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
}, { capped: { size: 512000, max: 1000}});


mongoose.model('BlockStat', BlockStat);
module.exports.BlockStat = mongoose.model('BlockStat');
