require( '../db.js' );
var etherUnits = require("../lib/etherUnits.js");
var BigNumber = require('bignumber.js');

var Web3 = require('web3');

var mongoose        = require( 'mongoose' );
var Block           = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );
var Contract        = mongoose.model( 'Contract' );
var TokenTransfer   = mongoose.model( 'TokenTransfer' );

const ERC20ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}];
const ERC20_METHOD_DIC = {"0xa9059cbb":"transfer", "0xa978501e":"transferFrom"};
const METHOD_DIC = {
    "0x930a61a57a70a73c2a503615b87e2e54fe5b9cdeacda518270b852296ab1a377":"Transfer(address,address,uint)",
    "0xa9059cbb2ab09eb219583f4a59a5d0623ade346d962bcd4e46b11da047c9049b":"transfer(address,uint256)",
    "0xa978501e4506ecbd340f6e45a48ac5bd126b1c14f03f2210837c8e0b602d4d7b":"transferFrom(address,address,uint)",
    "0x086c40f692cc9c13988b9e49a7610f67375e8373bfe7653911770b351c2b1c54":"approve(address,uint)",
    "0xf2fde38b092330466c661fc723d5289b90272a3e580e3187d1d7ef788506c557":"transferOwnership(address)",
    "0x3bc50cfd0fe2c05fb67c0fe4be91fb10eb723ba30ea8f559d533fcd5fe29be7f":"Released(address,uint)",
    "0xb21fb52d5749b80f3182f8c6992236b5e5576681880914484d7f4c9b062e619e":"Released(address indexed, uint indexed)"
};

const normalizeTX = async (txData, receipt, blockData) => {
  var tx = {
    blockHash: txData.blockHash,
    blockNumber: txData.blockNumber,
    from: txData.from.toLowerCase(),
    hash: txData.hash.toLowerCase(),
    value: etherUnits.toEther(new BigNumber(txData.value), 'wei'),
    nonce: txData.nonce,
    r: txData.r,
    s: txData.s,
    v: txData.v,
    gas: txData.gas,
    gasUsed: receipt.gasUsed,
    gasPrice: String(txData.gasPrice),
    input: txData.input,
    transactionIndex: txData.transactionIndex,
    timestamp: blockData.timestamp
  };

  if (receipt.status)
  tx.status = receipt.status;

  if (txData.to) {
    tx.to = txData.to.toLowerCase();
    return tx;
  } else {
    if (tx.creates) {
      tx.creates = txData.creates.toLowerCase();
      return tx;
    } else {
      if (receipt && receipt.contractAddress) {
        tx.creates = receipt.contractAddress.toLowerCase();
      }
      return tx;
    }
  }
}

var grabBlock = function(config, web3, blockHashOrNumber) {
    var desiredBlockHashOrNumber;
    // check if done
    if(blockHashOrNumber == undefined) {
        return;
    }
    desiredBlockHashOrNumber = blockHashOrNumber;
    if(web3.eth.net.isListening()) {
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
const writeTransactionsToDB = async(config, blockData) => {
    var bulkOps = [];
    if (blockData.transactions.length > 0) {
        for (d in blockData.transactions) {
            var txData = blockData.transactions[d];
            var receipt = await web3.eth.getTransactionReceipt(txData.hash);
            var tx = await normalizeTX(txData, receipt, blockData);
            // Contact creation tx, Event logs of internal transaction
            if (txData.input && txData.input.length > 2) {
              // Contact creation tx
              if (txData.to == null) {
                contractAddress = txData.creates.toLowerCase();
                var contractdb = {}
                var isTokenContract = true;
                var Token = new web3.eth.Contract(ERC20ABI, contractAddress);
                contractdb.owner = txData.from;
                contractdb.blockNumber = blockData.number;
                contractdb.creationTransaction = txData.hash;
                try {
                  var call = await web3.eth.call({ to: contractAddress, data:web3.utils.sha3("totalSupply()")});
                  if (call == '0x') {
                    isTokenContract = false;
                  } else {
                    try {
                      contractdb.tokenName = await Token.methods.name().call();
                      contractdb.decimals = await Token.methods.decimals().call();
                      contractdb.symbol = await Token.methods.symbol().call();
                      contractdb.totalSupply = await Token.methods.totalSupply().call();
                    } catch (err) {
                      isTokenContract = false;
                    }
                  }
                } catch (err) {
                  isTokenContract = false;
                }
                contractdb.byteCode = await web3.eth.getCode(contractAddress);
                if (isTokenContract) {
                  contractdb.ERC = 2;
                } else {
                  // Normal Contract
                  contractdb.ERC = 0;
                }
                // Write to db
                Contract.update (
                  {address: contractAddress},
                  {$setOnInsert: contractdb},
                  {upsert: true},
                  function (err, data) {
                    if (err) {
                      console.log(err);
                    }
                  }
                );
              } else {
                // Internal transaction  . write to doc of InternalTx
                var transfer = {"blockNumber": "", "number": 0, "from": "", "to": "", "contract":"", "value": 0, "timestamp":0};
                var methodCode = txData.input.substr(0,10);
                if (ERC20_METHOD_DIC[methodCode]=="transfer" || ERC20_METHOD_DIC[methodCode]=="transferFrom") {
                  if (ERC20_METHOD_DIC[methodCode]=="transfer") {
                    // Token transfer transaction
                    transfer.from = txData.from;
                    transfer.to = "0x" + txData.input.substring(34,74);
                    transfer.value = Number("0x" + txData.input.substring(74));
                  } else {
                    // transferFrom
                    transfer.from = "0x" + txData.input.substring(34,74);
                    transfer.to = "0x" + txData.input.substring(74,114);
                    transfer.value = Number("0x" + txData.input.substring(114));
                  }
                  transfer.method = ERC20_METHOD_DIC[methodCode];
                  transfer.hash = txData.hash;
                  transfer.blockNumber = blockData.number;
                  transfer.contract = txData.to;
                  transfer.timestamp = blockData.timestamp;
                  // Write transfer transaction into db
                  TokenTransfer.update (
                    {hash: transfer.hash},
                    {$setOnInsert: transfer},
                    {upsert: true},
                    function (err, data) {
                      if (err) {
                        console.log(err);
                      }
                    }
                  );
                }
              }
            }
            bulkOps.push(tx);
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
    // number of blocks should equal difference in block numbers
    var firstBlock = 0;
    var lastBlock = web3.eth.getBlockNumber() - 1;
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

// load config.json
var config = { nodeAddr: 'localhost', wsPort: 8546 };
try {
    var local = require('../config.json');
    _.extend(config, local);
    console.log('config.json found.');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        var local = require('../config.example.json');
        _.extend(config, local);
        console.log('No config file found. Using default configuration... (config.example.json)');
    } else {
        throw error;
        process.exit(1);
    }
}

console.log('Connecting ' + config.nodeAddr + ':' + config.wsPort + '...');
var web3 = new Web3(new Web3.providers.WebsocketProvider('ws://' + config.nodeAddr + ':' + config.wsPort.toString()));

patchBlocks(config);
