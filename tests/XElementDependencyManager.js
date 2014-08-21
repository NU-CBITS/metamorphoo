// tests/XElementDependencyManager.js
//
// Tests XElementDependencyManager.
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20120618


// libs
var _ = require('underscore');

var should = require('should');
var cbs = require('../cbitsSys.js');

// testable module's dependencies
var MetamorphooOperation = require('../MetamorphooOperation.js');

// testable module
var XElementDependencyManager = require('../XElementDependencyManager.js');


// set cwd
// process.chdir('../');
cbs.dbgLog("CWD = " + process.cwd());


// config from cfg file
var cfgInCurrEnv;
try {
  cbs.msgLog("**************************************");
  cbs.msgLog("****  CBITS Metamorphoo STARTED  *****");
  cbs.msgLog("**************************************");
  cfgFilePath = "/home/samba/dev/configs/metamorphoo.json";
  appEnv = "dev";
  cbs.msgLog('Cfg file path = ' + cfgFilePath);
  cbs.msgLog('Environment = ' + appEnv);
  cfg = cbs.getAppConfig(cfgFilePath);
  cfgInCurrEnv = cbs.getAppConfigValue(cfg, appEnv);
} catch (error) {
  var errMsg = 'ERROR: error configuring Metamorphoo: ' +  error;
  throw errMsg;
}




/***** XElementDependencyManager Tests *****/
describe('XElementDependencyManagerTests', function() {
  var testData;
  var expected;
  var m;

  // Setup before all tests.
  before(function() {
    console.log(_.isNull(XElementDependencyManager));
    console.log(XElementDependencyManager.Traversal);
  });


  /***** Traversal tests *****/
  describe('Traversal', function() {

    // Setup before each test.
    before(function() {
      m = new XElementDependencyManager.Traversal();
      should.exist(m);
      should.exist(m.getByGUID);
      should.exist(m.getChildren);
      should.exist(m.getGuidsInXElement);
    });


    // Test: Get an XElement by its GUID.
    it('should return 1 whole XElement', function() {
      var guid = "MM_TraversalTest_xel_01";
      var route = '/xelements/' + guid;

      var mmOp = new MetamorphooOperation().createMetamorphooOperation(null, null,
        "trireme", route, null, null,                    // callback defined in XElementDependencyManager
        "http", "json", "caller", null, null,            // for now, we don't need to execute anything in DataDstHandler
        "edu_northwestern_cbits_metamorphoo_xelement_Traversal_getByGUID", TestUser, cfgInCurrEnv
        );

      var actual = m.getByGUID(mmOp);
      should.exist(actual);
    });


    // Test: Children-traversal: return-count.
    it('should count a set of 5 non-distinct children, from a set of 5 non-unique children', function() {
      testData = getXElementPopulation();
      var actual = m.getRequiredXElements("ROOT", "xel_data_values.required_xelement_ids", testData, 0, -1);
      
      // Test: verify the XElement count.
      actual.length.should.equal(5);
    });


    // Test: Children-traversal: return-composition.
    it('should find 5 non-distinct GUIDs, from a set of 5 non-unique children', function() {
      testData = getXElementPopulation();
      var actual = m.getRequiredXElements("ROOT", "xel_data_values.required_xelement_ids", testData, 0, -1, false);
      
      // Test: verify the GUIDs of the returned XElements, and verify uniqueness in the set.
      var childGUIDs = ["L1C1", "L1C2", "L2C1", "L2C2"];
      _.each(actual, function(a) {
        var found = _.any(childGUIDs, function (g) { return a.guid == g; });
        found.should.equal(true);
      });
    });

    // Test: Children-traversal: return-composition.
    it('should find 4 distinct GUIDs, from a set of 5 non-unique children', function() {
      testData = getXElementPopulation();
      var actual = m.getRequiredXElements("ROOT", "xel_data_values.required_xelement_ids", testData, 0, -1, true);
      
      // Test: verify the GUIDs of the returned XElements, and verify uniqueness in the set.
      var childGUIDs = ["L1C1", "L1C2", "L2C1", "L2C2"];
      _.each(actual, function(a) {
        var found = _.any(childGUIDs, function (g) { return a.guid == g; });
        found.should.equal(true);
        
        if (found) {
          // remove the GUID from the set so that we guarantee no GUID matches twice.
          var idx = -1;
          for (var i = 0; i < childGUIDs.length; i++) {
            if (childGUIDs[i] == a.guid) {
              idx = i;
              break;
            }
          }
          childGUIDs.splice(idx, 1);
        }
      });
    });



    // Test: Object-search: return all GUIDs found in an object inside a specified field in an XElement.
    it('should find all xelementGuidArray GUIDs in metacontent_internal', function() {
      testData = getXElementPopulation();
      
      var xelement = _.find(testData, function(xel) { return xel.guid == "L2C1"; });
      cbs.dbgLog('INIT: xelement.xel_data_types.metacontent_internal  = ' + JSON.stringify(xelement.xel_data_types.metacontent_internal), 'XElementDependencyManager.getGuidsInXElement');
      cbs.dbgLog('INIT: xelement.xel_data_values.metacontent_internal = ' + JSON.stringify(xelement.xel_data_values.metacontent_internal), 'XElementDependencyManager.getGuidsInXElement');
      
      var actual = m.getGuidsInXElement(xelement.xel_data_types.metacontent_internal, xelement.xel_data_values.metacontent_internal, 0, "xelementGuidArray");
      
      // Mark (20120710): returned order doesn't matter, for now...
      should.exist(actual);
      // cbs.dbgLog('actual = ' + actual);
      // _.each(actual, function(e) { cbs.dbgLog('_.isArray(e) = ' + _.isArray(e) + '; e = ' + e); });
      actual.length.should.equal(24);
    });


    // Test: Object-search: return all GUIDs found in an object inside a specified field in an XElement.
    it('should find all xelementGuidArray GUIDs in XElement', function() {
      testData = getXElementPopulation();
      
      var xelement = _.find(testData, function(xel) { return xel.guid == "L2C1"; });
      cbs.dbgLog('INIT: xelement.xel_data_types  = ' + JSON.stringify(xelement.xel_data_types), 'XElementDependencyManager.getGuidsInXElement');
      cbs.dbgLog('INIT: xelement.xel_data_values = ' + JSON.stringify(xelement.xel_data_values), 'XElementDependencyManager.getGuidsInXElement');
      
      var actual = m.getGuidsInXElement(xelement.xel_data_types, xelement.xel_data_values, 0, "xelementGuidArray");
      
      // Mark (20120710): returned order doesn't matter, for now...
      should.exist(actual);
      cbs.dbgLog('actual = ' + actual);
      actual.length.should.equal(25);
    });

  });



  /***** Traversal tests *****/
  describe('Sorting', function() {

    // Setup before each test.
    before(function() {
      m = new XElementDependencyManager.Sorting();
      should.exist(m);
      should.exist(m.sortXElementsBy);
      should.exist(m.groupByXElementTypes);
    });


    it('groupByXElementTypes: should sort the XElements by xelement type', function() {
      testData = getXElementPopulation();
      
      var sortedXElements = m.groupByXElementTypes(testData, ['css', 'script_library', 'static_html']);

      should.exist(sortedXElements);

      // check the contiguousness of the results: CSS should follow CSS uninterrupted, JS should follow JS uninterrupted and not be followed at any point by more CSS, etc.. 
      // sortedXElements[2].xel_data_values.xelement_type = 'static_html';  // uncomment to verify the search below works as-expected.
      // console.log(sortedXElements);

      var seenXElementTypes = new Array();
      _.each(sortedXElements, function(xel, i) {

        if (i > 0 && sortedXElements[i-1].xel_data_values.xelement_type != xel.xel_data_values.xelement_type) {
          _.any(seenXElementTypes, function(t) { return t == xel.xel_data_values.xelement_type; }).should.be.false;
          seenXElementTypes.push(xel.xel_data_values.xelement_type);
        }
      })
    });
  });
});







// gets/generates a population of XElement data for testing purposes.
var getXElementPopulation = function () {
  return [
        {
          guid: "ROOT",
          xel_data_types:
          {
            required_xelement_ids: 'xelementGuidArray',
            metacontent_internal: 'string',
            xelement_type: 'string'
          },          xel_data_values:
          {
            required_xelement_ids: '[ "L1C1", "L1C2" ]',
            metacontent_internal: '',
            xelement_type: 'static_html'
          }
        },
        {
          guid: "L2C2",
          xel_data_types:
          {
            required_xelement_ids: 'xelementGuidArray',
            metacontent_internal: 'string',
            xelement_type: 'string'
          },
          xel_data_values:
          {
            required_xelement_ids: '[ ]',
            metacontent_internal: '',
            xelement_type: 'javascript'
          }
        },
        {
          guid: "L1C1",
          xel_data_types:
          {
            required_xelement_ids: 'xelementGuidArray',
            metacontent_internal: 'string',
            xelement_type: 'string'
          },
          xel_data_values:
          {
            required_xelement_ids: '[ "L2C1", "L2C2" ]',
            metacontent_internal: '',
            xelement_type: 'javascript'
          }
        },
        {
          guid: "L2C1",
          xel_data_types:
          {
            required_xelement_ids: 'xelementGuidArray',
            metacontent_internal: 
            {
              Animals:
              {
                Bear: "xelementGuidArray",
                Cat:
                {
                  Lion: "xelementGuidArray",
                  Tiger: "string"
                },
                Dog: "string",
                Eagle: "xelementGuidArray",
                Falcon:
                {
                  Gyrfalcon: "string",
                  Peregrine: "xelementGuidArray",
                  Lanner: "string"
                }
              },
              AutomobileManufacturers: "xelementGuidArray",
              Universe:
              {
                MilkyWay:
                {
                  Earth: "xelementGuidArray",
                  Mars:
                  {
                    Aliens: "xelementGuidArray",
                    MovieStars: "xelementGuidArray"
                  }
                }
              }
            },
            xelement_type: 'string'
          },
          xel_data_values:
          {
            required_xelement_ids: [ "MetacontentViewerGuid01" ],
            metacontent_internal: 
            {
              Animals:
              {
                Bear: [ "BearGuid01", "BearGuid02", "BearGuid03" ],
                Cat:
                {
                  Lion: ["LionGuid01", "LionGuid02", "LionGuid03" ],
                  Tiger: "PrettyCat"
                },
                Dog: "Fido",
                Eagle: [ "EagleGuid01", "EagleGuid02", "EagleGuid03" ],
                Falcon:
                {
                  Gyrfalcon: "white",
                  Peregrine: [ "PeregrineGuid01", "PeregrineGuid02" ],
                  Lanner: "brown"
                }
              },
              AutomobileManufacturers: [ "Audi", "BMW", "Chevrolet", "Dodge", "Ford" ],
              Universe:
              {
                MilkyWay:
                {
                  Earth: [ "PersonGuid01", "PersonGuid02", "PersonGuid03" ],
                  Mars:
                  {
                    Aliens: [ "AlienGuid01", "AlienGuid02", "AlienGuid03" ],
                    MovieStars: [ "Schwarzenegger", "Gershon" ]
                  }
                }
              }
            },
            xelement_type: 'css'
          }
        },
        {
          guid: "L1C2",
          xel_data_types:
          {
            required_xelement_ids: 'xelementGuidArray',
            metacontent_internal: 'string',
            xelement_type: 'string'
          },
          xel_data_values:
          {
            required_xelement_ids: '[ "L2C1" ]',
            metacontent_internal: '',
            xelement_type: 'css'
          }
        }
      ];
};

var TestUser = {
  "username" : "TEST-USER",
  "guid" : "TEST-USER-GUID"
};