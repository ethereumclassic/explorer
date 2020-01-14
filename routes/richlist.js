#!/usr/bin/env node
/**
 * Endpoint for richlist
 */

const async = require('async');
const mongoose = require('mongoose');
const _ = require('lodash');

require('../db.js');

const Account = mongoose.model('Account');

// load config.json
let config = {};
try {
  config = require('../config.json');
  console.log('config.json found.');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    config = require('../config.example.json');
    console.log('No config file found. Using default configuration... (config.example.json)');
  } else {
    throw error;
    process.exit(1);
  }
}

var getAccounts = function (req, res) {
  const self = getAccounts;
  if (!self.totalSupply) {
    self.totalSupply = {};
    self.timestamp = {};
    self.count = {};
    self.cacheTime = config.settings.cacheTime || 30*60;
  }

  // search word
  var search = req.body.search && req.body.search.value;
  var searchArg = {};
  var searchType = -1;
  if (search) {
    // check user defined accountTypes
    if (config.settings.accountTypes) {
      try {
        var searchre = new RegExp(search, 'i');
        _.forEach(config.settings.accountTypes, function(v, k) {
          if (v.match(searchre)) {
            searchType = (k << 3) | 0x4; // user defined type
            return false;
          }
        });
      } catch (e) {
        // ignore
      }
    }

    // check default account types
    if (searchType < 0) {
      try {
        var searchre = new RegExp(search, 'i');
        if ('account'.match(searchre)) {
          searchType = 0; // normal account
        } else if ('contract'.match(searchre)) {
          searchType = 1; // contract
        }
      } catch (e) {
        // ignore
      }
    }
    if (searchType >= 0) {
      searchArg = { type: searchType };
    }
  }

  // check cached totalSupply and count
  if (!self.timestamp[searchType] || new Date() - self.timestamp[searchType] > self.cacheTime*1000) {
    self.totalSupply[searchType] = -1;
    self.timestamp[searchType] = 0;
    self.count[searchType] = 0;
  }

  // count accounts only once
  let count = self.count[searchType] || 0;
  count = parseInt(count);
  if (count < 0) {
    count = 0;
  }

  // get totalSupply only once
  const queryTotalSupply = self.totalSupply[searchType] || -1;

  var aggregateArg = [];
  if (searchType >= 0) {
    aggregateArg.push({ $match: searchArg });
  }
  aggregateArg.push({ $group: { _id: null, totalSupply: { $sum: '$balance' } } });

  async.waterfall([
    function (callback) {
      if (queryTotalSupply < 0) {
        Account.aggregate(aggregateArg).exec((err, docs) => {
          if (err) {
            callbck(err);
            return;
          }

          if (docs.length == 0) {
            callback(true);
            return;
          }
          const { totalSupply } = docs[0];

          // update cache
          self.timestamp[searchType] = new Date();
          self.totalSupply[searchType] = totalSupply;
          callback(null, totalSupply);
        });
      } else {
        callback(null, queryTotalSupply > 0 ? queryTotalSupply : null);
      }
    },
    function (totalSupply, callback) {
      if (!count) {
        // get the number of all accounts
        Account.count(searchArg, (err, count) => {
          if (err) {
            callbck(err);
            return;
          }

          count = parseInt(count);
          self.count[searchType] = count;
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

    Account.find(searchArg).lean(true).sort(sortOrder).skip(start)
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
