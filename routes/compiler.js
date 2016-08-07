var solc = require('solc');

var eth = require('./web3dummy').eth;
//var web3relay = require('./web3relay').eth;

/* 
  TODO: support other languages
*/

exports.compileSolc = function(req, res) {
  console.log(req.body);

  // get bytecode at address
  var address = req.body.address;
  var version = req.body.version;
  var name = req.body.name;

  var bytecode = eth.getCode(address);

  try {
    var input = req.body.code;
    // TODO (Elaine): install versions locally
    var solcV = solc.loadRemoteVersion(version, function(err, solcV) {
      var optimise = (req.body.optimization) ? 1 : 0;
      var output = solcV.compile(input, optimise); 
      for (var contractName in output.contracts) {
        // code and ABI that are needed by web3
        console.log(contractName + ': ' + output.contracts[contractName].bytecode);
        console.log(contractName + ': ' + JSON.parse(output.contracts[contractName].interface));
      }

      var data = {
        "address": address,
        "creationTransaction": "", // deal with this later
        "verifiedContracts": output.contracts,
        "compilerVersion": version,
        "optimization": req.body.optimization
      }
      // compare to bytecode at address
      if (output.contracts[name].bytecode == bytecode)
        data.verified = true;
      else
        data.verified = false;

      res.write(JSON.stringify(data));
      res.end();
    });
  } catch (e) {
    console.error(e.stack);
  }

}
