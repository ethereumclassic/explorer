/**
 * @file index.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @author hackyminer <hackyminer@gmail.com>
 * @license LGPL
 * @date 2019/10/18
 */

import {Network} from 'web3-net';
import * as Utils from 'web3-utils';
import {formatters} from 'web3-core-helpers';
import {ProviderResolver} from 'web3-providers';
import MethodFactory from './factories/MethodFactory';
import ParityModule from './Parity.js';

/**
 * Returns the Parity object
 *
 * @method Parity
 *
 * @param {Web3EthereumProvider|HttpProvider|WebsocketProvider|IpcProvider|String} provider
 * @param {Net.Socket} net
 * @param {Object} options
 *
 * @returns {Parity}
 */
export function Parity(provider, net = null, options = {}) {
    const resolvedProvider = new ProviderResolver().resolve(provider, net);

    return new ParityModule(
        resolvedProvider,
        new MethodFactory(Utils, formatters),
        new Network(resolvedProvider, null, options),
        Utils,
        formatters,
        options,
        null
    );
}
