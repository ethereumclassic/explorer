var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

module.exports = new Schema(
  {
    "transactionHash" : {type: String, index: {unique: true}},
    "address" : String,
    "data" : String,
    "topics" : String,
    "logIndex" : Number,
    "blockHash" : String,
    "blockNumber" : Number
  }, {collection: "Logs"}
);
