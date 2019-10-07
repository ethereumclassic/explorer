const { eth } = require('./web3relay');
const ABI = require('../abi/bios');
const { getConfig } = require('../utils');

const config = getConfig();
if (!config.biosAddress) throw new Error('Setup config.biosAddres');
const contract = new eth.Contract(ABI, config.biosAddress);

module.exports = function (req, res) {
  if (typeof contract.methods.getAuthorities !== 'function') {
    console.error('Contract method \'getAuthorities\' not found', err);
    res.send([]);
    res.end();
  }    
  contract.methods.getAuthorities().call()
    .then(authorities => {      
      res.send(authorities);
      res.end();
    })
    .catch(err => {
      console.error('Can\'t get authorities from contract. Silently return empty array', err);
      res.send([]);
      res.end();
    })
};
