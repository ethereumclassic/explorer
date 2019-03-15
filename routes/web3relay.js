#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("web3");
var web3;

var _ = require('lodash');
var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")

require( '../db.js' );
const mongoose = require( 'mongoose' );
const Block = mongoose.model( 'Block' );
const Transaction = mongoose.model( 'Transaction' );
const Market = mongoose.model( 'Market' );

var getLatestBlocks = require('./index').getLatestBlocks;
var filterBlocks = require('./filters').filterBlocks;
var filterTrace = require('./filters').filterTrace;

/*Start config for node connection and sync*/
// load config.json
var config = { nodeAddr: 'localhost', rpcPort: 8545 };
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
console.log('Connecting ' + config.nodeAddr + ':' + config.rpcPort + '...');
if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider('http://'+config.nodeAddr+':'+config.rpcPort));
}

if (web3.isConnected())
  console.log("Web3 connection established");
else
  throw "No connection, please specify web3host in conf.json";

web3 = require("../lib/trace.js")(web3);

var newBlocks = web3.eth.filter("latest");
var newTxs = web3.eth.filter("pending");

exports.data = async (req, res) => {
  console.log(req.body)

  if ("tx" in req.body) {
    var txHash = req.body.tx.toLowerCase();

    Transaction.findOne({hash: txHash}).lean(true).exec(async(err, doc) => {
      if (err || !doc) {
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
            //get TxReceipt status & gasUsed
            web3.eth.getTransactionReceipt(txHash, function(err, receipt) {
              if (err) {
                console.error(err);
                return;
              }
              if(receipt.status != null)
                ttx.status = receipt.status;
              ttx.gasUsed = receipt.gasUsed;
            });
            //get timestamp from block
            var block = web3.eth.getBlock(tx.blockNumber, function(err, block) {
              if (!err && block)
              ttx.timestamp = block.timestamp;
              ttx.isTrace = (ttx.input != "0x");
              txResponse = ttx;
            });
          }
        });
      } else {
        txResponse = doc;
      }

      const latestPrice = await Market.findOne().sort({timestamp: -1})

      const latestBlock = await web3.eth.blockNumber + 1;

      txResponse.confirmations = latestBlock - txResponse.blockNumber;

      if (txResponse.confirmations === latestBlock) {
        txResponse.confirmation = 0;
      }
      txResponse.gasPriceGwei = etherUnits.toGwei( new BigNumber(txResponse.gasPrice), "wei");
      txResponse.gasPriceEther = etherUnits.toEther( new BigNumber(txResponse.gasPrice), "wei");
      txResponse.txFee = txResponse.gasPriceEther * txResponse.gasUsed;
      txResponse.txFeeUSD = txResponse.txFee * latestPrice.quoteUSD;
      txResponse.valueUSD = txResponse.value * latestPrice.quoteUSD;

      res.write(JSON.stringify(txResponse));
      res.end();
    });

  } else if ("tx_trace" in req.body) {
    var txHash = req.body.tx_trace.toLowerCase();

    web3.trace.transaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterTrace(tx)));
      }
      res.end();
    });
  } else if ("addr_trace" in req.body) {
    var addr = req.body.addr_trace.toLowerCase();
    // need to filter both to and from
    // from block to end block, paging "toAddress":[addr],
    // start from creation block to speed things up
    // TODO: store creation block
    var filter = {"fromBlock":"0x1d4c00", "toAddress":[addr]};
    web3.trace.filter(filter, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterTrace(tx)));
      }
      res.end();
    })
  } else if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();
    var options = req.body.options;

    var addrData = {};

    // batch job
    var batch = web3.createBatch();
    batch.add(web3.eth.getBalance.request(addr));
    batch.add(web3.eth.getTransactionCount.request(addr));
    batch.add(web3.eth.getCode.request(addr));

    batch.requestManager.sendBatch(batch.requests, async(err, results) => {
      if (err) {
        console.error("AddrWeb3 error :" + err);
        res.write(JSON.stringify({"error": true}));
        res.end();
        return;
      }

      results = results || [];
      var addrData = {};
      batch.requests.map(function (request, index) {
        return results[index] || {};
      }).forEach(function (result, i) {
        if (i == 0) {
          addrData["balance"] = etherUnits.toEther(result.result, 'wei');
        } else if (i == 1) {
          addrData["count"] = Number(result.result);
        } else if (i == 2) {
          addrData["bytecode"] = result.result;
          if (addrData["bytecode"].length > 2)
            addrData["isContract"] = true;
          else
            addrData["isContract"] = false;
        }
      });

      const latestPrice = await Market.findOne().sort({timestamp: -1})
      addrData["balanceUSD"] = addrData.balance * latestPrice.quoteUSD;

      res.write(JSON.stringify(addrData));
      res.end();
    });
  } else if ("block" in req.body) {
    var blockNumOrHash;
    if (/^(0x)?[0-9a-f]{64}$/i.test(req.body.block.trim())) {
        blockNumOrHash = req.body.block.toLowerCase();
    } else {
        blockNumOrHash = parseInt(req.body.block);
    }

    Block.findOne({$or: [{hash: blockNumOrHash}, {number: blockNumOrHash}]},
      { '_id': 0 }).lean(true).exec("findOne", function(err, doc) {
        if (err || !doc) {
          web3.eth.getBlock(blockNumOrHash, function(err, block) {
            if(err || !block) {
              console.error("BlockWeb3 error :" + err)
              res.write(JSON.stringify({"error": true}));
            } else {
              res.write(JSON.stringify(filterBlocks(block)));
            }
            res.end();
          });
        } else {
          Transaction.find({blockNumber: doc.number}).distinct("hash", (err, txs) => {
            doc["transactions"] = txs;
            res.write(JSON.stringify(filterBlocks(doc)));
            res.end();
          });
        }
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

    web3.eth.getBlock(blockNumOrHash, uncleIdx, function(err, uncle) {
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

exports.eth = web3.eth;
