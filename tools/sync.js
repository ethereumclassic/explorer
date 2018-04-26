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
  // Starts full sync when set to true in config
  if (config.syncAll === true){
    console.log('Starting Full Sync');
    getOldestBlockDB(config);
  }
  // Starts full sync when set to true in config
  if (config.patch === true){
    console.log('Checking for missing blocks');
    runPatcher(config);
  }
}
/**
  If full sync is checked this function will start syncing the block chain from lastSynced param see README
**/
var syncChain = function(config,web3,nextBlock){
  if(web3.isConnected()) {
    web3.eth.getBlock(nextBlock, true, function(error,blockData) {
      if(error) {
        console.log('Warning: error on getting block with hash/number: ' + nextBlock + ': ' + error);
        getOldestBlockDB();
      }else if(blockData == null) {
        console.log('Warning: null block data received from the block with hash/number: ' + nextBlock);
        getOldestBlockDB();
      }else{
        writeBlockToDB(config, blockData);
        writeTransactionsToDB(config, blockData);
      }
    });
  }else{
    console.log('Error: Web3 connection time out trying to get block ' + nextBlock + ' retrying connection now');
    syncChain(config,web3,nextBlock);
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
      // continues sync if flag is still true
      if (config.syncAll === true){
        getOldestBlockDB(config);
      }
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
          getOldestBlockDB();
          //process.exit(9);
        }
      }else{
        console.log(blockData.transactions.length.toString() + ' transactions recorded for Block# ' + blockData.number.toString());
        // continues sync if flag is still true
        if (config.syncAll === true){
          getOldestBlockDB(config);
        }
      }
    });
  }
}
/**
  //Check oldest block in db and start sync from tehre
**/
var getOldestBlockDB = function() {
  var oldBlockFind = Block.find({}, "number").lean(true).sort('number').limit(1);
  oldBlockFind.exec(function (err, docs) {
    if(docs.length < 1){
      console.log('nothing here starting from latest');
    }else{
      var nextBlock = (docs[0].number - 1);
      if( nextBlock <= config.startBlock ){
        console.log('Sync Finsihed');
        config.syncAll = false;
        return;
      }else{
        syncChain(config,web3,nextBlock);
      }
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
        //getOldestBlockDB();
      }else if(patchData == null) {
        console.log('Warning: null block data received from the block with hash/number: ' + patchBlock);
        //getOldestBlockDB();
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
