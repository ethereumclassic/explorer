var assert = require('assert');
var expect = require('chai').expect;
var request = require('request');

//* unit under test *//

var app  = require('../../app.js');

/* Description:
 *  tests that the express server is basically functional
 */

module.exports =

describe("Explorer Server Tests", function() {

 //ping the index page to ensure it is running

  describe("Test index page", function() {
    let url = "http://localhost:3000/";
    it("returns status 200", function(done) {
      request(url, function(error, response, body) {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        done();
      });
    });

  // return the 404 on a bad page request
    let badurl = "http://localhost:3000/ethereum_classic_is_best_classic";
    it("bad pages go to index", function(done) {
      request(badurl, function(error, response, body) {
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
  describe("Test config page", function(){
    it("returns a string", function(done){
      let configurl = "http://localhost:3000/config";
      request(configurl, function(){
        expect(error).to.be.null;
        expect(response.statusCode).to.equal(200);
        expect(body).to.be.a('string');
        done();
      });_
    });
  });
});
