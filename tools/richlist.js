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

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/blockDB');

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

      // Please see https://github.com/gobitfly/etherchain-light by gobitfly
      async.eachSeries(accounts, function(account, eachCallback) {
        web3.eth.getCode(account, function(err, code) {
          if (err) {
            console.log("ERROR: fail to getCode(" + account + ")");
            return eachCallback(err);
          }
          data[account] = {};
          data[account].address = account;
          data[account].type = code.length > 2 ? 1 : 0; // 0: address, 1: contract

          web3.eth.getBalance(account, blockNumber, function(err, balance) {
            if (err) {
              console.log("ERROR: fail to getBalance(" + account + ")");
              return eachCallback(err);
            }

            //data[account].balance = web3.fromWei(balance, 'ether');
            let ether;
            if (typeof balance === 'object') {
              ether = parseFloat(balance.div(1e18).toString());
            } else {
              ether /= 1e18;
            }
            data[account].balance = ether;
            eachCallback();
          });
        });
      }, function(err) {
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
  var bulk = Object.keys(accounts).map(function(j) {
    let account = accounts[j];
    account.blockNumber = blockNumber;
    return account;
  });

  Account.collection.insert(bulk, function(error, data) {
    if (error) {
      if (error.code == 11000) {
        async.eachSeries(bulk, function(item, eachCallback) {
          // upsert accounts
          delete item._id; // remove _id field
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
            console.log('ERROR: Aborted due to error: ' + err);
            process.exit(9);
            return;
          }
          console.log('* ' + bulk.length + ' accounts successfully updated.');
        });
      } else {
        console.log('Error: Aborted due to error on DB: ' + error);
        process.exit(9);
      }
    } else {
      console.log('* ' + data.insertedCount + ' accounts successfully inserted.');
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

var useParity = false;
if (web3.version.node.split('/')[0].toLowerCase().includes('parity')) {
  // load parity extension
  web3 = require("../lib/trace.js")(web3);
  useParity = true;
}

var latestBlock = web3.eth.blockNumber;

// run
console.log("* latestBlock = " + latestBlock);

if (useParity) {
  makeParityRichList(100, null, latestBlock, updateAccounts);
} else {
  console.log("Sorry, currently only Parity is supported.");
  process.exit(1);
}
