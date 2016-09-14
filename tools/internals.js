require( '../db-internal.js' );

var express = require('express');
var app = express();

var http = require('http');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var mongoose = require( 'mongoose' );
var InternalTx     = mongoose.model( 'InternalTransaction' );

const BATCH_SIZE = 100;

function grabInternalTxs(batchNum) {
  var fromBlock = web3.toHex(batchNum);
  var toBlock = web3.toHex(batchNum + BATCH_SIZE - 1);
  var post_data = '{ \
    "jsonrpc":"2.0", \
    "method":"trace_filter", \
    "params":[{"fromBlock":"' + fromBlock + '", \
    "toBlock":"' + toBlock + '"}], \
    "id":' + batchNum + '}';

  var post_options = {
      host: '54.175.149.212',
      port: '8545',
      path: '/',
      method: 'POST',
      headers: { "Content-Type": "application/json" }
  };

  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      var data;
      res.on('data', function (chunk) {
        console.log(chunk);
        if (chunk)
            data = chunk;
      });
      res.on('end', function() {
        try {
            var jdata = JSON.parse(data);
        } catch (e) {
            console.error(e);
            console.error(post_data);
            return
        }
          for (d in jdata.result) {
            var j = jdata.result[d];
            if (j.action.gas)
              j.action.gas = web3.toDecimal(j.action.gas);
            if (j.result.gasUsed)
              j.result.gasUsed = web3.toDecimal(j.result.gasUsed);
            j.subtraces = web3.toDecimal(j.subtraces);
            j.transactionPosition = web3.toDecimal(j.transactionPosition);
            writeTxToDB(j);
          }
      });
  });

  post_req.write(post_data);
  post_req.end();

}

var writeTxToDB = function(txData) {
    return InternalTx(txData, txData, {upsert: true}, function( err, tx ){
        if ( typeof err !== 'undefined' && err ) {
            if (err.code == 11000) {
                console.log('Skip: Duplicate key ' + 
                txData.number.toString() + ': ' + 
                err);
            } else {
               console.log('Error: Aborted due to error: ' + 
                    err);
               process.exit(9);
           }
        } else {
            console.log('DB successfully written for block number ' +
                txData.blockNumber.toString() );
        }
      });
}


var minutes = 0.5;
statInterval = minutes * 60 * 1000;

var count = 46000;
setInterval(function() {
    grabInternalTxs(count);
    count += BATCH_SIZE;
    if (count > 2252020)
        process.exit(9);
}, statInterval);


