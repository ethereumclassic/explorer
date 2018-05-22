/*
  Tool for calculating block stats
*/

var Web3 = require('web3');

var mongoose = require( 'mongoose' );
var BlockStat = require( '../db.js' ).BlockStat;

var updateStats = function(range, interval, rescan) {
    var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

    mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/blockDB');
    mongoose.set('debug', true);

    var latestBlock = web3.eth.blockNumber;

    interval = Math.abs(parseInt(interval));
    if (!range) {
        range = 1000;
    }
    range *= interval;
    if (interval >= 10) {
        latestBlock -= latestBlock % interval;
    }
    getStats(web3, latestBlock, null, latestBlock - range, interval, rescan);
}


var getStats = function(web3, blockNumber, nextBlock, endNumber, interval, rescan) {
    if (endNumber < 0)
        endNumber = 0;
    if (blockNumber <= endNumber) {
        if (rescan) {
            process.exit(9);
        }
        return;
    }

    if(web3.isConnected()) {

        web3.eth.getBlock(blockNumber, true, function(error, blockData) {
            if(error) {
                console.log('Warning: error on getting block with hash/number: ' +
                    blockNumber + ': ' + error);
            }
            else if(blockData == null) {
                console.log('Warning: null block data received from the block with hash/number: ' +
                    blockNumber);
            }
            else {
                if (nextBlock)
                    checkBlockDBExistsThenWrite(web3, blockData, nextBlock, endNumber, interval, rescan);
                else
                    checkBlockDBExistsThenWrite(web3, blockData, null, endNumber, interval, rescan);
            }
        });
    } else {
        console.log('Error: Aborted due to web3 is not connected when trying to ' +
            'get block ' + blockNumber);
        process.exit(9);
    }
}

/**
  * Checks if the a record exists for the block number 
  *     if record exists: abort
  *     if record DNE: write a file for the block
  */
var checkBlockDBExistsThenWrite = function(web3, blockData, nextBlock, endNumber, interval, rescan) {
    BlockStat.find({number: blockData.number}, function (err, b) {
        if (!b.length && nextBlock) {
            // calc hashrate, txCount, blocktime, uncleCount
            var stat = {
                "number": blockData.number,
                "timestamp": blockData.timestamp,
                "difficulty": blockData.difficulty,
                "txCount": blockData.transactions.length,
                "gasUsed": blockData.gasUsed,
                "gasLimit": blockData.gasLimit,
                "miner": blockData.miner,
                "blockTime": (nextBlock.timestamp - blockData.timestamp) / (nextBlock.number - blockData.number),
                "uncleCount": blockData.uncles.length
            }
            new BlockStat(stat).save( function( err, s, count ){
                console.log(s)
                if ( typeof err !== 'undefined' && err ) {
                   console.log('Error: Aborted due to error on ' + 
                        'block number ' + blockData.number.toString() + ': ' + 
                        err);
                   process.exit(9);
                } else {
                    console.log('DB successfully written for block number ' +
                        blockData.number.toString() );    
                    getStats(web3, blockData.number - interval, blockData, endNumber, interval, rescan);
                }
            });
        } else {
            if (rescan || !nextBlock) {
                getStats(web3, blockData.number - interval, blockData, endNumber, interval, rescan);
                if (nextBlock) {
                    console.log('WARN: block number: ' + blockData.number.toString() + ' already exists in DB.');
                }
            } else {
                console.error('Aborting because block number: ' + blockData.number.toString() +
                    ' already exists in DB.');
                return;
            }
        }

    })
}

/** On Startup **/
// geth --rpc --rpcaddr "localhost" --rpcport "8545"  --rpcapi "eth,net,web3"

var minutes = 1;
statInterval = minutes * 60 * 1000;

var rescan = false; /* rescan: true - rescan range */
var range = 1000;
var interval = 100;

/**
 * RESCAN=1000:100000 means interval;range
 *
 * Usage:
 *   RESCAN=1000:100000 node tools/stats.js
 */
if (process.env.RESCAN) {
    var tmp = process.env.RESCAN.split(/:/);
    if (tmp.length > 1) {
        interval = Math.abs(parseInt(tmp[0]));
        if (tmp[1]) {
            range = Math.abs(parseInt(tmp[1]));
        }
    }
    var i = interval;
    var j = 0;
    for (var j = 0; i >= 10; j++) {
        i = parseInt(i / 10);
    }
    interval = Math.pow(10, j);
    console.log('Selected interval = ' + interval);

    rescan = true;
}

// run
updateStats(range, interval, rescan);

if (!rescan) {
    setInterval(function() {
      updateStats(range, interval);
    }, statInterval);
}
