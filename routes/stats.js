var BlockStat = require( '../db-stats.js' ).BlockStat;

var etherUnits = require(__lib + "etherUnits.js")

module.exports = function(req, res) {
  if (!("action" in req.body))
    res.status(400).send();
  else if (req.body.action=="miners") {
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
  } else if (req.body.action=="hashrate") {
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
}

