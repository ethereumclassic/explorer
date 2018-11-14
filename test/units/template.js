//* modules needed for test *//

var assert = require('assert');
var expect = require('chai').expect;
var request = require('request');

//* unit under test *//

var unit  = require('../path/to/unit.js');

//* Description:
  * A description of what the file is and what  
  *  it should do if every thing is on the happy path
  * //

module.exports =

describe("name for test", function() {

 // test 1
  describe("Test index page", function() {
    var url = "http://localhost:3000/";
    it("returns status 200", function(done) {
      request(url, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });

 //test2
    var badurl = "http://localhost:3000/ethereum_classic_is_best_classic";
    it("bad pages go to index", function(done) {
      request(badurl, function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
});
