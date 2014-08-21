// tests/FunfImporterTestsES.js
//
// Tests FunfImporter. INTENDED TO BE MERGED BACK INTO FunfImporterTests.js.
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20121001


// libs
var fs = require('fs');
var should = require('should');
var cbs = require('../cbitsSys.js');
var _  = require('underscore');


var jsonfn = require('../node_modules/jsonfn/jsonfn.js');			// src: http://www.eslinstructor.net/jsonfn/


var quote = function(text) {
	return JSON.stringify(text);
};


var unquote = function(text) {
	return JSON.parse(text);
};


var getTestData = function() {
	var text = fs.readFileSync("quoteUnquoteTests_testData.js", 'utf8');
	return text;
};

var getTestDataNaturalEvalResult = function() {
	var text = fs.readFileSync("quoteUnquoteTests_testData.js.out.txt", 'utf8');
	return text;
};



var testData = null;



/**
 * Validation tests.
 * @return {[type]} [description]
 */
describe('utility', function() {

  /**
   * Setup before *EACH* test.
   * @return {[type]} [description]
   */
  beforeEach(function() {
    testData = getTestData();
    // console.log('testData = ' + testData);
    // console.log(_.isString(testData));
  });


  it('testData should exist and have a nonzero length', function() {
  	
  	testData.length.should.be.above(0);
  	// console.log(testData);
  });


  it('quote: the testData should be quoted', function() {
  	// console.log(testData.substring(0,100));
  	var actual = quote(testData);
  	console.log(actual.substring(0,1000));
		actual.length.should.be.above(0);
		(_.isString(actual)).should.be.true;
  });


  it('unquote: the testData should be unquoted and execute properly', function() {
    // console.log('testData = ' + testData);
  	var actual = unquote(quote(testData));

		(_.isString(actual)).should.be.true;
		actual.length.should.be.above(0);
  	actual.should.eql(testData);									// if true, then idempotency is proved.
  	// console.log(actual.substring(0,100));

		eval(actual);																	// must produce whatever output the testdata.js file would produce if not 
  });

});