//////////////////////////////////////////////////////////////////////////////////////////////////////////
// tests/FunfImporterTests.js																			//
//																										//
// Purpose: Tests FunfImporter.																			//
// Created by: Evan Story (evan.story@northwestern.edu), John J Guiry (johnj.guiry@northwestern.edu)	//
// Created on: 20121030																					//
// Version: 0.2																							//
// Revision History: 																					//
//				   V0.1 => V0.2: Updated Comments														//
//				   V0.1 => Baseline functional Dingo Tests												//
//////////////////////////////////////////////////////////////////////////////////////////////////////////


// libs
var fs = require('fs');
var should = require('should');
var cbs = require('../cbitsSys.js');
var _  = require('underscore');

var request = require('request');

//globals
var ACTIVITY_INDEX = 0;
var ANDROID_INFO_INDEX = 1;
var APPLICATIONS_INDEX = 2;
var AUDIO_FEATURES_INDEX = 3;
var BATTERY_INFO_INDEX = 4;
var BLUETOOTH_INDEX = 5;
var BLUETOOTH_DEVICES_INDEX = 6;
var CELL_INDEX = 7;
var HARDWARE_INFO_INDEX = 8;
var IMAGES_INDEX = 9;
var LIGHT_SENSOR_INDEX = 10;
var LIGHT_SENSOR_ARRAY_INDEX = 11;
var LOCATION_INDEX = 12;
var MAGNETIC_FIELD_INDEX = 13;
var PRESSURE_SENSOR_INDEX = 14;
var PROBE_INDEX = 15;
var PROXIMITY_SENSOR_INDEX = 16;
var PROXIMITY_SENSOR_ARRAY_INDEX = 17;
var RUNNING_APPS_INDEX = 18;
var SCREEN_INDEX = 19;
var SOURCE_INDEX = 20;
var TIME_OFFSET_INDEX = 21;
var WIFI_INDEX = 22;
var WIFI_DEVICES_INDEX = 23;

var currentTestID = -1;

var TABLE_NAMES = 	[	
						"ActivityProbe", 
						"AndroidInfoProbe", 
						"ApplicationsProbe", 
						"AudioFeaturesProbe",
						"BatteryProbe",
						"BluetoothProbe",
						"BluetoothProbe.DEVICES",
						"CellProbe",
						"HardwareInfoProbe",
						"ImagesProbe",
						"LightSensorProbe",
						"LightSensorProbe.ArrayValues",
						"LocationProbe",
						"MagneticFieldSensorProbe",
						"PressureSensorProbe",
						"Probe",
						"ProximitySensorProbe",
						"ProximitySensorProbe.ArrayValues",
						"RunningApplicationsProbe",
						"ScreenProbe",
						"SourceValue",
						"TimeOffsetProbe",
						"WifiProbe",
						"WifiProbe.SCAN_RESULTS"
					];
					
var TOTAL_NUMBER_OF_TABLES = TABLE_NAMES.length;
			
var SELECT_ACTIVITY_PROBE =  "SELECT * FROM \"ActivityProbe\";";
var SELECT_ANDROID_INFO_PROBE = "SELECT * FROM \"AndroidInfoProbe\";";
var SELECT_APPLICATIONS_PROBE = "SELECT * FROM \"ApplicationsProbe\";";
var SELECT_AUDIO_FEATURES_PROBE = "SELECT * FROM \"AudioFeaturesProbe\";";
var SELECT_BATTERY_PROBE = "SELECT * FROM \"BatteryProbe\";";
var SELECT_BLUETOOTH_PROBE = "SELECT * FROM \"BluetoothProbe\";";
var SELECT_BLUETOOTH_DEVICES_PROBE = "SELECT * FROM \"BluetoothProbe.DEVICES\";";
var SELECT_CELL_PROBE = "SELECT * FROM \"CellProbe\";";
var SELECT_HARDWARE_INFO_PROBE = "SELECT * FROM \"HardwareInfoProbe\";";
var SELECT_IMAGES_PROBE = "SELECT * FROM \"ImagesProbe\";";
var SELECT_LIGHT_SENSOR_PROBE = "SELECT * FROM \"LightSensorProbe\";";
var SELECT_LIGHT_SENSOR_PROBE_ARRAY_VALUES = "SELECT * FROM \"LightSensorProbe.ArrayValues\";";
var SELECT_LOCATION_PROBE = "SELECT * FROM \"LocationProbe\";";
var SELECT_MAGNETIC_FIELD_SENSOR_PROBE = "SELECT * FROM \"MagneticFieldSensorProbe\";";
var SELECT_PRESSURE_SENSOR_PROBE = "SELECT * FROM \"PressureSensorProbe\";";
var SELECT_PROBE_LIST = "SELECT * FROM \"Probe\";";
var SELECT_PROXIMITY_SENSOR_PROBE = "SELECT * FROM \"ProximitySensorProbe\";";
var SELECT_PROXIMITY_SENSOR_PROBE_ARRAY_VALUES = "SELECT * FROM \"ProximitySensorProbe.ArrayValues\";";
var SELECT_RUNNING_APPLICATIONS_PROBE = "SELECT * FROM \"RunningApplicationsProbe\";";
var SELECT_SCREEN_PROBE = "SELECT * FROM \"ScreenProbe\";";
var SELECT_SOURCE_VALUE = "SELECT * FROM \"SourceValue\";";
var SELECT_TIME_OFFSET_PROBE = "SELECT * FROM \"TimeOffsetProbe\";";
var SELECT_WIFI_PROBE = "SELECT * FROM \"WifiProbe\";";
var SELECT_WIFI_SCAN_RESULTS_PROBE = "SELECT * FROM \"WifiProbe.SCAN_RESULTS\";"

var ESCAPE_SEQUENCE = "\""

var testValidSELECTData = 
	[
		SELECT_ACTIVITY_PROBE,
		SELECT_ANDROID_INFO_PROBE,
		SELECT_APPLICATIONS_PROBE,
		SELECT_AUDIO_FEATURES_PROBE,
		SELECT_BATTERY_PROBE,
		SELECT_BLUETOOTH_PROBE,
		SELECT_BLUETOOTH_DEVICES_PROBE,
		SELECT_CELL_PROBE,
		SELECT_HARDWARE_INFO_PROBE,
		SELECT_IMAGES_PROBE,
		SELECT_LIGHT_SENSOR_PROBE,
		SELECT_LIGHT_SENSOR_PROBE_ARRAY_VALUES,
		SELECT_LOCATION_PROBE,
		SELECT_MAGNETIC_FIELD_SENSOR_PROBE,
		SELECT_PRESSURE_SENSOR_PROBE,
		SELECT_PROBE_LIST,
		SELECT_PROXIMITY_SENSOR_PROBE,
		SELECT_PROXIMITY_SENSOR_PROBE_ARRAY_VALUES,
		SELECT_RUNNING_APPLICATIONS_PROBE,
		SELECT_SCREEN_PROBE,
		SELECT_SOURCE_VALUE,
		SELECT_TIME_OFFSET_PROBE,
		SELECT_WIFI_PROBE,
		SELECT_WIFI_SCAN_RESULTS_PROBE		
	]
	
var testValidINSERTData = [];
var testInvalidINSERTData = [];

var guid;
var guidAsForeignKey = null;
var milliseconds; 

//massClearFunction() is responsible for clearing the PG tables, 
//and resetting any ID keys are necessary
var massClearFunction = function(done) 
{
	var methodName = "massClearFunction()";

	cbs.dbgLog(methodName + " begins", methodName);

	// * STEP 1 *: Create your test data.
	var requestData = 
					[
						//Since the array tables require the ID counter be reset, we do this the long way ....
						"DELETE FROM \"BluetoothProbe.DEVICES\";",
						"ALTER SEQUENCE \"BluetoothProbe.DEVICES_id_seq\" RESTART WITH 1;",
						"DELETE FROM \"LightSensorProbe.ArrayValues\";",
						"ALTER SEQUENCE \"LightSensorProbe.ArrayValues_id_seq\" RESTART WITH 1;",
						"DELETE FROM \"ProximitySensorProbe.ArrayValues\";",
						"ALTER SEQUENCE \"ProximitySensorProbe.ArrayValues_id_seq\" RESTART WITH 1;",
						"DELETE FROM \"WifiProbe.SCAN_RESULTS\";",
						"ALTER SEQUENCE \"WifiProbe.SCAN_RESULTS_id_seq\" RESTART WITH 1;",
						
						
						"DELETE FROM \"ActivityProbe\";",
						"DELETE FROM \"AndroidInfoProbe\";",
						"DELETE FROM \"ApplicationsProbe\";",
						"DELETE FROM \"AudioFeaturesProbe\";",
						"DELETE FROM \"BatteryProbe\";",
						"DELETE FROM \"BluetoothProbe\";",
						"DELETE FROM \"CellProbe\";",
						"DELETE FROM \"HardwareInfoProbe\";",
						"DELETE FROM \"ImagesProbe\";",
						"DELETE FROM \"LightSensorProbe\";",
						"DELETE FROM \"LocationProbe\";",
						"DELETE FROM \"MagneticFieldSensorProbe\";",
						"DELETE FROM \"PressureSensorProbe\";",
						"DELETE FROM \"ProximitySensorProbe\";",
						"DELETE FROM \"RunningApplicationsProbe\";",
						"DELETE FROM \"ScreenProbe\";",
						"DELETE FROM \"SourceValue\";",
						"DELETE FROM \"TimeOffsetProbe\";",
						"DELETE FROM \"WifiProbe\";"
					];

       //STEP 2 *: Submit your request to Dingo.
       //APPROACH #4: Use the request.js module. Src: http://blog.kardigen.org/2012/03/mochajs-shouldjs-requestjs-nice-tool.html
      request({
          method: "POST",
          url: getDingoUrl(),
          json: true,
          body: getDingoPostObj(requestData)
        },
        // * STEP 3 *: Response function: this runs after the server sends its response.
        function(err, res, body) 
		{
			var methodName = "massClearFunctionCallback()"; 

			cbs.dbgLog(methodName + " begins", methodName);

			// if the request threw an error, then let's do the same.
			if (err) 
			{ 
				cbs.errLog(err); 
				throw err; 
			}

			// What did we get from the server? Let's check, manually... turns-out, it's an object, so first stringify it.
			cbs.dbgLog("res.body = " + JSON.stringify(res.body), methodName);

			res.body.length.should.be.equal(0); //No reply back is indicative of success (No Query Error)
			// Test #2: Test that the response status code is OK. (If we've gotten this far, it should be.)
			res.statusCode.should.be.equal(200);

			cbs.dbgLog(methodName + " ends", methodName);

			// Call the unit-test's callback to signal that this unit-test is done.
			done();
		  
        });
		cbs.dbgLog(methodName + " ends", methodName);
}

//massInsertFunction(done, numberOfIterations) will place a record in 
//each table numberOfIterations times
//CAVEAT: Minimal Validation -- Possibilities for use in load test
var massInsertFunction = function(done, numberOfIterations)
{	
	var methodName = "massInsertFunction()";
	var callbackCount = 0;
	
	cbs.dbgLog(methodName + " begins", methodName);

	for(var testIndex = 0; testIndex < numberOfIterations; testIndex++)
	{
		cbs.dbgLog(methodName + " begins ...", methodName);
		initializeInsertState();

		  // * STEP 2 *: Submit your request to Dingo.
		  //  APPROACH #4: Use the request.js module. Src: http://blog.kardigen.org/2012/03/mochajs-shouldjs-requestjs-nice-tool.html
		  request({
			  method: "POST",
			  url: getDingoUrl(),
			  json: true,
			  body: getDingoPostObj(testValidINSERTData)
			},
			// * STEP 3 *: Response function: this runs after the server sends its response.
			function(err, res, body) 
			{
			
			  var methodName = "insertCallback()";
			  callbackCount++;
			  // if the request threw an error, then let's do the same.
			  if (err) 
			  { 
				throw err; 
			  }

			  // What did we get from the server? Let's check, manually... turns-out, it's an object, so first stringify it.
			  cbs.dbgLog("res.body = " + JSON.stringify(res.body), methodName);
			  
			  res.body.length.should.be.equal(0); 
			   
			  // Test #1: Test that the response status code is OK. (If we've gotten this far, it should be.)
			  res.statusCode.should.be.equal(200);
			  
			  // Call the unit-test's callback to signal that this unit-test is done.
			  
			  if(callbackCount == numberOfIterations)
			  {
			  	if (done != null)
				{
					cbs.dbgLog(methodName + " calls done()", methodName);
					done();
				}
			  }
			  
			}
		);
	}
	cbs.dbgLog(methodName + " ends", methodName);
}

//genericInsertWithSelectValidation(done, tableIndex) will place an updated
//record for the specified table into PG, before validating this using a follow
//up SELECT  
genericInsertWithSelectValidation = function(done, tableIndex)
{	
	var methodName = "genericInsertWithSelectValidation()";
	var localTableIndexer = tableIndex;

	cbs.dbgLog(methodName + " begins ...", methodName);
	
	initializeInsertState();
	cbs.dbgLog("localTableIndexer is ... " + localTableIndexer, methodName);
	if (typeof localTableIndexer !== "undefined")
	{
		//Let's assume only this single table must be tested ...
	
		var insertResponseBody = "";
		var selectResponseBody = "";
		
	  // * STEP 2 *: Submit your request to Dingo.
	  //  APPROACH #4: Use the request.js module. Src: http://blog.kardigen.org/2012/03/mochajs-shouldjs-requestjs-nice-tool.html
		
		var insertRequestCallback = function(err, res, body)
		{
			var methodName = "insertRequestCallback()";
			
			  cbs.dbgLog(methodName + " begins ...", methodName);
			  // if the request threw an error, then let's do the same.
			  if (err) { throw err; }
			  
			  insertResponseBody = res.body;
			  cbs.dbgLog("JSON.stringify(insertResponseBody) = " + insertResponseBody, methodName);
			  res.body.length.should.be.equal(0); 			  
			  readBackRowAndValidate(); //tbleIndexer may be something else here ...
			
			  cbs.dbgLog(methodName + " ends ... ", methodName);
			
		};
		
		var readBackRowAndValidate = function ()
		{
			var methodName = "readBackRowAndValidate()";
			cbs.dbgLog(methodName, ' starts for localTableIndexer ' + localTableIndexer, methodName);
			
			var sqlStatement = "SELECT * FROM " + ESCAPE_SEQUENCE + TABLE_NAMES[localTableIndexer] + ESCAPE_SEQUENCE + " ORDER BY timestamp DESC LIMIT 1;";
			var returnValue = "";
			
			cbs.dbgLog(methodName + ' sending request: ' + sqlStatement, methodName);
			var reqObj = {
				  method: "POST",
				  url: getDingoUrl(),
				  json: true,
				  body: getDingoPostObj(sqlStatement)
				};
				
			request(reqObj, selectRequestCallback);
			
			cbs.dbgLog('readBackRowAndValidate() ends for localTableIndexer ' + localTableIndexer, methodName);
			
		};
		
		var selectRequestCallback = function(err, res, body)
		{
			var methodName = "selectRequestCallback()";
			
			cbs.dbgLog(methodName + ' begins ...', methodName);
			
			// if the request threw an error, then let's do the same.
			if (err) 
			{ 
				throw err; 
			}
			  
			selectResponseBody = res.body;			
			
			var guidIndex = selectResponseBody.toString().indexOf(guid.toString());
			var sampleIDIndex = selectResponseBody.toString().indexOf(guidAsForeignKey.toString());
			var testFlag = false;
			
			guidAsForeignKey = guid;
			
			//Some tests use a GUID, some use a sampleID
			if(guidIndex > -1 || sampleIDIndex > -1 )
			{
				testFlag = true;
				
				cbs.dbgLog("Flag set ..." + guidIndex + "  " + sampleIDIndex);
			}
			else
			{
				cbs.dbgLog("Flag unset ..." + guidIndex + "  " + sampleIDIndex);
			}
			
			testFlag.should.be.true;
			selectResponseBody.toString().indexOf(milliseconds.toString()).should.not.be.equal(-1) 
		  
		  //or there are no rows
			
			// Test #2: Test that the response status code is OK. (If we've gotten this far, it should be.)
			res.statusCode.should.be.equal(200);
			
			cbs.dbgLog("Test Pass for INSERT and readback on table " + TABLE_NAMES[localTableIndexer], methodName);
				  
			cbs.dbgLog(methodName + " ends ...", methodName);	  
			// Call the unit-test's callback to signal that this unit-test is done.
			done();

		};
	  
		cbs.dbgLog("About to make request for " + TABLE_NAMES[localTableIndexer] + " with stmt: " + testValidINSERTData[localTableIndexer], methodName);
		request({
		  method: "POST",
		  url: getDingoUrl(),
		  json: true,
		  body: getDingoPostObj(testValidINSERTData[localTableIndexer])
		},
		insertRequestCallback
		);
	}
	
	cbs.dbgLog(methodName + " ends ...", methodName);
};

//genericInvalidInsertWithSelectValidation(done, tableIndex) will 
//attempt to insert an invalid sql statement into PG via Dingo
//Query Errors are expected to be returned!
genericInvalidInsertWithSelectValidation = function(done, tableIndex)
{	
	var localTableIndexer = tableIndex;
	var methodName = "genericInvalidInsertWithSelectValidation()";

	initializeInvalidINSERTState();
	cbs.dbgLog("localTableIndexer is ... " + localTableIndexer, methodName);
	if (typeof localTableIndexer !== "undefined")
	{
		//Let's assume only this single table must be tested ...
	
		var insertResponseBody = "";
		var selectResponseBody = "";
		
	  // * STEP 2 *: Submit your request to Dingo.
	  //  APPROACH #4: Use the request.js module. Src: http://blog.kardigen.org/2012/03/mochajs-shouldjs-requestjs-nice-tool.html
		
		var insertRequestCallback = function(err, res, body)
		{
			var methodName = "insertRequestCallback()";
			
			cbs.dbgLog(methodName + " begins ... ", methodName);
			// if the request threw an error, then let's do the same.
			if (err) { throw err; }

			insertResponseBody = res.body;
			cbs.dbgLog("JSON.stringify(insertResponseBody) = " + insertResponseBody, methodName);
			res.body.length.should.not.be.equal(0); 			  
			readBackRowAndValidate(); //tbleIndexer may be something else here ...

			cbs.dbgLog(methodName + " ends", methodName);
		};
		
		var readBackRowAndValidate = function ()
		{
			var methodName = "readBackRowAndValidate()";
			
			cbs.dbgLog(methodName + ' starts for localTableIndexer ' + localTableIndexer, methodName);
			
			var sqlStatement = "SELECT * FROM " + ESCAPE_SEQUENCE + TABLE_NAMES[localTableIndexer] + ESCAPE_SEQUENCE + " ORDER BY timestamp DESC LIMIT 1;";
			var returnValue = "";
			
			cbs.dbgLog(methodName + ' sending request: ' + sqlStatement, methodName);
			var reqObj = {
				  method: "POST",
				  url: getDingoUrl(),
				  json: true,
				  body: getDingoPostObj(sqlStatement)
				};
				
			request(reqObj, selectRequestCallback);
			
			cbs.dbgLog(methodName + ' ends for localTableIndexer ' + localTableIndexer, methodName);
			
		};
		
		var selectRequestCallback = function(err, res, body)
		{
			var methodName = "selectRequestCallback()"; 
			
			// if the request threw an error, then let's do the same.
			if (err) { throw err; }
			  
			selectResponseBody = res.body;
			  
			var rowsReturned = _.map(res.body, JSON.parse); //Should be either 0 or 1
			
			cbs.dbgLog('NUMBER OF ROWS RETURNED = ' + rowsReturned.length);		
			
			var guidIndex = selectResponseBody.toString().indexOf(guid.toString());
			var sampleIDIndex = selectResponseBody.toString().indexOf(guidAsForeignKey.toString());
			var testFlag = false;
			
			guidAsForeignKey = guid;
			
			if(rowsReturned > 0)
			{
				//Some tests use a GUID, some use a sampleID
				if(guidIndex > -1 || sampleIDIndex > -1 )
				{
					testFlag = false;
					
					cbs.dbgLog("Flag set ..." + guidIndex + "  " + sampleIDIndex);
				}
				else
				{
					cbs.dbgLog("Flag unset ..." + guidIndex + "  " + sampleIDIndex);
				}
				testFlag.should.be.false;
				
				//The timestamp should not have been entered
				selectResponseBody.toString().indexOf(milliseconds.toString()).should.be.equal(-1);
			}
		
			// Test #2: Test that the response status code is OK. (If we've gotten this far, it should be.)
			res.statusCode.should.be.equal(200);
			
			cbs.dbgLog("Test Pass for INVALID INSERT and readback ", methodName);
				  
			// Call the unit-test's callback to signal that this unit-test is done.
			done();

		};
	  
		cbs.dbgLog("About to make request for " + TABLE_NAMES[localTableIndexer]);
		request({
		  method: "POST",
		  url: getDingoUrl(),
		  json: true,
		  body: getDingoPostObj(testInvalidINSERTData[localTableIndexer])
		},
		insertRequestCallback
		);
	}
};

genericSelectFunction = function(done ,tableIndex)
{	
	var localTableIndexer = tableIndex;
	var methodName = "genericSelectFunction()";

	cbs.dbgLog(methodName + " begins ... ", methodName);
	
	cbs.dbgLog("localTableIndexer is ... " + localTableIndexer), "genericSelectFunction";
	
	if (typeof localTableIndexer !== "undefined")
	{
		//Let's assume only this single table must be tested ...
		var selectResponseBody = "";
		
		var selectRequestCallback = function(err, res, body)
		{
			var methodName = "selectRequestCallback()"; 
			// if the request threw an error, then let's do the same.
			if (err) { throw err; }
			  
			selectResponseBody = res.body;
			  
			// * STEP 4 *: TEST SOME RETURN VALUES ALREADY, GEEZ! :)
				  
			// What did we get from the server? Let's check, manually... turns-out, it's an object, so first stringify it.
			//cbs.dbgLog("selectRequestCallback() res.body = " + JSON.stringify(res.body), "selectRequestCallback");
			
			//GUIDs are in common with every entry (bar SourceValue, & Probe where GUID will be missing)
			//Let's assume that guid and millisecond key parameters are generic across any one INSERT bundle ...
			var guidIndex = selectResponseBody.toString().indexOf("id");
			var sampleIDIndex = selectResponseBody.toString().indexOf("sampleId");
			var testFlag = false;
			
			//guidAsForeignKey = guid;
			
			//Some tests use a GUID, some use a sampleID
			if(guidIndex > -1 || sampleIDIndex > -1 )
			{
				testFlag = true;
				
				cbs.dbgLog("Flag set ..." + guidIndex + "  " + sampleIDIndex, methodName);
			}
			else
			{
				cbs.dbgLog("Flag unset ..." + guidIndex + "  " + sampleIDIndex, methodName);
			}
			
			testFlag.should.be.true;
			res.body.length.should.be.above(0); 
			// Test #2: Test that the response status code is OK. (If we've gotten this far, it should be.)
			res.statusCode.should.be.equal(200);
			
			cbs.dbgLog("Test Pass for SELECT on table " + TABLE_NAMES[localTableIndexer], methodName);
			
			cbs.dbgLog(methodName + " ends ...", methodName);
				  
			// Call the unit-test's callback to signal that this unit-test is done.
			done();

		};
	  
		cbs.dbgLog("About to make request for " + TABLE_NAMES[localTableIndexer], "genericSelectFunction");
		request({
		  method: "POST",
		  url: getDingoUrl(),
		  json: true,
		  body: getDingoPostObj(testValidSELECTData[localTableIndexer])
		},
		selectRequestCallback
		);
	}
};

			
// object whose functions we will test
var TestableClass = require('../FunfImporter.js');
if(!TestableClass) 
{
  cbs.errLog("!TestableClass ==> TestableClass not loading properly; TestableClass code probably broken.", "tests/FunfImporter.js");
  return 1;
}
else
{
	cbs.dbgLog('Successfully imported Testable class ... ', "tests/FunfImporter.js");
}


/**
 * Returns some HTTP request parameters.
 * @param  {[type]} postObj [description]
 * @return {[type]}         [description]
 */
var getDingoRequestParamsAndPostData = function(postObj) 
{
  var querystring = require('querystring');
  var postData = querystring.stringify(postObj);
  // values are for the Dev host running the Dingo instance
  var reqParams = 
  {
    host: 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE',
    port: 3339,
    path: "/dingo",
    method: 'POST',
    headers: 
	{
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };
  return { "reqParams": reqParams, "postData": postData };
}

/**
 * Returns a URL to Dingo.
 * @return {[type]} [description]
 */
var getDingoUrl = function() 
{
  return 'http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:3339/dingo';
};

/**
 * Returns an object on which to perform an HTTP POST.
 * @param  {[type]} sql [description]
 * @return {[type]}     [description]
 */
var getDingoPostObj = function(sql) 
{

  // conn info is for the host running the Postgres instance
  // NOTE: the "host" value, at the time of this comment's writing (20121001-1714) is Evan's laptop, which is on DHCP, which means the IP address could change.
  var postObj = 
  {
    'host': 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE',
    'port': 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE',               
    'dbmsName': 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE',
    'dbName': 'S3Evan',
    'username': 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE',
    'user_pw': 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE',
    'sqlCmd': sql
  };
  return postObj;
}

/***** Funf Importer Tests - equivalent to an xUnit class containing multiple tests *****/
describe('FunfImporterTests', function() 
{
  var testData;
  var expected;
  var testableObj;

  /**
   * Setup before *ALL* tests.
   * @return {[type]} [description]
   */
  before(function() 
  {
    testableObj = new TestableClass();
    should.exist(testableObj);
  });
  
  /***** SQL-execution tests *****/
  describe('sendSQLToDingo', 
    
  function() 
  {

    /**
     * Setup before *EACH* test.
     * @return {[type]} [description]
     */
    before(function() 
	{
      should.exist(testableObj);
    });
	
   /**
	* Test clearing of tables ...
    * @param  done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
    */
    it('SuccessfulCLEAR: Sends, via Dingo, 2 SELECT statements for tables in the database.', massClearFunction);
	
   /**
	* Test the sending of a set of valid INSERT statements to Dingo, ensures there's something in DB for subsequent SELECTS.
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param numberOfIterations The number of times each table should be written to
	*/	 
    it('SuccessfulMassINSERT: Sends INSERT statements to multiple tables via Dingo.', function (done) {massInsertFunction(done, 1)});

   /**
	* Test the sending of a SELECT on the ACTIVITY table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	 
	it('SuccessfulActivityProbeSelect: Sends Select statements to the ACTIVITY table via Dingo.', function (done){genericSelectFunction(done, ACTIVITY_INDEX)});
	
   /**
	* Test the sending of a SELECT on the ANDROID_INFO table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulAndroidInfoProbeSelect: Sends Select statements to the ANDROID INFO table via Dingo.', function (done){genericSelectFunction(done, ANDROID_INFO_INDEX)});
	
   /**
	* Test the sending of a SELECT on the APPLICATIONS table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulApplicationsProbeSelect: Sends Select statements to the APPLICATIONS table via Dingo.', function (done){genericSelectFunction(done, APPLICATIONS_INDEX)});
	
   /**
	* Test the sending of a SELECT on the AUDIO_FEATURES table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulAudioProbeSelect: Sends Select statements to the AUDIO_FEATURES table via Dingo.', function (done){genericSelectFunction(done, AUDIO_FEATURES_INDEX)});
	
   /**
	* Test the sending of a SELECT on the BATTERY_INFO table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulBatteryProbeSelect: Sends Select statements to the BATTERY_INFO table via Dingo.', function (done){genericSelectFunction(done, BATTERY_INFO_INDEX)});
	
   /**
	* Test the sending of a SELECT on the BLUETOOTH table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulBluetoothProbeSelect: Sends Select statements to the BLUETOOTH table via Dingo.', function (done){genericSelectFunction(done, BLUETOOTH_INDEX)});
	
   /**
	* Test the sending of a SELECT on the BLUETOOTH_DEVICES table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulBluetoothDevicesProbeSelect: Sends Select statements to the BLUETOOTH_DEVICES table via Dingo.', function (done){genericSelectFunction(done, BLUETOOTH_DEVICES_INDEX)});
	
   /**
	* Test the sending of a SELECT on the CELL table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulCellyProbeSelect: Sends Select statements to the CELL table via Dingo.', function (done){genericSelectFunction(done, CELL_INDEX)});
	
   /**
	* Test the sending of a SELECT on the HARDWARE_INFO table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulHardwareInfoProbeSelect: Sends Select statements to the HARDWARE_INFO table via Dingo.', function (done){genericSelectFunction(done, HARDWARE_INFO_INDEX)});
	
   /**
	* Test the sending of a SELECT on the IMAGES table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulImagesProbeSelect: Sends Select statements to the IMAGES table via Dingo.', function (done){genericSelectFunction(done, IMAGES_INDEX)});
	
   /**
	* Test the sending of a SELECT on the LIGHT_SENSOR table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulLightSensorProbeSelect: Sends Select statements to the LIGHT_SENSOR table via Dingo.', function (done){genericSelectFunction(done, LIGHT_SENSOR_INDEX)});
	
   /**
	* Test the sending of a SELECT on the LIGHT_SENSOR_ARRAY table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulLightSensorArrayProbeSelect: Sends Select statements to the LIGHT_SENSOR_ARRAY table via Dingo.', function (done){genericSelectFunction(done, LIGHT_SENSOR_ARRAY_INDEX)});
	
   /**
	* Test the sending of a SELECT on the LOCATION table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulLocationProbeSelect: Sends Select statements to the LOCATION table via Dingo.', function (done){genericSelectFunction(done, LOCATION_INDEX)});
	
   /**
	* Test the sending of a SELECT on the MAGNETIC_FIELD table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulMagneticFieldProbeSelect: Sends Select statements to the MAGNETIC_FIELD table via Dingo.', function (done){genericSelectFunction(done, MAGNETIC_FIELD_INDEX)});
	
   /**
	* Test the sending of a SELECT on the PRESSURE table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulPressureSensorProbeSelect: Sends Select statements to the PRESSURE table via Dingo.', function (done){genericSelectFunction(done, PRESSURE_SENSOR_INDEX)});
	
   /**
	* Test the sending of a SELECT on the PROBE table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulProbeSelect: Sends Select statements to the PROBE table via Dingo.', function (done){genericSelectFunction(done, PROBE_INDEX)});
	
   /**
	* Test the sending of a SELECT on the PROXIMITY table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulProximitySensorSelect: Sends Select statements to the PROXIMITY table via Dingo.', function (done){genericSelectFunction(done, PROXIMITY_SENSOR_INDEX)});
	
   /**
	* Test the sending of a SELECT on the PROXIMITY_SENSOR_ARRAY table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulProximitySensorArrayProbeSelect: Sends Select statements to the PROXIMITY_SENSOR_ARRAY table via Dingo.', function (done){genericSelectFunction(done, PROXIMITY_SENSOR_ARRAY_INDEX)});
	
   /**
	* Test the sending of a SELECT on the RUNNING_APPS table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulRunningAppsProbeSelect: Sends Select statements to the RUNNING_APPS table via Dingo.', function (done){genericSelectFunction(done, RUNNING_APPS_INDEX)});
	
   /**
	* Test the sending of a SELECT on the SCREEN table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulScreenProbeSelect: Sends Select statements to the SCREEN table via Dingo.', function (done){genericSelectFunction(done, SCREEN_INDEX)});
	
   /**
	* Test the sending of a SELECT on the SOURCE table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulSourceProbeSelect: Sends Select statements to the SOURCE table via Dingo.', function (done){genericSelectFunction(done, SOURCE_INDEX)});
	
   /**
	* Test the sending of a SELECT on the TIME_OFFSET table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulTimeOffsetProbeSelect: Sends Select statements to the TIME_OFFSET table via Dingo.', function (done){genericSelectFunction(done, TIME_OFFSET_INDEX)});
   
   /**
	* Test the sending of a SELECT on the WIFI table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulWifiProbeSelect: Sends Select statements to the WIFI table via Dingo.', function (done){genericSelectFunction(done, WIFI_INDEX)});
	
   /**
	* Test the sending of a SELECT on the WIFI_DEVICES table via Dingo
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of SELECT statements
	*/	
	it('SuccessfulWifiDevicesProbeSelect: Sends Select statements to the WIFI_DEVICES table via Dingo.', function (done){genericSelectFunction(done, WIFI_DEVICES_INDEX)});
	 
   /**
    * Test the sending of a set of valid INSERT on the ACTIVITY table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulActivityProbeINSERT: Sends INSERT & SELECT statements to Activity Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, ACTIVITY_INDEX)} );
	
   /**
    * Test the sending of a set of valid INSERT on the ANDROID_INFO table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulAndroidInfoProbeINSERT: Sends INSERT & SELECT statements to Android Info Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, ANDROID_INFO_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the APPLICATIONS table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulApplicationsProbeINSERT: Sends INSERT & SELECT statements to Applications Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, APPLICATIONS_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the AUDIO_FEATURES table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulAudioFeaturesProbeINSERT: Sends INSERT & SELECT statements to Audio Features Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, AUDIO_FEATURES_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the BATTERY_INFO table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulBatteryInfoProbeINSERT: Sends INSERT & SELECT statements to Battery Info Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, BATTERY_INFO_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the BLUETOOTH table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulBluetoothProbeINSERT: Sends INSERT & SELECT statements to Bluetooth Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, BLUETOOTH_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the BLUETOOTH_DEVICES table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulBluetoothDevicesINSERT: Sends INSERT & SELECT statements to Bluetooth Devices Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, BLUETOOTH_DEVICES_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the CELL table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulCellIndexProbeINSERT: Sends INSERT & SELECT statements to Cell Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, CELL_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the HARDWARE_INFO table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulHardwareInfoProbeINSERT: Sends INSERT & SELECT statements to Hardware Info Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, HARDWARE_INFO_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the IMAGES table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulImagesProbeINSERT: Sends INSERT & SELECT statements to Images Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, IMAGES_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the LIGHT_SENSOR table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulLightSensorProbeINSERT: Sends INSERT & SELECT statements to Light Sensor Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, LIGHT_SENSOR_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the LIGHT_SENSOR_ARRAY table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulLightSensorArrayINSERT: Sends INSERT & SELECT statements to Light Sensor Array via Dingo.', function (done){genericInsertWithSelectValidation(done, LIGHT_SENSOR_ARRAY_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the LOCATION table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulLocationProbeINSERT: Sends INSERT & SELECT statements to Location Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, LOCATION_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the MAGNETIC_FIELD table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulMagneticFieldProbeINSERT: Sends INSERT & SELECT statements to Magnetic Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, MAGNETIC_FIELD_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the PRESSURE table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulPressureSensorProbeINSERT: Sends INSERT & SELECT statements to Pressure Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, PRESSURE_SENSOR_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the PROXIMITY table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulProximitySensorProbeINSERT: Sends INSERT & SELECT statements to Proximity Sensor Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, PROXIMITY_SENSOR_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the PROXIMITY_ARRAY table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulProximitySensorArrayINSERT: Sends INSERT & SELECT statements to Proximity Array Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, PROXIMITY_SENSOR_ARRAY_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the RUNNING_APPS table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulRunningAppsProbeINSERT: Sends INSERT & SELECT statements to Running Apps Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, RUNNING_APPS_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the SCREEN table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulScreenProbeINSERT: Sends INSERT & SELECT statements to Screen Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, SCREEN_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the SOURCE table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulSourceProbeINSERT: Sends INSERT & SELECT statements to Source Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, SOURCE_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the TIME_OFFSET table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulTimeOffsetProbeINSERT: Sends INSERT & SELECT statements to Time Offset Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, TIME_OFFSET_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the WIFI table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulWifiProbeINSERT: Sends INSERT & SELECT statements to Wifi Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, WIFI_INDEX)});
	
   /**
    * Test the sending of a set of valid INSERT on the WIFI_DEVICES table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	it('SuccessfulWifiDevicesINSERT: Sends INSERT & SELECT statements to Wifi Devices Probe via Dingo.', function (done){genericInsertWithSelectValidation(done, WIFI_DEVICES_INDEX)});
	

   /**
    * Test the sending of a set of INVALID INSERT on the ACTIVITY table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	 it('InvalidTestSyntaxError: Sends INVALID INSERT & VALID SELECT statements to Activtiy Probe via Dingo.', function (done){genericInvalidInsertWithSelectValidation(done, ACTIVITY_INDEX)});
	 
   /**
    * Test the sending of a set of INVALID INSERT on the ANDROID_INFO table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	 //it('InvalidTestIncorrectType: Sends INVALID INSERT & VALID SELECT statements to Android INFO Probe via Dingo.', function (done){genericInvalidInsertWithSelectValidation(done, ANDROID_INFO_INDEX)});
	 
   /**
    * Test the sending of a set of INVALID INSERT on the APPLICATIONS table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	 it('InvalidTestNonExistentParam: Sends INVALID INSERT & VALID SELECT statements to Applications Probe via Dingo.', function (done){genericInvalidInsertWithSelectValidation(done, APPLICATIONS_INDEX)});
	 
   /**
    * Test the sending of a set of INVALID INSERT on the AUDIO_FEATURES table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	 it('InvalidTestMissingRequiredField: Sends INVALID INSERT & VALID SELECT statements to Audio Features Probe via Dingo.', function (done){genericInvalidInsertWithSelectValidation(done, AUDIO_FEATURES_INDEX)});
	 
   /**
    * Test the sending of a set of INVALID INSERT on the BATTERY_INFO table with corresponding synchronous SELECT statement verification
	* @param done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
	* @param tableIndex An indexer into the array of INSERT statements
    */	
	 it('InvalidTestIDFieldUndefined: Sends INVALID INSERT & VALID SELECT statements to Battery Probe via Dingo.', function (done){genericInvalidInsertWithSelectValidation(done, BATTERY_INFO_INDEX)}); 
	
	/**
     * Test the sending of multiple SELECT statements to Dingo.
     * @param  {Function} done A callback within Mocha. CRITICAL: This forces the test to wait on the asynchronous function!
     * @return {[type]}        [description]
     */
    it('SuccessfulMassSELECT: Sends, via Dingo, Multiple SELECT statements for tables in the database.', function(done) {
      // * STEP 1 *: Create your test data.
      testData = [
	  
				 SELECT_ACTIVITY_PROBE,
				 SELECT_ANDROID_INFO_PROBE,
				 SELECT_APPLICATIONS_PROBE,
				 SELECT_AUDIO_FEATURES_PROBE,
				 SELECT_BATTERY_PROBE,
				 SELECT_BLUETOOTH_PROBE,
				 SELECT_BLUETOOTH_DEVICES_PROBE,
				 SELECT_CELL_PROBE,
				 SELECT_HARDWARE_INFO_PROBE,
				 SELECT_IMAGES_PROBE,
				 SELECT_LIGHT_SENSOR_PROBE,
				 SELECT_LIGHT_SENSOR_PROBE_ARRAY_VALUES,
				 SELECT_LOCATION_PROBE,
				 SELECT_MAGNETIC_FIELD_SENSOR_PROBE,
				 SELECT_PRESSURE_SENSOR_PROBE,
				 SELECT_PROBE_LIST,
				 SELECT_PROXIMITY_SENSOR_PROBE,
				 SELECT_PROXIMITY_SENSOR_PROBE_ARRAY_VALUES,
				 SELECT_RUNNING_APPLICATIONS_PROBE,
				 SELECT_SCREEN_PROBE,
				 SELECT_SOURCE_VALUE,
				 SELECT_TIME_OFFSET_PROBE,
				 SELECT_WIFI_PROBE,
				 SELECT_WIFI_SCAN_RESULTS_PROBE
        ];

       // * STEP 2 *: Submit your request to Dingo.
       //  APPROACH #4: Use the request.js module. Src: http://blog.kardigen.org/2012/03/mochajs-shouldjs-requestjs-nice-tool.html
       request({
           method: "POST",
           url: getDingoUrl(),
           json: true,
           body: getDingoPostObj(testData)
         },
        // * STEP 3 *: Response function: this runs after the server sends its response.
        function(err, res, body) {
          // if the request threw an error, then let's do the same.
          if (err) { cbs.errLog(err); throw err; }

          // What did we get from the server? Let's check, manually... turns-out, it's an object, so first stringify it.
          cbs.dbgLog("res.body = " + JSON.stringify(res.body), "SuccessfulMassSELECT");
          
          // At this point, res.body is an array of strings.
          // For testing convenience, here I convert each returned row -- a string -- to an object in an array, by mapping each element in res.body to the JSON.parse function.
          // The _.map function iterates over res.body, and for each element, passes the element as the 1st & only parameter to JSON.parse (which expects 1 parameter). JSON.parse executes, and returns a JS object created from that element.
          // In this object form, we can thus perform any set-theoretic operations we want to on the array!
          var rowsReturned = _.map(res.body, JSON.parse);

          // DBG: useful to see each row returned from Dingo.
          // _.each(rowsReturned, function(r) { cbs.dbgLog('rowsReturned row = ' + JSON.stringify(r)); });
          
          // * STEP 4 *: TEST SOME RETURN VALUES ALREADY, GEEZ! :)
          
          // Test #1: Very simple: If any row has an id value of 1 (i.e., is the first row in the table), then this test passes; else, it fails.
          // Here, it should pass (i.e., our assertion should be true).
          var foundId = _.any(rowsReturned, function(r) { return r.id == 1; });
          foundId.should.equal(true);

          // Test #2: Test that the response status code is OK. (If we've gotten this far, it should be.)
          res.statusCode.should.be.equal(200);
          
          // Call the unit-test's callback to signal that this unit-test is done.
          done();
        });
    });
	
    /**
     * Test the sending of invalid INSERT statements to Dingo.
     * @return {[type]} [description]
     */
    // it('Sends bogus data to the database via Dingo (should return an error)', function(done) { 
      // throw "Not implemented. See the \"SuccessfulSELECT\" test above as a sample.";
    // });

  });
});

function initializeInsertState(guidOverride)
{
	var methodName = "initializeInsertState()";
	
	cbs.dbgLog(methodName + " begins ... ", methodName);
	
	if (typeof guidOverride !== "undefined")
	{
		guid = guidOverride;
	}
	else
	{
		cbs.dbgLog("About to call GUID generator ", methodName);
		guid = GUIDGenerator();
		cbs.dbgLog("GUID generator returns ", guid);
	}	
	
	cbs.dbgLog("Guid is " + guid, methodName);
	
	if(guidAsForeignKey == null)
	{
		cbs.dbgLog("guidAsForeignKey is null ...", methodName);
		guidAsForeignKey = guid;
	}
	
	
	var currentDate = new Date();
	  
	milliseconds = Date.parse(currentDate);
		
	milliseconds /= 1000;
	  
	var INSERT_ACTIVITY_PROBE = "INSERT INTO \"ActivityProbe\" ( \"id\", \"timestamp\",\"eventDateTime\",\"HIGH_ACTIVITY_INTERVALS\",\"TOTAL_INTERVALS\",\"TIMESTAMP\",\"LOW_ACTIVITY_INTERVALS\") VALUES('" + guid + "'," +milliseconds+"  ,to_timestamp("+milliseconds+"  ),0,5,"+milliseconds+"  ,4);";
	var INSERT_ANDROID_INFO_PROBE = "INSERT INTO \"AndroidInfoProbe\" ( \"id\", \"timestamp\", \"eventDateTime\", \"BUILD_NUMBER\", \"FIRMWARE_VERSION\", \"SDK\", \"TIMESTAMP\") VALUES ('" + guid + "'," +milliseconds+", to_timestamp("+milliseconds+"), 'soju-user 2.3.4 GRJ22 121341 release-keys', '2.3.4',10, "+milliseconds+" );";
	var INSERT_APPLICATIONS_PROBE = "INSERT INTO \"ApplicationsProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"INSTALLED_APPLICATIONS\", \"TIMESTAMP\", \"UNINSTALLED_APPLICATIONS\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), '[{ \"dataDir\": \"/data/data/com.google.android.location\",\"taskAffinity\": \"com.google.android.location\", \"sourceDir\": \"/system/app/NetworkLocation.apk\", \"nativeLibraryDir\": \"/data/data/com.google.android.location/lib\", \"processName\": \"com.google.process.gapps\", \"publicSourceDir\": \"/system/app/NetworkLocation.apk\", \"installLocation\": -1, \"flags\": 572997, \"enabled\": true, \"targetSdkVersion\": 10, \"descriptionRes\": 0, \"theme\": 0, \"uid\": 10019, \"packageName\": \"com.google.android.location\", \"logo\": 0, \"labelRes\": 2130837504, \"icon\": 0}, {\"dataDir\": \"/data/data/com.android.voicedialer\", \"taskAffinity\": \"com.android.voicedialer\", \"sourceDir\": \"/system/app/VoiceDialer.apk\", \"nativeLibraryDir\": \"/data/data/com.android.voicedialer/lib\", \"processName\": \"com.android.voicedialer\", \"publicSourceDir\": \"/system/app/VoiceDialer.apk\", \"installLocation\": -1, \"flags\": 572997, \"enabled\": true, \"targetSdkVersion\": 10, \"descriptionRes\": 0, \"theme\": 16973835, \"uid\": 10004, \"packageName\": \"com.android.voicedialer\", \"logo\": 0, \"labelRes\": 2130968576, \"icon\": 2130837504}]',1316125815,'{\"dataDir\": \"/data/data/com.weather.Weather\", \"taskAffinity\": \"com.weather.Weather\", \"sourceDir\": \"/data/app/com.weather.Weather-1.apk\", \"nativeLibraryDir\": \"/data/data/com.weather.Weather/lib\", \"processName\": \"com.weather.Weather\", \"publicSourceDir\": \"/data/app/com.weather.Weather-1.apk\", \"installLocation\": -1, \"flags\": 48710, \"enabled\": true, \"targetSdkVersion\": 4, \"descriptionRes\": 0, \"theme\": 16973830, \"uid\": 10079, \"packageName\": \"com.weather.Weather\", \"logo\": 0, \"labelRes\": 2131361793, \"icon\": 2130837560}' );";
	var INSERT_AUDIO_FEATURES_PROBE = "INSERT INTO \"AudioFeaturesProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"DIFF_SECS\", \"L1_NORM\", \"L2_NORM\", \"LINF_NORM\", \"MFCCS\", \"PSD_ACROSS_FREQUENCY_BANDS\", \"TIMESTAMP\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), 9, 99, 999, 9999, 99999, 999999, 1345699268);";
	var INSERT_BATTERY_PROBE = "INSERT INTO \"BatteryProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"TIMESTAMP\", \"health\", \"icon_SUB_small\", \"invalid_charger\", \"level\", \"plugged\", \"present\", \"scale\", \"status\", \"technology\", \"temperature\", \"voltage\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), "+milliseconds+", 2, 17302188, 1, 94, 2, true, 100, 2, 'Li-ion', 280, 4176);";
	var INSERT_BLUETOOTH_PROBE = "INSERT INTO \"BluetoothProbe\" (\"id\", \"timestamp\",\"eventDateTime\",\"TIMESTAMP\")	VALUES ('" + guid + "',"+milliseconds+",to_timestamp("+milliseconds+"),"+milliseconds+");";
	var INSERT_BLUETOOTH_DEVICES = "INSERT INTO \"BluetoothProbe.DEVICES\" (\"timestamp\",\"eventDateTime\", \"arrayIdx\", \"android.bluetooth.device.extra.DEVICE.mAddress\", \"android.bluetooth.device.extra.NAME\", \"android.bluetooth.device.extra.RSSI\", \"android.bluetooth.device.extra.CLASS.mClass\", \"sampleId\") VALUES ("+milliseconds+",to_timestamp("+milliseconds+"),1,'74:F0:6D:A7:E7:66','MEGA',-64,4063492,'" + guidAsForeignKey + "');";
	var INSERT_CELL_PROBE = "INSERT INTO \"CellProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"TIMESTAMP\", \"type\", \"cid\", \"lac\", \"psc\", \"baseStationId\", \"baseStationLatitude\", \"baseStationLongitude\", \"networkId\", \"systemId\")  VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), "+milliseconds+", 1, 22682, 6012, -1, -1, -1, -1, -1, -1);";
	var INSERT_HARDWARE_INFO_PROBE = "INSERT INTO \"HardwareInfoProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"ANDROID_ID\", \"BLUETOOTH_MAC\", \"BRAND\", \"DEVICE_ID\", \"MODEL\", \"TIMESTAMP\", \"WIFI_MAC\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), 'c3a5c9a115d94ea2', '00:00:00:00:00:00', 'google', '344031460718032', 'Galaxy Nexus', "+milliseconds+", '00:00:00:00:00:00');";
	var INSERT_IMAGES_PROBE = "INSERT INTO \"ImagesProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"IMAGES\", \"TIMESTAMP\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), '[{\"bucket_id\": \"1506676782\",\"orientation\": 0,\"date_modified\": 1312060620,\"bucket_display_name\": \"{ONE_WAY_HASH:4da9c9af9631e294961d5a16fdc681ca3d84f508}\", \"title\": \"{ONE_WAY_HASH:ecc613e31642f16783da3fbb25943c5eafefe52}\", \"mini_thumb_magic\": 867321541, \"_id\": \"142\", \"mime_type\": \"image/jpeg\", \"date_added\": 1312071421, \"_display_name\": \"{ONE_WAY_HASH: 8eec46fa3d33efc804ef6202d3bc4b62a19a6471}\", \"isprivate\": 0, \"description\": \"\", \"_size\": 2272384, \"longitude\": -71.087637, \"latitude\": 42.360938, \"datetaken\": 1312071420000}, {\"bucket_id\": \"1506676782\", \"orientation\": 180, \"date_modified\": 1312057590, \"bucket_display_name\": \"{ONE_WAY_HASH:4da9c9af9631e294961d5a16fdc681ca3d84f508}, \"title\": \"{ONE_WAY_HASH:aa1bc843e2b6ad420a73e415af2d795b6552eab7}\", \"mini_thumb_magic\": -483944364, \"_id\": \"141\", \"mime_type\": \"image/jpeg\", \"date_added\": 1312068391, \"_display_name\": \"{ONE_WAY_HASH:b6a90f2ac480c4f06d59a06341939296ef153bb7}\", \"isprivate\": 0, \"description\": \"\", \"_size\": 1439330, \"longitude\": -71.087637, \"latitude\": 42.360938, \"datetaken\": 1312068390000},{\"bucket_id\": \"1506676782\",\"orientation\": 180,\"date_modified\": 1312057584,\"bucket_display_name\": \"{ONE_WAY_HASH:4da9c9af9631e294961d5a16fdc681ca3d84f508}\",\"title\": \"{ONE_WAY_HASH:cf70ec1c29cd460f4cfbeedf4ce2dd8cba207541}\",\"mini_thumb_magic\": -1137136377,\"_id\": \"140\",\"mime_type\": \"image/jpeg\",\"date_added\": 1312068384,\"_display_name\": \"{ONE_WAY_HASH:32199908db52948be8017a1687b0040732751b89}\",\"isprivate\": 0,\"description\": \"\",\"_size\": 1617194,\"longitude\": -71.087637,\"latitude\": 42.360938,\"datetaken\": 1312068383000]', 1316000712);";
	var INSERT_LIGHT_SENSOR_PROBE = "INSERT INTO \"LightSensorProbe\" (\"id\", \"timestamp\",\"eventDateTime\",\"SENSOR.RESOLUTION\",\"SENSOR.POWER\",\"SENSOR.NAME\",\"SENSOR.VERSION\",\"SENSOR.TYPE\",\"SENSOR.MAXIMUM_RANGE\",\"SENSOR.VENDOR\") VALUES ('" + guid + "',"+milliseconds+",to_timestamp("+milliseconds+"),1,0.75,'GP2A Light Sensor',1,5,3000,'Sharp');";
	var INSERT_LIGHT_SENSOR_ARRAY_VALUES = "INSERT INTO \"LightSensorProbe.ArrayValues\" (\"timestamp\",\"eventDateTime\", \"arrayIdx\", \"ACCURACY\",\"LUX\",\"EVENT_TIMESTAMP\", \"sampleId\") VALUES ("+milliseconds+",to_timestamp("+milliseconds+"), 1, 0, 146, 8170743497000,'" + guidAsForeignKey + "');";
	var INSERT_LOCATION_PROBE = "INSERT INTO \"LocationProbe\" (\"id\", \"timestamp\",\"eventDateTime\", \"TIMESTAMP\",\"LOCATION.mResults\",\"LOCATION.mProvider\",\"LOCATION.mExtras.satellites\",\"LOCATION.mDistance\",\"LOCATION.mTime\",\"LOCATION.mAltitude\",\"LOCATION.mLongitude\",\"LOCATION.mLon2\",\"LOCATION.mLon1\",\"LOCATION.mLatitude\",\"LOCATION.mLat1\",\"LOCATION.mLat2\",\"LOCATION.mInitialBearing\",\"LOCATION.mHasSpeed\",\"LOCATION.mHasBearing\",\"LOCATION.mHasAltitude\",\"LOCATION.mHasAccuracy\",\"LOCATION.mAccuracy\",\"LOCATION.mSpeed\",\"LOCATION.mBearing\") VALUES ('" + guid + "',"+milliseconds+",to_timestamp("+milliseconds+"),"+milliseconds+",'[0,0]','gps',6,0,1345699270643,149.89999389648438,-87.68242118,0,0,41.96831737,0,0,0,true,true,true,true,21,0.25,128.5);";
	var INSERT_MAGNETIC_FIELD_PROBE = "INSERT INTO \"MagneticFieldSensorProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"ACCURACY\", \"EVENT_TIMESTAMP\", \"SENSOR.MAXIMUM_RANGE\", \"SENSOR.NAME\", \"SENSOR.POWER\", \"SENSOR.RESOLUTION\", \"SENSOR.TYPE\", \"SENSOR.VENDOR\", \"SENSOR.VERSION\", \"TIMESTAMP\")  VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), '[3,3]', '[ 151004165361000,151004165361000]', '2000.0', 'AK8973 3-axis Magnetic field sensor', 6.8, 0.0625, 2, 'Asahi Kasei Microdevices', 1, 1316125850);";
	var INSERT_PRESSURE_SENSOR_PROBE = "INSERT INTO \"PressureSensorProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"ACCURACY\", \"EVENT_TIMESTAMP\", \"PRESSURE\", \"SENSOR.MAXIMUM_RANGE\", \"SENSOR.NAME\", \"SENSOR.POWER\", \"SENSOR.RESOLUTION\", \"SENSOR.TYPE\", \"SENSOR.VENDOR\", \"SENSOR.VERSION\", \"TIMESTAMP\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), '[3,3]', '[ 151004165361000,151004165361000]',  '1113.00', '2000.0', 'bmp180 Pressure Sensor', 6.8, 0.0625, 2, 'Killer Pressure Sensors Inc.', 1, 1316125850);";
	var INSERT_PROBE = "";
	var INSERT_PROXIMITY_SENSOR_PROBE = "INSERT INTO \"ProximitySensorProbe\" (\"id\", \"timestamp\",\"eventDateTime\",\"SENSOR.RESOLUTION\",\"SENSOR.POWER\",\"SENSOR.NAME\",\"SENSOR.VERSION\",\"SENSOR.TYPE\",\"SENSOR.MAXIMUM_RANGE\",\"SENSOR.VENDOR\")  VALUES ('" + guid + "',"+milliseconds+",to_timestamp("+milliseconds+"),5,0.75,'GP2A Proximity Sensor',1,8,5,'Sharp');";
	var INSERT_PROXIMITY_SENSOR_ARRAY_VALUES = "INSERT INTO \"ProximitySensorProbe.ArrayValues\" (\"timestamp\",\"eventDateTime\", \"arrayIdx\", \"ACCURACY\",\"DISTANCE\",\"EVENT_TIMESTAMP\", \"sampleId\") VALUES ("+milliseconds+",to_timestamp("+milliseconds+"), 1, 0, 3.1415, 8170743497000,'" + guidAsForeignKey + "');";
	var INSERT_RUNNING_APPS_PROBE = "INSERT INTO \"RunningApplicationsProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"RUNNING_TASKS\", \"TIMESTAMP\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), '[{ \"baseActivity\": { \"mClass\": \"edu.mit.media.funf.collector.RootActivity\", \"mPackage\": \"edu.mit.media.funf.collector\"}, \"topActivity\": { \"mClass\": \"edu.mit.media.funf.collector.RootActivity\", \"mPackage\": \"edu.mit.media.funf.collector\", \"numRunning\": 1, \"numActivities\": 1, \"id\": 129},{\"baseActivity\":{\"mClass\": \"com.android.launcher2.Launcher\", \"mPackage\": \"com.android.launcher\"}, \"topActivity\": {\"mClass\": \"com.android.launcher2.Launcher\",\"mPackage\": \"com.android.launcher\"},\"numRunning\": 1, \"numActivities\": 1,\"id\": 77},{\"baseActivity\": {\"mClass\": \"com.android.contacts.DialtactsActivity\",\"mPackage\": \"com.android.contacts\"}, \"topActivity\": {\"mClass\": \"com.android.contacts.DialtactsActivity\",\"mPackage\": \"com.android.contacts\"}, \"numRunning\": 1,\"numActivities\": 1,\"id\": 123}]',1316125889);";
	var INSERT_SCREEN_PROBE = "INSERT INTO \"ScreenProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"SCREEN_ON\", \"TIMESTAMP\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), true, "+milliseconds+")";
	var INSERT_SOURCE_VALUE = "INSERT INTO \"SourceValue\" (\"id\", \"timestamp\", \"value\") VALUES ('" + guid + "', "+milliseconds+",'{\"HIGH_ACTIVITY_INTERVALS\":0,\"PROBE\":\"edu.mit.media.funf.probe.builtin.ActivityProbe\",\"TOTAL_INTERVALS\":5,\"TIMESTAMP\":1345699291,\"LOW_ACTIVITY_INTERVALS\":4,\"ignore\":{\"_id\":\"26\"}}');";
	var INSERT_TIME_OFFSET = "INSERT INTO \"TimeOffsetProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"TIMESTAMP\", \"TIME_OFFSET\") VALUES ('" + guid + "',"+milliseconds+",to_timestamp("+milliseconds+"), "+milliseconds+", -0.06);";
	var INSERT_WIFI_PROBE = "INSERT INTO \"WifiProbe\" (\"id\", \"timestamp\",\"eventDateTime\", \"TIMESTAMP\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), "+milliseconds+");";
	var INSERT_WIFI_SCAN_RESULTS = "INSERT INTO \"WifiProbe.SCAN_RESULTS\" (\"timestamp\",\"eventDateTime\", \"arrayIdx\", \"BSSID\", \"SSID\", \"capabilities\", \"frequency\", \"level\", \"sampleId\") VALUES ("+milliseconds+",to_timestamp("+milliseconds+"), 5, '64:0f:28:db:fa:d1','2WIRE409','[WPA-PSK-TKIP+CCMP][WPA2-PSK-TKIP+CCMP][ESS]',2452,-82,'" + guidAsForeignKey + "');";		
	
	testValidINSERTData = 
						[
							INSERT_ACTIVITY_PROBE,	
							INSERT_ANDROID_INFO_PROBE,
							INSERT_APPLICATIONS_PROBE,
							INSERT_AUDIO_FEATURES_PROBE,
							INSERT_BATTERY_PROBE,
							INSERT_BLUETOOTH_PROBE,
							INSERT_BLUETOOTH_DEVICES,
							INSERT_CELL_PROBE,
							INSERT_HARDWARE_INFO_PROBE,
							INSERT_IMAGES_PROBE,
							INSERT_LIGHT_SENSOR_PROBE,
							INSERT_LIGHT_SENSOR_ARRAY_VALUES,
							INSERT_LOCATION_PROBE,
							INSERT_MAGNETIC_FIELD_PROBE,
							INSERT_PRESSURE_SENSOR_PROBE,
							INSERT_PROBE,
							INSERT_PROXIMITY_SENSOR_PROBE,
							INSERT_PROXIMITY_SENSOR_ARRAY_VALUES,
							INSERT_RUNNING_APPS_PROBE,
							INSERT_SCREEN_PROBE,
							INSERT_SOURCE_VALUE,
							INSERT_TIME_OFFSET,
							INSERT_WIFI_PROBE,
							INSERT_WIFI_SCAN_RESULTS	
						];
	// guidAsForeignKey = guid;
	cbs.dbgLog(methodName + " ends ... ", methodName);
}

function initializeInvalidINSERTState(guidOverride)
{
	var methodName = "initializeInvalidINSERTState()";
	
	cbs.dbgLog(methodName + " begins ... ", methodName);
	
	if (typeof guidOverride !== "undefined")
	{
		guid = guidOverride;
	}
	else
	{
		guid = GUIDGenerator();
	}	
	
	cbs.dbgLog("Guid is " + guid, methodName);
	
	if(guidAsForeignKey == null)
	{
		cbs.dbgLog("guidAsForeignKey is null ...", methodName);
		guidAsForeignKey = guid;
	}
	
	var currentDate = new Date();
	  
	milliseconds = Date.parse(currentDate);
		
	milliseconds /= 1000;

	cbs.dbgLog(methodName + " begins ... ", methodName);
		
	// Missing Quotes on Table Name
	var INVALID_SYNTAX_ON_INSERT = "INSERT INTO ActivityProbe ( \"id\", \"timestamp\",\"eventDateTime\",\"HIGH_ACTIVITY_INTERVALS\",\"TOTAL_INTERVALS\",\"TIMESTAMP\",\"LOW_ACTIVITY_INTERVALS\") VALUES('" + guid + "'," +milliseconds+"  ,to_timestamp("+milliseconds+"  ),0,5,"+milliseconds+"  ,4);";
	//Param 1 is of type INT, not TEXT -- just converted to text ...
	//var INVALID_TYPE_ON_INSERT = "INSERT INTO \"AndroidInfoProbe\" ( \"id\", \"timestamp\", \"eventDateTime\", \"BUILD_NUMBER\", \"FIRMWARE_VERSION\", \"SDK\", \"TIMESTAMP\") VALUES (1," +milliseconds+", to_timestamp("+milliseconds+"), 'soju-user 2.3.4 GRJ22 121341 release-keys', '2.3.4',10, "+milliseconds+" );"; 
	//Additional non-existent last parameter ...
	var TOO_MANY_PARAMETERS_ON_INSERT = "INSERT INTO \"ApplicationsProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"INSTALLED_APPLICATIONS\", \"TIMESTAMP\", \"UNINSTALLED_APPLICATIONS\", \"iMadeThisUp\") VALUES ('" + guid + "',"+milliseconds+", to_timestamp("+milliseconds+"), '[{ \"dataDir\": \"/data/data/com.google.android.location\",\"taskAffinity\": \"com.google.android.location\", \"sourceDir\": \"/system/app/NetworkLocation.apk\", \"nativeLibraryDir\": \"/data/data/com.google.android.location/lib\", \"processName\": \"com.google.process.gapps\", \"publicSourceDir\": \"/system/app/NetworkLocation.apk\", \"installLocation\": -1, \"flags\": 572997, \"enabled\": true, \"targetSdkVersion\": 10, \"descriptionRes\": 0, \"theme\": 0, \"uid\": 10019, \"packageName\": \"com.google.android.location\", \"logo\": 0, \"labelRes\": 2130837504, \"icon\": 0}, {\"dataDir\": \"/data/data/com.android.voicedialer\", \"taskAffinity\": \"com.android.voicedialer\", \"sourceDir\": \"/system/app/VoiceDialer.apk\", \"nativeLibraryDir\": \"/data/data/com.android.voicedialer/lib\", \"processName\": \"com.android.voicedialer\", \"publicSourceDir\": \"/system/app/VoiceDialer.apk\", \"installLocation\": -1, \"flags\": 572997, \"enabled\": true, \"targetSdkVersion\": 10, \"descriptionRes\": 0, \"theme\": 16973835, \"uid\": 10004, \"packageName\": \"com.android.voicedialer\", \"logo\": 0, \"labelRes\": 2130968576, \"icon\": 2130837504}]',1316125815,'{\"dataDir\": \"/data/data/com.weather.Weather\", \"taskAffinity\": \"com.weather.Weather\", \"sourceDir\": \"/data/app/com.weather.Weather-1.apk\", \"nativeLibraryDir\": \"/data/data/com.weather.Weather/lib\", \"processName\": \"com.weather.Weather\", \"publicSourceDir\": \"/data/app/com.weather.Weather-1.apk\", \"installLocation\": -1, \"flags\": 48710, \"enabled\": true, \"targetSdkVersion\": 4, \"descriptionRes\": 0, \"theme\": 16973830, \"uid\": 10079, \"packageName\": \"com.weather.Weather\", \"logo\": 0, \"labelRes\": 2131361793, \"icon\": 2130837560}', 'iMadeThisUp' );";
	//Missing required ID Field
	var TOO_FEW_PARAMETERS_ON_INSERT = "INSERT INTO \"AudioFeaturesProbe\" (\"timestamp\", \"eventDateTime\", \"DIFF_SECS\", \"L1_NORM\", \"L2_NORM\", \"LINF_NORM\", \"MFCCS\", \"PSD_ACROSS_FREQUENCY_BANDS\", \"TIMESTAMP\") VALUES ("+milliseconds+", to_timestamp("+milliseconds+"), 9, 99, 999, 9999, 99999, 999999, 1345699268);";
	//Invalid ID Field
	var INVALID_ID_FIELD = "INSERT INTO \"BatteryProbe\" (\"id\", \"timestamp\", \"eventDateTime\", \"TIMESTAMP\", \"health\", \"icon_SUB_small\", \"invalid_charger\", \"level\", \"plugged\", \"present\", \"scale\", \"status\", \"technology\", \"temperature\", \"voltage\") VALUES ('" + undefined + "',"+milliseconds+", to_timestamp("+milliseconds+"), "+milliseconds+", 2, 17302188, 1, 94, 2, true, 100, 2, 'Li-ion', 280, 4176);";
	
	testInvalidINSERTData = 
						[
							INVALID_SYNTAX_ON_INSERT,
							//INVALID_TYPE_ON_INSERT,
							TOO_MANY_PARAMETERS_ON_INSERT,
							TOO_FEW_PARAMETERS_ON_INSERT
						];
						
	cbs.dbgLog(methodName + " ends ... ", methodName);
}

function discoverResponseTable(insertResponseBody)
{
	var methodName = "discoverResponseTable()";
	
	cbs.dbgLog(methodName + " begins for " + insertResponseBody, methodName);
	var returnValue = -1;
	
	for(var tableIndexer = 0; tableIndexer <=  TOTAL_NUMBER_OF_TABLES  - 1; tableIndexer++)
	{
		if(insertResponseBody.toString().indexOf(TABLE_NAMES[tableIndexer]) > -1)
		{
			//We've got a match
			returnValue = tableIndexer;
			cbs.dbgLog("Match found for " + TABLE_NAMES[tableIndexer], methodName);
			break;
		}
	}
	
	cbs.dbgLog(methodName +  " ends, returning " + returnValue, methodName);
	
	return returnValue;
}

//No true GUIDs for Javascript -- http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
function GUIDGenerator()
{
	var returnValue = "";
	var methodName = "GUIDGenerator";
	
    var S4 = function ()
    {
		cbs.dbgLog("S4() gets called ...");
        return Math.floor(Math.random() * 0x10000 /* 65536 */).toString(16);
    };
	
	cbs.dbgLog(methodName + " begins ...");
	returnValue =	S4() + S4() + "-" +
					S4() + "-" +
					S4() + "-" +
					S4() + "-" +
					S4() + S4() + S4();

	
	cbs.dbgLog("GUIDGenerator() about to return " + returnValue );				
    return (returnValue);
};