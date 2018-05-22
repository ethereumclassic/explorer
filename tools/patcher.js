require( '../db.js' );
var etherUnits = require("../lib/etherUnits.js");
var BigNumber = require('bignumber.js');

var fs = require('fs');

var Web3 = require('web3');

var mongoose        = require( 'mongoose' );
var Block           = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );

var grabBlock = function(config, web3, blockHashOrNumber) {
    var desiredBlockHashOrNumber;
    // check if done
    if(blockHashOrNumber == undefined) {
        return;
    }
    desiredBlockHashOrNumber = blockHashOrNumber;
    if(web3.isConnected()) {
        web3.eth.getBlock(desiredBlockHashOrNumber, true, function(error, blockData) {
            if(error) {
                console.log('Warning: error on getting block with hash/number: ' +
                    desiredBlockHashOrNumber + ': ' + error);
            }
            else if(blockData == null) {
                console.log('Warning: null block data received from the block with hash/number: ' +
                    desiredBlockHashOrNumber);
            }
            else {
                checkBlockDBExistsThenWrite(config, blockData);
            }
        });
    }
    else {
        console.log('Error: Aborted due to web3 is not connected when trying to ' +
            'get block ' + desiredBlockHashOrNumber);
        process.exit(9);
    }
}
var writeBlockToDB = function(config, blockData) {
    return new Block(blockData).save( function( err, block, count ){
        if ( typeof err !== 'undefined' && err ) {
            if (err.code == 11000) {
                console.log('Skip: Duplicate DB on #' + blockData.number.toString());
            } else {
               console.log('Error: Aborted due to error on ' +
                    'block number ' + blockData.number.toString() + ': ' +
                    err);
               process.exit(9);
           }
        } else {
            if(!('quiet' in config && config.quiet === true)) {
                console.log('DB successfully written for block #' +
                    blockData.number.toString() );
            }
        }
      });
}

/**
  * Checks if the a record exists for the block number then ->
  *     if record exists: abort
  *     if record DNE: write a file for the block
  */
var checkBlockDBExistsThenWrite = function(config, blockData) {
    Block.find({number: blockData.number}, function (err, b) {
        if (!b.length) {
            writeBlockToDB(config, blockData);
            writeTransactionsToDB(config, blockData);
        } else {
            console.log('Block #' + blockData.number.toString() + ' already exists in DB.');
        }

    })
}

/**
    Break transactions out of blocks and write to DB
**/
var writeTransactionsToDB = function(config, blockData) {
    var bulkOps = [];
    if (blockData.transactions.length > 0) {
        for (d in blockData.transactions) {
            var txData = blockData.transactions[d];
            txData.timestamp = blockData.timestamp;
            txData.value = etherUnits.toEther(new BigNumber(txData.value), 'wei');
            bulkOps.push(txData);
        }
        Transaction.collection.insert(bulkOps, function( err, tx ){
            if ( typeof err !== 'undefined' && err ) {
                if (err.code == 11000) {
                    console.log('Skip: Duplicate transaction on #' + blockData.number.toString());
                } else {
                   console.log('Error: Aborted due to error: ' +
                        err);
                   process.exit(9);
               }
            } else if(!('quiet' in config && config.quiet === true)) {
                console.log('DB successfully written for block ' +
                    blockData.transactions.length.toString() );

            }
        });
    }
}

/*
  Patch Missing Blocks
*/
var patchBlocks = function(config) {
    var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:' +
        config.gethPort.toString()));

    // number of blocks should equal difference in block numbers
    var firstBlock = 0;
    var lastBlock = web3.eth.blockNumber - 1;
    blockIter(web3, firstBlock, lastBlock, config);
}

var blockIter = function(web3, firstBlock, lastBlock, config) {
    // if consecutive, deal with it
    if (lastBlock < firstBlock)
        return;
    if (lastBlock - firstBlock === 1) {
        [lastBlock, firstBlock].forEach(function(blockNumber) {
            Block.find({number: blockNumber}, function (err, b) {
                if (!b.length)
                    grabBlock(config, web3, blockNumber);
            });
        });
    } else if (lastBlock === firstBlock) {
        Block.find({number: firstBlock}, function (err, b) {
            if (!b.length)
                grabBlock(config, web3, firstBlock);
        });
    } else {
        Block.count({number: {$gte: firstBlock, $lte: lastBlock}}, function(err, c) {
          var expectedBlocks = lastBlock - firstBlock + 1;
          console.log(" - expectedBlocks = " + expectedBlocks + ", real counting = " + c);
          if (c === 0) {
            console.log("INFO: No blocks found.")
          } else if (expectedBlocks > c) {
            console.log("* " + JSON.stringify(expectedBlocks - c) + " missing blocks found, between #" + firstBlock + " and #" + lastBlock);
            var midBlock = firstBlock + parseInt((lastBlock - firstBlock)/2);
            blockIter(web3, firstBlock, midBlock, config);
            blockIter(web3, midBlock + 1, lastBlock, config);
          } else
            return;
        })
    }
}

var config = {};

try {
    var configContents = fs.readFileSync('config.json');
    config = JSON.parse(configContents);
}
catch (error) {
    if (error.code === 'ENOENT') {
        console.log('No config file found. Using default configuration (will ' +
            'download all blocks starting from latest)');
    }
    else {
        throw error;
        process.exit(1);
    }
}
// set the default geth port if it's not provided
if (!('gethPort' in config) || (typeof config.gethPort) !== 'number') {
    config.gethPort = 8545; // default
}

// set the default output directory if it's not provided
if (!('output' in config) || (typeof config.output) !== 'string') {
    config.output = '.'; // default this directory
}

console.log('Connecting ' + config.nodeAddr + ':' + config.gethPort + '...');

patchBlocks(config);
