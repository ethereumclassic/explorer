/**
  If full sync is checked this function will start syncing the block chain from lastSynced param see README
**/

// DB
var db              = require( '../database/db.js' );
var Block           = db.Block;
var Transaction     = db.Transaction;

// tools
var web3 = require('../tools/ethernode.js');

// lib
//lib functions.
var blockLib = require('../lib/blockLib.js');

var syncChain = function(config, nextBlock){
  if(web3.isConnected()) {
    if (typeof nextBlock === 'undefined') {
      prepareSync(config, function(error, startBlock) {
        if(error) {
          console.log('ERROR: error: ' + error);
          return;
        }
        syncChain(config, startBlock);
      });
      return;
    }

    if( nextBlock == null ) {
      console.log('nextBlock is null');
      return;
    } else if( nextBlock < config.startBlock ) {
      blockLib.writeBlockToDB(config, null, true);
      blockLib.writeTransactionsToDB(config, null, true);
      console.log('*** Sync Finsihed ***');
      config.syncAll = false;
      return;
    }

    var count = config.bulkSize;
    while(nextBlock >= config.startBlock && count > 0) {
      web3.eth.getBlock(nextBlock, true, function(error,blockData) {
        if(error) {
          console.log('Warning: error on getting block with hash/number: ' + nextBlock + ': ' + error);
        }else if(blockData == null) {
          console.log('Warning: null block data received from the block with hash/number: ' + nextBlock);
        }else{
          blockLib.writeBlockToDB(config, blockData);
          blockLib.writeTransactionsToDB(config, blockData);

        }
      });
      nextBlock--;
      count--;
    }

    setTimeout(function() { syncChain(config, nextBlock); }, 500);
  }else{
    console.log('Error: Web3 connection time out trying to get block ' + nextBlock + ' retrying connection now');
    syncChain(config, nextBlock);
  }
}

/**
  //check oldest block or starting block then callback
**/
var prepareSync = function(config, callback) {
  var blockNumber = null;
  var oldBlockFind = Block.find({}, "number").lean(true).sort('number').limit(1);
  oldBlockFind.exec(function (err, docs) {
    if(err || !docs || docs.length < 1) {
      // not found in db. sync from config.endBlock or 'latest'
      if(web3.isConnected()) {
        var currentBlock = web3.eth.blockNumber;
        var latestBlock = config.endBlock || currentBlock || 'latest';
        if(latestBlock === 'latest') {
          web3.eth.getBlock(latestBlock, true, function(error, blockData) {
            if(error) {
              console.log('Warning: error on getting block with hash/number: ' +   latestBlock + ': ' + error);
            } else if(blockData == null) {
              console.log('Warning: null block data received from the block with hash/number: ' + latestBlock);
            } else {
              console.log('Starting block number = ' + blockData.number);
              blockNumber = blockData.number - 1;
              callback(null, blockNumber);
            }
          });
        } else {
          console.log('Starting block number = ' + latestBlock);
          blockNumber = latestBlock - 1;
          callback(null, blockNumber);
        }
      } else {
        console.log('Error: Web3 connection error');
        callback(err, null);
      }
    }else{
      blockNumber = docs[0].number - 1;
      console.log('Old block found. Starting block number = ' + blockNumber);
      callback(null, blockNumber);
    }
  });
}
module.exports = syncChain;
