/**
  //Just listen for latest blocks and sync from the start of the app.
**/

var web3 = require('../tools/ethernode.js');
var blockLib = require('./blockLib.js');

module.exports = (config) => {
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
            blockLib.writeBlockToDB(config, blockData, true);
            blockLib.writeTransactionsToDB(config, blockData, true);
          }
        });
      }else{
        console.log('Error: Web3 connection time out trying to get block ' + latestBlock + ' retrying connection now');
        blockLib.listenBlocks(config);
      }
    }
  });
}
