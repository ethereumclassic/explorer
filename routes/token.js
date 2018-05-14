#!/usr/bin/env node

/*
    Endpoint for client interface with ERC-20 tokens
*/

require( '../db.js' );

var mongoose = require( 'mongoose' );
var Contract = mongoose.model( 'Contract' );

var eth = require('./web3relay').eth;

var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")
var async = require('async');

const ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"}];

module.exports = function(req, res){
  console.log(req.body)
  if (!("action" in req.body)) {
    res.status(400).send();
    return;
  }

  var contractAddress = req.body.address;

  async.waterfall([
    function(callback) {
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
          callback(null, token);
        });
    }
  ], function(error, token) {
  if (req.body.action=="info") {
    try {
      var actualBalance = eth.getBalance(contractAddress);
      actualBalance = etherUnits.toEther(actualBalance, 'wei');
      var totalSupply = token.totalSupply();
      // totalSupply = etherUnits.toEther(totalSupply, 'wei')*100;
      var decimals = token.decimals ? token.decimals() : 0;
      var name = token.name();
      var symbol = token.symbol();
      var count = eth.getTransactionCount(contractAddress);
      var tokenData = {
        "balance": actualBalance,
        "total_supply": totalSupply,
        "count": count,
        "name": name,
        "symbol": symbol,
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
      // tokens = etherUnits.toEther(tokens, 'wei')*100;
      res.write(JSON.stringify({"tokens": tokens}));
      res.end();
    } catch (e) {
      console.error(e);
    }
  }
  });
  
};  

const MAX_ENTRIES = 50;