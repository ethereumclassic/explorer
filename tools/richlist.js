#!/usr/bin/env node
/**
 * Tool for calculating richlist by hackyminer
 */
require("@babel/register")({
  presets: ["@babel/preset-env"]
});

const _ = require('lodash');
const Web3 = require('web3');
const asyncL = require('async');
const fs = require('fs');
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
        let chunks = [];

        // about ~1000 `eth_getBalance` json rpc calls are possible in one json-rpc batchjob.
        while (accounts.length > 800) {
          let chunk = accounts.splice(0, 500);
          chunks.push(chunk);
        }
        if (accounts.length > 0) {
          chunks.push(accounts);
        }

        asyncL.eachSeries(chunks, (chunk, outerCallback) => {
          let data = {};
          // get account type + getBalance using json rpc batch job
          asyncL.waterfall([
          async () => {
            let batch = new web3.BatchRequest();

            for (let i = 0; i < chunk.length; i++) {
              let account = chunk[i];
              batch.add(web3.eth.getCode.request(account));
            }

            try {
              let results = await batch.execute();
              results.response.forEach((code, i) => {
                let account = chunk[i];
                data[account] = { address: account };
                if (code.length > 2) {
                  // 0: normal address, 1: contract
                  data[account].type = 1; // contract case
                } else if (self.accounts[account]) {
                  data[account].type = self.accounts[account].type;
                }

              });
              return data;
            } catch (err) {
              console.log("ERROR: fail to getCode batch job:", err);
              return err;
            }
          }, async function(data) {
            // batch rpc job
            let batch = new web3.BatchRequest();
            for (let i = 0; i < chunk.length; i++) {
              let account = chunk[i];
              batch.add(web3.eth.getBalance.request(account));
            }

            try {
              let results = await batch.execute();
              results.response.forEach((balance, i) => {
                let ether;
                if (typeof balance === 'object') {
                  ether = parseFloat(balance.div(1e18).toString());
                } else {
                  ether = balance / 1e18;
                }
                data[chunk[i]].balance = ether;
              });
              return data;
            } catch (err) {
              console.log("ERROR: fail to getBalance batch job:", err);
              return err;
            }
          }], (err, data) => {
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
      let data = {};

      // get account type + getBalance using json rpc batch job
      asyncL.waterfall([
      async function() {
        let batch = new web3.BatchRequest();

        for (let i = 0; i < accounts.length; i++) {
          let account = accounts[i];
          batch.add(web3.eth.getCode.request(account));
        }

        try {
          let results = await batch.execute();
          results.response.forEach((code, i) => {
            let account = accounts[i].toLowerCase();
            data[account] = { address: account };
            if (code.length > 2) {
              // 0: normal address, 1: contract
              data[account].type = 1; // contract case
            }

          });
          return data;
        } catch (err) {
          console.log("ERROR: fail to getCode batch job:", err);
          return err;
        }
      }, async function(data) {
        // batch rpc job
        let batch = new web3.BatchRequest();
        for (let i = 0; i < accounts.length; i++) {
          let account = accounts[i];
          batch.add(web3.eth.getBalance.request(account));
        }

        try {
          let results = await batch.execute();
          results.response.forEach((balance, i) => {
            let ether;
            if (typeof balance === 'object') {
              ether = parseFloat(balance.div(1e18).toString());
            } else {
              ether = balance / 1e18;
            }
            data[accounts[i]].balance = ether;
          });
          return data;
        } catch (err) {
          console.log("ERROR: fail to getBalance batch job:", err);
          return err;
        }
      }], (err, data) => {
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
  if (json.accounts || json.alloc) {
    // genesis.json style
    let jsonAccounts = json.accounts || json.alloc;
    Object.keys(jsonAccounts).forEach((account) => {
      let key = account.toLowerCase();
      key = `0x${key.replace(/^0x/, '')}`;
      accounts[key] = { address: key, defaultType };
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

async function readJsonAccounts(json, blockNumber, callback, defaultType = 0) {
  const data = prepareJsonAddress(json, defaultType);
  const accounts = Object.keys(data);
  console.log(`* update ${accounts.length} genesis accounts...`);

  // batch rpc job
  let batch = new web3.BatchRequest();
  // normally, the request size of batch getBalance() of all accounts is not bigger than 128kB.
  // simply getBalance at once using rpc batch job.
  for (let i = 0; i < accounts.length; i++) {
    let account = accounts[i];
    batch.add(web3.eth.getBalance.request(account));
  }

  try {
    // web3 2.0.0 case
    let results = await batch.execute();
    results.response.forEach((balance, i) => {
      let ether;
      if (typeof balance === 'object') {
        ether = parseFloat(balance.div(1e18).toString());
      } else {
        ether = balance / 1e18;
      }
      data[accounts[i]].balance = ether;
    });
    callback(data, blockNumber);
  } catch (e) {
    console.log('Error: ', e);
  }
}

// temporary turn on some debug
//config.quiet = false;
//mongoose.set('debug', true);

async function startSync(isParity) {
  const latestBlock = await web3.eth.getBlockNumber();
  console.log(`* latestBlock = ${latestBlock}`);

  if (isParity) {
    const Parity = require("../lib/parity").Parity;
    web3.parity = new Parity(web3.currentProvider);

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

// only update some accounts and exit
if (process.argv[2]) {
  console.log("Update accounts ...");

  let addrs = process.argv[2];
  try {
    if (fs.existsSync(addrs)) {
      let content = fs.readFileSync(addrs);
      let json = JSON.parse(content);
      web3.eth.getBlockNumber((err, latestBlock) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        console.log(`* latestBlock = ${latestBlock}`);
        readJsonAccounts(json, latestBlock, updateAccounts);
      });
    }
  } catch(err) {
    console.error(err);
    process.exit(1);
  }
} else
web3.eth.getNodeInfo((err, nodeInfo) => {
  let isParity = false;

  console.log(`Node version = ${nodeInfo}`);
  if (nodeInfo.split('/')[0].toLowerCase().includes('parity')) {
    console.log('Web3 has detected parity node configuration');
    const Parity = require("../lib/parity").Parity;
    web3.parity = new Parity(web3.currentProvider);
    isParity = true;
  }

  startSync(isParity);
});
