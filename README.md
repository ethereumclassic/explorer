# ETCExplorer (In Progress)

##License

The code in this branch is licensed under GPLv3 (see LICENSE file)

Code in the MIT branch is under the MIT License (shocker, amirite)

But seriously, license file has a TL;DR, at least look at that before using this code in a project

Clone the repo

`git clone https://github.com/ethereumproject/explorer`

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

Install dependencies:

`npm install`

### Populate the DB

This will fetch and parse the entire blockchain.

`node ./tools/grabber.js`

TODO (Elaine): define options in config.json

