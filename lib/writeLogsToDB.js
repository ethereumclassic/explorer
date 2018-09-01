/**
  Break transactions out of blocks and write to DB
**/
//db
var mongoose        = require( 'mongoose' );
var Logs     = mongoose.model( 'Logs' );

var web3 = require('../tools/ethernode.js');
var blockLib = require('./blockLib.js');

 var writeLogsToDB = function(logs) {
        console.log("LOG----------------------------" + logs);
        Logs.collection.insert(logs, function( err, tx ){
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
             console.log('* ' + tx.insertedCount + ' logs successfully recorded.');
           }
          });
         }


module.exports = writeLogsToDB;
