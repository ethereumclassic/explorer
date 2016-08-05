var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );
var filters = require('./filters')

exports.addr = function(req, res){
  // TODO: validate addr and tx
  var addr = req.body.addr.toLowerCase();

  // txin = true: inbound tx
  if (req.body.txin) 
    var txQuery = "to";
  else
    var txQuery = "from";

  var findQuery = "transactions." + txQuery;
  var addrFind = Block.find( { $or: [{"transactions.to": addr}, {"transactions.from": addr}] },
                            "transactions timestamp")
  addrFind.exec(function (err, docs) {
    if (!docs.length){
      res.write(JSON.stringify([]));
      res.end();
    } else {
      // filter transactions
      var txDocs = filters.filterTX(docs, addr);
      res.write(JSON.stringify(filters.datatableTX(txDocs)));
      res.end();
    }
  });

};
 


exports.block = function(req, res) {

  // TODO: support queries for block hash
  var txQuery = "number";
  var number = parseInt(req.body.block);

  var blockFind = Block.findOne( { number : number });
  blockFind.exec(function (err, doc) {
    console.log(doc)
    console.log(err)
    if (!doc._id){
      res.write(JSON.stringify({}));
      res.end();
    } else {
      res.write(JSON.stringify(doc));
      res.end();
    }
  });

};

exports.tx = function(req, res){

  var tx = req.body.tx.toLowerCase();

  var txFind = Block.findOne( { "transactions.hash" : tx });
  txFind.exec(function (err, doc) {
    console.log(doc)
    if (!doc._id){
      res.write(JSON.stringify({}));
      res.end();
    } else {
      // filter transactions
      var txDocs = filters.filterBlock(doc, "hash", tx)
      res.write(JSON.stringify(txDocs));
      res.end();
    }
  });

};

/*
  Fetch data from DB
*/
exports.data = function(req, res){

  // TODO: error handling for invalid calls
  var action = req.body.action.toLowerCase();
  var limit = req.body.limit

  if (action in DATA_ACTIONS) {
    if (isNaN(limit))
      var lim = MAX_ENTRIES;
    else
      var lim = parseInt(limit);
    
    getLatest(lim, res, DATA_ACTIONS[action]);

  } else {
  
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }

};


var getLatest = function(lim, res, callback) {
  var blockFind = Block.find().sort('-number').limit(lim);
  blockFind.exec(function (err, docs) {
    callback(docs, res);
  });
}

/* get blocks from db */
var sendBlocks = function(data, res) {
  res.write(JSON.stringify({"blocks": data}));
  res.end();
}

var sendTxs = function(data, res) {
  var txs = extractTX(data);
  res.write(JSON.stringify({"txs": txs}));
  res.end();
}

const MAX_ENTRIES = 13;

const DATA_ACTIONS = {
  "latest_blocks": sendBlocks,
  "latest_txs": sendTxs
}

