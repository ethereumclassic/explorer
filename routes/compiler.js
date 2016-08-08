var solc = require('solc');

var eth = require('./web3dummy').eth;
//var web3relay = require('./web3relay').eth;

var Contract = require('./contracts');

/* 
  TODO: support other languages
*/
exports.compiler = function(req, res) {
  console.log(req.body);
  if (!("action" in req.body))
    res.status(400).send();
  if (req.body.action=="compile") {
    compileSolc(req, res);
  } else if (req.body.action=="find") {
    Contract.findContract(req.body.addr, res);
  }

}


var compileSolc = function(req, res) {

  // get bytecode at address
  var address = req.body.address;
  var version = req.body.version;
  var name = req.body.name;
  var input = req.body.code;
  var optimization = (req.body.optimization) ? true : false;
  var optimise = (optimization) ? 1 : 0;

  var bytecode = eth.getCode(address);

  var data = {
    "address": address,
    "creationTransaction": "", // deal with this later
    "compilerVersion": version,
    "optimization": optimization,
    "contractName": name,
    "sourceCode": input
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
  if (!output.contracts || !output.contracts[data.contractName])
    data.valid = false;
  else if (output.contracts[data.contractName].bytecode == bytecode){
    data.valid = true;
    //write to db
    data.abi = output.contracts[data.contractName].interface;
    data.byteCode = bytecode;
    Contract.addContract(data);
  }  else
    data.valid = false;

  data["verifiedContracts"] = verifiedContracts;
  response.write(JSON.stringify(data));
  response.end();
}