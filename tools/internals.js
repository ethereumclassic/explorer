require( '../db-internal.js' );

var express = require('express');
var app = express();

var http = require('http');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var mongoose = require( 'mongoose' );
var InternalTx     = mongoose.model( 'InternalTransaction' );

const BATCH_SIZE = 1000;

function grabInternalTxs(batchNum) {
  var fromBlock = web3.toHex(batchNum);
  var toBlock = web3.toHex(batchNum + BATCH_SIZE - 1);
  var post_data = '{ \
    "jsonrpc":"2.0", \
    "method":"trace_filter", \
    "params":[{"fromBlock":"' + batchNum + '", \
    "toBlock":"' + toBlock + '""}], \
    "id":' + batchNum + '}';

  var post_options = {
      host: 'localhost',
      port: '8545',
      path: '/',
      method: 'POST',
      headers: { "Content-Type": "application/json" }
  };

  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (data) {
        var jdata = JSON.parse(data);
          console.log('Response: ' + jdata.result);
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
      res.on('end', function() {
        console.log(batchNum);
      });
  });

  post_req.write(post_data);
  post_req.end();

}

var writeTxToDB = function(txData) {
    return new InternalTx.findOneAndUpdate(txData, txData, {upsert: true}, function( err, tx ){
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


var minutes = 0.1;
statInterval = minutes * 60 * 1000;

var count = 1;
setInterval(function() {
    grabInternalTxs(count);
    count += BATCH_SIZE;
    if (count > 2252020)
        process.exit(9);
}, statInterval);


