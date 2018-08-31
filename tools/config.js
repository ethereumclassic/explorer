var _ = require('lodash');


/*Start config for node connection and sync*/
// load config.json
var config = { nodeAddr: 'localhost', gethPort: 8545 };

try {
  var local = require('../config.json');
  _.extend(config, local);
  console.log('config.json found.');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    var local = require('../config.example.json');
    _.extend(config, local);
    console.log('No config file found. Using default configuration... (config.example.json)');
    } else {
      throw error;
     process.exit(1);
   }
}

// set defaults
// set the default geth port if it's not provided
if (!('gethPort' in config) || (typeof config.gethPort) !== 'number') {
    config.gethPort = 8545; // default
}
// set the default output directory if it's not provided
if (!('output' in config) || (typeof config.output) !== 'string') {
    config.output = '.'; // default this directory
}
// set the default blocks if it's not provided
if (!('blocks' in config) || !(Array.isArray(config.blocks))) {
    config.blocks = [];
    config.blocks.push({'start': 0, 'end': 'latest'});
}
// set the default size of array in block to use bulk operation.
if (!('bulkSize' in config) || (typeof config.bulkSize) !== 'number') {
  config.bulkSize = 100;
}

module.exports = config;
