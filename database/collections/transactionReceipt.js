var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

module.exports = new Schema(
  {
    "status" : Boolean,
    "blockHash" : String,
    "blockNumber" : Number,
    "transactionHash" : {type: String, index: {unique: true}},
    "transactionIndex" : Number,
    "from" : String,
    "to" : String,
    "contractAddress" : String,
    "cumulativeGasUsed" : Number,
    "gasUsed" : Number,
    "logs" : String
  }, {collection: "TransactionReceipt"}
);
