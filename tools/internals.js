/****
  DEPRECATED -- DO NOT USE
***/

require( '../db-internal.js' );

var http = require('http');
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var mongoose = require( 'mongoose' );
var InternalTx     = mongoose.model( 'InternalTransaction' );

const BATCH_SIZE = 10;

function grabInternalTxs(batchNum, batchSize) {
  var fromBlock = web3.toHex(batchNum);
  var toBlock = web3.toHex(batchNum + batchSize - 1);
  var post_data = '{ \
    "jsonrpc":"2.0", \
    "method":"trace_filter", \
    "params":[{"fromBlock":"' + fromBlock + '", \
    "toBlock":"' + toBlock + '"}], \
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
      var data;
      res.on('data', function (chunk) {
        if (chunk)
            data = chunk;
      });
      res.on('end', function() {
        try {
            var jdata = JSON.parse(data);
        } catch (e) {
            console.error(e);
            if (batchSize > 1) {
                for (var b=0; b<batchSize; b++) {
                    grabInternalTxs(batchNum+b, 1);
                }
            } else {
                console.error(post_data);
            }
            return
        }
          // console.log(data);
          for (d in jdata.result) {
            var j = jdata.result[d];
            if (j.action.call)
              j.action = j.action.call;
            else if (j.action.create)
              j.action = j.action.create;
            else if (j.action.suicide)
              j.action = j.action.suicide;

            if (j.action.callType)
              j.action.callType = Object.keys(j.action.callType)[0]
            if (j.result.call)
              j.result = j.result.call;
            else if (j.result.create)
              j.result = j.result.create;
            else if (j.result.suicide)
              j.result = j.result.suicide;
            if (j.action.gas)
              j.action.gas = web3.toDecimal(j.action.gas);
            if (j.result.gasUsed)
              j.result.gasUsed = web3.toDecimal(j.result.gasUsed);
            j.subtraces = web3.toDecimal(j.subtraces);
            j.transactionPosition = web3.toDecimal(j.transactionPosition);
            j.blockNumber = web3.toDecimal(j.blockNumber);
            var block = web3.eth.getBlock(j.blockNumber);
            j.timestamp = block.timestamp;
            writeTxToDB(j);
          }
      });
  });

  post_req.write(post_data);
  post_req.end();

}

var writeTxToDB = function(txData) {
  try { 
    InternalTx.findOneAndUpdate(txData, txData, {upsert: true}, function( err, tx ){
        if ( typeof err !== 'undefined' && err ) {
            if (err.code == 11000) {
                console.log('Skip: Duplicate key ' + 
                txData.number.toString() + ': ' + 
                err);
            } else {
               console.log('Error: Aborted due to error: ' + 
                    err);
           }
        } else {
            console.log('DB successfully written for block number ' +
                txData.blockNumber.toString() );
        }
      });
  } catch (e) {
    console.error(e); 
  }
  return;
}

var getLatestBlocks = function(latest, start) {
  var count = start;

  setInterval(function() {
    try {
      grabInternalTxs(count, BATCH_SIZE);
      count += BATCH_SIZE;
      if (count > latest)
        return;
    } catch (e) {
      console.error(e);
      // wait and try again
    }
  }, 1000);  
}


mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/blockDB');
mongoose.set('debug', true);

var minutes = 5;
statInterval = minutes * 60 * 1000;
setInterval(function() {
  // get latest 
  try {
      InternalTx.findOne({}, "blockNumber").lean(true).sort("-blockNumber")
          .exec(function(err, doc) {
            var last = doc.blockNumber;
            var latest = web3.eth.blockNumber;
            getLatestBlocks(latest, last);
          });
  } catch (e) {
    console.error(e);
    // wait and try again
  }
}, statInterval);


