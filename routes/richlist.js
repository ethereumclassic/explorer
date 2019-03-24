#!/usr/bin/env node
/**
 * Endpoint for richlist
 */

const async = require('async');
const mongoose = require('mongoose');

require('../db.js');

const Account = mongoose.model('Account');

var getAccounts = function (req, res) {
  const self = getAccounts;
  if (!self.totalSupply) {
    self.totalSupply = -1;
    self.timestamp = 0;
  }

  // check cached totalSupply
  if (new Date() - self.timestamp > 30 * 60 * 1000) {
    self.totalSupply = -1;
    self.timestamp = 0;
  }

  // count accounts only once
  let count = req.body.recordsTotal || 0;
  count = parseInt(count);
  if (count < 0) {
    count = 0;
  }

  // get totalSupply only once
  const queryTotalSupply = self.totalSupply || req.body.totalSupply || null;

  async.waterfall([
    function (callback) {
      if (queryTotalSupply < 0) {
        Account.aggregate([
          { $group: { _id: null, totalSupply: { $sum: '$balance' } } },
        ]).exec((err, docs) => {
          if (err) {
            callbck(err);
            return;
          }

          const { totalSupply } = docs[0];
          // update cache
          self.timestamp = new Date();
          self.totalSupply = totalSupply;
          callback(null, totalSupply);
        });
      } else {
        callback(null, queryTotalSupply > 0 ? queryTotalSupply : null);
      }
    },
    function (totalSupply, callback) {
      if (!count) {
        // get the number of all accounts
        Account.count({}, (err, count) => {
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
    },
  ], (error, totalSupply, count) => {
    if (error) {
      res.write(JSON.stringify({ 'error': true }));
      res.end();
      return;
    }

    // check sort order
    let sortOrder = { balance: -1 };
    if (req.body.order && req.body.order[0] && req.body.order[0].column) {
      // balance column
      if (req.body.order[0].column == 3) {
        if (req.body.order[0].dir == 'asc') {
          sortOrder = { balance: 1 };
        }
      }
      if (req.body.order[0].column == 2) {
        // sort by account type and balance
        if (req.body.order[0].dir == 'asc') {
          sortOrder = { type: -1, balance: -1 };
        }
      }
    }

    // set datatable params
    const limit = parseInt(req.body.length);
    const start = parseInt(req.body.start);

    const data = { draw: parseInt(req.body.draw), recordsFiltered: count, recordsTotal: count };
    if (totalSupply > 0) {
      data.totalSupply = totalSupply;
    }

    Account.find({}).lean(true).sort(sortOrder).skip(start)
      .limit(limit)
      .exec((err, accounts) => {
        if (err) {
          res.write(JSON.stringify({ 'error': true }));
          res.end();
          return;
        }

        data.data = accounts.map((account, i) => [i + 1 + start, account.address, account.type, account.balance, account.blockNumber]);
        res.write(JSON.stringify(data));
        res.end();
      });
  });
};

module.exports = getAccounts;
