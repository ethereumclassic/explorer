#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("web3");
var web3;

var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")

var extractTX = require('./filters').extractTX;
var getLatestBlocks = require('./index').getLatestBlocks;
var filterBlocks = require('./filters').filterBlocks;


if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

if (web3.isConnected()) 
  console.log("Web3 connection established");
else
  throw "No connection";


var newBlocks = web3.eth.filter("latest");
var newTxs = web3.eth.filter("pending");

/*
exports.clientSocket = function(io) {

  newBlocks.watch(function (error, log) {
    console.log('### JSON emitted to block client: ' + JSON.stringify(log));
    io.emit('block', log);
  });

  newTxs.watch(function (error, log) {
    console.log('### JSON emitted to transaction client: ' + JSON.stringify(log));
    io.emit('tx', log);
  });

}
*/

exports.data = function(req, res){
  console.log(req.body)
  
  if ("addr" in req.body) {
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


  } else if ("tx" in req.body) {
    var txHash = req.body.tx.toLowerCase();

    web3.eth.getTransaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TxWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        var ttx = tx;
        ttx.value = etherUnits.toEther( new BigNumber(tx.value), "wei");
        //get timestamp from block
        var block = web3.eth.getBlock(tx.blockNumber);
        ttx.timestamp = block.timestamp;
        ttx.isTrace = (ttx.input != "0x");
        res.write(JSON.stringify(ttx));
      }
      res.end();
    });

  } else if ("block" in req.body) {
    var blockNum = parseInt(req.body.block);

    web3.eth.getBlock(blockNum, function(err, block) {
      if(err || !block) {
        console.error("BlockWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterBlocks(block)));
      }
      res.end();
    });

  } else if ("trace" in req.body) {
    // TODO: trace for addrs as well
    var txHash = req.body.trace.toLowerCase();

    web3.trace.transaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        for (x in tx) {
          var ttx = [];
          var t = tx[x];
          if (t.action.gas)
            t.gas = web3.toDecimal(t.action.gas);
          if (t.result.gasUsed)
            t.gasUsed = web3.toDecimal(t.result.gasUsed);
          if (t.result.address)
            t.to = t.result.address;
          if (t.action.to)
            t.to = t.action.to;
          t.from = t.action.from;
          t.value = etherUnits.toEther( new BigNumber(t.action.value), "wei");
          ttx.push(t);
        }
        res.write(JSON.stringify(ttx));
      }
      res.end();
    });
  } else {
  
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }

};

exports.eth = web3.eth;
  