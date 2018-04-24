# ETCExplorer

<b>Live Version: [etherhub.io](http://etherhub.io)</b>

Follow the project progress at: [ETC Block Explorer Development](https://github.com/ethernodeio/explorer)

## Local installation

Clone the repo

`git clone https://github.com/ethernodeio/explorer`

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

Install dependencies:

`npm install`

Install mongodb:

MacOS: `brew install mongodb`

Ubuntu: `sudo apt-get install -y mongodb-org`

## Populate the DB

This will fetch and parse the entire blockchain.

Configuration file: `/conf.json`

Basic settings:
```json
{
    "nodeAddr":     "localhost",
    "gethPort":     8545,
    "startBlock":   0,
    "endBlock":     "latest",
    "quiet":        true,
    "syncAll":      true,
    "patch":        true,
    "patchBlocks":  100,
    "blocks": [ {"start": 2000000, "end": "latest"}],
    "settings": {
        "symbol": "ETC",
        "name": "Ethereum Classic",
        "title": "Ethereum Classic Block Explorer",
        "author": "Elaine"
    }
}

```

```nodeAddr```    Your node API RPC address.
```gethPort```    Your node API RPC port.
```startBLock```  This is the start block of the blockchain, should always be 0 if you want to sync the whole ETC blockchain.
```endBlock````   This is usually the 'latest'/'newest' block in the blockchain, this value gets updated automatically, and will be used to patch missing blocks if the whole app goes down.
```quiet```       Prints out the log of what it is doing, Might not work for all messages in this release
```syncAll```     If this is set to true at the start of the app, the sync will start syncing all blocks from lastSync, and if lastSync is 0 it will start from whatever the endBlock or latest block in the blockchain is.
```patch```       If set to true and below value is set, sync will iterated through the # of blocks specified
```patchBlocks``` If `patch` is set to true, the amount of block specified will be check from the latest one.


### Run:
If you run

  `npm start app.js`

it will also start sync.js and start syncing the blockchain based on set parameters. NOTE running app.js will always start sync.js keep listening and syncing the latest block.

You can leave sync.js running without app.js and it will sync and grab blocks based on config.json parameters
`node ./tools/sync.js`
