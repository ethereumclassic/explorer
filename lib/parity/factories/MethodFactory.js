/**
 * @file MethodFactory.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @author hackyminer <hackyminer@gmail.com>
 * @license LGPL
 * @date 2019/10/18
 */

import {AbstractMethodFactory} from 'web3-core-method';
import ParityListAccountsMethod from '../../methods/ParityListAccountsMethod';

export default class MethodFactory extends AbstractMethodFactory {
    /**
     * @param utils
     * @param formatters
     *
     * @constructor
     */
    constructor(utils, formatters) {
        super(utils, formatters);

        this.methods = {
            listAccounts: ParityListAccountsMethod
        };
    }
}
