var assert = require('assert');
var expect = require('chai').expect;
var request = require('request');

//* unit under test *//

var app  = require('../../app.js');

/* Description:
 *  tests that the express server is basically functional
 */

module.exports =

describe("Classic Explorer Server Tests", function() {

 //ping the index page to ensure it is running

  describe("Test index page", function() {
    var url = "http://localhost:3000/";
    it("returns status 200", function(done) {
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });

  // return the 404 on a bad page request

    var badurl = "http://localhost:3000/ethereum_classic_is_best_classic";
    it("bad pages go to index", function(done) {
      request(badurl, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
});
