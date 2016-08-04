var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );

exports.addr = function(req, res){
  // TODO: validate addr and tx
  var addr = req.body.addr.toLowerCase();

  // txin = true: inbound tx
  if (req.body.txin) 
    var txQuery = "to";
  else
    var txQuery = "from";

  var findQuery = "transactions." + txQuery;
  var addrFind = Block.find( { $or: [{"transactions.to": addr}, {"transactions.from": addr}] })
                      .select("transactions");
  addrFind.exec(function (err, docs) {
    if (!docs.length){
      res.write(JSON.stringify([]));
      res.end();
    } else {
      // filter transactions
      var txDocs = filterTX(docs, txQuery, addr);
      res.write(JSON.stringify(txDocs));
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
      var txDocs = filterTX([doc], "hash", tx)
      res.write(JSON.stringify(txDocs));
      res.end();
    }
  });

};

exports.test = function(req, res) {

  Block.find( function (err, docs) {
    res.write(JSON.stringify(docs));
        res.end();
  }).limit(10);

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
  var blockTX = txs.map(function(block) {
    return block.transactions.filter(function(obj) {
      return obj[field]==value;   
    });
  });
  return [].concat.apply([], blockTX);
}
