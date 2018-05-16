#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("web3");
var web3;

var _ = require('lodash');
var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")
var async = require('async');
var abiDecoder = require('abi-decoder');

require( '../db.js' );
var mongoose = require( 'mongoose' );
var Contract = mongoose.model( 'Contract' );
var Transaction = mongoose.model( 'Transaction' );

var getLatestBlocks = require('./index').getLatestBlocks;
var filterBlocks = require('./filters').filterBlocks;
var filterTrace = require('./filters').filterTrace;

const ERC20ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}];

const KnownMethodIDs = {
  "0xa9059cbb": { type: "ERC20", method: "transfer" },
  "0x23b872dd": { type: "ERC20", method: "transferFrom" },
  "0x095ea7b3": { type: "ERC20", method: "approve" },
  "0xf2fde38b": { type: "ERC20", method: "transferOwnership" }
};

/*Start config for node connection and sync*/
// load config.json
var config = { nodeAddr: 'localhost', gethPort: 8545 };
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

//Create Web3 connection
console.log('Connecting ' + config.nodeAddr + ':' + config.gethPort + '...');
if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider('http://'+config.nodeAddr+':'+config.gethPort));
}

if (web3.isConnected())
  console.log("Web3 connection established");
else
  throw "No connection, please specify web3host in conf.json";

if (web3.version.node.split('/')[0].toLowerCase().includes('parity')) {
  // parity extension
  web3 = require("../lib/trace.js")(web3);
}

var newBlocks = web3.eth.filter("latest");
var newTxs = web3.eth.filter("pending");

exports.data = function(req, res){
  console.log(req.body)

  if ("tx" in req.body) {
    var txHash = req.body.tx.toLowerCase();

    web3.eth.getTransaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TxWeb3 error :" + err)
        if (!tx) {
          web3.eth.getBlock(txHash, function(err, block) {
            if(err || !block) {
              console.error("BlockWeb3 error :" + err)
              res.write(JSON.stringify({"error": true}));
            } else {
              console.log("BlockWeb3 found: " + txHash)
              res.write(JSON.stringify({"error": true, "isBlock": true}));
            }
            res.end();
          });
        } else {
          res.write(JSON.stringify({"error": true}));
          res.end();
        }
      } else {
        var ttx = tx;
        ttx.value = etherUnits.toEther( new BigNumber(tx.value), "wei");
        //get timestamp from block
        var block = web3.eth.getBlock(tx.blockNumber, function(err, block) {
          if (!err && block)
            ttx.timestamp = block.timestamp;
          ttx.isTrace = (ttx.input != "0x");
          res.write(JSON.stringify(ttx));
          res.end();
        });
      }
    });

  } else if ("tx_trace" in req.body) {
    var txHash = req.body.tx_trace.toLowerCase();

    async.waterfall([
    function(callback) {
      web3.eth.getTransaction(txHash, function(err, tx) {
        if(err || !tx) {
          return callback({error: true, message: 'Transaction not found.'}, null);
        } else {
          // call web3.trace.*() for tx.input != "0x" cases
          callback(tx.input == "0x", tx);
        }
      });
    }, function(tx, callback) {
      web3.trace.transaction(txHash, function(err, traces) {
        if(err || !traces) {
          console.error("TraceWeb3 error :" + err)
          return callback({ error: true, message: "TraceWeb3 error:" + err }, null);
        } else {
          callback(null, tx, traces);
        }
      });
    }, function(tx, traces, callback) {
      if (tx.to != null) {
        // detect some known contracts
        var methodSig = tx.input.substr(0, 10);
        if (KnownMethodIDs[methodSig]) {
          // is it a token contract ?
          if (KnownMethodIDs[methodSig].type == 'ERC20') {
            var contract = web3.eth.contract(ERC20ABI);
            var token = contract.at(tx.to);

            try {
              // is it a valid ERC20 token?
              token.decimals();
              callback(null, tx, traces, contract, token);
              return;
            } catch(e) {
              console.log('WARN: invalid ERC20 token. fail to call decimals() :' + e);
            }
          }
        }
        Contract.findOne({address: tx.to}).lean(true)
          .exec(function(err, contractDb) {
            if (err || !contractDb) {
              console.log('Contract not found. tx.to = ', tx.to);
              callback(null, tx, traces, null);
              return;
            }
            callback(null, tx, traces, contractDb, null);
          });
      } else {
        // creation contract case
        callback(null, tx, traces, null);
      }
    }], function(error, tx, traces, contractOrDb, tokenContract) {
      if (error) {
        if (error === true)
          error = { error: true, message: 'normal TX' };
        res.write(JSON.stringify(error));
        res.end();
        return;
      }

      // check traces for tokenContract
      if (contractOrDb || tokenContract) {
        var decimals = 0, decimalsBN, decimalsDivisor = 1;

        // convert given contractDB to contract and check validity
        if (!tokenContract && typeof contractOrDb.abi == "string") {
          var abi = [];
          try {
            abi = JSON.parse(contractOrDb.abi);
          } catch (e) {
            console.log("Error parsing ABI:", contractOrDb.abi, e);
            res.write(JSON.stringify({ error: true, message: 'normal TX' }));
            res.end();
            return;
          }
          var contract = web3.eth.contract(abi);
          tokenContract = contract.at(tx.to);
        }
        decimals = tokenContract.decimals ? tokenContract.decimals() : 0;
        abiDecoder.addABI(tokenContract.abi);

        // prepare to convert transfer unit
        decimalsBN = new BigNumber(decimals);
        decimalsDivisor = new BigNumber(10).pow(decimalsBN);

        var txns = filterTrace(traces);
        txns.forEach(function(trace) {
          if(!trace.error && trace.action.input && tokenContract) {
            trace.callInfo = abiDecoder.decodeMethod(trace.action.input);
            if (trace.callInfo.name == 'transfer') {
              var amount = new BigNumber(trace.callInfo.params[1].value);
              trace.amount = amount.dividedBy(decimalsDivisor);
              // replace to address with _to address arg
              trace.to = trace.callInfo.params[0].value;
              trace.type = 'transfer';
            }
          }
        });
        res.write(JSON.stringify(txns));
      } else {
        res.write(JSON.stringify(filterTrace(traces)));
      }
      res.end();
    });
  } else if ("addr_trace" in req.body) {
    var addr = req.body.addr_trace.toLowerCase();
    // need to filter both to and from
    // from block to end block, paging "toAddress":[addr], 
    // start from creation block to speed things up 

    async.waterfall([
      function(callback) {
        // get the creation transaction.
        Transaction.findOne({to: addr}).lean(true).sort("blockNumber").exec(function(err, doc) {
          if (err || !doc) {
            callback({error: "true", message: "Contract not found"}, null);
            return;
          }
          callback(null, doc);
        });
      }
    ], function(error, transaction, callback) {
      if (error) {
        console.error("TraceWeb3 error :", error)
        res.write(JSON.stringify(error));
        return;
      }
      var minFromBlock = transaction.blockNumber;
      var fromBlock;

      if (req.body.fromBlock) {
        var from = parseInt(req.body.fromBlock);
        if (from < 0) {
          fromBlock = minFromBlock;
        } else {
          fromBlock = Math.min(from, minFromBlock);
        }
      }

      var filter = {"fromBlock": web3.toHex(fromBlock), "toAddress":[addr]};
      web3.trace.filter(filter, function(err, tx) {
        if(err || !tx) {
          console.error("TraceWeb3 error :" + err)
          res.write(JSON.stringify({"error": true}));
        } else {
          res.write(JSON.stringify({transactions: filterTrace(tx), createTransaction: transaction}));
        }
        res.end();
      });
    });
  } else if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();
    var options = req.body.options;

    var addrData = {};

    if (options.indexOf("balance") > -1) {
      try {
        addrData["balance"] = web3.eth.getBalance(addr);  
        addrData["balance"] = etherUnits.toEther(addrData["balance"], 'wei');
      } catch(err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("count") > -1) {
      try {
         addrData["count"] = web3.eth.getTransactionCount(addr);
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("bytecode") > -1) {
      try {
         addrData["bytecode"] = web3.eth.getCode(addr);
         if (addrData["bytecode"].length > 2) 
            addrData["isContract"] = true;
         else
            addrData["isContract"] = false;
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
   
    res.write(JSON.stringify(addrData));
    res.end();


  } else if ("block" in req.body) {
    var blockNumOrHash;
    if (/^(0x)?[0-9a-f]{64}$/i.test(req.body.block.trim())) {
        blockNumOrHash = req.body.block.toLowerCase();
    } else {
        blockNumOrHash = parseInt(req.body.block);
    }

    web3.eth.getBlock(blockNumOrHash, function(err, block) {
      if(err || !block) {
        console.error("BlockWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterBlocks(block)));
      }
      res.end();
    });

    /* 
    / TODO: Refactor, "block" / "uncle" determinations should likely come later
    / Can parse out the request once and then determine the path.
    */
  } else if ("uncle" in req.body) {
    var uncle = req.body.uncle.trim();
    var arr = uncle.split('/');
    var blockNumOrHash; // Ugly, does the same as blockNumOrHash above
    var uncleIdx = parseInt(arr[1]) || 0;

    if (/^(?:0x)?[0-9a-f]{64}$/i.test(arr[0])) {
      blockNumOrHash = arr[0].toLowerCase();
      console.log(blockNumOrHash)
    } else {
      blockNumOrHash = parseInt(arr[0]);
    }

    if (typeof blockNumOrHash == 'undefined') {
      console.error("UncleWeb3 error :" + err);
      res.write(JSON.stringify({"error": true}));
      res.end();
      return;
    }

    web3.eth.getUncle(blockNumOrHash, uncleIdx, function(err, uncle) {
      if(err || !uncle) {
        console.error("UncleWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterBlocks(uncle)));
      }
      res.end();
    });

  } else if ("action" in req.body) {
    if (req.body.action == 'hashrate') {
      web3.eth.getBlock('latest', function(err, latest) {
        if(err || !latest) {
          console.error("StatsWeb3 error :" + err);
          res.write(JSON.stringify({"error": true}));
          res.end();
        } else {
          console.log("StatsWeb3: latest block: " + latest.number);
          var checknum = latest.number - 100;
          if(checknum < 0)
            checknum = 0;
          var nblock = latest.number - checknum;
          web3.eth.getBlock(checknum, function(err, block) {
            if(err || !block) {
              console.error("StatsWeb3 error :" + err);
              res.write(JSON.stringify({"blockHeight": latest.number, "difficulty": latest.difficulty, "blockTime": 0, "hashrate": 0 }));
            } else {
              console.log("StatsWeb3: check block: " + block.number);
              var blocktime = (latest.timestamp - block.timestamp) / nblock;
              var hashrate = latest.difficulty / blocktime;
              res.write(JSON.stringify({"blockHeight": latest.number, "difficulty": latest.difficulty, "blockTime": blocktime, "hashrate": hashrate }));
            }
            res.end();
          });
        }
      });
    } else {
      console.error("Invalid Request: " + action)
      res.status(400).send();
    }
  } else {
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }

};

exports.web3 = web3;
exports.eth = web3.eth;