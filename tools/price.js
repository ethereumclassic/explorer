const _ = require('lodash');
const mongoose = require( 'mongoose' );
const fetch = require("node-fetch");
const https = require('https');
const Market = require( '../db.js' ).Market;

// 10 minutes
const quoteInterval = 10 * 60 * 1000;

const getQuote = async () => {
    const options = {
        timeout: 10000
    }
    const URL = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${config.settings.symbol}&CMC_PRO_API_KEY=${config.CMC_API_KEY}`;

    try {
        let requestUSD = await fetch(URL);
        let requestBTC = await fetch(URL + '&convert=BTC');
        let quoteUSD = await requestUSD.json();
        let quoteBTC = await requestBTC.json();
        console.log(quoteUSD)

        quoteObject = {
            timestamp: Math.round(new Date(quoteUSD.status.timestamp).getTime() / 1000),
            quoteBTC: quoteBTC.data.ETC.quote.BTC.price,
            quoteUSD: quoteUSD.data.ETC.quote.USD.price,
        }

        new Market(quoteObject).save( ( err, market, count ) => {
            console.log(market)
            if ( typeof err !== 'undefined' && err ) {
               process.exit(9);
            } else {
                console.log('DB successfully written for market quote.');
            }
        });
    } catch (error) {
        console.log(error);
    }
}


var config = { nodeAddr: 'localhost', rpcPort: 8545, bulkSize: 100 };
try {
    var local = require('../config.json');
    _.extend(config, local);
    console.log('config.json found.');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        var local = require('../config.example.json');
        _.extend(config, local);
        console.log('No config file found. Using default configuration... (config.example.json)');
    } else {
        throw error;
        process.exit(1);
    }
}

getQuote()

setInterval(() => {
    getQuote()
}, quoteInterval);
