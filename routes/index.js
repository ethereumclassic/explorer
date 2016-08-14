var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );
var filters = require('./filters')

//var Memcached = require('memcached');
//var memcached = new Memcached("localhost:11211");

module.exports = function(app){
  if (app.get('env') === 'development') 
    var web3relay = require('./web3dummy');
  else
    var web3relay = require('./web3relay');

  var DAO = require('./dao');


  var compile = require('./compiler');
  var fiat = require('./fiat');

  /* 
    Local DB: data request format
    { "address": "0x1234blah", "txin": true } 
    { "tx": "0x1234blah" }
    { "block": "1234" }
  */
  app.post('/addr', getAddr);
  app.post('/tx', getTx);
  app.post('/block', getBlock);
  app.post('/data', getData);

  app.post('/daorelay', DAO);
  app.post('/web3relay', web3relay.data);
  app.post('/fiat', fiat);
  app.post('/compile', compile);

}

var getAddr = function(req, res){
  // TODO: validate addr and tx
  var addr = req.body.addr.toLowerCase();

  // txin = true: inbound tx
  if (req.body.txin) 
    var txQuery = "to";
  else
    var txQuery = "from";

  var findQuery = "transactions." + txQuery;
  var addrFind = Block.find( { $or: [{"transactions.to": addr}, {"transactions.from": addr}] },
                            "transactions timestamp").lean(true).sort('-number').limit(MAX_ENTRIES);
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
 


var getBlock = function(req, res) {

  // TODO: support queries for block hash
  var txQuery = "number";
  var number = parseInt(req.body.block);

  var blockFind = Block.findOne( { number : number }).lean(true);
  blockFind.exec(function (err, doc) {
    if (err || !doc) {
      console.error("BlockFind error: " + err)
      console.error(req.body);
      res.write(JSON.stringify({"error": true}));
    } else {
      var block = filters.filterBlocks([doc]);
      res.write(JSON.stringify(block[0]));
    }
    res.end();
  });

};

var getTx = function(req, res){

  var tx = req.body.tx.toLowerCase();

  var txFind = Block.findOne( { "transactions.hash" : tx }, "transactions timestamp")
                  .lean(true);
  txFind.exec(function (err, doc) {
    if (!doc){
      console.log("missing: " +tx)
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
var getData = function(req, res){

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

/* 
  temporary blockstats here
*/
var latestBlock = function(req, res) {
  var block = Block.findOne({}, "totalDifficulty")
                      .lean(true).sort('-number');
  block.exec(function (err, doc) {
    res.write(JSON.stringify(doc));
    res.end();
  });
} 


var getLatest = function(lim, res, callback) {
  var blockFind = Block.find({}, "number transactions timestamp miner extraData")
                      .lean(true).sort('-number').limit(lim);
  blockFind.exec(function (err, docs) {
    callback(docs, res);
  });
}

/* get blocks from db */
var sendBlocks = function(data, res) {
  res.write(JSON.stringify({"blocks": filters.filterBlocks(data)}));
  res.end();
}

var sendTxs = function(data, res) {
  var txs = filters.extractTX(data);
  res.write(JSON.stringify({"txs": txs}));
  res.end();
}

const MAX_ENTRIES = 10;

const DATA_ACTIONS = {
  "latest_blocks": sendBlocks,
  "latest_txs": sendTxs
}

