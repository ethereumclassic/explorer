var BlockStat = require( '../db-stats.js' ).BlockStat;
var https = require('https');
var async = require('async');

var etherUnits = require(__lib + "etherUnits.js")

module.exports = function(req, res) {

  if (!("action" in req.body))
    res.status(400).send();
  
  else if (req.body.action=="miners") 
    getMinerStats(res)
  
  else if (req.body.action=="hashrate") 
    getHashrate(res);
  
  else if (req.body.action=="etceth") 
    getEtcEth(res);
  

}

/**
  Aggregate miner stats
**/
var getMinerStats = function(res) {
  BlockStat.aggregate([
      { $group: {
        _id: '$miner',  
        count: {$sum: 1} }
      }
  ], function (err, result) {
      if (err) {
        console.error(err);
        res.status(500).send();
      } else {
        res.write(JSON.stringify(result));
        res.end();
      }
  });
}

/**
  Calc difficulty, hashrate from recent blocks in DB
**/
var getHashrate = function(res) {
  var hashFind = BlockStat.find({}, "difficulty blockTime")
                            .lean(true).limit(64).sort('-number');
    
  // highest difficulty / avg blocktime
  hashFind.exec(function (err, docs) {
    var x = docs.reduce( function(hashR, doc) { 
                            return { "blockTime": hashR.blockTime + doc.blockTime, 
                                     "difficulty": Math.max(hashR.difficulty, doc.difficulty) }
                                 }, {"blockTime": 0, "difficulty": 0}); 
    var hashrate = x.difficulty / (1000*x.blockTime / docs.length);
    res.write(JSON.stringify({"hashrate": hashrate, "difficulty": x.difficulty}));
    res.end();
  });
}

/**
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
