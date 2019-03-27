const mongoose = require('mongoose');

const Block = mongoose.model('Block');
const BlockStat = mongoose.model('BlockStat');

const https = require('https');
const async = require('async');
const filters = require('./filters');

const etherUnits = require(`${__lib}etherUnits.js`);

let config = {};
try {
  config = require('../config.json');
} catch (e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('No config file found. Using default configuration... (config.example.json)');
    config = require('../config.example.json');
  } else {
    throw e;
    process.exit(1);
  }
}

module.exports = function (req, res) {

  if (!('action' in req.body)) res.status(400).send();

  else if (req.body.action == 'miners') { getMinerStats(req, res); } else if (req.body.action == 'hashrate') { getHashrate(res); } else if (req.body.action == 'hashrates') getHashrates(req, res);

};
/**
  Aggregate miner stats
**/
var getMinerStats = function (req, res) {
  let range = 6 * 60 * 60; // 6 hours
  // check validity of range
  if (req.body.range && req.body.range < 60 * 60 * 24 * 7) {
    range = parseInt(req.body.range);
    if (range < 1800) { // minimal 30 minutes
      range = 1800;
    }
  }

  const timebefore = parseInt((new Date()) / 1000) - range;
  Block.find({ timestamp: { $lte: timebefore } }, 'timestamp number')
    .lean(true).sort('-number').limit(1)
    .exec((err, docs) => {
      if (err || !docs) {
        console.error(err);
        res.status(500).send();
        res.end();
        return;
      }
      const blockNumber = docs[0].number;
      console.log(`getMinerStats(): blockNumber = ${blockNumber}`);
      Block.aggregate([
        { $match: { number: { $gte: blockNumber } } },
        {
          $group: {
            _id: '$miner',
            timestamp: { $min: '$timestamp' },
            count: { $sum: 1 },
          },
        },
      ], (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send();
        } else {
          if (config.settings.miners) {
            result.forEach((m) => {
              if (config.settings.miners[m._id]) {
                m._id = config.settings.miners[m._id];
              }
            });
          }
          res.write(JSON.stringify(result));
          res.end();
        }
      });
    });
};

/**
  Aggregate network hashrates
**/
var getHashrates = function (req, res) {
  // setup default range
  //var range =      7 * 24 * 60 * 60; /* 7 days */
  //var range =     14 * 24 * 60 * 60; /* 14 days */
  //var range =     30 * 24 * 60 * 60; /* 1 months */
  //var range = 2 * 30 * 24 * 60 * 60; /* 2 months */
  let range = 6 * 30 * 24 * 60 * 60; /* 6 months */
  if (req.body.days && req.body.days <= 365) {
    let days = parseInt(req.body.days);
    if (days <= 1) {
      days = 1;
    }
    range = days * 60 * 60 * 24;
  } else if (req.body.range && req.body.range < 31536000 /* 60 * 60 * 24 * 365 */) {
    range = parseInt(req.body.range);
    if (range < 30 * 60) {
      range = 30 * 60; /* minimal range */
    }
  }

  // select mod
  const rngs = [30 * 60, 60 * 60, 2 * 60 * 60, 4 * 60 * 60, 6 * 60 * 60,
    12 * 60 * 60, 24 * 60 * 60, 7 * 24 * 60 * 60, 14 * 24 * 60 * 60, 30 * 24 * 60 * 60,
  ];
  const mods = [1, 1, 2, 10, 10,
    15, 30, 15 * 60, 30 * 60, 30 * 60,
    60 * 60,
  ];
  let i = 0;
  rngs.forEach((r) => {
    if (range > r) {
      i++;
    }

  });
  const mod = mods[i];

  const timestamp = parseInt((new Date()) / 1000) - range;

  BlockStat.aggregate([
    { $match: { timestamp: { $gte: timestamp } } },
    {
      $group: {
        _id: {
          timestamp: {
            $subtract: ['$timestamp', { $mod: ['$timestamp', mod] }],
          },
        },
        blockTime: { $avg: '$blockTime' },
        difficulty: { $max: '$difficulty' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        '_id': 0,
        'timestamp': '$_id.timestamp',
        'blockTime': 1,
        'difficulty': 1,
        'count': 1,
      },
    }]).sort('timestamp').exec((err, docs) => {
    const hashrates = [];
    docs.forEach((doc) => {
      doc.instantHashrate = doc.difficulty / doc.blockTime;
      doc.unixtime = doc.timestamp; /* FIXME */
      doc.timestamp = doc.timestamp;
    });
    res.write(JSON.stringify({ 'hashrates': docs }));
    res.end();
  });
};

/**
  Get hashrate Diff stuff
**/
var getHashrate = function (res) {
  const blockFind = Block.find({}, 'difficulty timestamp number')
    .lean(true).sort('-number').limit(100);
  blockFind.exec((err, docs) => {
    const blockTime = (docs[0].timestamp - docs[99].timestamp) / 100;
    const hashrate = docs[0].difficulty / blockTime;
    res.write(JSON.stringify({
      'blocks': docs,
      'hashrate': hashrate,
      'blockTime': blockTime,
      'blockHeight': docs[0].number,
      'difficulty': docs[0].difficulty,
    }));
    res.end();
  });
};
/**
  OLD CODE DON'T USE
  Swipe ETC ETH data
**/
const getEtcEth = function (res) {
  const options = [{
    host: 'api.minergate.com',
    path: '/1.0/etc/status',
    method: 'GET',
    data: 'etc',
  }, {
    host: 'api.minergate.com',
    path: '/1.0/eth/status',
    method: 'GET',
    data: 'eth',
  }];

  async.map(options, (opt, callback) => {

    https.request(opt, (mg) => {
      mg.on('data', (data) => {
        try {
          const result = JSON.parse(data.toString());
          result.chain = opt.data;
          callback(null, result);
        } catch (e) {
          callback(e);
        }
      });
    }).end();
  }, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send();
    } else {
      if (results.length < 2) res.status(500).send();
      else {
        const c = ((results[0].chain == 'etc') ? 0 : 1);
        const h = 1 - c;
        const etcHashrate = parseInt(results[c].instantHashrate);
        const ethHashrate = parseInt(results[h].instantHashrate);
        const etcDiff = results[c].difficulty.toFixed(2);
        const ethDiff = results[h].difficulty.toFixed(2);
        const etcEthHash = parseInt(100 * etcHashrate / ethHashrate);
        const etcEthDiff = parseInt(100 * etcDiff / ethDiff);
        res.write(JSON.stringify({
          'etcHashrate': etcHashrate,
          'ethHashrate': ethHashrate,
          'etcDiff': etcDiff,
          'ethDiff': ethDiff,
          'etcEthHash': etcEthHash,
          'etcEthDiff': etcEthDiff,
        }));
        res.end();
      }
    }

  });
};
