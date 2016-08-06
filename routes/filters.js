/*
  Filter an array of TX 
*/
function filterTX(txs, value) {
  var blockTX = txs.map(function(block) {
    var cleanTX = block.transactions.filter(function(obj) {
      return (obj.to==value || obj.from==value);   
    });
    return cleanTX.map(function(tx) { 
      var ttx = tx;
      ttx.timestamp = block.timestamp; 
      return ttx;
    });
  });
  return [].concat.apply([], blockTX);
}

function filterBlock(block, field, value) {
  var blockTX = txs.map(function(block) {
    return block.transactions.filter(function(obj) {
      return obj[field]==value;   
    });
  });
  return [].concat.apply([], blockTX);
}

/* extract transactions from blocks */
function extractTX(blocks) {
    
  var blockTX = blocks.map(function(block) {
    return block.transactions;
  });
  return [].concat.apply([], blockTX);
}

/* stupid datatable format */
function datatableTX(txs) {
  return txs.map(function(tx){
    return [tx.hash, tx.blockNumber, tx.from, tx.to, tx.value, tx.gas, tx.timestamp]
  })
}

module.exports = {
  extractTX: extractTX,
  filterBlock: filterBlock,
  filterTX: filterTX,
  datatableTX: datatableTX
}