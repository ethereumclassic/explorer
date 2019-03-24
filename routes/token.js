#!/usr/bin/env node

/*
    Endpoint for client interface with ERC-20 tokens
*/

const { eth } = require('./web3relay');

const BigNumber = require('bignumber.js');

const etherUnits = require(`${__lib}etherUnits.js`);

const ABI = [{
  'constant': true, 'inputs': [], 'name': 'name', 'outputs': [{ 'name': '', 'type': 'string' }], 'payable': false, 'type': 'function',
}, {
  'constant': true, 'inputs': [], 'name': 'totalSupply', 'outputs': [{ 'name': '', 'type': 'uint256' }], 'payable': false, 'type': 'function',
}, {
  'constant': true, 'inputs': [], 'name': 'decimals', 'outputs': [{ 'name': '', 'type': 'uint8' }], 'payable': false, 'type': 'function',
}, {
  'constant': true, 'inputs': [{ 'name': '', 'type': 'address' }], 'name': 'balanceOf', 'outputs': [{ 'name': '', 'type': 'uint256' }], 'payable': false, 'type': 'function',
}, {
  'constant': true, 'inputs': [], 'name': 'symbol', 'outputs': [{ 'name': '', 'type': 'string' }], 'payable': false, 'type': 'function',
}];

module.exports = async (req, res) => {
  console.log(req.body);

  const contractAddress = req.body.address;

  const Token = new eth.Contract(ABI, contractAddress);

  if (!('action' in req.body)) res.status(400).send();
  else if (req.body.action == 'info') {
    try {
      let actualBalance = await eth.getBalance(contractAddress);
      actualBalance = etherUnits.toEther(actualBalance, 'wei');
      const totalSupply = await Token.methods.totalSupply().call();
      const name = await Token.methods.name().call();
      const symbol = await Token.methods.symbol().call();
      const count = await eth.getTransactionCount(contractAddress);

      const tokenData = {
        'balance': actualBalance,
        'total_supply': totalSupply,
        'count': count,
        'name': name,
        'symbol': symbol,
        'bytecode': await eth.getCode(contractAddress),
      };
      res.write(JSON.stringify(tokenData));
      res.end();
    } catch (e) {
      console.error(e);
    }
  } else if (req.body.action == 'balanceOf') {
    const addr = req.body.user.toLowerCase();
    try {
      const tokens = await Token.methods.balanceOf(addr).call();
      res.write(JSON.stringify({ 'tokens': tokens }));
      res.end();
    } catch (e) {
      console.error(e);
    }
  }

};
