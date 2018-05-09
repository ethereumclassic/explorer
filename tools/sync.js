/*
Name: Ethereum Blockchain syncer
Version: .0.0.2
This file will start syncing the blockchain from the node address you provide in the conf.json file.
Please read the README in the root directory that explains the parameters of this code
*/
require( '../db.js' );
var etherUnits = require("../lib/etherUnits.js");
var BigNumber = require('bignumber.js');

var fs = require('fs');
var Web3 = require('web3');

var mongoose        = require( 'mongoose' );
var Block           = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );

/**
  //Just listen for latest blocks and sync from the start of the app.
**/
var listenBlocks = function(config) {
    var newBlocks = web3.eth.filter("latest");
    newBlocks.watch(function (error,latestBlock) {
    if(error) {
        console.log('Error: ' + error);
    } else if (latestBlock == null) {
        console.log('Warning: null block hash');
    } else {
      console.log('Found new block: ' + latestBlock);
      if(web3.isConnected()) {
        web3.eth.getBlock(latestBlock, true, function(error,blockData) {
          if(error) {
            console.log('Warning: error on getting block with hash/number: ' +   latestBlock + ': ' + error);
          }else if(blockData == null) {
            console.log('Warning: null block data received from the block with hash/number: ' + latestBlock);
          }else{
            writeBlockToDB(config, blockData);
            writeTransactionsToDB(config, blockData);
          }
        });
      }else{
        console.log('Error: Web3 connection time out trying to get block ' + latestBlock + ' retrying connection now');
        listenBlocks(config);
      }
    }
  });
}
/**
  If full sync is checked this function will start syncing the block chain from lastSynced param see README
**/
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
      console.log('*** Sync Finsihed ***');
      config.syncAll = false;
      return;
    }

    web3.eth.getBlock(nextBlock, true, function(error,blockData) {
      if(error) {
        console.log('Warning: error on getting block with hash/number: ' + nextBlock + ': ' + error);
      }else if(blockData == null) {
        console.log('Warning: null block data received from the block with hash/number: ' + nextBlock);
      }else{
        writeBlockToDB(config, blockData);
        writeTransactionsToDB(config, blockData);
      }
      nextBlock--;
      syncChain(config, nextBlock);
    });
  }else{
    console.log('Error: Web3 connection time out trying to get block ' + nextBlock + ' retrying connection now');
    syncChain(config, nextBlock);
  }
}
/**
  Write the whole block object to DB
**/
var writeBlockToDB = function(config, blockData) {
  return new Block(blockData).save( function( err, block, count ){
    if ( typeof err !== 'undefined' && err ) {
      if (err.code == 11000) {
        if(!('quiet' in config && config.quiet === true)) {
          console.log('Skip: Duplicate key ' + blockData.number.toString() + ': ' +err);
        }
      }else{
        console.log('Error: Aborted due to error on ' + 'block number ' + blockData.number.toString() + ': ' + err);
        process.exit(9);
      }
    }else{
      console.log('DB successfully written for block number ' + blockData.number.toString() );
    }
  });
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
          if(!('quiet' in config && config.quiet === true)) {
            console.log('Skip: Duplicate key ' + err);
          }
        }else{
          console.log('Error: Aborted due to error: ' + err);
          process.exit(9);
        }
      }else{
        console.log(blockData.transactions.length.toString() + ' transactions recorded for Block# ' + blockData.number.toString());
      }
    });
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
/**
  Block Patcher(experimental)
**/
var runPatcher = function(config) {
  currentBlock = web3.eth.blockNumber;
  patchBlock = currentBlock - config.patchBlocks;
  console.log('Starting patching from block: '+patchBlock);
  while(config.patchBlocks > 0){
    config.patchBlocks--;
    patchBlock++;
    if(!('quiet' in config && config.quiet === true)) {
      console.log('Patching Block: '+patchBlock)
    }
    web3.eth.getBlock(patchBlock, true, function(error,patchData) {
      if(error) {
        console.log('Warning: error on getting block with hash/number: ' + patchBlock + ': ' + error);
      }else if(patchData == null) {
        console.log('Warning: null block data received from the block with hash/number: ' + patchBlock);
      }else{
        checkBlockDBExistsThenWrite(config,patchData)
      }
    });
    if (config.patchBlocks == 0){
      config.patch = false;
      console.log('Block Patching Complete')
    }
  }
}
/**
  This will be used for the patcher(experimental)
**/
var checkBlockDBExistsThenWrite = function(config,patchData) {
  Block.find({number: patchData.number}, function (err, b) {
    if (!b.length){
      writeBlockToDB(config,patchData);
      writeTransactionsToDB(config,patchData);
    }else if(!('quiet' in config && config.quiet === true)) {
      console.log('Block number: ' +patchData.number.toString() + ' already exists in DB.');
    }
  });
};
/**
  Start config for node connection and sync
**/
var config = {};
// set the default NODE address to localhost if it's not provided
if (!('nodeAddr' in config) || !(config.nodeAddr)) {
  config.nodeAddr = 'localhost'; // default
}
// set the default geth port if it's not provided
if (!('gethPort' in config) || (typeof config.gethPort) !== 'number') {
  config.gethPort = 8545; // default
}
// set the default output directory if it's not provided
if (!('output' in config) || (typeof config.output) !== 'string') {
  config.output = '.'; // default this directory
}
//Look for config.json file if not
try {
    var configContents = fs.readFileSync('config.json');
    config = JSON.parse(configContents);
    console.log('CONFIG FOUND: Node:'+config.nodeAddr+' | Port:'+config.gethPort);
}
catch (error) {
  if (error.code === 'ENOENT') {
      console.log('No config file found. Using default configuration: Node:'+config.nodeAddr+' | Port:'+config.gethPort);
  }
  else {
      throw error;
      process.exit(1);
  }
}
// Sets address for RPC WEB3 to connect to, usually your node IP address defaults ot localhost
var web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.nodeAddr + ':' + config.gethPort.toString()));
// Start listening for latest blocks
listenBlocks(config);

// Starts full sync when set to true in config
if (config.syncAll === true){
  console.log('Starting Full Sync');
  syncChain(config);
}
// Starts full sync when set to true in config
if (config.patch === true){
  console.log('Checking for missing blocks');
  runPatcher(config);
}
