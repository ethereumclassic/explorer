/*
  Tool for calculating block stats
*/

const _ = require('lodash');
const Web3 = require('web3');

const mongoose = require('mongoose');
const { BlockStat, TxStat, Transaction } = require('../db.js');

// load config.json
const config = { nodeAddr: 'localhost', wsPort: 8546, bulkSize: 100 };
try {
  var local = require('../config.json');
  _.extend(config, local);
  console.log('config.json found.');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    var local = require('../config.example.json');
    _.extend(config, local);
    console.log('No config file found. Using default configuration... (config.example.json)');
  } else {
    throw error;
    process.exit(1);
  }
}

console.log(`Connecting ${config.nodeAddr}:${config.wsPort}...`);
// Sets address for RPC WEB3 to connect to, usually your node IP address defaults ot localhost
const web3 = new Web3(new Web3.providers.WebsocketProvider(`ws://${config.nodeAddr}:${config.wsPort.toString()}`));
if ('quiet' in config && config.quiet === true) {
  console.log('Quiet mode enabled');
}

const updateStats = async (range, interval, rescan) => {
  let latestBlock = await web3.eth.getBlockNumber();

  interval = Math.abs(parseInt(interval));
  if (!range) {
    range = 1000;
  }
  range *= interval;
  if (interval >= 10) {
    latestBlock -= latestBlock % interval;
  }
  getStats(web3, latestBlock, null, latestBlock - range, interval, rescan);
};

var getStats = function (web3, blockNumber, nextBlock, endNumber, interval, rescan) {
  if (endNumber < 0) endNumber = 0;
  if (blockNumber <= endNumber) {
    if (rescan) {
      process.exit(9);
    }
    return;
  }

  if (web3.eth.net.isListening()) {

    web3.eth.getBlock(blockNumber, true, (error, blockData) => {
      if (error) {
        console.log(`Warning: error on getting block with hash/number: ${
          blockNumber}: ${error}`);
      } else if (blockData == null) {
        console.log(`Warning: null block data received from the block with hash/number: ${
          blockNumber}`);
      } else {
        if (nextBlock) checkBlockDBExistsThenWrite(web3, blockData, nextBlock, endNumber, interval, rescan);
        else checkBlockDBExistsThenWrite(web3, blockData, null, endNumber, interval, rescan);
      }
    });
  } else {
    console.log(`${'Error: Aborted due to web3 is not connected when trying to ' +
            'get block '}${blockNumber}`);
    process.exit(9);
  }
};

/**
 * Aggregate transaction stats
 */
var updateTxStats = function(settings, days) {
    var txnDays = settings.stats && settings.stats.txnDays || 3;

    var defaultRange =  24*txnDays*60*60;
    // check validity of range
    var range = 24*days*60*60;
    if (range && range < 60 * 60 * 24 * 7) {
        if (range < 3600) { // minimal 1 hour
            range = 3600;
        }
    } else {
        range = defaultRange;
    }

    // select mod
    var rngs = [    60*60,    2*60*60,     4*60*60,     6*60*60,    12*60*60,
                 24*60*60, 7*24*60*60, 14*24*60*60, 30*24*60*60, 60*24*60*60
               ];
    var mods = [    30*60,      30*60,       60*60,       60*60,       60*60,
                    60*60,   24*60*60,    24*60*60,    24*60*60,    24*60*60,
                 24*60*60
               ];
    var i = 0;
    rngs.forEach(function(r) {
        if (range > r) {
            i++;
        }
        return;
    });
    var mod = mods[i];

    var timebefore = parseInt((new Date()).getTime() / 1000) - range;
    timebefore -= timebefore % mod;
    Transaction.aggregate([{
        $match: {
            timestamp: {
                $gte: timebefore
            }
        }
    }, {
        $group: {
            _id: {
                timestamp: {
                    $subtract: [ '$timestamp', { $mod: [ '$timestamp', mod ] } ]
                }
            },
            timestamp: { $min: '$timestamp' },
            txns: { $sum: 1 }
        }
    }, {
        $project: {
            "_id": 0,
            "timestamp": 1,
            "txns": 1
        }
    }]).sort('timestamp').exec(function(err, results) {
        if (err || !results) {
            console.error(err);
        } else {
            results.forEach(function(result) {
                var txstat = {
                    "timestamp": result.timestamp,
                    "txns": result.txns
                }
                console.log(' - txstat ' + result.timestamp + ' / txns = ' + result.txns);
                TxStat.collection.update({ timestamp: result.timestamp }, { $set: txstat }, { upsert: true });
            });
        }
    });
}

/**
  * Checks if the a record exists for the block number 
  *     if record exists: abort
  *     if record DNE: write a file for the block
  */
var checkBlockDBExistsThenWrite = function (web3, blockData, nextBlock, endNumber, interval, rescan) {
  BlockStat.find({ number: blockData.number }, (err, b) => {
    if (!b.length && nextBlock) {
      // calc hashrate, txCount, blocktime, uncleCount
      const stat = {
        'number': blockData.number,
        'timestamp': blockData.timestamp,
        'difficulty': blockData.difficulty,
        'txCount': blockData.transactions.length,
        'gasUsed': blockData.gasUsed,
        'gasLimit': blockData.gasLimit,
        'miner': blockData.miner,
        'blockTime': (nextBlock.timestamp - blockData.timestamp) / (nextBlock.number - blockData.number),
        'uncleCount': blockData.uncles.length,
      };
      new BlockStat(stat).save((err, s, count) => {
        if (!('quiet' in config && config.quiet === true)) {
          console.log(s);
        }
        if (typeof err !== 'undefined' && err) {
          console.log(`${'Error: Aborted due to error on ' + 'block number '}${blockData.number.toString()}: ${
            err}`);
          process.exit(9);
        } else {
          if (!('quiet' in config && config.quiet === true)) {
            console.log(`DB successfully written for block number ${blockData.number.toString()}`);
          }
          getStats(web3, blockData.number - interval, blockData, endNumber, interval, rescan);
        }
      });
    } else {
      if (rescan || !nextBlock) {
        getStats(web3, blockData.number - interval, blockData, endNumber, interval, rescan);
        if (nextBlock) {
          if (!('quiet' in config && config.quiet === true)) {
            console.log(`WARN: block number: ${blockData.number.toString()} already exists in DB.`);
          }
        }
      } else {
        if (!('quiet' in config && config.quiet === true)) {
          console.error(`Aborting because block number: ${blockData.number.toString()} already exists in DB.`);
        }

      }
    }

  });
};

const minutes = 1;
statInterval = minutes * 60 * 1000;

let rescan = false; /* rescan: true - rescan range */
let range = 1000;
let interval = 100;

/**
 * RESCAN=1000:100000 means interval;range
 *
 * Usage:
 *   RESCAN=1000:100000 node tools/stats.js
 */
if (process.env.RESCAN) {
  const tmp = process.env.RESCAN.split(/:/);
  if (tmp.length > 1) {
    interval = Math.abs(parseInt(tmp[0]));
    if (tmp[1]) {
      range = Math.abs(parseInt(tmp[1]));
    }
  }
  let i = interval;
  var j = 0;
  for (var j = 0; i >= 10; j++) {
    i = parseInt(i / 10);
  }
  interval = Math.pow(10, j);
  console.log(`Selected interval = ${interval}`);

  rescan = true;
}

// tx stats
var notxstats = false;
// tx days: aggregate range
var txndays = 14; /* 14 days */
// interval
var txStatInterval = 10 * 60 * 1000;

/**
 * Usage:
 *  - to execute updateTxStats() only once.
 *   NOTXSTATS=1 tools/stats.js
 */
if (process.env.NOTXSTATS) {
    notxstats = true;
}

if (process.env.TXNDAYS) {
    txndays = Number(process.env.TXNDAYS);
    if (txndays < 1) {
        txndays = 1;
    }
}

// run
updateStats(range, interval, rescan);

if (!rescan) {
  setInterval(() => {
    updateStats(range, interval);
  }, statInterval);
}

// update TxStats
updateTxStats(config.settings, txndays);

if (!notxstats) {
    setInterval(function() {
        updateTxStats(config.settings, txndays);
    }, txStatInterval);
}
