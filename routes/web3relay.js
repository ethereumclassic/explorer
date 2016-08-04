#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("web3");
var web3

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

exports.data = function(req, res){
  //var call = req.body.call.toLowerCase();

  var blocks = getLatest();
  res.write(JSON.stringify(blocks));
  res.end();

};

function getLatest() {
  var blocks = [];
  for (var i=0; i < 10; i++) {
    blocks.push(web3.eth.getBlock(web3.eth.blockNumber - i));
  }
  return blocks;
}
