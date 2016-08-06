#!/usr/bin/env node

/*
    Stand-in for local testing of web3 calls
*/
var BigNumber = require('bignumber.js');

exports.data = function(req, res){
  console.log(req.body)
  
  if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();

    var addrData = {};

    addrData["balance"] = new BigNumber(75380000001024);
    addrData["count"] = 139;
    addrData["isContract"] = true;
    addrData["bytecode"] = "0x606060405236156100f8576000357c010000000000000000000000000000000000000000000000000000000090048063173825d9146101605780632f54bf6e1461";
    
    res.write(JSON.stringify(addrData));
    res.end();


  } else if ("tx" in req.body) {
    var tx = {
      blockHash: "0x59fee9b288d1201841ca59569026a93fa0e32f350224019747145cc52d2877ba",
      blockNumber: 2004907,
      from: "0xf9436cd1bc93805bd54326dbb8857e15e9e5ef4a",
      gas: 90000,
      gasPrice: 20000000000,
      hash: "0x3868a24286d737841f42c55384b5593111defccfcec4a2d0b38115d67b10af6c",
      input: "0x",
      nonce: 3042,
      to: "0x7172e090ef7aad8fb5b58052040587aaf248d7be",
      transactionIndex: 5,
      value: 400000000000000000000
    }

    res.write(JSON.stringify(tx));
    res.end();
  
  } else {
  
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }

};
  