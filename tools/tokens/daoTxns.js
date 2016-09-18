#!/usr/bin/env node

/*
    Thing to get history of DAO transactions
*/

var Web3 = require("web3");
var web3;

require( '../../db-dao.js' );
require( '../../db.js' );
require( '../../db-internal.js' );
var mongoose = require( 'mongoose' );
var DAOCreatedToken = mongoose.model('DAOCreatedToken');
var DAOTransferToken = mongoose.model('DAOTransferToken');
var InternalTx     = mongoose.model( 'InternalTransaction' );
var Block     = mongoose.model( 'Block' );

if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

if (web3.isConnected()) 
  console.log("Web3 connection established");
else
  throw "No connection";


var daoABI = [{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_amount","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_amount","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"value","type":"uint256"}],"name":"FuelingToDate","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"CreatedToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Refund","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"proposalID","type":"uint256"},{"indexed":false,"name":"recipient","type":"address"},{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"newCurator","type":"bool"},{"indexed":false,"name":"description","type":"string"}],"name":"ProposalAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"proposalID","type":"uint256"},{"indexed":false,"name":"position","type":"bool"},{"indexed":true,"name":"voter","type":"address"}],"name":"Voted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"proposalID","type":"uint256"},{"indexed":false,"name":"result","type":"bool"},{"indexed":false,"name":"quorum","type":"uint256"}],"name":"ProposalTallied","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_newCurator","type":"address"}],"name":"NewCurator","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_recipient","type":"address"},{"indexed":false,"name":"_allowed","type":"bool"}],"name":"AllowedRecipientChanged","type":"event"}];
var daoContract = web3.eth.contract(daoABI);
var DAO = daoContract.at("0xbb9bc244d798123fde783fcc1c72d3bb8c189413");

var creationBlock = 1428757;
var creationEnd = 1599205;

var populateCreatedTokens = function () {
  //total: 58713

  var event = DAO.CreatedToken;
  event({}, {fromBlock: creationBlock, toBlock: creationEnd}).get( function(err, log) {
      if (err) {
        console.error(err);
        process.exit(9);
      } else {
        for (var l in log) {
          try {
            var newToken = {
                "transactionHash": log[l].transactionHash,
                "blockNumber": log[l].blockNumber,
                "amount": log[l].args.amount,
                "to": log[l].args.to
            }
          } catch (e) {
            console.error(e);
            continue;
          }

          new DAOCreatedToken(newToken).save( function( err, token, count ){
            if ( typeof err !== 'undefined' && err ) {
              if (err.code == 11000) {
                  console.log('Skip: Duplicate tx ' + 
                  log[l].transactionHash + ': ' + 
                  err);
              } else {
                 console.log('Error: Aborted due to error on ' + 
                      'block number ' + log[l].blockNumber.toString() + ': ' + 
                      err);
                 process.exit(9);
              }
            } else 
              console.log('DB successfully written for tx ' +
                        token.transactionHash );            
            
          });        
        }
      }

  });
}

var populateTransferTokens = function () {

  var event = DAO.Transfer;
  event({}, {fromBlock: creationEnd, toBlock: "latest"}).get( function(err, log) {
      if (err) {
        console.error(err);
        process.exit(9);
      } else {
        for (var l in log) {
          try {
            var newToken = {
                "transactionHash": log[l].transactionHash,
                "blockNumber": log[l].blockNumber,
                "amount": log[l].args._amount,
                "to": log[l].args._to,
                "from": log[l].args._from
            }
          } catch (e) {
            console.error(e);
            continue;
          }
          try {
            var block = web3.eth.getBlock(log[l].blockNumber);
            newToken.timestamp = block.timestamp;
          } catch (e) {
            console.error(e);
            continue;
          }
          new DAOTransferToken(newToken).save( function( err, token, count ){
            if ( typeof err !== 'undefined' && err ) {
              if (err.code == 11000) {
                  console.log('Skip: Duplicate tx ' + 
                  log[l].transactionHash + ': ' + 
                  err);
                  return null;
              } else {
                 console.log('Error: Aborted due to error on ' + 
                      'block number ' + log[l].blockNumber.toString() + ': ' + 
                      err);
                 process.exit(9);
              }
            } else 
              console.log('DB successfully written for tx ' +
                        log[l].transactionHash );            
            
          });        
        }
      }

  });
}

var bulkTimeUpdate = function(bulk, callback) {
  console.log("Bulk execution started");
  bulk.execute(function(err,result) {             
    if (err) 
      console.error(err);
    else 
      console.log(result.toJSON());
  });
}


var patchTimestamps = function(collection) {
  mongoose.connection.on("open", function(err,conn) { 

    var bulk = collection.initializeOrderedBulkOp();

    var bulkOps = [];
    var count = 0;
    var q = 0;
    var missingCount = 5200;
    collection.count({timestamp: null}, function(err, c) {
      missingCount = c;
      console.log("Missing: " + JSON.stringify(missingCount));
    });

    collection.find({timestamp: null}).forEach(function(doc) {
      q++;
      setTimeout(function() {
        try {
          // var block = web3.eth.getBlock(doc.blockNumber);
          var blockFind = Block.findOne( { "number" : doc.blockNumber }, "timestamp").lean(true);
          var block = blockFind.exec(function (err, b) {
            if (err)
              console.error(err); 
            else if (b)
              return b;              
          });
        } catch (e) {
          console.error(e); return;
        }

        bulk.find({ '_id': doc._id }).updateOne({
            '$set': { 'timestamp': block.timestamp }
        });
        count++;
        if(count % 1000 === 0) {
          // Execute per 1000 operations and re-init
          bulkTimeUpdate(bulk);
          bulk = collection.initializeOrderedBulkOp();
        } 
        if(count == missingCount) {
          // Clean up queues
          bulkTimeUpdate(bulk);
        }
      }, 100*q);
    });
        
  })
}


// mongoose.connect( 'mongodb://localhost/blockDB' );
// mongoose.set('debug', true);
5894858

patchTimestamps(InternalTx.collection)
// populateCreatedTokens();
// populateTransferTokens();
