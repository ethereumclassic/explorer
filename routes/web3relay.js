#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("web3");
var web3;

var extractTX = require('./filters').extractTX;


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
  // TODO: error handling for invalid calls
  var action = req.body.action.toLowerCase();

  if (action in DATA_ACTIONS) {
    
    var data = getData(DATA_ACTIONS[action], {});
    res.write(JSON.stringify(data));
    res.end();

  } else {
  
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }

};
  
function getData(action, options) {
  if (isNaN(options.limit))
    var limit = MAX_ENTRIES;
  else
    var limit = parseInt(options.limit);

  return action(limit);
}

function getLatest(lim) {
  var blocks = [];
  for (var i=0; i < lim; i++) {
    blocks.push(web3.eth.getBlock(web3.eth.blockNumber - i));
  }
  return blocks;
}

function getLatestBlocks(lim) {
  var blocks = getLatest(lim);
  return {"blocks": blocks}
}

function getLatestTxs(lim) {
  var blocks = getLatest(lim);
  var txs = extractTX(blocks);
  return {"txs": txs}
}

const MAX_ENTRIES = 20;

const DATA_ACTIONS = {
  "latest_blocks": getLatestBlocks,
  "latest_txs": getLatestTxs
}
