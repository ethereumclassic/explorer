/******
  DEPRECATED -- DO NOT USE
*******/
var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var InternalTransaction = new Schema(
{
    "type": String,
    "action": {
      "from": String,  // for call
      "to": String,
      "value": String,
      "gas": Number,
      "input":String,
      "callType":String,
      "init": String, // for create
      "address": String, // for suicide
      "refundAddress": String,
      "balance": String
    },
    "result": {
      "gasUsed":Number,
      "output":String,
      "code": String,
      "address": String
    },
    "error": String,
    "traceAddress":[String],
    "subtraces":Number,
    "transactionPosition":Number,
    "transactionHash": {type: String, index: {unique: false}}, // parent transaction
    "blockNumber":{type: Number, index: {unique: false}},
    "timestamp": Number,
    "blockHash":String
});

mongoose.model('InternalTransaction', InternalTransaction);
module.exports.InternalTransaction = mongoose.model('InternalTransaction');