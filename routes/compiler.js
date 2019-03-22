const solc = require('solc');
const { eth } = require('./web3relay');
const Contract = require('./contracts');

/*
  TODO: support other languages
*/
module.exports = function (req, res) {
  console.log(req.body);
  if (!('action' in req.body)) res.status(400).send();
  if (req.body.action == 'compile') {
    compileSolc(req, res);
  } else if (req.body.action == 'find') {
    Contract.findContract(req.body.addr, res);
  }

};

var compileSolc = async (req, res) => {

  // get bytecode at address
  const { address } = req.body;
  const { version } = req.body;
  const { name } = req.body;
  const input = req.body.code;
  const optimization = !!(req.body.optimization);
  const optimise = (optimization) ? 1 : 0;

  let bytecode = await eth.getCode(address);
  if (bytecode.substring(0, 2) == '0x') bytecode = bytecode.substring(2);

  const data = {
    'address': address,
    'compilerVersion': version,
    'optimization': optimization,
    'contractName': name,
    'sourceCode': input,
  };

  console.log(version);

  try {
    // latest version doesn't need to be loaded remotely
    if (version == 'latest') {
      const output = solc.compile(input, optimise);
      testValidCode(output, data, bytecode, res);
    } else {

      solc.loadRemoteVersion(version, (err, solcV) => {
        if (err) {
          console.error(err);
          res.write(JSON.stringify({ 'valid': false }));
          res.end();
        } else {
          const output = solcV.compile(input, optimise);
          testValidCode(output, data, bytecode, res);
        }
      });
    }
    return;
  } catch (e) {
    console.error(e.stack);
  }

};

var testValidCode = function (output, data, bytecode, response) {
  const verifiedContracts = [];
  for (var contractName in output.contracts) {
    // code and ABI that are needed by web3
    console.log(`${contractName}: ${output.contracts[contractName].bytecode}`);
    verifiedContracts.push({
      'name': contractName,
      'abi': output.contracts[contractName].interface,
      'bytecode': output.contracts[contractName].bytecode,
    });
  }

  // Remove swarm hash
  const bytecodeClean = bytecode.replace(/a165627a7a72305820.{64}0029$/gi, '');

  var contractName = `:${data.contractName}`; // XXX

  // compare to bytecode at address
  if (!output.contracts || !output.contracts[contractName]) data.valid = false;
  else if (output.contracts[contractName].bytecode.indexOf(bytecodeClean) > -1) {
    let contractBytecodeClean = output.contracts[contractName].bytecode.replace(/a165627a7a72305820.{64}0029$/gi, '');
    constructorArgs = contractBytecodeClean.replace(bytecodeClean, '');
    contractBytecodeClean = contractBytecodeClean.replace(constructorArgs, '');

    if (contractBytecodeClean == bytecodeClean) {
      data.valid = true;
      //write to db
      data.abi = output.contracts[contractName].interface;
      data.byteCode = bytecode;
      Contract.addContract(data);
    } else {
      data.valid = false;
    }
  } else data.valid = false;

  data['verifiedContracts'] = verifiedContracts;
  response.write(JSON.stringify(data));
  response.end();
};
