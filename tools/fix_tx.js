/*
  Tool for breaking out transactions
*/

var mongoose = require( 'mongoose' );
require( '../db.js' );
var Block     = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );

var getTx = function(collection) {
  mongoose.connection.on("open", function(err,conn) { 

    var bulkOps = [];
    var count = 0;
    var missingCount = 5200;

    collection.find().forEach(function(doc) {
      if (doc.transactions.length > 0) {
      setTimeout(function() {
        for (d in doc.transactions) {
            var txData = doc.transactions[d];
            txData.timestamp = doc.timestamp;
            bulkOps.push(txData);
        }
          Transaction.collection.insert(bulkOps, {upsert: true}, function( err, tx ){
            if ( typeof err !== 'undefined' && err ) {
                if (err.code == 11000) {
                    console.log('Skip: Duplicate key ' + 
                    tx.hash + ': ' + 
                    err);
                } else {
                   console.log('Error: Aborted due to error: ' + 
                        err);
                   process.exit(9);
               }
            } else {
                console.log('DB successfully written for block ' +
                    doc.number.toString() );
            }
            bulkOps = [];
          });
    
      }, 1000);
      }
    });
        
  })
}

getTx(Block.collection)