#!/usr/bin/env node
/**
 * Tool for calculating richlist by hackyminer
 */

const _ = require('lodash');
const Web3 = require('web3');
const web3explorer = require('web3-explorer');
const asyncL = require('async');
const BigNumber = require('bignumber.js');
const mongoose = require('mongoose');

const { Account } = require('../db.js');
const { Transaction } = require('../db.js');
const { Block } = require('../db.js');

const ADDRESS_CACHE_MAX = 10000; // address cache threshold

/**
 * Start config for node connection and sync
 */
const config = { nodeAddr: 'localhost', 'wsPort': 8546 };
// load the config.json file
try {
  const loaded = require('../config.json');
  _.extend(config, loaded);
  console.log('config.json found.');
} catch (error) {
  console.log('No config file found.');
  throw error;
  process.exit(1);
}

console.log(`Connecting ${config.nodeAddr}:${config.wsPort}...`);
// Sets address for RPC WEB3 to connect to, usually your node IP address defaults ot localhost
const web3 = new Web3(new Web3.providers.WebsocketProvider(`ws://${config.nodeAddr}:${config.wsPort.toString()}`));

// RichList for Geth Classic, Geth
function makeRichList(toBlock, blocks, updateCallback) {
  const self = makeRichList;
  if (!self.cached) {
    self.cached = {};
    self.index = 0;
  }
  if (!self.accounts) {
    self.accounts = {};
  }
  let fromBlock = toBlock - blocks;
  if (fromBlock < 0) {
    fromBlock = 0;
  }

  if (!('quiet' in config && config.quiet === true)) {
    console.log(`Scan accounts from ${fromBlock} to ${toBlock} ...`);
  }

  let ended = false;
  if (fromBlock == toBlock) {
    ended = true;
  }

  asyncL.waterfall([
    function (callback) {
      // Transaction.distinct("from", { blockNumber: { $lte: toBlock, $gt: fromBlock } }, function(err, docs) ...
      // faster
      // dictint("from")
      Transaction.aggregate([
        { $match: { blockNumber: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$from' } },
        { $project: { '_id': 1 } },
      ]).exec((err, docs) => {
        if (err) {
          console.log(err);
          return;
        }
        docs.forEach((doc) => {
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
    }, function (callback) {
      // dictint("to")
      Transaction.aggregate([
        { $match: { blockNumber: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$to' } },
        { $project: { '_id': 1 } },
      ]).exec((err, docs) => {
        if (err) {
          console.log(err);
          return;
        }
        docs.forEach((doc) => {
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
    }, function (callback) {
      // aggregate miner's addresses
      Block.aggregate([
        { $match: { number: { $lte: toBlock, $gt: fromBlock } } },
        { $group: { _id: '$miner' } },
        { $project: { '_id': 1 } },
      ]).exec((err, docs) => {
        if (err) {
          console.log(err);
          return;
        }
        docs.forEach((doc) => {
          if (!self.cached[doc._id]) {
            self.accounts[doc._id] = { address: doc._id, type: 0 };
            self.cached[doc._id] = 1;
          } else {
            self.cached[doc._id]++;
          }
        });
        callback(null);
      });
    }, function (callback) {
      const len = Object.keys(self.accounts).length;
      console.info(`* ${len} / ${self.index + len} total accounts.`);
      if (updateCallback && (len >= 100 || ended)) {
        self.index += len;
        if (!('quiet' in config && config.quiet === true)) {
          console.log(`* update ${len} accounts ...`);
        }

        // split accounts into chunks to make proper sized json-rpc batch job.
        const accounts = Object.keys(self.accounts);
        const chunks = [];

        // about ~1000 `eth_getBalance` json rpc calls are possible in one json-rpc batchjob.
        while (accounts.length > 200) {
          const chunk = accounts.splice(0, 100);
          chunks.push(chunk);
        }
        if (accounts.length > 0) {
          chunks.push(accounts);
        }

        asyncL.eachSeries(chunks, (chunk, outerCallback) => {
          const data = {};
          asyncL.eachSeries(chunk, (account, eachCallback) => {
            web3.eth.getCode(account, (err, code) => {
              if (err) {
                return eachCallback(err);
              }
              data[account] = { address: account };
              if (code.length > 2) {
                data[account].type = 1; // contract type
              } else if (self.accounts[account]) {
                data[account].type = self.accounts[account].type;
              }

              web3.eth.getBalance(account, (err, balance) => {
                if (err) {
                  return eachCallback(err);
                }

                data[account].balance = parseFloat(web3.utils.fromWei(balance, 'ether'));
                eachCallback();
              });
            });
          }, (err) => {
            if (err) {
              return outerCallback(err);
            }
            if (data) {
              updateCallback(data, toBlock);
            }

            outerCallback();
          });
        }, (error) => {
          if (error) {
            console.log(`WARN: fail to call getBalance() ${error}`);
          }
          // reset accounts
          self.accounts = {};

          // check the size of the cached accounts
          if (Object.keys(self.cached).length > ADDRESS_CACHE_MAX) {
            console.info('** reduce cached accounts ...');
            const sorted = Object.keys(self.cached).sort((a, b) => self.cached[b] - self.cached[a], // descend order
            );
            const newcached = {};
            const reduce = parseInt(ADDRESS_CACHE_MAX * 0.6);
            for (let j = 0; j < reduce; j++) {
              newcached[sorted[j]] = self.cached[sorted[j]];
            }
            self.cached = newcached;
          }

          callback(null);
        });
      } else {
        callback(null);
      }
    },
  ], (error) => {
    if (error) {
      console.log(error);
      return;
    }

    if (ended) {
      console.log('**DONE**');
    } else {
      setTimeout(() => {
        makeRichList(fromBlock, blocks, updateCallback);
      }, 300);
    }
  });
}

function makeParityRichList(number, offset, blockNumber, updateCallback) {
  const self = makeParityRichList;
  if (!self.index) {
    self.index = 0;
  }
  number = number || 100;
  offset = offset || null;

  asyncL.waterfall([
    function (callback) {
      web3.parity.listAccounts(number, offset, blockNumber, (err, result) => {
        callback(err, result);
      });
    }, function (accounts, callback) {
      if (!accounts) {
        return callback({
          error: true,
          message: 'No accounts found. Please restart Parity with --fat-db=on option to enable FatDB.',
        });
      }

      if (accounts.length === 0) {
        return callback({
          error: true,
          message: 'No more accounts found.',
        });
      }

      const lastAccount = accounts[accounts.length - 1];
      const data = {};

      // Please see https://github.com/gobitfly/etherchain-light by gobitfly
      asyncL.eachSeries(accounts, (account, eachCallback) => {
        web3.eth.getCode(account, (err, code) => {
          if (err) {
            console.log(`ERROR: fail to getCode(${account})`);
            return eachCallback(err);
          }
          data[account] = {};
          data[account].address = account;
          if (code.length > 2) {
            // 0: normal address, 1: contract
            data[account].type = 1; //contract case
          }

          web3.eth.getBalance(account, (err, balance) => {
            if (err) {
              console.log(`ERROR: fail to getBalance(${account})`);
              return eachCallback(err);
            }

            data[account].balance = parseFloat(web3.utils.fromWei(balance, 'ether'));
            eachCallback();
          });
        });
      }, (err) => {
        callback(err, data, lastAccount);
      });
    },
  ], (error, accounts, lastAccount) => {
    if (error) {
      console.log(error);
      process.exit(9);
      return;
    }

    //console.log(JSON.stringify(accounts, null, 2));
    offset = lastAccount;
    const j = Object.keys(accounts).length;
    self.index += j;
    if (!('quiet' in config && config.quiet === true)) {
      console.log(` * ${j} / ${self.index} accounts, offset = ${offset}`);
    }
    if (updateCallback) {
      updateCallback(accounts, blockNumber);
    }
    setTimeout(() => {
      makeParityRichList(number, lastAccount, blockNumber, updateCallback);
    }, 300);
  });
}

/**
 * Write accounts to DB
 */
const updateAccounts = function (accounts, blockNumber) {
  // prepare
  const bulk = Object.keys(accounts).map((j) => {
    const account = accounts[j];
    account.blockNumber = blockNumber;
    return account;
  });

  bulkInsert(bulk);
};

var bulkInsert = function (bulk) {
  if (!bulk.length) {
    return;
  }

  let localbulk;
  if (bulk.length > 300) {
    localbulk = bulk.splice(0, 200);
  } else {
    localbulk = bulk.splice(0, 300);
  }
  Account.collection.insert(localbulk, (error, data) => {
    if (error) {
      if (error.code == 11000) {
        // For already exists case, try upsert method.
        asyncL.eachSeries(localbulk, (item, eachCallback) => {
          // upsert accounts
          item._id = undefined;
          delete item._id; // remove _id field
          if (item.type == 0) {
            // do not update for normal address cases
            item.type = undefined;
            delete item.type;
          }
          Account.collection.update({ 'address': item.address }, { $set: item }, { upsert: true }, (err, updated) => {
            if (err) {
              if (!config.quiet) {
                console.log(`WARN: Duplicate DB key : ${error}`);
                console.log(`ERROR: Fail to update account: ${err}`);
              }
              return eachCallback(err);
            }
            eachCallback();
          });
        }, (err) => {
          if (err) {
            if (err.code != 11000) {
              console.log(`ERROR: Aborted due to error: ${JSON.stringify(err, null, 2)}`);
              process.exit(9);
              return;
            }
            console.log(`WARN: Fail to upsert (ignore) ${err}`);

          }
          if (!('quiet' in config && config.quiet === true)) {
            console.log(`* ${localbulk.length} accounts successfully updated.`);
          }
          if (bulk.length > 0) {
            setTimeout(() => {
              bulkInsert(bulk);
            }, 200);
          }
        });
      } else {
        console.log(`Error: Aborted due to error on DB: ${error}`);
        process.exit(9);
      }
    } else {
      if (!('quiet' in config && config.quiet === true)) {
        console.log(`* ${data.insertedCount} accounts successfully inserted.`);
      }
      if (bulk.length > 0) {
        setTimeout(() => {
          bulkInsert(bulk);
        }, 200);
      }
    }
  });
};

function prepareJsonAddress(json, defaultType = 0) {
  const accounts = {};
  if (json.accounts) {
    // genesis.json style
    Object.keys(json.accounts).forEach((account) => {
      let key = account.toLowerCase();
      key = `0x${key.replace(/^0x/, '')}`;
      accounts[key] = { address: key, type };
    });
  } else if (typeof json === 'object') {
    Object.keys(json).forEach((account) => {
      let key = account.toLowerCase();
      key = `0x${key.replace(/^0x/, '')}`;
      let type = defaultType;
      if (json[account].type) {
        type = json[account].type;
      }
      accounts[key] = { address: key, type };
    });
  } else { // normal array
    json.forEach((account) => {
      let key = account.toLowerCase();
      key = `0x${key.replace(/^0x/, '')}`;
      accounts[key] = { address: key, type };
    });
  }
  return accounts;
}

function readJsonAccounts(json, blockNumber, callback, defaultType = 0) {
  const data = prepareJsonAddress(json, defaultType);
  const accounts = Object.keys(data);
  console.log(`* update ${accounts.length} genesis accounts...`);
  async.eachSeries(accounts, (account, eachCallback) => {
    web3.eth.getBalance(account, (err, balance) => {
      if (err) {
        console.log(`ERROR: fail to getBalance(${account})`);
        return eachCallback(err);
      }

      data[account].balance = parseFloat(web3.utils.fromWei(balance, 'ether'));
      eachCallback();
    });
  }, (err) => {
    if (err) {
      console.log(`ERROR: fail to getBalance()${err}`);
      return;
    }
    callback(data, blockNumber);
  });
}

// temporary turn on some debug
//config.quiet = false;
//mongoose.set('debug', true);

async function startSync() {
  const latestBlock = await web3.eth.getBlockNumber();
  const nodeInfo = await web3.eth.getNodeInfo();

  console.log(`Node version = ${nodeInfo}`);

  if (nodeInfo.split('/')[0].toLowerCase().includes('parity')) {
    console.log('Web3 has detected parity node configuration');
    web3explorer(web3);
    console.log(`* latestBlock = ${latestBlock}`);
    makeParityRichList(500, null, latestBlock, updateAccounts);
  } else {
    // load genesis account
    if (config.settings && config.settings.genesisAddress) {
      try {
        const genesis = require(`../${config.settings.genesisAddress}`);
        readJsonAccounts(genesis, latestBlock, updateAccounts);
      } catch (e) {
        console.log('Error: Fail to load genesis address (ignore)');
      }
    }
    if ('quiet' in config && config.quiet === true) {
      console.log('Quiet mode enabled');
    }
    makeRichList(latestBlock, 500, updateAccounts);
  }
}
startSync();
