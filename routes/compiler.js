var solc = require('solc');

// var eth = require('./web3dummy').eth;
var eth = require('./web3relay').eth;

var Contract = require('./contracts');

/* 
  TODO: support other languages
*/
module.exports = function(req, res) {
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
  if (bytecode.substring(0,2)=="0x")
    bytecode = bytecode.substring(2);

  var data = {
    "address": address,
    "creationTransaction": "", // deal with this later
    "compilerVersion": version,
    "optimization": optimization,
    "contractName": name,
    "sourceCode": input
  }

  console.log(version)

  try {
    // latest version doesn't need to be loaded remotely
    if (version == "latest") {
        var output = solc.compile(input, optimise);
        testValidCode(output, data, bytecode, res);
    } else {

      solc.loadRemoteVersion(version, function(err, solcV) {  
        if (err) {
          console.error(err);
          res.write(JSON.stringify({"valid": false}));
          res.end();
        }
        else {
          var output = solcV.compile(input, optimise); 
          testValidCode(output, data, bytecode, res);
        }
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
    verifiedContracts.push({"name": contractName, 
                            "abi": output.contracts[contractName].interface,
                            "bytecode": output.contracts[contractName].bytecode});
  }

  // compare to bytecode at address
  if (!output.contracts || !output.contracts[data.contractName])
    data.valid = false;
  else if (output.contracts[data.contractName].bytecode.indexOf(bytecode) > -1){
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