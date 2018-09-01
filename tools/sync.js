/*
Name: Ethereum Blockchain syncer
Version: .0.0.2
This file will start syncing the blockchain from the node address you provide in the conf.json file.
Please read the README in the root directory that explains the parameters of this code
*/

// DB
require( '../database/db.js' );

// Sets address for RPC WEB3 to connect to, usually your node IP address defaults ot localhost
var web3 = require('../tools/ethernode.js');
var config = require('../tools/config.js');
var syncChain = require('../tools/syncChain.js');
var runPatcher = require('../tools/patcher.js');

//lib functions.
var blockLib = require('../lib/blockLib.js');


// patch missing blocks
if (config.patch === true){
  console.log('Checking for missing blocks');
  runPatcher(config);
}

// Start listening for latest blocks
blockLib.listenBlocks(config);

// Starts full sync when set to true in config
if (config.syncAll === true){
  console.log('Starting Full Sync');
  syncChain(config);
}
