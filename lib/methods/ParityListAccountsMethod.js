/**
 * @file ParityListAccountMethod.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @author hackyminer <hackyminer@gmail.com>
 * @license LGPL
 * @date 2019/10/18
 */

import isFunction from 'lodash/isFunction';
import { AbstractMethod } from 'web3-core-method';

export default class ParityListAccountMethod extends AbstractMethod {
    /**
     * @param {Utils} utils
     * @param {Object} formatters
     * @param {AbstractWeb3Module} moduleInstance
     *
     * @constructor
     */
    constructor(utils, formatters, moduleInstance) {
        super('parity_listAccounts', 3, utils, formatters, moduleInstance);
    }

    /**
     * This method will be executed before the RPC request.
     *
     * @method beforeExecution
     *
     * @param {AbstractWeb3Module} moduleInstance - The package where the method is called from.
     */
    beforeExecution(moduleInstance) {
        // Optional second parameter 'defaultBlock' could also be the callback
        if (isFunction(this.parameters[2])) {
            this.callback = this.parameters[2];
            this.parameters[2] = moduleInstance.defaultBlock;
        }

        this.parameters[2] = this.formatters.inputDefaultBlockNumberFormatter(this.parameters[2], moduleInstance);
    }
}
