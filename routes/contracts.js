/*
  Stuff to deal with verified contracts in DB
*/

require('../db.js');
const mongoose = require('mongoose');

const Contract = mongoose.model('Contract');

exports.addContract = function (contract) {
  Contract.update(
    { address: contract.address },
    { $setOnInsert: contract },
    { upsert: true },
    (err, data) => {
      console.log(data);
    },
  );
};

exports.findContract = function (address, res) {
  const contractFind = Contract.findOne({ address }).lean(true);
  contractFind.exec((err, doc) => {
    if (err) {
      console.error(`ContractFind error: ${err}`);
      console.error(`bad address: ${address}`);
      res.write(JSON.stringify({ 'error': true, 'valid': false }));
    } else if (!doc || !doc.sourceCode) {
      res.write(JSON.stringify({ 'valid': false }));
    } else {
      const data = doc;
      data.valid = true;
      res.write(JSON.stringify(data));
    }
    res.end();
  });
};
