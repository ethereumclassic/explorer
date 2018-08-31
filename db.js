var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var Block = new Schema(
{
    "number": {type: Number, index: {unique: true}},
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
    "blockTime": Number,
    "uncles": [String],
    "transactionCount" : Number
});

var Contract = new Schema(
{
    "address": {type: String, index: {unique: true}},
    "creationTransaction": String,
    "contractName": String,
    "compilerVersion": String,
    "optimization": Boolean,
    "sourceCode": String,
    "abi": String,
    "byteCode": String
}, {collection: "Contract"});

var Transaction = new Schema(
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

var BlockStat = new Schema(
{
    "number": {type: Number, index: {unique: true}},
    "timestamp": Number,
    "difficulty": String,
    "hashrate": String,
    "txCount": Number,
    "gasUsed": Number,
    "gasLimit": Number,
    "miner": String,
    "blockTime": Number,
    "uncleCount": Number
});

var Logs = new Schema(
  {
    "transactionHash" : {type: String, index: {unique: true}},
    "address" : String,
    "data" : String,
    "topics" : String,
    "logIndex" : Number,
    "blockHash" : String,
    "blockNumber" : Number
  }
);

var transactionReceipt = new Schema(
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
  }
)


// create indices
Transaction.index({blockNumber:-1});
Transaction.index({from:1, blockNumber:-1});
Transaction.index({to:1, blockNumber:-1});
Block.index({miner:1});

mongoose.model('BlockStat', BlockStat);
mongoose.model('Block', Block);
mongoose.model('Contract', Contract);
mongoose.model('Transaction', Transaction);
mongoose.model('Logs', Logs);
mongoose.model('transactionReceipt', transactionReceipt);

module.exports.BlockStat = mongoose.model('BlockStat');
module.exports.Block = mongoose.model('Block');
module.exports.Contract = mongoose.model('Contract');
module.exports.Transaction = mongoose.model('Transaction');
module.exports.Logs = mongoose.model('Logs');
module.exports.transactionReceipt = mongoose.model('transactionReceipt');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/blockDB');

// mongoose.set('debug', true);
