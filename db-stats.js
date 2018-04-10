var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

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

mongoose.model('BlockStat', BlockStat);
module.exports.BlockStat = mongoose.model('BlockStat');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/blockDB');
mongoose.set('debug', true);