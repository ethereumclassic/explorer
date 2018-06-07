# ETCExplorer

<b>Live Version: [etherhub.io](http://etherhub.io)</b>

Follow the project progress at: [ETC Block Explorer Development](https://github.com/ethereumproject/explorer)

## Local installation

Clone the repo

`git clone https://github.com/ethereumproject/explorer`

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

Install dependencies:

`npm install`

Install mongodb:

MacOS: `brew install mongodb`

Ubuntu: `sudo apt-get install -y mongodb-org`

## Populate the DB

This will fetch and parse the entire blockchain.

Setup your configuration file: `cp config.example.json config.json`

Edit `config.json` as you wish

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

```startBlock```  This is the start block of the blockchain, should always be 0 if you want to sync the whole ETC blockchain.

```endBlock```    This is usually the 'latest'/'newest' block in the blockchain, this value gets updated automatically, and will be used to patch missing blocks if the whole app goes down.

```quiet```       Suppress some messages. (admittedly still not quiet)

```syncAll```     If this is set to true at the start of the app, the sync will start syncing all blocks from lastSync, and if lastSync is 0 it will start from whatever the endBlock or latest block in the blockchain is.

```patch```       If set to true and below value is set, sync will iterated through the # of blocks specified.

```patchBlocks``` If `patch` is set to true, the amount of block specified will be check from the latest one.


### Run:
The below will start both the web-gui and sync.js (which populates MongoDV with blocks/transactions).
`npm start`

You can leave sync.js running without app.js and it will sync and grab blocks based on config.json parameters
`node ./tools/sync.js`

Enabling stats requires running a separate process:
`node ./tools/stats.js`

You can configure intervals (how often a new data point is pulled) and range (how many blocks to go back) with the following:
`RESCAN=1000:100000 node tools/stats.js` (New data point every 1,000 blocks. Go back 100,000 blocks).