#!/usr/bin/env node
/**
 * Tool for calculating richlist by hackyminer
 */

var _ = require('lodash');
var Web3 = require('web3');
var async = require('async');
var BigNumber = require('bignumber.js');
var mongoose = require('mongoose');

var Account = require('../db.js').Account;
var Transaction = require('../db.js').Transaction;
var Block = require('../db.js').Block;

const ADDRESS_CACHE_MAX = 10000; // address cache threshold

function makeParityRichList(number, offset, blockNumber, updateCallback) {
  var self = makeParityRichList;
  if (!self.index) {
    self.index = 0;
  }
  number = number || 100;
  offset = offset || null;

  async.waterfall([
    function(callback) {
      web3.parity.listAccounts(number, offset, blockNumber, function(err, result) {
        callback(err, result);
      });
    }, function(accounts, callback) {
      if (!accounts) {
        return callback({
          error: true,
          message: "No accounts found. Please restart Parity with --fat-db=on option to enable FatDB."
        });
      }

      if (accounts.length === 0) {
        return callback({
          error: true,
          message: "No more accounts found."
        });
      }

      var lastAccount = accounts[accounts.length - 1];
      var data = {};

      // get account type + getBalance using json rpc batch job
      async.waterfall([
      function(innerCallback) {
        var batch = web3.createBatch();

        for (var i = 0; i < accounts.length; i++) {
          var account = accounts[i];
          batch.add(web3.eth.getCode.request(account));
        }

        batch.requestManager.sendBatch(batch.requests, function(err, results) {
          if (err) {
            console.log("ERROR: fail to getCode batch job:", err);
            innerCallback(err);
            return;
          }
          results = results || [];
          batch.requests.map(function (request, index) {
            return results[index] || {};
          }).forEach(function (result, i) {
            var code = batch.requests[i].format ? batch.requests[i].format(result.result) : result.result;
            var account = batch.requests[i].params[0];
            data[account] = { address: account };
            if (code.length > 2) {
              // 0: normal address, 1: contract
              data[account].type = 1; // contract case
            }

          });
          innerCallback(null, data);
        });
      }, function(data, innerCallback) {
        // batch rpc job
        var batch = web3.createBatch();
        for (var i = 0; i < accounts.length; i++) {
          var account = accounts[i];
          batch.add(web3.eth.getBalance.request(account));
        }

        batch.requestManager.sendBatch(batch.requests, function(err, results) {
          if (err) {
            console.log("ERROR: fail to getBalance batch job:", err);
            innerCallback(err);
            return;
          }
          results = results || [];
          batch.requests.map(function (request, index) {
            return results[index] || {};
          }).forEach(function (result, i) {
            var balance = batch.requests[i].format ? batch.requests[i].format(result.result) : result.result;

            let ether;
            if (typeof balance === 'object') {
              ether = parseFloat(balance.div(1e18).toString());
            } else {
              ether = balance / 1e18;
            }
            data[batch.requests[i].params[0]].balance = ether;
          });
          innerCallback(null, data);
        });
      }], function(err) {
        callback(err, data, lastAccount);
      });
    }
  ], function(error, accounts, lastAccount) {
    if (error) {
      console.log(error);
      process.exit(9);
      return;
    }

    //console.log(JSON.stringify(accounts, null, 2));
    offset = lastAccount;
    let j = Object.keys(accounts).length;
    self.index += j;
    console.log(' * ' + j + ' / ' + self.index + ' accounts, offset = ' + offset);
    if (updateCallback) {
      updateCallback(accounts, blockNumber);
    }
    setTimeout(function() {
      makeParityRichList(number, lastAccount, blockNumber, updateCallback);
    }, 300);
  });
}

/**
 * Write accounts to DB
 */
var updateAccounts = function(accounts, blockNumber) {
  // prepare
  var bulk = Object.keys(accounts).map(function(j) {
    let account = accounts[j];
    account.blockNumber = blockNumber;
    return account;
  });

  bulkInsert(bulk);
}

var bulkInsert = function(bulk) {
  if (!bulk.length) {
    return;
  }

  var localbulk;
  if (bulk.length > 300) {
    localbulk = bulk.splice(0, 200);
  } else {
    localbulk = bulk.splice(0, 300);
  }
  Account.collection.insert(localbulk, function(error, data) {
    if (error) {
      if (error.code == 11000) {
        // For already exists case, try upsert method.
        async.eachSeries(localbulk, function(item, eachCallback) {
          // upsert accounts
          item._id = undefined;
          delete item._id; // remove _id field
          if (item.type == 0) {
            // do not update for normal address cases
            item.type = undefined;
            delete item.type;
          }
          Account.collection.update({ "address": item.address }, { $set: item }, { upsert: true }, function(err, updated) {
            if (err) {
              if (!config.quiet) {
                console.log('WARN: Duplicate DB key : ' + error);
                console.log('ERROR: Fail to update account: ' + err);
              }
              return eachCallback(err);
            }
            eachCallback();
          });
        }, function(err) {
          if (err) {
            if (err.code != 11000) {
              console.log('ERROR: Aborted due to error: ' + JSON.stringify(err, null, 2));
              process.exit(9);
              return;
            } else {
              console.log('WARN: Fail to upsert (ignore) ' + err);
            }
          }
          console.log('* ' + localbulk.length + ' accounts successfully updated.');
          if (bulk.length > 0) {
            setTimeout(function() {
              bulkInsert(bulk);
            }, 200);
          }
        });
      } else {
        console.log('Error: Aborted due to error on DB: ' + error);
        process.exit(9);
      }
    } else {
      console.log('* ' + data.insertedCount + ' accounts successfully inserted.');
      if (bulk.length > 0) {
        setTimeout(function() {
          bulkInsert(bulk);
        }, 200);
      }
    }
  });
}

/**
 * Start config for node connection and sync
 */
var config = { nodeAddr: 'localhost', 'gethPort': 8545 };
// load the config.json file
try {
  var loaded = require('../config.json');
  _.extend(config, loaded);
  console.log('config.json found.');
} catch (error) {
  console.log('No config file found.');
  throw error;
  process.exit(1);
}

// temporary turn on some debug
//config.quiet = false;
//mongoose.set('debug', true);

console.log('Connecting ' + config.nodeAddr + ':' + config.gethPort + '...');

var web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.nodeAddr + ':' + config.gethPort.toString()));

web3 = require("../lib/trace.js")(web3);

var latestBlock = web3.eth.blockNumber;

// run
console.log("* latestBlock = " + latestBlock);

makeParityRichList(500, null, latestBlock, updateAccounts);
