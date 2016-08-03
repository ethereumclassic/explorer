var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var Block = new Schema(
{
    "number": Number,
    "hash": String,
    "parentHash": String,
    "nonce": String,
    "sha3Uncles": String,
    "logsBloom": String,
    "transactionsRoot": String,
    "stateRoot": String,
    "receiptRoot": String,
    "miner": String,
    "difficulty": String,
    "totalDifficulty": String,
    "size": Number,
    "extraData": String,
    "gasLimit": Number,
    "gasUsed": Number,
    "timestamp": Number,
    "transactions": [
        {
            "hash": String,
            "nonce": Number,
            "blockHash": String,
            "blockNumber": Number,
            "transactionIndex": Number,
            "from": String,
            "to": String,
            "value": String,
            "gas": Number,
            "gasPrice": String,
            "input": String
        }
    ],
    "uncles": [String]
});

var blockDB = mongoose.model('Block', Block);
module.exports.Block = mongoose.model('Block');

mongoose.connect( 'mongodb://localhost/blockDB' );