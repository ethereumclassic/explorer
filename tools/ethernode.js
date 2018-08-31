//* Web3 information *//
var Web3 = require('zsl-web3.js');
var config = require('../tools/config.js');


function buildURI(config) {
  // set the default NODE address to localhost if it's not provided
  if (!('nodeAddr' in config) || !(config.nodeAddr)) {
    config.nodeAddr = 'localhost'; // default
  }
  // set the default geth port if it's not provided
  if (!('gethPort' in config) || (typeof config.gethPort) !== 'number') {
    config.gethPort = 8545; // default
  }
  //set protocol
  if (!('isSSL' in config) || !(config.isSSL)) {
    var protocol = "http://";
  } else {
    var protocol = "https://";
  }
  //true is using unsigned certs
  if (!('unsafeTLS' in config) || (config.unsafeTLS)) {
    console.log("unsafely ignoring self signed certs!");
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  //timeout
  if (!('timeout' in config) || (typeof config.timeout) !== 'number') {
    config.timeout = 0; // default
  }
  // put it all together
  if (!('userName' in config)) {
    var uri = protocol
              + config.nodeAddr + ":" + config.gethPort.toString()
              + "," + config.timeout;
    //console.log('Connecting ' + protocol  + config.nodeAddr + ':' + config.gethPort + '...');
  } else {
    var uri = {"url" : protocol
            + config.nodeAddr + ":" + config.gethPort.toString()
            , "timeout" : config.timeout
            , "userName" : config.userName
            , "password" : config.password};
   //console.log('Connecting ' + protocol + config.nodeAddr + ':' + config.gethPort + ' with user: ' + config.userName + ' ...');
  }
  return uri;
}

module.exports = new Web3(new Web3.providers.HttpProvider(buildURI(config).url, buildURI(config).timeout, buildURI(config).userName, buildURI(config).password));
