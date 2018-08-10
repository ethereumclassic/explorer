#!/usr/bin/env node
/**
 * Endpoint for richlist
 */

var async = require('async');
var mongoose = require('mongoose');

require( '../db.js' );
var Account = mongoose.model('Account');

var getAccounts = function(req, res) {
  // count accounts only once
  var count = req.body.recordsTotal || 0;
  count = parseInt(count);
  if (count < 0) {
    count = 0;
  }

  // get totalSupply only once
  var queryTotalSupply = req.body.totalSupply || null;

  async.waterfall([
    function(callback) {
      if (queryTotalSupply < 0) {
        Account.aggregate([
          { $group: { _id: null, totalSupply: { $sum: '$balance' } } }
        ]).exec(function(err, docs) {
          if (err) {
            callbck(err);
            return;
          }

          var totalSupply = docs[0].totalSupply;
          callback(null, totalSupply);
        });
      } else {
        callback(null, null);
      }
    },
    function(totalSupply, callback) {
      if (!count) {
        // get the number of all accounts
        Account.count({}, function(err, count) {
          if (err) {
            callbck(err);
            return;
          }

          count = parseInt(count);
          callback(null, totalSupply, count);
        });
      } else {
        callback(null, totalSupply, count);
      }
    }
  ], function(error, totalSupply, count) {
    if (error) {
      res.write(JSON.stringify({"error": true}));
      res.end();
      return;
    }

    // check sort order
    var sortOrder = '-balance';
    if (req.body.order && req.body.order[0] && req.body.order[0].column) {
      // balance column
      if (req.body.order[0].column == 3) {
        if (req.body.order[0].dir == 'asc') {
          sortOrder = 'balance';
        }
      }
    }

    // set datatable params
    var limit = parseInt(req.body.length);
    var start = parseInt(req.body.start);

    var data = { draw: parseInt(req.body.draw), recordsFiltered: count, recordsTotal: count };
    if (totalSupply > 0) {
      data.totalSupply = totalSupply;
    }

    Account.find({}).lean(true).sort(sortOrder).skip(start).limit(limit)
      .exec(function (err, accounts) {
        if (err) {
          res.write(JSON.stringify({"error": true}));
          res.end();
          return;
        }

        data.data = accounts.map(function(account, i) {
          return [i + 1 + start, account.address, account.type == 0 ? "Account" : "Contract", account.balance, account.blockNumber];
        });
        res.write(JSON.stringify(data));
        res.end();
      }
    );
  });
}

module.exports = getAccounts;
