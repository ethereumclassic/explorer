# ETC Explorer

<img src="public/img/explorer-logo.png" alt="ETC Explorer logo" height="200" />

<b>Live Version: [etherhub.io](http://etherhub.io)</b>

Follow the project progress at: [ETC Block Explorer Development](https://github.com/ethereumclassic/explorer)

## Local installation

Clone the repo

`git clone https://github.com/ethereumclassic/explorer`

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
    "wsPort":       8546,
    "startBlock":   0,
    "endBlock":     "latest",
    "quiet":        true,
    "syncAll":      true,
    "patch":        true,
    "patchBlocks":  100,
    "bulkSize":     100,
    "settings": {
        "symbol": "ETC",
        "name": "Ethereum Classic",
        "title": "Ethereum Classic Block Explorer",
        "author": "Elaine",
        "rss": "https://ethereumclassic.org",
        "reddit": "https://www.reddit.com/r/EthereumClassic",
        "twitter": "https://twitter.com/eth_classic",
        "linkedin": "https://www.linkedin.com/company/ethereum-classic",
        "github": "https://github.com/ethereumclassic",
        "logo": "/img/explorer-logo.png",
        "copyright": "2019 &copy; Ethereum Classic.",
        "poweredbyCustom": false,
        "poweredbyEtcImage": "/img/powered-by-etcexplorer-w.png",
        "poweredbyEtc": true,
        "useRichList": true,
        "useFiat": true,
        "miners": {
            "0xdf7d7e053933b5cc24372f878c90e62dadad5d42": "EtherMine",
            "0xc91716199ccde49dc4fafaeb68925127ac80443f": "F2Pool",
            "0x9eab4b0fc468a7f5d46228bf5a76cb52370d068d": "NanoPool",
            "0x1C0FA194a9d3B44313DCD849F3C6be6Ad270a0A4": "MiningPoolHub",
            "0x4750e296949b747df1585aa67beee8be903dd560": "UUPool",
            "0xef224fa5fad302b51f38898f4df499d7af127af0": "91pool",
            "0x0073Cf1B9230cF3EE8Cab1971B8DbeF21eA7B595": "2miners",
            "0x4c2b4e716883a2c3f6b980b70b577e54b9441060": "ETCPool PL",
            "0xd144e30a0571aaf0d0c050070ac435deba461fab": "Clona Network",
            "0x568f58bf1667504fdf5aa02d776c156f940178a5": "Whalesburg",
            "0x3b2d2613ad66d66ee0cb518aeeccc98e9e3b19c0": "private(0x3b2d2613)",
            "0x919973eb38844313dc31c41e140700d6e333f8d5": "private(0x919973eb)",
            "0xb205f337bad80e28351c7540b741c81470c4927f": "private(0xb205f337)",
            "0x232cad0429e653ab610fbcf7e7ebee2f05f28410": "private(0x232cad04)",
            "0x999c2944807874d3677ee3c6065c8a8a92721ac5": "NinjaPool.jp",
            "0x39cd14977601184b7da518fd352261aad0cb9fd3": "91pool",
            "0xf35074bbd0a9aee46f4ea137971feec024ab704e": "Solo Mining Pools",
            "0xa97ed75172773ec705c2c78d999d3203199101bd": "epool",
            "0x58b3cabd0c5c777da2c1c4d4f7ecc8afe5674f20": "private(0x58b3cabd0)",
            "0x87cfd09c483fe65352456bb26c784a0e4c4ba389": "ArsMine",
            "0x5bc9ccbd3115cefb6f382d33e8ce2a0aba084da4": "private(0x5bc9ccbd3)",
            "0x4924414988feb1ee16e29298509f96317400eb57": "private(0x492441498)",
            "0xa9a926bed50dc038b20bb20de361e4c35aae51fc": "private(0xa9a926bed)",
            "0x0073cf1b9230cf3ee8cab1971b8dbef21ea7b595": "2miners",
            "0x004730417cd2b1d19f6be2679906ded4fa8a64e2": "2miners",
            "0x1c0fa194a9d3b44313dcd849f3c6be6ad270a0a4": "MiningPoolHub"
         }
    }
}

```

| Name  | Explanation |
|-------------|-----|
| `nodeAddr` | Your node API RPC address. |
| `wsPort` | Your node API WS (Websocket) port. (RPC HTTP port is deprecated on Web3 1.0 see https://web3js.readthedocs.io/en/1.0/web3.html#value) |
| `startBlock` | This is the start block of the blockchain, should always be 0 if you want to sync the whole ETC blockchain. |
| `endBlock` | This is usually the 'latest'/'newest' block in the blockchain, this value gets updated automatically, and will be used to patch missing blocks if the whole app goes down. |
| `quiet` | Suppress some messages. (admittedly still not quiet) |
| `syncAll` | If this is set to true at the start of the app, the sync will start syncing all blocks from lastSync, and if lastSync is 0 it will start from whatever the endBlock or latest block in the blockchain is. |
| `patch` | If set to true and below value is set, sync will iterated through the # of blocks specified. |
| `patchBlocks` | If `patch` is set to true, the amount of block specified will be check from the latest one. |
| `useRichList` | If `useRichList` is set to true, explorer will update account balance for richlist page. |
| `useFiat` | If `useFiat` is set to true, explorer will show price for account & tx page. ( Disable for testnets )|

### Mongodb Auth setting.

#### Configure MongoDB

In view of system security, most of mongoDB Admin has setup security options, So, You need to setup mongodb auth informations.
Switch to the built-in admin database:

```
$ mongo
$ > use admin
```

1. Create an administrative user  (if you have already admin or root of mongodb account, then skip it)

```
# make admin auth and role setup
$ > db.createUser( { user: "admin", pwd: "<Enter a secure password>", roles: ["root"] } )
```

And, You can make Explorer's "explorerDB" database with db user accounts "explorer" and password "some_pass_code".

```
$ > use explorerDB
$ > db.createUser( { user: "explorer", pwd: "<Enter a secure password>", roles: ["dbOwner"] } )
$ > quit()
```

Above dbuser explorer will full access explorerDB and clustor setting will be well used on monitoring the multiple sharding and replication of multiple mongodb instances.
Enable database authorization in the MongoDB configuration file /etc/mongodb.conf by appending the following lines:

```
auth=true
```

Restart MongoDB and verify the administrative user created earlier can connect:

```
$ sudo service mongodb restart
$ mongo -u admin -p your_password --authenticationDatabase=admin
```

If everything is configured correctly the Mongo Shell will connect and

```
$ > show dbs
```

will show db informations.
and You can add modified from  ./db.js:103 lines,  add auth information and mongodb connect options.

```
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/explorerDB', {
  useMongoClient: true
  // poolSize: 5,
  // rs_name: 'myReplicaSetName',
  // user: 'explorer',
  // pass: 'yourdbpasscode'
});
```

And explore it.

### Run

The below will start both the web-gui and sync.js (which populates MongoDB with blocks/transactions).

`npm start`

You can leave sync.js running without app.js and it will sync and grab blocks based on config.json parameters

`npm run sync`

Enabling stats requires running a separate process:

`npm run stats`

Enabling richlist requires running a separate process:

`npm run rich`

You can configure intervals (how often a new data point is pulled) and range (how many blocks to go back) with the following:

`RESCAN=100:7700000 node tools/stats.js` (New data point every 100 blocks. Go back 7,700,000 blocks).

## Docker installation

Set `nodeAddr` in `config.json` to `host.docker.internal`

Run `docker-compose up`
