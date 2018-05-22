var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );
var BlockStat = mongoose.model( 'BlockStat' );
var filters = require('./filters');

var https = require('https');
var async = require('async');

var etherUnits = require(__lib + "etherUnits.js")

var config = {};
try {
  config = require('../config.json');
} catch(e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('No config file found. Using default configuration... (tools/config.json)');
    config = require('../tools/config.json');
  } else {
    throw e;
    process.exit(1);
  }
}

module.exports = function(req, res) {

  if (!("action" in req.body))
    res.status(400).send();
  
  else if (req.body.action=="miners") 
    getMinerStats(req, res)
  
  else if (req.body.action=="hashrate") 
    getHashrate(res);

  else if (req.body.action=="hashrates")
    getHashrates(req, res);
  
}
/**
  Aggregate miner stats
**/
var getMinerStats = function(req, res) {
  var range =  6*60*60; // 6 hours
  // check validity of range
  if (req.body.range && req.body.range < 60 * 60 * 24 * 7) {
    range = parseInt(req.body.range);
    if (range < 1800) { // minimal 30 minutes
      range = 1800;
    }
  }

  var timebefore = parseInt((new Date())/1000) - range;
  Block.find({ timestamp: { $lte: timebefore } }, "timestamp number")
    .lean(true).sort('-number').limit(1).exec(function (err, docs) {
    if (err || !docs) {
      console.error(err);
      res.status(500).send();
      res.end();
      return;
    }
    var blockNumber = docs[0].number;
    console.log('getMinerStats(): blockNumber = ' + blockNumber);
    Block.aggregate([
        { $match: { number: { $gte: blockNumber } } },
        { $group: {
          _id: '$miner',
          timestamp: {$min: '$timestamp' },
          count: {$sum: 1} }
        }
    ], function (err, result) {
        if (err) {
          console.error(err);
          res.status(500).send();
        } else {
          if (config.settings.miners) {
            result.forEach(function(m) {
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
}

/**
  Aggregate network hashrates
**/
var getHashrates = function(req, res) {
  // setup default range
  //var range =      7 * 24 * 60 * 60; /* 7 days */
  //var range =     14 * 24 * 60 * 60; /* 14 days */
  //var range =     30 * 24 * 60 * 60; /* 1 months */
  //var range = 2 * 30 * 24 * 60 * 60; /* 2 months */
  var range = 6 * 30 * 24 * 60 * 60; /* 6 months */
  if (req.body.days && req.body.days <= 365) {
    var days = parseInt(req.body.days);
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
  var rngs = [    30*60,    60*60,    2*60*60,     4*60*60,     6*60*60,
               12*60*60, 24*60*60, 7*24*60*60, 14*24*60*60, 30*24*60*60
             ];
  var mods = [        1,        1,          2,          10,          10,
                     15,       30,      15*60,       30*60,       30*60,
                  60*60
             ];
  var i = 0;
  rngs.forEach(function(r) {
    if (range > r) {
      i++;
    }
    return;
  });
  var mod = mods[i];

  var timestamp = parseInt((new Date())/1000) - range;

  BlockStat.aggregate([
    { $match: { timestamp: { $gte: timestamp } } },
    { $group: {
      _id: {
          timestamp: {
            $subtract: [ '$timestamp', { $mod: [ '$timestamp', mod ] } ]
          }
      },
      blockTime: { $avg: '$blockTime' },
      difficulty: { $max: '$difficulty' },
      count: { $sum: 1 }
    }},
    { $project: {
        "_id": 0,
        "timestamp": '$_id.timestamp',
        "blockTime": 1,
        "difficulty": 1,
        "count": 1,
    }
  }]).sort('timestamp').exec(function(err, docs) {
    var hashrates = [];
    docs.forEach(function(doc) {
      doc.instantHashrate = doc.difficulty / doc.blockTime;
      doc.unixtime = doc.timestamp; /* FIXME */
      doc.timestamp = doc.timestamp;
    });
    res.write(JSON.stringify({"hashrates": docs}));
    res.end();
  });
}

/**
  Get hashrate Diff stuff
**/
var getHashrate = function(res) {
  var blockFind = Block.find({}, "difficulty timestamp number")
                      .lean(true).sort('-number').limit(100);
  blockFind.exec(function (err, docs) {
  var blockTime = (docs[0].timestamp - docs[99].timestamp)/100;
  var hashrate = docs[0].difficulty / blockTime;
    res.write(JSON.stringify({
        "blocks": docs,
        "hashrate": hashrate,
        "blockTime": blockTime,
        "blockHeight": docs[0].number,
        "difficulty": docs[0].difficulty
    }));
    res.end();
  });
}
/**
  OLD CODE DON'T USE
  Swipe ETC ETH data
**/
var getEtcEth = function(res) {
  var options = [{
    host: 'api.minergate.com',
    path: '/1.0/etc/status',
    method: 'GET',
    data: 'etc'
  },{
    host: 'api.minergate.com',
    path: '/1.0/eth/status',
    method: 'GET',
    data: 'eth'
  }];
  
  async.map(options, function(opt, callback) {
    
    https.request(opt, function(mg) {
      mg.on('data', function (data) {
        try {
          var result = JSON.parse(data.toString());
          result.chain = opt.data;
          callback(null, result);
        } catch (e) {
          callback(e);
        }
      })
    }).end();
  }, function(err, results) {
    if (err) {
      console.error(err);
      res.status(500).send();
    } else {
      if (results.length < 2)
        res.status(500).send();
      else {
        var c = ((results[0].chain == "etc") ? 0 : 1);
        var h = 1 - c;
        var etcHashrate = parseInt(results[c].instantHashrate);
        var ethHashrate = parseInt(results[h].instantHashrate);
        var etcDiff = results[c].difficulty.toFixed(2);
        var ethDiff = results[h].difficulty.toFixed(2);
        var etcEthHash = parseInt(100*etcHashrate/ethHashrate);
        var etcEthDiff = parseInt(100*etcDiff/ethDiff);
        res.write(JSON.stringify({
          "etcHashrate": etcHashrate,
          "ethHashrate": ethHashrate,
          "etcDiff": etcDiff,
          "ethDiff": ethDiff,
          "etcEthHash": etcEthHash,
          "etcEthDiff": etcEthDiff
        }));
        res.end();
      } 
    }

  });
}
