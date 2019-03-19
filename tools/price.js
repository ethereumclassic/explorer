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
    const URL = `https://min-api.cryptocompare.com/data/price?fsym=${config.settings.symbol}&tsyms=USD`;

    try {
        let requestUSD = await fetch(URL);
        let quoteUSD = await requestUSD.json();
        console.log(quoteUSD)

        quoteObject = {
            timestamp: Math.round( Date.now() / 1000),
            quoteUSD: quoteUSD.USD,
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


var config = { nodeAddr: 'localhost', wsPort: 8546, bulkSize: 100 };
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
