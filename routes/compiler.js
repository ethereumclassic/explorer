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
  var input = req.body.code;
  var optimise = (req.body.optimization) ? 1 : 0;

  var bytecode = eth.getCode(address);

  var data = {
    "address": address,
    "creationTransaction": "", // deal with this later
    "version": version,
    "optimization": req.body.optimization,
    "name": name
  }

  try {
    // latest version doesn't need to be loaded remotely
    if (version.substr(version.length - 8) == "(latest)") {
        var output = solc.compile(input, optimise);
        testValidCode(output, data, bytecode, res);
    } else {

      // TODO (Elaine): install versions locally
      solc.loadRemoteVersion(version, function(err, solcV) {
          
        var output = solcV.compile(input, optimise); 
        testValidCode(output, data, bytecode, res);
      });
    }
    return;
  } catch (e) {
    console.error(e.stack);
  }

}

var testValidCode = function(output, data, bytecode, response) {
  var verifiedContracts = [];
  for (var contractName in output.contracts) {
    // code and ABI that are needed by web3
    console.log(contractName + ': ' + output.contracts[contractName].bytecode);
    console.log(contractName + ': ' + JSON.parse(output.contracts[contractName].interface));
    verifiedContracts.push({"name": contractName, 
                            "abi": output.contracts[contractName].interface,
                            "bytecode": output.contracts[contractName].bytecode});
  }

  // compare to bytecode at address
  if (!output.contracts[data.name])
    data.valid = false;
  else if (output.contracts[data.name].bytecode == bytecode)
    data.valid = true;
  else
    data.valid = false;

  data["verifiedContracts"] = verifiedContracts;
  response.write(JSON.stringify(data));
  response.end();
}