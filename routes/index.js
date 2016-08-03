var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );

exports.addr = function(req, res){
  
  // TODO: validate addr and tx
  var addr = req.body.addr;

  // txin = true: inbound tx
  if (req.body.txin) 
    var txQuery = "to";
  else
    var txQuery = "from";

  var findQuery = "transactions." + txQuery;
  var addrFind = Block.find( { findQuery : addr } ).select("transactions");
  addrFind.exec(function (err, docs) {
    if (!docs.length){
      res.write(JSON.stringify([]));
      res.end();
    } else {
      // filter transactions
      var txDocs = filterTX(docs, txQuery, addr);
      res.write(JSON.stringify(docs));
      res.end();
    }
  });

};
 


exports.block = function(req, res) {

  // TODO: support queries for block hash
  var txQuery = "number";
  var number = parseInt(req.body.block);

  var blockFind = Block.find( { number : number });
  blockFind.exec(function (err, doc) {

    if (!doc.length){
      res.write(JSON.stringify({}));
      res.end();
    } else {
      res.write(JSON.stringify(doc));
      res.end();
    }
  });

};

exports.tx = function(req, res){

  var txFind = Block.findOne( { "transactions.hash" : req.body.tx });
  txFind.exec(function (err, docs) {
    if (!docs.length){
      res.write(JSON.stringify([]));
      res.end();
    } else {
      // filter transactions
      var txDocs = filterTX(docs, "hash", req.body.tx)
      res.write(JSON.stringify(txDocs));
      res.end();
    }
  });

};

exports.test = function(req, res) {

  Block.find( function (err, docs) {
    res.write(JSON.stringify(docs));
        res.end();
  });

};


function sum( obj ) {
  var sum = 0;
  for( var el in obj ) {
      sum += parseFloat( obj[el].count );
  }
  return sum;
}

/*
  Filter an array of TX 
*/
function filterTX(txs, field, value) {
  return txs.filter( function(obj) {
    return obj[field]==value; 
  });
}
