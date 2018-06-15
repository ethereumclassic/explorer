/**
 * Source code from ripple charts frontend:
 * https://github.com/ripple/ripplecharts-frontend/blob/fc14de40c1a5b362352d140836ca993bdebf9fb3/src/common/graph.js#L1686
 *
 * Copyright (c) 2012,2013,2014,2015 Ripple Inc.
 * 
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

function commas(number) {
  var parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function abbreviate(address) {
  return address.slice(0, 25) + "...";
}

function magnitude(oom) {
  var mfo3 = Math.floor(oom / 3);
  var text = { 1: "K", 2: "M", 3: "B", 4: "T", 5: "Q" }[mfo3];
  var value;
  if (text) {
    value = Math.pow(1000, mfo3);
  } else {
    value = Math.pow(10, oom);
    text = "&times;10<sup>" + ("" + oom).replace("-", "&#8209;") + "</sup>";
  }
  return { value: value, text: text };
}

function roundNumber(number) {
  number = parseFloat(number);
  var man = Math.abs(number);

  if (number === 0 || (man < 100000.00 && man > 0.00001)) {
    return commas(number);
  } else {
    var oom = Math.floor((Math.log(man) + 0.00000000000001) / Math.LN10);
    var mag = magnitude(oom);
    return commas(number / mag.value) + mag.text;
  }
}

window.roundNumber = roundNumber;

// module.exports = roundNumber;