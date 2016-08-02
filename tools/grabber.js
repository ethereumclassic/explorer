var express = require('express');
var app = express();

var fs = require('fs');

var Web3 = require('web3');


var grabBlocks = function(config) {
    var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:' + 
        config.gethPort.toString()));
    setTimeout(function() {
        grabBlock(config, web3, config.blocks.pop());
    }, 2000);
}

var grabBlock = function(config, web3, blockHashOrNumber) {
    
    var desiredBlockHashOrNumber;

    // check if done
    if(blockHashOrNumber == undefined) {
        return; 
    }

    if (typeof blockHashOrNumber === 'object') {
        if('start' in blockHashOrNumber && 'end' in blockHashOrNumber) {
            desiredBlockHashOrNumber = blockHashOrNumber.end;
        }
        else {
            console.log('Error: Aborted becasue found a interval in blocks ' +
                'array that doesn\'t have both a start and end.');
            process.exit(9);
        }
    }
    else {
        desiredBlockHashOrNumber = blockHashOrNumber;
    }

    if(web3.isConnected()) {

        web3.eth.getBlock(desiredBlockHashOrNumber, true, function(error, blockData) {
            if(error) {
                console.log('Warning: error on getting block with hash/number: ' +
                    desiredBlockHashOrNumber + ': ' + error);
            }
            else if(blockData == null) {
                console.log('Warning: null block data received from the block with hash/number: ' +
                    desiredBlockHashOrNumber);
            }
            else {
                if('terminateAtExistingFile' in config && config.terminateAtExistingFile === true) {
                    checkBlockFileExistsThenWrite(config, blockData);
                }
                else {
                    writeBlockToFile(config, blockData);
                }

                if('hash' in blockData && 'number' in blockData) {
                    // If currently working on an interval (typeof blockHashOrNumber === 'object') and 
                    // the block number or block hash just grabbed isn't equal to the start yet: 
                    // then grab the parent block number (<this block's number> - 1). Otherwise done 
                    // with this interval object (or not currently working on an interval) 
                    // -> so move onto the next thing in the blocks array.
                    if(typeof blockHashOrNumber === 'object' &&
                        (
                            (typeof blockHashOrNumber['start'] === 'string' && blockData['hash'] !== blockHashOrNumber['start']) ||
                            (typeof blockHashOrNumber['start'] === 'number' && blockData['number'] > blockHashOrNumber['start'])
                        )
                    ) {
                        blockHashOrNumber['end'] = blockData['number'] - 1;
                        grabBlock(config, web3, blockHashOrNumber);
                    }
                    else {
                        grabBlock(config, web3, config.blocks.pop());
                    }
                }
                else {
                    console.log('Error: No hash or number was found for block: ' + blockHashOrNumber);
                    process.exit(9);
                }
            }
        });
    }
    else {
        console.log('Error: Aborted due to web3 is not connected when trying to ' +
            'get block ' + desiredBlockHashOrNumber);
        process.exit(9);
    }
}


var writeBlockToFile = function(config, blockData) {
    var blockFilename = blockData.number + '.json';
    var fileContents = JSON.stringify(blockData, null, 4);

    fs.writeFile(config.output + '/' + blockFilename, fileContents, function(error) {
        if(error) {
            console.log('Error: Aborted due to error on writting to file for ' + 
                'block number ' + blockData.number.toString() + ': "' + 
                config.output + '/' + blockFilename + '"');
            console.log('Error Received: ' + error);
            process.exit(9);
        }
        else {
            if(!('quiet' in config && config.quiet === true)) {
                console.log('File successfully written for block number ' +
                    blockData.number.toString() + ': "' + config.output + '/' +
                    blockFilename + '"');
            }
        }
    });
}

/**
  * Checks if the a file exists for the block number then ->
  *     if file exists: abort
  *     if file DNE: write a file for the block
  */
var checkBlockFileExistsThenWrite = function(config, blockData) {
    var blockFilePath = config.output + '/' + blockData.number + '.json';
    fs.stat(blockFilePath, function(error, stat) {
        if(error == null) {
            console.log('Aborting because block number: ' + blockData.number.toString() + 
                ' already has a json file for it.');
            process.exit(9);
        }
        else if(error.code == 'ENOENT') {
            writeBlockToFile(config, blockData);
        }
        else {
            console.log('Error: Aborted due to error when checking if file exists for block number: ' + 
                blockData.number.toString(), error.code);
            process.exit(9);
        }
    });
}

/** On Startup **/
// start geth with: geth --rpc --rpccorsdomain 'http://localhost:8000'
// read input arguments
// possible args: 
//      output (output directory, this directory if not provided)
//      gethPort (geth port on local host (optional, defult = 8545))

var config = {};

try {
    var configContents = fs.readFileSync('config.json');
    config = JSON.parse(configContents);
}
catch (error) {
    if (error.code === 'ENOENT') {
        console.log('No config file found. Using default configuration (will ' + 
            'download all blocks starting from latest)');
    }
    else {
        throw error;
        process.exit(1);
    }
}

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

console.log('Using configuration:');
console.log(config);
grabBlocks(config);

app.listen(4000);