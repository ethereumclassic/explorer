const assert = require('assert');
const { expect } = require('chai');
const request = require('request');

//* unit under test *//

const app = require('../../app.js');

/* Description:
 *  tests that the express server is basically functional
 */

module.exports =

describe('Classic Explorer Server Tests', () => {

  //ping the index page to ensure it is running

  describe('Test index page', () => {
    const url = 'http://localhost:3000/';
    it('returns status 200', (done) => {
      request(url, (error, response, body) => {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });

    // return the 404 on a bad page request

    const badurl = 'http://localhost:3000/ethereum_classic_is_best_classic';
    it('bad pages go to index', (done) => {
      request(badurl, (error, response, body) => {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
});
