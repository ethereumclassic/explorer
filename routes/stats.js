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

  }
}

