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
      "balance": Number
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
    "transactionHash":String, // parent transaction
    "blockNumber":Number,
    "blockHash":String
});

mongoose.model('InternalTransaction', InternalTransaction);
module.exports.InternalTransaction = mongoose.model('InternalTransaction');

mongoose.connect( 'mongodb://localhost/blockDB' );
mongoose.set('debug', true);