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

// RichList for Geth Classic, Geth
function makeRichList(toBlock, blocks, updateCallback) {
  var self = makeRichList;
  if (!self.cached) {
    self.cached = {};
    self.index = 0;
  }
  if (!self.accounts) {
    self.accounts = {};
  }
  var fromBlock = toBlock - blocks;
  if (fromBlock < 0) {
    fromBlock = 0;
  }

  console.log('Scan accounts from ' + fromBlock + ' to ' + toBlock + ' ...');

  var ended = false;
  if (fromBlock == toBlock) {
    ended = true;
  }

  async.waterfall([
    function(callback) {
      // Transaction.distinct("from", { blockNumber: { $lte: toBlock, $gt: fromBlock } }, function(err, docs) ...
      // faster
      // dictint("from")
      Transaction.aggregate([
        { $match: { blockNumber: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$from' }},
        { $project: { "_id": 1 }}
      ]).exec(function(err, docs) {
        if (err) {
          console.log(err);
          return;
        }
        docs.forEach(function(doc) {
          // check address cache
          if (!self.cached[doc._id]) {
            self.accounts[doc._id] = { address: doc._id, type: 0 };
            // increase cache counter
            self.cached[doc._id] = 1;
          } else {
            self.cached[doc._id]++;
          }
        });
        callback(null);
      });
    }, function(callback) {
      // dictint("to")
      Transaction.aggregate([
        { $match: { blockNumber: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$to' }},
        { $project: { "_id": 1 }}
      ]).exec(function(err, docs) {
        if (err) {
           console.log(err);
           return;
        }
        docs.forEach(function(doc) {
          // to == null case
          if (!doc._id) {
            return;
          }
          if (!self.cached[doc._id]) {
            self.accounts[doc._id] = { address: doc._id, type: 0 };
            self.cached[doc._id] = 1;
          } else {
            self.cached[doc._id]++;
          }
        });
        callback(null);
      });
    }, function(callback) {
      // aggregate miner's addresses
      Block.aggregate([
        { $match: { number: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$miner' }},
        { $project: { "_id": 1 }}
      ]).exec(function(err, docs) {
        if (err) {
           console.log(err);
           return;
        }
        docs.forEach(function(doc) {
          if (!self.cached[doc._id]) {
            self.accounts[doc._id] = { address: doc._id, type: 0 };
            self.cached[doc._id] = 1;
          } else {
            self.cached[doc._id]++;
          }
        });
        callback(null);
      });
    }, function(callback) {
      let len = Object.keys(self.accounts).length;
      console.info('* ' + len + ' / ' + (self.index + len) + ' total accounts.');
      if (updateCallback && (len >= 200 || ended)) {
        self.index += len;
        console.log("* update " + len + " accounts ...");

        // split accounts into chunks to make proper sized json-rpc batch job.
        var accounts = Object.keys(self.accounts);
        var chunks = [];

        // about ~1000 `eth_getBalance` json rpc calls are possible in one json-rpc batchjob.
        while (accounts.length > 800) {
          var chunk = accounts.splice(0, 500);
          chunks.push(chunk);
        }
        if (accounts.length > 0) {
          chunks.push(accounts);
        }

        async.eachSeries(chunks, function(chunk, outerCallback) {
          var data = {};
          // get account type + getBalance using json rpc batch job
          async.waterfall([
          function(innerCallback) {
            var batch = web3.createBatch();

            for (var i = 0; i < chunk.length; i++) {
              var account = chunk[i];
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
                } else if (self.accounts[account]) {
                  data[account].type = self.accounts[account].type;
                }

              });
              innerCallback(null, data);
            });
          }, function(data, innerCallback) {
            // batch rpc job
            var batch = web3.createBatch();
            for (var i = 0; i < chunk.length; i++) {
              var account = chunk[i];
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
            if (err) {
              return outerCallback(err);
            }
            if (data) {
              updateCallback(data, toBlock);
            }

            outerCallback();
          });
        }, function(error) {
          if (error) {
            console.log("WARN: fail to call getBalance() " + error);
          }
          // reset accounts
          self.accounts = {};

          // check the size of the cached accounts
          if (Object.keys(self.cached).length > ADDRESS_CACHE_MAX) {
            console.info("** reduce cached accounts ...");
            var sorted = Object.keys(self.cached).sort(function(a, b) {
              return self.cached[b] - self.cached[a]; // descend order
            });
            var newcached = {};
            var reduce = parseInt(ADDRESS_CACHE_MAX * 0.6);
            for (var j = 0; j < reduce; j++) {
              newcached[sorted[j]] = self.cached[sorted[j]];
            }
            self.cached = newcached;
          }

          callback(null);
        });
      } else {
        callback(null);
      }
    }
  ], function(error) {
    if (error) {
      console.log(error);
      return;
    }

    if (ended) {
      console.log("**DONE**");
    } else {
      setTimeout(function() {
        makeRichList(fromBlock, blocks, updateCallback);
      }, 300);
    }
  });
}

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

function prepareJsonAddress(json, defaultType = 0) {
  var accounts = {};
  if (json.accounts) {
    // genesis.json style
    Object.keys(json.accounts).forEach(function(account) {
      var key = account.toLowerCase();
      key = '0x' + key.replace(/^0x/, '');
      accounts[key] = { address: key, type: type };
    });
  } else if (typeof json === 'object') {
    Object.keys(json).forEach(function(account) {
      var key = account.toLowerCase();
      key = '0x' + key.replace(/^0x/, '');
      var type = defaultType;
      if (json[account].type) {
        type = json[account].type;
      }
      accounts[key] = { address: key, type: type };
    });
  } else { // normal array
    json.forEach(function(account) {
      var key = account.toLowerCase();
      key = '0x' + key.replace(/^0x/, '');
      accounts[key] = { address: key, type: type };
    });
  }
  return accounts;
}

function readJsonAccounts(json, blockNumber, callback, defaultType = 0) {
  var data = prepareJsonAddress(json, defaultType);
  var accounts = Object.keys(data);
  console.log("* update " + accounts.length + " genesis accounts...");

  // batch rpc job
  var batch = web3.createBatch();
  // normally, the request size of batch getBalance() of all accounts is not bigger than 128kB.
  // simply getBalance at once using rpc batch job.
  for (var i = 0; i < accounts.length; i++) {
    var account = accounts[i];
    batch.add(web3.eth.getBalance.request(account));
  }

  batch.requestManager.sendBatch(batch.requests, function(err, results) {
    if (err) {
      console.log("ERROR: fail to getBalance batch job:", err);
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
    callback(data, blockNumber);
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
if (!process.env.NOPARITY
    && web3.version.node.split('/')[0].toLowerCase().includes('parity')) {
  // load parity extension
  web3 = require("../lib/trace.js")(web3);
  useParity = true;
}

var latestBlock = web3.eth.blockNumber;

// run
console.log("* latestBlock = " + latestBlock);

if (useParity) {
  makeParityRichList(500, null, latestBlock, updateAccounts);
} else {
  // load genesis account
  if (config.settings && config.settings.genesisAddress) {
    try {
      var genesis = require('../' + config.settings.genesisAddress);
      readJsonAccounts(genesis, latestBlock, updateAccounts);
    } catch (e) {
      console.log("Error: Fail to load genesis address (ignore)");
    }
  }
  makeRichList(latestBlock, 500, updateAccounts);
}
