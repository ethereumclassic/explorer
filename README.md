# ETCExplorer (In Progress) 

CURRENT DEVELOPMENT STAGE STAGE: ALPHA 

Follow the project progress at: [ETC Block Explorer Development](https://trello.com/b/W3ftl57z/etc-block-explorer-development) 

## Local installation

Clone the repo

`git clone https://github.com/ethereumproject/explorer`

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

Install dependencies:

`npm install`

### Populate the DB

This will fetch and parse the entire blockchain.

`node ./tools/grabber.js`

TODO (Elaine): define options in config.json

