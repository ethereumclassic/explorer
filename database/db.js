var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

// Colllections
var Block              = require('./collections/Block.js');
var Contract           = require('./collections/Contract');
var Transaction        = require('./collections/Transaction.js');
var BlockStat          = require('./collections/BlockStat');
var Logs               = require('./collections/Logs.js');
var transactionReceipt = require('./collections/transactionReceipt.js');


// create indices
Transaction.index({blockNumber:-1});
Transaction.index({from:1, blockNumber:-1});
Transaction.index({to:1, blockNumber:-1});
Block.index({miner:1});

//models
mongoose.model('BlockStat', BlockStat);
mongoose.model('Block', Block);
mongoose.model('Contract', Contract);
mongoose.model('Transaction', Transaction);
mongoose.model('Logs', Logs);
mongoose.model('transactionReceipt', transactionReceipt);

//exports
module.exports.BlockStat = mongoose.model('BlockStat');
module.exports.Block = mongoose.model('Block');
module.exports.Contract = mongoose.model('Contract');
module.exports.Transaction = mongoose.model('Transaction');
module.exports.Logs = mongoose.model('Logs');
module.exports.transactionReceipt = mongoose.model('transactionReceipt');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/blockDB');

// mongoose.set('debug', true);
