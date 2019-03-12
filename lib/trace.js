/**
 * @author Alexis Roussel <alexis@bity.com>
 * @author Peter Pratscher <peter@bitfly.at>
 * @date 2017
 * @license LGPL
 * @changelog 2018/05/19 - modified for web3.js 0.20.x using extend() method. (by hackyminer <hackyminer@gmail.com>)
 */
module.exports = function(web3) {
  /**
   * @file trace.js
   * @author Alexis Roussel <alexis@bity.com>
   * @date 2017
   * @license LGPL
   */
  web3.extend({
    property: 'trace',
    methods: [{
      name: 'call',
      call: 'trace_call',
      params: 3,
      inputFormatter: [web3.extend.formatters.inputCallFormatter, null, web3.extend.formatters.inputDefaultBlockNumberFormatter]
    },{
      name: 'rawTransaction',
      call: 'trace_rawTransaction',
      params: 2
    },{
      name: 'replayTransaction',
      call: 'trace_replayTransaction',
      params: 2
    },{
      name: 'block',
      call: 'trace_block',
      params: 1,
      inputFormatter: [web3.extend.formatters.inputDefaultBlockNumberFormatter]
    },{
      name: 'filter',
      call: 'trace_filter',
      params: 1
    },{
      name: 'get',
      call: 'trace_get',
      params: 2
    },{
      name: 'transaction',
      call: 'trace_transaction',
      params: 1
    }]
  });

  /**
   * @file parity.js
   * @author Peter Pratscher <peter@bitfly.at>
   * @date 2017
   * @license LGPL
   */
  web3.extend({
    property: 'parity',
    methods: [{
      name: 'pendingTransactions',
      call: 'parity_pendingTransactions',
      params: 0,
      outputFormatter: web3.extend.formatters.outputTransactionFormatter
    },{
      name: 'pendingTransactionsStats',
      call: 'parity_pendingTransactionsStats',
      params: 0
    },{
      name: 'listAccounts',
      call: 'parity_listAccounts',
      params: 3,
      inputFormatter: [null, null, web3.extend.formatters.inputDefaultBlockNumberFormatter]
    },{
      name: 'phraseToAddress',
      call: 'parity_phraseToAddress',
      params: 1
    }]
  });
  return web3;
};
