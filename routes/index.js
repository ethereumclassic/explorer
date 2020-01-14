const mongoose = require('mongoose');

const Block = mongoose.model('Block');
const Transaction = mongoose.model('Transaction');
const Account = mongoose.model('Account');
const _ = require('lodash');
const async = require('async');
const BigNumber = require('bignumber.js');
const filters = require('./filters');

var config = {};
try {
  config = require('../config.json');
} catch(e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('No config file found. Using default configuration... (config.example.json)');
    config = require('../config.example.json');
  } else {
    throw e;
    process.exit(1);
  }
}

module.exports = function (app) {
  const web3relay = require('./web3relay');

  const Token = require('./token');

  const compile = require('./compiler');
  const stats = require('./stats');
  const richList = require('./richlist');

  /*
    Local DB: data request format
    { "address": "0x1234blah", "txin": true }
    { "tx": "0x1234blah" }
    { "block": "1234" }
  */
  app.post('/richlist', richList);
  app.post('/addr', getAddr);
  app.post('/addr_count', getAddrCounter);
  app.post('/tx', getTx);
  app.post('/block', getBlock);
  app.post('/data', getData);
  app.get('/total', getTotal);

  app.post('/tokenrelay', Token);
  app.post('/web3relay', web3relay.data);
  app.post('/compile', compile);

  app.post('/stats', stats);
  app.post('/supply', getTotalSupply);
  app.get('/supply/:act', getTotalSupply);
  app.get('/supply', getTotalSupply);
};

const getAddr = async (req, res) => {
  // TODO: validate addr and tx
  const addr = req.body.addr.toLowerCase();
  const count = parseInt(req.body.count);

  const limit = parseInt(req.body.length);
  const start = parseInt(req.body.start);

  const data = {
    draw: parseInt(req.body.draw), recordsFiltered: count, recordsTotal: count, mined: 0,
  };

  const addrFind = Transaction.find({ $or: [{ 'to': addr }, { 'from': addr }] });

  let sortOrder = '-blockNumber';
  if (req.body.order && req.body.order[0] && req.body.order[0].column) {
    // date or blockNumber column
    if (req.body.order[0].column == 1 || req.body.order[0].column == 6) {
      if (req.body.order[0].dir == 'asc') {
        sortOrder = 'blockNumber';
      }
    }
  }

  addrFind.lean(true).sort(sortOrder).skip(start).limit(limit)
    .exec('find', (err, docs) => {
      if (docs) data.data = filters.filterTX(docs, addr);
      else data.data = [];
      res.write(JSON.stringify(data));
      res.end();
    });

};
var getAddrCounter = function (req, res) {
  const addr = req.body.addr.toLowerCase();
  const count = parseInt(req.body.count);
  const data = { recordsFiltered: count, recordsTotal: count, mined: 0 };

  async.waterfall([
    function (callback) {

      Transaction.count({ $or: [{ 'to': addr }, { 'from': addr }] }, (err, count) => {
        if (!err && count) {
          // fix recordsTotal
          data.recordsTotal = count;
          data.recordsFiltered = count;
        }
        callback(null);
      });

    }, function (callback) {

      Block.count({ 'miner': addr }, (err, count) => {
        if (!err && count) {
          data.mined = count;
        }
        callback(null);
      });

    }], (err) => {
    res.write(JSON.stringify(data));
    res.end();
  });

};
var getBlock = function (req, res) {
  // TODO: support queries for block hash
  const txQuery = 'number';
  const number = parseInt(req.body.block);

  const blockFind = Block.findOne({ number }).lean(true);
  blockFind.exec((err, doc) => {
    if (err || !doc) {
      console.error(`BlockFind error: ${err}`);
      console.error(req.body);
      res.write(JSON.stringify({ 'error': true }));
    } else {
      const block = filters.filterBlocks([doc]);
      res.write(JSON.stringify(block[0]));
    }
    res.end();
  });
};

/** 
 * calc totalSupply
 * total supply = genesis alloc + miner rewards + estimated uncle rewards
 */
var getTotalSupply = function(req, res) {
  var act;
  if (req.params.act && ['total', 'totalSupply', 'circulatingSupply', 'genesisAlloc', 'minerRewards', 'uncleRewards'].indexOf(req.params.act) > -1) {
    act = req.params.act;
    if (act === 'total') {
      act = 'totalSupply';
    }
  }

  Block.findOne({}).lean(true).sort('-number').exec(function (err, latest) {
    if(err || !latest) {
      console.error("getTotalSupply error: " + err)
      res.write(JSON.stringify({"error": true}));
      res.end();
    } else {
      console.log("getTotalSupply: latest block: " + latest.number);
      var blockNumber = latest.number;

      var total = new BigNumber(0);
      var genesisAlloc = new BigNumber(0);
      var blocks = [];

      var rewards = {
        enableECIP1017: true,
        estimateUncle: 0.054, /* true: aggregate db // number(fractioal value): uncle rate // false: disable */
        genesisAlloc: 72009990.50,
        blocks: [
          /* will be regeneragted later for ECIP1017 enabled case */
          { start:        1, reward: 5e+18, uncle: 0.90625 },
          { start:  5000001, reward: 4e+18, uncle:  0.0625 },
          { start: 10000001, reward: 4e+18, uncle:  0.0625 },
        ]
      };

      if (config.rewards) {
        _.extend(rewards, config.rewards);
      }

      if (rewards && rewards.blocks) {
        // get genesis alloc
        if (typeof rewards.genesisAlloc === "object") {
          genesisAlloc = new BigNumber(rewards.genesisAlloc.total) || new BigNumber(0);
        } else {
          genesisAlloc = new BigNumber(rewards.genesisAlloc) || new BigNumber(0);
        }
        genesisAlloc = genesisAlloc.times(new BigNumber(1e+18));

        if (rewards.enableECIP1017) {
          // regenerate reward block config for ETC
          // https://github.com/ethereumproject/ECIPs/blob/master/ECIPs/ECIP-1017.md
          var reward = new BigNumber(5e+18);
          var uncleRate = new BigNumber(1).div(32).plus(new BigNumber(7).div(8)); // 1/32(block miner) + 7/8(uncle miner)
          blocks.push({start: 1, end: 5000000, reward, uncle: uncleRate});

          reward = reward.times(0.8); // reduce 20%
          uncleRate = new BigNumber(1).div(32).times(2); // 1/32(block miner) + 1/32(uncle miner)
          blocks.push({start: 5000001, end: 10000000, reward, uncle: uncleRate});
          currentBlock = 10000001;
          var i = 2;
          var lastBlock = blockNumber;
          for (; lastBlock > currentBlock; currentBlock += 5000000) {
            var start = blocks[i - 1].end + 1;
            var end = start + 5000000 - 1;
            reward = reward.times(0.8); // reduce 20%
            blocks.push({start, end, reward, uncle: blocks[i - 1].uncle});
            i++;
          }
          rewards.blocks = blocks;
          blocks = [];
        }

        // check reward blocks, calc total miner's reward
        rewards.blocks.forEach(function(block, i) {
          if (blockNumber > block.start) {
            var startBlock = block.start;
            if (startBlock < 0) {
              startBlock = 0;
            }
            var endBlock = blockNumber;
            var reward = new BigNumber(block.reward);
            if (rewards.blocks[i + 1] && blockNumber > rewards.blocks[i + 1].start) {
              endBlock = rewards.blocks[i + 1].start - 1;
            }
            blocks.push({start: startBlock, end: endBlock, reward: reward, uncle: block.uncle });

            var blockNum = endBlock - startBlock;
            total = total.plus(reward.times(new BigNumber(blockNum)));
          }
        });
      }

      var totalSupply = total.plus(genesisAlloc);
      // circulationSupply = totalSupply - longterm reserve
      var circulatingSupply = totalSupply.minus(rewards.longtermReserve || 0);
      var ret = { "height": blockNumber, "circulatingSupply": circulatingSupply.div(1e+18), "totalSupply": totalSupply.div(1e+18), "genesisAlloc": genesisAlloc.div(1e+18), "minerRewards": total.div(1e+18) };
      if (req.method === 'POST' && typeof rewards.genesisAlloc === 'object') {
        ret.genesisAlloc = rewards.genesisAlloc;
      }

      // estimate uncleRewards
      var uncleRewards = [];
      if (typeof rewards.estimateUncle === 'boolean' && rewards.estimateUncle && blocks.length > 0) {
        // aggregate uncle blocks (slow)
        blocks.forEach(function(block) {
          Block.aggregate([
            { $match: { number: { $gte: block.start, $lt: block.end } } },
            { $group: { _id: null, uncles: { $sum: { $size: "$uncles" } } } }
          ]).exec(function(err, results) {
            if (err) {
              console.log(err);
            }
            if (results && results[0] && results[0].uncles) {
              // estimate Uncle Rewards
              var reward = block.reward.times(new BigNumber(results[0].uncles)).times(block.uncle);
              uncleRewards.push(reward);
            }
            if (uncleRewards.length === blocks.length) {
              var totalUncleRewards = new BigNumber(0);
              uncleRewards.forEach(function(reward) {
                totalUncleRewards = totalUncleRewards.plus(reward);
              });
              ret.uncleRewards = totalUncleRewards.div(1e+18);
              ret.totalSupply = totalSupply.plus(totalUncleRewards).div(1e+18);
              ret.circulatingSupply = circulatingSupply.plus(totalUncleRewards).div(1e+18);
              if (req.method === 'GET' && act) {
                res.write(ret[act].toString());
              } else {
                res.write(JSON.stringify(ret));
              }
              res.end();
            }
          });
        });
        return;
      } else if (typeof rewards.estimateUncle === 'number' && rewards.estimateUncle > 0) {
        // estimate Uncle rewards with uncle probability. (faster)
        blocks.forEach(function(block) {
          var blockcount = block.end - block.start;
          var reward = block.reward.times(new BigNumber(blockcount).times(rewards.estimateUncle)).times(block.uncle);
          uncleRewards.push(reward);
        });
        var totalUncleRewards = new BigNumber(0);
        uncleRewards.forEach(function(reward) {
          totalUncleRewards = totalUncleRewards.plus(reward);
        });
        ret.uncleRewards = totalUncleRewards.div(1e+18);
        ret.totalSupply = totalSupply.plus(totalUncleRewards).div(1e+18);
        ret.circulatingSupply = circulatingSupply.plus(totalUncleRewards).div(1e+18);
      }
      if (req.method === 'GET' && act) {
        res.write(ret[act].toString());
      } else {
        res.write(JSON.stringify(ret));
      }
      res.end();
    }
  });
};

var getTx = function(req, res){
  var tx = req.body.tx.toLowerCase();
  var txFind = Block.findOne( { "transactions.hash" : tx }, "transactions timestamp")
                  .lean(true);
  txFind.exec((err, doc) => {
    if (!doc) {
      console.log(`missing: ${tx}`);
      res.write(JSON.stringify({}));
      res.end();
    } else {
      // filter transactions
      const txDocs = filters.filterBlock(doc, 'hash', tx);
      res.write(JSON.stringify(txDocs));
      res.end();
    }
  });
};
/*
  Fetch data from DB
*/
var getData = function (req, res) {
  // TODO: error handling for invalid calls
  const action = req.body.action.toLowerCase();
  const { limit } = req.body;

  if (action in DATA_ACTIONS) {
    if (isNaN(limit)) var lim = MAX_ENTRIES;
    else var lim = parseInt(limit);
    DATA_ACTIONS[action](lim, res);
  } else {
    console.error(`Invalid Request: ${action}`);
    res.status(400).send();
  }
};

/*
  Total supply API code
*/
var getTotal = function (req, res) {
  Account.aggregate([
    { $group: { _id: null, totalSupply: { $sum: '$balance' } } },
  ]).exec((err, docs) => {
    if (err) {
      res.write('Error getting total supply');
      res.end();
    }
    res.write(docs[0].totalSupply.toString());
    res.end();
  });
};

/*
  temporary blockstats here
*/
const latestBlock = function (req, res) {
  const block = Block.findOne({}, 'totalDifficulty')
    .lean(true).sort('-number');
  block.exec((err, doc) => {
    res.write(JSON.stringify(doc));
    res.end();
  });
};

const getLatest = function (lim, res, callback) {
  const blockFind = Block.find({}, 'number transactions timestamp miner extraData')
    .lean(true).sort('-number').limit(lim);
  blockFind.exec((err, docs) => {
    callback(docs, res);
  });
};

/* get blocks from db */
const sendBlocks = function (lim, res) {
  const blockFind = Block.find({}, 'number timestamp miner extraData')
    .lean(true).sort('-number').limit(lim);
  blockFind.exec((err, docs) => {
    if (!err && docs) {
      const blockNumber = docs[docs.length - 1].number;
      // aggregate transaction counters
      Transaction.aggregate([
        { $match: { blockNumber: { $gte: blockNumber } } },
        { $group: { _id: '$blockNumber', count: { $sum: 1 } } },
      ]).exec((err, results) => {
        const txns = {};
        if (!err && results) {
          // set transaction counters
          results.forEach((txn) => {
            txns[txn._id] = txn.count;
          });
          docs.forEach((doc) => {
            doc.txn = txns[doc.number] || 0;
          });
        }
        res.write(JSON.stringify({ 'blocks': filters.filterBlocks(docs) }));
        res.end();
      });
    } else {
      console.log(`blockFind error:${err}`);
      res.write(JSON.stringify({ 'error': true }));
      res.end();
    }
  });
};

const sendTxs = function (lim, res) {
  Transaction.find({}).lean(true).sort('-blockNumber').limit(lim)
    .exec((err, txs) => {
      res.write(JSON.stringify({ 'txs': txs }));
      res.end();
    });
};

const MAX_ENTRIES = 10;

const DATA_ACTIONS = {
  'latest_blocks': sendBlocks,
  'latest_txs': sendTxs,
};
