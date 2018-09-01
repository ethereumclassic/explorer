var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

module.exports = new Schema(
{
    "hash": {type: String, index: {unique: true}},
    "nonce": Number,
    "blockHash": String,
    "blockNumber": Number,
    "transactionIndex": Number,
    "from": String,
    "to": String,
    "value": String,
    "gas": Number,
    "gasPrice": String,
    "timestamp": Number,
    "input": String
}, {collection: "Transaction"});
