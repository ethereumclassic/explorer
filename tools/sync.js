/*
If you don't want to use localhost node but a remote node to grab and syn blocks from.
Copy and paste the sync.json from the ./tools/ directory to the root directory of explorer.
And setup the remote NODE address and port before luanching the app.
Use grabber.js and grabberConfig.json to setup and sync the rest of the chain.
*/

require( '../db.js' );
require( './grabber.js')
var etherUnits = require("../lib/etherUnits.js");
var BigNumber = require('bignumber.js');

var fs = require('fs');
var Web3 = require('web3');

var mongoose        = require( 'mongoose' );
var Block           = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );


/*Start config for node connection and sync*/
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
//Look for sync.config file if not
try {
    var configContents = fs.readFileSync('sync.json');
    config = JSON.parse(configContents);
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
//Just lsiten for latest blocks and sync from the start of the app.
var listenBlocks = function(config) {
    // Sets address for RPC WEb3 to connect to, usually your node address defaults ot localhost
    var web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.nodeAddr + ':' + config.gethPort.toString()));
    var newBlocks = web3.eth.filter("latest");
    newBlocks.watch(function (error, log) {
        if(error) {
            console.log('Error: ' + error);
        } else if (log == null) {
            console.log('Warning: null block hash');
        } else {
            //grabBlock(config, web3, log);
            console.log('Found new block: ' + log);
        }
    });
}
listenBlocks(config);
