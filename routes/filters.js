/*
  Filter an array of TX 
*/
function filterTX(txs, field, value) {
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

module.exports = {
  extractTX: extractTX,
  filterTX: filterTX
}