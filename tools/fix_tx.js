/*
  Tool for breaking out transactions

  DEPRECATED: DO NOT USE
*/

var mongoose = require( 'mongoose' );
require( '../db.js' );
var async = require('async');
var Block     = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );

var getTx = function() {
  mongoose.connection.on("open", function(err,conn) { 

    Block.find({}, "transactions timestamp").lean(true).exec(function(err, docs) {
        async.forEach(docs, function(doc, cb) {
            var bulkOps = [];
          if (doc.transactions.length > 0) {
            for (d in doc.transactions) {
                var txData = doc.transactions[d];
                txData.timestamp = doc.timestamp;
                bulkOps.push(txData);
            }
              Transaction.collection.insert(bulkOps, function( err, tx ){
                if ( typeof err !== 'undefined' && err ) {
                    if (err.code == 11000) {
                        console.log('Skip: Duplicate key ' + 
                        err);
                    } else {
                       console.log('Error: Aborted due to error: ' + 
                            err);
                       process.exit(9);
                   }
                } else {
                    console.log('DB successfully written for block ' +
                        tx.length.toString() );
                    
                }
                bulkOps = [];
                cb();
              });
        
          }
    }, function() { return; });
      });  
  })
}

getTx()