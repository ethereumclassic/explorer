#!/usr/bin/env node

/*
    Endpoint for client interface with ERC-20 tokens
*/

require( '../db.js' );

var mongoose = require( 'mongoose' );
var Contract = mongoose.model( 'Contract' );
var Transaction = mongoose.model( 'Transaction' );

var eth = require('./web3relay').eth;
var web3 = require('./web3relay').web3;

var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")
var async = require('async');
var abiDecoder = require('abi-decoder');
var filterTrace = require('./filters').filterTrace;

const ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];

module.exports = function(req, res){
  console.log(req.body)
  if (!("action" in req.body)) {
    res.status(400).send();
    return;
  }

  var contractAddress = req.body.address;

  async.waterfall([
    function(callback) {
      // get the creation transaction.
      Transaction.findOne({to: contractAddress}).lean(true).sort("blockNumber").exec(function(err, doc) {
        if (err || !doc) {
          callback({error: "true", message: "Token not found"}, null);
          return;
        }
        callback(null, doc);
      });
    },
    function(transaction, callback) {
      Contract.findOne({address: contractAddress}).lean(true)
        .exec(function(err, doc) {
          var contract;
          if (err || !doc) {
            console.log('Contract not found. use default abi.');
            contract = eth.contract(ABI);
          } else {
            try {
              contract = eth.contract(JSON.parse(doc.abi));
            } catch (e) {
              console.log('JSON parse error. use default abi.');
              contract = eth.contract(ABI);
            }
          }
          var token = contract.at(contractAddress);
          callback(null, transaction, contract, token);
        });
    }
  ], function(error, transaction, contract, token) {
    if (error) {
      console.error("Error :", error)
      res.write(JSON.stringify(error));
      res.end();
      return;
    }
  if (req.body.action=="info") {
    try {
      var actualBalance = eth.getBalance(contractAddress);
      actualBalance = etherUnits.toEther(actualBalance, 'wei');
      var totalSupply = token.totalSupply();
      var decimals = token.decimals ? token.decimals() : 0;
      var name = token.name();
      var symbol = token.symbol();
      var count = eth.getTransactionCount(contractAddress);

      // convert totalSupply unit
      var decimalsBN = new BigNumber(decimals);
      var divisor = new BigNumber(10).pow(decimalsBN);
      totalSupply = totalSupply.dividedBy(divisor);

      var tokenData = {
        "balance": actualBalance,
        "total_supply": totalSupply,
        "count": count,
        "name": name,
        "symbol": symbol,
        "creator": transaction.from,
        "transaction": transaction.hash,
        "timestamp": transaction.timestamp,
        "decimals": decimals,
        "bytecode": eth.getCode(contractAddress)
      }
      res.write(JSON.stringify(tokenData));
      res.end();
    } catch (e) {
      console.error(e);
    }
  } else if (req.body.action=="balanceOf") {
    var addr = req.body.user.toLowerCase();
    try {
      var tokens = token.balanceOf(addr);
      var decimals = token.decimals ? token.decimals() : 0;
      var decimalsBN = new BigNumber(decimals);
      var divisor = new BigNumber(10).pow(decimalsBN);
      tokens = tokens.dividedBy(divisor);
      res.write(JSON.stringify({"tokens": tokens}));
      res.end();
    } catch (e) {
      console.error(e);
    }
  } else if (req.body.action == "transfer") {
    var addr = req.body.address.toLowerCase();
    abiDecoder.addABI(contract.abi);

    // convert token unit
    var decimals = 0;
    try {
      decimals = token.decimals ? token.decimals() : 0;
    } catch (e) {
      console.log('Not a valid ERC20 token. ignored');
    }
    var decimalsBN = new BigNumber(decimals);
    var divisor = new BigNumber(10).pow(decimalsBN);

    var fromBlock = transaction.blockNumber;
    fromBlock = web3.toHex(fromBlock);
    var filter = {"fromBlock": fromBlock, "toAddress":[addr]};
    web3.trace.filter(filter, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        var txns = filterTrace(tx);
        var transfers = [];
        txns.forEach(function(t) {
          if (t.type == "call") {
            var callInfo = abiDecoder.decodeMethod(t.action.input);
            if (callInfo && callInfo.name && callInfo.name == 'transfer') {
              // convert amount
              var amount = new BigNumber(callInfo.params[1].value);
              t.amount = amount.dividedBy(divisor);
              // replace to address with _to address arg
              t.to = callInfo.params[0].value;
              t.callInfo = callInfo;
              transfers.push(t);
            }
          }
        });
        res.write(JSON.stringify(transfers));
      }
      res.end();
    })
  } else if (req.body.action == "transaction") {
    var addr = req.body.address.toLowerCase();
    abiDecoder.addABI(contract.abi);

    var fromBlock = transaction.blockNumber;
    fromBlock = web3.toHex(fromBlock);
    var filter = {"fromBlock": fromBlock, "toAddress":[addr]};
    web3.trace.filter(filter, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        var txns = filterTrace(tx);
        txns = txns.map(function(t) {
          if (t.type == "call") {
            t.callInfo = abiDecoder.decodeMethod(t.action.input);
          }
          return t;
        });
        res.write(JSON.stringify(filterTrace(txns)));
      }
      res.end();
    })

  }
  });
  
};  

const MAX_ENTRIES = 50;