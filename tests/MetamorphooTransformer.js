// tests/MetamorphooTransformerTests.js
//
// Tests MetamorhooUglifier.
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20120606


// libs
var fs = require('fs');
var should = require('should');
var cbs = require('../cbitsSys.js');

// module to test
var MetamorphooTransformer = require('../MetamorphooTransformer.js');



/***** Metamorphoo Uglifier Tests (duh) *****/
describe('MetamorphooTransformerTests', function() {
  var testData;
  var expected;
  var m;

  // Setup before all tests.
  before(function() {
    m = new MetamorphooTransformer();
    should.exist(m);
  });


  /***** Concatenation tests *****/
  describe('concat', function() {

    // Setup before each test.
    before(function() {
      testData = ["a", "b", "c"];
      expected = "abc";
      should.exist(m);
      should.exist(m.concat);
    });

    // Test JS concat
    it('JS: should concat [a, b, c] into abc.', function() {
      var actual = m.concat.javascript(testData);
      actual.should.equal(expected);
    });

    // Test CSS concat
    it('CSS: should concat [a, b, c] into abc.', function() {
      var actual = m.concat.css(testData);
      actual.should.equal(expected);
    });

    // Test HTML concat
    it('HTML: should concat [a, b, c] into abc.', function() {
      var actual = m.concat.html(testData);
      actual.should.equal(expected);
    });

  });


  /***** Minification tests *****/
  describe('minify', function() {

    // Setup before each test.
    before(function() {
      should.exist(m);
      // should.exist(m.concat);
      should.exist(m.minify);
    });

    // Test JS minification
    it('JS: should minify', function() {
      // setup test data
      var testData = 
       "// Example of how to calculate the area of a rectangle." + "\r\n" +
        "var a = 7;" + "\r\n" +
        "var b = 8;" + "\r\n" +
        "function area(x, y) {" + "\r\n" +
        "  return x * y; // area = length * width" + "\r\n" +
        "}" + "\r\n" +
        "var c = area(a, b);" + "\r\n" +
        "//console.log('area = ' + c);" + "\r\n" +
        "{c}";

      testData.length.should.be.above(0);
      // verify the test-data executes correctly (this will throw error if not)
      var testDataExecResult = testDataExecResult = eval(testData);
      should.exist(testDataExecResult);
      testDataExecResult.should.be.above(0);
      // exec
      var actual = m.minify.javascript(testData);
      // value-test
      should.exist(actual);
      actual.length.should.be.above(0);
      testData.length.should.be.above(actual.length);
      // test that the new code still executes
      var actualExecResult = null;
      try{
        actualExecResult = eval(actual);
      }
      catch(e){
        cbs.errLog("For actual = '" + actual + "': e = " + e, 'JS: should obfuscate');
      }
      testDataExecResult.should.equal(actualExecResult);
      // comparison reporting (comment-out when done!)
      // cbs.msgLog("testData.length = " + testData.length + "; testData = " + testData);
      // cbs.msgLog("actual.length = " + actual.length + "; actual = " + actual);
    });

    // Test JS minification
    it('JS: should minify jQuery', function() {
      // setup test data
      var testData = fs.readFileSync('/var/www/nodeserver/dev/cms/static/clientjs/vendor/jquery-1.7.2.js', 'utf-8');
      // var testData = fs.readFileSync('/var/www/nodeserver/dev/cms/static/clientjs/vendor/jquery.layout.js');
      // var testData = fs.readFileSync('/var/www/nodeserver/dev/cms/static/clientjs/xelementEditor.LanguageConversion.js');

      testData.length.should.be.above(0);
      // exec
      // cbs.dbgLog('testData = ' + testData);
      var actual = m.minify.javascript(testData);
      // value-test
      should.exist(actual);
      actual.length.should.be.above(0);
      testData.length.should.be.above(actual.length);
      // comparison reporting (comment-out when done!)
      // cbs.msgLog("testData.length = " + testData.length + "; testData = " + testData);
      // cbs.msgLog("actual.length = " + actual.length + "; actual = " + actual);
    });

    // Test CSS minification
    it('CSS: should minify', function() {
      // setup test data
      var testData =
        "/* 1996 called - they want their starry-sky and 'under construction' blinking-barricade page-design back! */" + "\r\n" +
        ".body {" + "\r\n" +
        "  background-color: Black;" + "\r\n" +
        "  color: White;" + "\r\n" +
        "}" + "\r\n" +
        "h1 h2 {" + "\r\n" +
        "  color: Orange;" + "\r\n" +
        "}" + "\r\n" +
        "img.underConstruction {" + "\r\n" +
        "  background-image: blinkingYellowBarricade.gif;" + "\r\n" +
        "}" + "\r\n" +
        "";
      testData.length.should.be.above(0);
      // exec
      var actual = m.minify.css(testData);
      // value-test
      should.exist(actual);
      actual.length.should.be.above(0);
      testData.length.should.be.above(actual.length);
      // comparison reporting (comment-out when done!)
      // cbs.msgLog("testData.length = " + testData.length + "; testData = " + testData, 'CSS: should minify');
      // cbs.msgLog("actual.length = " + actual.length + "; actual = " + actual, 'CSS: should minify');
    });

    // // Test HTML minification
    // it('HTML: should minify', function() {
    //   // throw "Not implemented.";
    //   cbs.msgLog("HTML: minification: Not implemented.", 'HTML: should minify');
    // });

  });


  /***** Obfuscation tests *****/
  describe('obfuscate', function() {

    // Setup before each test.
    before(function() {
      should.exist(m);
      // should.exist(m.concat);
      should.exist(m.obfuscate);
    });

    it('JS: should obfuscate', function() {
      // setup test data
      var testData = 
       "// Example of how to calculate the area of a rectangle." + "\r\n" +
        "var a = 7;" + "\r\n" +
        "var b = 8;" + "\r\n" +
        "function area(x, y) {" + "\r\n" +
        "  return x * y; // area = length * width" + "\r\n" +
        "}" + "\r\n" +
        "var c = area(a, b);" + "\r\n" +
        "//console.log('area = ' + c);" + "\r\n" +
        "{c}";

      testData.length.should.be.above(0);
      // verify the test-data executes correctly (this will throw error if not)
      var testDataExecResult = testDataExecResult = eval(testData);
      should.exist(testDataExecResult);
      testDataExecResult.should.be.above(0);
      // exec
      var actual = m.obfuscate.javascript(testData);
      // value-test
      should.exist(actual);
      actual.length.should.be.above(0);
      // test that the new code still executes
      var actualExecResult = null;
      try{
        actualExecResult = eval(actual);
      }
      catch(e){
        cbs.errLog("For actual = '" + actual + "': e = " + e, 'JS: should obfuscate');
      }
      should.exist(actualExecResult);
      testDataExecResult.should.equal(actualExecResult);
      // comparison reporting (comment-out when done!)
      // cbs.msgLog("testData.length = " + testData.length + "; testData = " + testData);
      // cbs.msgLog("actual.length = " + actual.length + "; actual = " + actual);
    });

    // it('CSS: should obfuscate', function() {
    //   assert.equal(1, 1);
    // });

    // it('HTML: should obfuscate', function() {
    //   assert.equal(1, 1);
    // });

  });

})