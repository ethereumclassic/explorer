#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("web3");
var web3;

var extractTX = require('./filters').extractTX;
var getLatestBlocks = require('./index').getLatestBlocks;


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

  // TODO: error handling for invalid calls

  if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();
    var balance = web3.eth.getBalance(addr);
    console.log(balance)
    var count = web3.eth.getTransactionCount(addr);

    res.write(JSON.stringify({"balance": balance, "count": count}));
    res.end();

  } else if ("tx" in req.body) {
    var txHash = req.body.tx.toLowerCase();
    var tx = web3.eth.getTransaction(txHash);

    res.write(JSON.stringify(tx));
    res.end();

  } else {
  
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }

};
  