/*
  Stuff to deal with verified contracts in DB 
*/

require( '../db.js' );
var mongoose = require( 'mongoose' );
var Contract     = mongoose.model( 'Contract' );

exports.addContract = function(contract) {
  Contract.update(
    {address: contract.address}, 
    {$setOnInsert: contract}, 
    {upsert: true}, 
    function (err, data) {
      console.log(data);
    }
  );
}

exports.findContract = function(address, res) {
  var contractFind = Contract.findOne({ address : address}).lean(true);
  contractFind.exec(function(err, doc) {
    if (err) {
      console.error("ContractFind error: " + err);
      console.error("bad address: " + address);
      res.write(JSON.stringify({"error": true, "valid": false}));
    } else if (!doc) {
      res.write(JSON.stringify({"valid": false}));
    } else {
      var data = doc;
      data.valid = true;
      res.write(JSON.stringify(data));
    }
    res.end();
  })
}