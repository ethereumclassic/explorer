'use strict';
var etherUnits = require(__lib + "etherUnits.js")
var BigNumber = require('bignumber.js');
var RLP = require('rlp');

/*
  Filter an array of TX 
*/
function filterTX(txs, value) {
  return txs.map(function(tx){
    return [tx.hash, tx.blockNumber, tx.from, tx.to, etherUnits.toEther(new BigNumber(tx.value), 'ether'), tx.gas, tx.timestamp]
  })
}

function filterTrace(txs, value) {
  return txs.map(function(tx){
    var t = tx;
    if (t.type == "suicide") {
      if (t.action.address)
        t.from = t.action.address;
      if (t.action.balance)
        t.value = etherUnits.toEther( new BigNumber(t.action.balance), "wei");
      if (t.action.refundAddress)
        t.to = t.action.refundAddress;
    } else {
      if (t.action.to)
        t.to = t.action.to;
      t.from = t.action.from; 
      if (t.action.gas)
        t.gas = new BigNumber(t.action.gas).toNumber();
      if ((t.result) && (t.result.gasUsed))
        t.gasUsed = new BigNumber(t.result.gasUsed).toNumber();
      if ((t.result) && (t.result.address))
        t.to = t.result.address;
      t.value = etherUnits.toEther( new BigNumber(t.action.value), "wei");            
    }
    return t;
  })
}

function filterBlock(block, field, value) {
  var tx = block.transactions.filter(function(obj) {
    return obj[field]==value;   
  });
  tx = tx[0];
  if (typeof tx !== "undefined")
    tx.timestamp = block.timestamp; 
  return tx;
}

/* make blocks human readable */
function filterBlocks(blocks) {
  if (blocks.constructor !== Array) {
    var b = blocks;
    var ascii = hex2ascii(blocks.extraData);
    b.extraDataHex = blocks.extraData;
    b.extraData = ascii;
    return b;
  }
  return blocks.map(function(block) {
    var b = block;
    var ascii = hex2ascii(block.extraData);
    b.extraDataHex = block.extraData;
    b.extraData = ascii;

    return b;
  })
}

/* stupid datatable format */
function datatableTX(txs) {
  return txs.map(function(tx){
    return [tx.hash, tx.blockNumber, tx.from, tx.to, 
            etherUnits.toEther(new BigNumber(tx.value), 'wei'), tx.gas, tx.timestamp]
  })
}

function internalTX(txs) {
  return txs.map(function(tx){
    return [tx.transactionHash, tx.blockNumber, tx.action.from, tx.action.to, 
            etherUnits.toEther(new BigNumber(tx.action.value), 'wei'), tx.action.gas, tx.timestamp]
  })
}

/* modified baToJSON() routine from rlp */
function baToString(ba) {
  if (Buffer.isBuffer(ba)) {
    return ba.toString('ascii');
  } else if (ba instanceof Array) {
    var array = [];
    for (var i = 0; i < ba.length; i++) {
      array.push(baToString(ba[i]));
    }
    return array.join('/');
  } else {
    return ba;
  }
}

var hex2ascii = function (hexIn) {
  var hex = hexIn.toString();
  var str = '';

  try {
    var ba = RLP.decode(hex);
    var test = ba[1].toString('ascii');

    if (test == 'geth' || test == 'Parity') {
      // FIXME
      ba[0] = ba[0].toString('hex');
    }
    str = baToString(ba);
  } catch(e) {
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

module.exports = {
  filterBlock: filterBlock,
  filterBlocks: filterBlocks,
  filterTX: filterTX,
  filterTrace: filterTrace,
  datatableTX: datatableTX,
  internalTX: internalTX
}
