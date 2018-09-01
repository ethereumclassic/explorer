/**
  Break transactions out of blocks and write to DB
**/
//db
var mongoose        = require( 'mongoose' );
var TransactionReceipt     = mongoose.model( 'transactionReceipt' );

var web3 = require('../tools/ethernode.js');
var blockLib = require('./blockLib.js');

 var writeTransactionReceiptToDB = function(txhash) {
   if(web3.isConnected()) {
     web3.eth.getTransactionReceipt(txhash, function(error,receipt) {
       if(error) {
         console.log('Warning: error on getting tx receipt with hash/number: ' +   txhash + ': ' + error);
       }else if(receipt == null) {
         console.log('Warning: null receipt received from the transaction with hash/number: ' + txhash);
       }else{
          if(receipt.logs.length > 0 ){
            blockLib.writeLogsToDB(receipt.logs);
          }
         TransactionReceipt.collection.insert(receipt, function( err, tx ){
           if ( typeof err !== 'undefined' && err ) {
             if (err.code == 11000) {
               if(!('quiet' in config && config.quiet === true)) {
                 console.log('Skip: Duplicate transaction key ' + err);
               }
             } else {
               console.log('Error: Aborted due to error on Transaction: ' + err);
               process.exit(9);
             }
           }else{
             console.log('* ' + tx.insertedCount + ' successfully recorded.');
           }
          });
         }
       })
   }else{
     console.log('Error: Web3 connection time out trying to get receipt ' + txhash + ' retrying connection now');
   }
 }


module.exports = writeTransactionReceiptToDB;
