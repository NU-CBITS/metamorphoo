// Metamorphoo (Greek for "metamorphosis")
//
// Performs ETL operations.
//
// Created: May 15, 2012
// Creator: Evan Story (evan.story@northwestern.edu)

var cluster = require('cluster');
// var clusterHttp = require('http');
var numCPUs = require('os').cpus().length;

var cbs = require('./cbitsSys.js');

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    // console.log('worker ' + worker.process.pid + ' died');
    cbs.msgLog('worker ' + worker.process.pid + ' died', 'server.js');
  });
}
else {

  // config from cfg file
  var cfgInCurrEnv, startupLog;
  try {
    startupLog = "\n\t********************************************************************************\n"
               + "\t****  CBITS Metamorphoo STARTED (" + (new Date()) + ")  *****\n"
               + "\t********************************************************************************\n";
    cfgFilePath = process.argv[2];
    appEnv = process.argv[3];
    // cbs.msgLog('Cfg file path = ' + cfgFilePath);
    // cbs.msgLog('Environment = ' + appEnv);
    // startup += '\tCfg file path = ' + cfgFilePath + '\n';
    startupLog += '\tEnvironment = ' + appEnv + '\n';
    cfg = cbs.getAppConfig(cfgFilePath);
    // cbs.msgLog('Getting app cfg values');
    startupLog += '\tCfg file path = ' + cfgFilePath + '\n';
    cfgInCurrEnv = cbs.getAppConfigValue(cfg, appEnv);
    // configure logging
    cbs.configureLogging(cfgInCurrEnv.log4js.cfgFilePath, 300);
    cbs.msgLog(startupLog);
  }
  catch (error) {
    console.log(startupLog);
    var errMsg = 'ERROR: error configuring Metamorphoo: ' +  error;
    throw errMsg;
  }



  // // Workers can share any TCP connection
  // // In this case its a HTTP server
  // clusterHttp.createServer(function(req, res) {

  // var cbs = require('./cbitsSys.js');
  var util = require('util');
  var http = require('http');
  var express = require('express');
  var _ = require('underscore');
  var url = require('url');
  var path = require('path');
  var fs = require('fs');
  // var dbMySQL = require('db-mysql');
  var GoogleDocs = require('./GoogleDocs.js');
  var google2=require('googleclientlogin');


  // app-specific requires
  var DataSrcHandler = require('./DataSrcHandler.js');
  var DataDstHandler = require('./DataDstHandler.js');
  var RouteHandler = require('./RouteHandler.js');
  var MetamorphooOperation = require('./MetamorphooOperation.js');
  var WebRequestManager = require('./WebRequestManager.js');
  var PrImporter = require('./PrImporter.js');
  var Util = require("./Util.js");


  var u = new Util();

  // param validation
  if (process.argv.length < 4) {
      throw "Syntax: " + process.argv[0] + " " + process.argv[1] + " {cfgFilePath} {appEnv}";
  }


  // // config from cfg file
  // var cfgInCurrEnv, startupLog;
  // try {
  //   startupLog = "\n\t********************************************************************************\n"
  //              + "\t****  CBITS Metamorphoo STARTED (" + (new Date()) + ")  *****\n"
  //              + "\t********************************************************************************\n";
  //   cfgFilePath = process.argv[2];
  //   appEnv = process.argv[3];
  //   // cbs.msgLog('Cfg file path = ' + cfgFilePath);
  //   // cbs.msgLog('Environment = ' + appEnv);
  //   // startup += '\tCfg file path = ' + cfgFilePath + '\n';
  //   startupLog += '\tEnvironment = ' + appEnv + '\n';
  //   cfg = cbs.getAppConfig(cfgFilePath);
  //   // cbs.msgLog('Getting app cfg values');
  //   startupLog += '\tCfg file path = ' + cfgFilePath + '\n';
  //   cfgInCurrEnv = cbs.getAppConfigValue(cfg, appEnv);
  //   // configure logging
  //   cbs.configureLogging(cfgInCurrEnv.log4js.cfgFilePath, 300);
  //   cbs.msgLog(startupLog);
  // } catch (error) {
  //   console.log(startupLog);
  //   var errMsg = 'ERROR: error configuring Metamorphoo: ' +  error;
  //   throw errMsg;
  // }


  var preRouterProcessing = function(req, res, next) {
    cbs.dbgLog("entered", "preRouterProcessing");
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Credentials', true);
    res.header("Access-Control-Allow-Methods", "OPTIONS, POST, GET, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");

    if (req.body != null) {
      cbs.msgLog("rewriting nulls", "preRouterProcessing");
      // console.log("rewriting nulls");
      _.each(req.body, function(value, key, obj) {
        if (value === 'null') {
          return obj[key] = null;
        }
      });
    }

    return next();
  };



  // SRC: http://www.hacksparrow.com/express-js-logging-access-and-errors.html
  cbs.dbgLog('cwd = ' +  process.cwd(), 'server.js');

  var reqProtocol = "http";

  // setup SSL option
  var app = null;

  // the "ssl" object, with paths to the necessary SSL files, must exist in the config file to enable SSL connections.
  var useSSL = u.exists(cfgInCurrEnv.node.ssl) && _.isObject(cfgInCurrEnv.node.ssl) &&
               u.exists(cfgInCurrEnv.node.ssl.enabled) && cfgInCurrEnv.node.ssl.enabled &&
               // u.exists(cfgInCurrEnv.node.ssl.ca) && _.isString(cfgInCurrEnv.node.ssl.ca) &&
               u.exists(cfgInCurrEnv.node.ssl.key) && _.isString(cfgInCurrEnv.node.ssl.key) &&
               u.exists(cfgInCurrEnv.node.ssl.cert) && _.isString(cfgInCurrEnv.node.ssl.cert)
               ;
  cbs.msgLog('SSL is ' + ((useSSL) ? "ENABLED" : "DISABLED"), 'server.js:SSL');
  var cfgFileStrs = [
    "u.exists(cfgInCurrEnv.node.ssl)", " _.isObject(cfgInCurrEnv.node.ssl)", 
    "u.exists(cfgInCurrEnv.node.ssl.enabled) ", " cfgInCurrEnv.node.ssl.enabled", 
    // "u.exists(cfgInCurrEnv.node.ssl.ca) ", " _.isString(cfgInCurrEnv.node.ssl.ca)", 
    "u.exists(cfgInCurrEnv.node.ssl.key) ", " _.isString(cfgInCurrEnv.node.ssl.key)", 
    "u.exists(cfgInCurrEnv.node.ssl.cert) ", " _.isString(cfgInCurrEnv.node.ssl.cert)"
    ];
  var cfgFileVals = [
    u.exists(cfgInCurrEnv.node.ssl) , _.isObject(cfgInCurrEnv.node.ssl), 
    u.exists(cfgInCurrEnv.node.ssl.enabled) , cfgInCurrEnv.node.ssl.enabled, 
    // u.exists(cfgInCurrEnv.node.ssl.ca) , _.isString(cfgInCurrEnv.node.ssl.ca), 
    u.exists(cfgInCurrEnv.node.ssl.key) , _.isString(cfgInCurrEnv.node.ssl.key), 
    u.exists(cfgInCurrEnv.node.ssl.cert) , _.isString(cfgInCurrEnv.node.ssl.cert)
    ];
  cbs.dbgLog(_.zip(cfgFileStrs, cfgFileVals), 'server.js:SSL');
  console.log('SSL is ' + ((useSSL) ? "ENABLED" : "DISABLED"));

  var sslOptions = null;
  if(useSSL) {
    // get the SSL CA, key, and certificate files, accommodating both relative and absolute Unix/Linux paths (path starts or does not start with '/').
    sslOptions = {
      key: fs.readFileSync((cfgInCurrEnv.node.ssl.key.substring(0,1) == '/') ? cfgInCurrEnv.node.ssl.key : __dirname + '/' + cfgInCurrEnv.node.ssl.key),
      cert: fs.readFileSync((cfgInCurrEnv.node.ssl.cert.substring(0,1) == '/') ? cfgInCurrEnv.node.ssl.cert : __dirname + '/' + cfgInCurrEnv.node.ssl.cert),
    };

    cbs.dbgLog('SSL cfg: ' + JSON.stringify(cfgInCurrEnv.node.ssl), 'server.js:SSL');

    // append the CA, if specified
    if(u.exists(cfgInCurrEnv.node.ssl.ca)) {
      sslOptions.ca = fs.readFileSync((cfgInCurrEnv.node.ssl.ca.substring(0,1) == '/') ? cfgInCurrEnv.node.ssl.ca : __dirname + '/' + cfgInCurrEnv.node.ssl.ca);
      cbs.dbgLog('SSL cfg: CA found at cfgInCurrEnv.node.ssl.ca in this instance\'s config file included in the SSL options set.');
    }

    // append the SSL key passphrase, if specified
    if(u.exists(cfgInCurrEnv.node.ssl.passphrase)) {
      sslOptions.passphrase = cfgInCurrEnv.node.ssl.passphrase;
      cbs.dbgLog('SSL cfg: passphrase found at cfgInCurrEnv.node.ssl.passphrase in this instance\'s config file included in the SSL options set.');
    }
  }

  // create and start server
  var app = useSSL
    ? express.createServer(sslOptions, express.logger())
    : express.createServer(express.logger());
  // enables JSONP responses: http://vaboone.wordpress.com/2011/08/17/jsonp-with-node-js-express/
  app.enable("jsonp callback");
  app.configure(function() {
      app.use(preRouterProcessing);
      app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

      var staticPath = __dirname + "/static";
      console.log("statically serving: " + staticPath);
      app.use(express.static(staticPath));
      // log the raw request body, before it is parsed
      app.use(function(req, res, next) {
          var data = '';
          req.setEncoding('utf8');
          req.on('data', function(chunk) { 
              data += chunk;
          });
          req.on('end', function() {
              req.rawBody = data;
          });
          next();
      });    
      app.use(express.bodyParser());
  });






  // ****************************
  // ****** Authentication ******
  // ****************************
  var TestUser = {
    "username" : "TEST-USER",
    "guid" : "TEST-USER-GUID"
  };
  var userObj = TestUser;




  // ****************************
  // ********** ROUTES **********
  // ****************************


  var outputFiles = "/output_files";
  var outputFolderPath = __dirname + "/static" + outputFiles;
  var outputFolderBasePath = outputFiles;



  app.get('/', function(req, res) {
    var route = '/';
    res.send('[' + new Date() + '] Service is alive. Random number: ' + Math.random());
    res.end();
  });


  /**
   * @description: GET: Generates a JSON file of all XElements.
   * @example:
   *   http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/xelements?debugMode&rootKey=xel_data_values
   * @param: Route.
   * @param: Request & response function.
   */
  app.get('/xelements', function(req, res) {
    var route = '/xelements';
    var fileName = route + ".json";
    var dstFilePath = outputFolderPath + fileName;
    var dstUrl = reqProtocol + "://" + req.headers.host;

    var mmOp = new MetamorphooOperation().createMetamorphooOperation(req, res, 
      "trireme", route, route, function(op) { new DataDstHandler().defaultResponse(op); },
      "file", "json", dstFilePath, dstUrl + outputFolderBasePath + fileName, function (p1) { cbs.dbgLog(p1); },
      "export", userObj, cfgInCurrEnv);

    new RouteHandler().genericHandler(mmOp);
  });



  /**
   * @description: GET: Gets the specified XElement children, to some optional max depth. Default is to return the full tree of children.
   * @example
   *   URL = http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/xelements/dep/MM_TraversalTest_xel_01/edu_northwestern_cbits_metamorphoo_xelement_Traversal_getChildren/xel_data_values.required_xelement_ids/1
   *
   *   This gets all the children of the XElement "MM_TraversalTest_xel_01", 
   *   using the function edu_northwestern_cbits_metamorphoo_xelement_Traversal_getChildren, 
   *   where the children are listed as an array in this XElement's key path in the value at "xel_data_values.required_xelement_ids",
   *   and the search for descendents is limited to a depth of 1 (i.e., only get the descendents that are immediately-adjacent to the specified XElement).
   *
   * @example
   *   URL = http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/xelements/dep/a61a5003cb94be864271ff9e1064d55f/edu_northwestern_cbits_metamorphoo_xelement_Traversal_getChildren/xel_data_values.required_xelement_ids
   *
   * @param: Route with GUID.
   * @param: Request & response function.
   */
  app.get('/xelements/dep/:guid/:fnName/:key/:maxDepth?', function(req, res) {
    cbs.dbgLog("key = " + req.params.key);
    var route = '/xelements';

    var mmOp = new MetamorphooOperation().createMetamorphooOperation(req, res,
      "trireme", route, null, null,                    // callback defined in XElementDependencyManager
      "http", "json", "caller", null, null,            // for now, we don't need to execute anything in DataDstHandler
      req.params.fnName, userObj, cfgInCurrEnv);

    // cbs.dbgLog('BEFORE: Calling RouteHandler.genericHandler', 'server.js:' + route);
    new RouteHandler().genericHandler(mmOp);
    // cbs.dbgLog('AFTER: Calling RouteHandler.genericHandler', 'server.js:' + route);
  });



  /**
   * Generates a file based on the specified XElement.
   * 
   * EXAMPLE1: To concatenate a set of files together:
   *   http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/writeFile/concatText/MM_TraversalTest_xel_01/xel_data_values.required_xelement_ids/xel_data_values.content?groupByXElementType=stylesheet,script_library,static_html&debugMode=true&fileName=writeFile_concatText_MM_TraversalTest_xel_01_customfilename.txt
   *
   * EXAMPLE2: to build the example app:
   *   (deprecated?) http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/writeFile/appPkg/7be6af242b27d7fadaa379b4a1e9f09b/xel_data_values.required_xelement_ids?distinct&groupByXElementType=stylesheet,script_library,static_html&debugMode=true&includeRoot
   *   http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/writeFile/appPkg/a61a5003cb94be864271ff9e1064d55f/xel_data_values.required_xelement_ids?distinct&groupByXElementType=stylesheet,script_library,static_html&debugMode=true&includeRoot&filePrefix=a61a5003cb94be864271ff9e1064d55f
   *
   *EXAMPLE3:
   *  http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/writeFile/appPkg/7be6af242b27d7fadaa379b4a1e9f09b/xel_data_values.required_xelement_ids?distinct&groupByXElementType=stylesheet,script_library,static_html&debugMode=true&includeRoot
   *
   * 
   * @param  {[type]} req [description]
   * @param  {[type]} res [description]
   * @return {[type]}     [description]
   */
  app.get('/writeFile/:dstLogicalType/:guid/:childrenKey/:outputField?', function(req, res) {
    var route = '/xelements/' + req.params.guid;
    cbs.dbgLog('Entered: ' + route, "server.js: " + route);
    cbs.dbgLog("req.headers = " + JSON.stringify(req.headers), "server.js: " + route);
    
    // setup params
    var filePrefix = (!_.isNull(req.query.filePrefix) && !_.isUndefined(req.query.filePrefix) && req.query.filePrefix.length > 0)
      ? req.query.filePrefix 
      : (req.params.dstLogicalType + "_" + req.params.guid + (req.params.dstLogicalType == "appPkg" ? "" : ".txt"));
    var dstFilePath = outputFolderPath + "/" + filePrefix;
    var dstUrl = reqProtocol + "://" + req.headers.host;

    // create MetamorphooOperation for this request.
    var mmOp = new MetamorphooOperation().createMetamorphooOperation(req, res,
      "trireme", "/xelements", null, function(response, op) { cbs.dbgLog('Fetched all XElements.'); },
      "file", req.params.dstLogicalType, dstFilePath, dstUrl + outputFolderBasePath  + "/" + filePrefix, function (op) { op.dstDataHandler.defaultResponse(op); cbs.dbgLog("File built from XElement: " + op.req.params.guid); },
      "export", userObj, cfgInCurrEnv
      );
    mmOp.dstLeafName = filePrefix;

    // cbs.dbgLog('BEFORE: Calling RouteHandler.genericHandler', 'server.js:' + route);
    new RouteHandler().genericHandler(mmOp);
    // cbs.dbgLog('AFTER: Calling RouteHandler.genericHandler', 'server.js:' + route);
  });



  /**
   * Imports samples from pr. Expects a JSON array.
   * @example EX1 of a POST with jQuery.
   *
    $.post('http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/savePost/UMBMA/REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com.userCfg/false', {
        "patientId":"MA345","email":"REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com","phonePassword":"p4ssw0rd","typeOfMedPromptPopup":"on","forceIfNonResponseYes":"on","medName_1":"prozac","medStrength_1":"100","medDispensationUnit_1":"dose","medName_2":"cymbalta","medStrength_2":"200","medDispensationUnit_2":"dose","medName_3":"effexor","medStrength_3":"300","medDispensationUnit_3":"dose","psychiatristName":"John Doe, PhD","psychiatristAddress":"123 Any St, Chicago","psychiatristPhone":"123-456-7890","pharmacyName":"Walgreens","pharmacyAddress":"456 Any St, Chicago","pharmacyPhone":"098-765-4321","clinicName":"Therapy Inc.","clinicAddress":"789 Any St, Chicago","clinicPhone":"555-555-1212","surveyOnTime06_09Mon":"on","surveyOnTime06_09Tue":"on","surveyOnTime06_09Wed":"on","surveyOnTime06_09Thu":"on","surveyOnTime06_09Fri":"on","surveyOnTime06_09Sat":"on","surveyOnTime06_09Sun":"on","surveyOnTime09_12Mon":"on","surveyOnTime09_12Tue":"on","surveyOnTime09_12Wed":"on","surveyOnTime09_12Thu":"on","surveyOnTime09_12Fri":"on","surveyOnTime09_12Sat":"on","surveyOnTime09_12Sun":"on","surveyOnTime12_15Mon":"on","surveyOnTime12_15Tue":"on","surveyOnTime12_15Wed":"on","surveyOnTime12_15Thu":"on","surveyOnTime12_15Fri":"on","surveyOnTime12_15Sat":"on","surveyOnTime12_15Sun":"on","surveyOnTime15_18Mon":"on","surveyOnTime15_18Tue":"on","surveyOnTime15_18Wed":"on","surveyOnTime15_18Thu":"on","surveyOnTime15_18Fri":"on","surveyOnTime15_18Sat":"on","surveyOnTime15_18Sun":"on","surveyOnTime18_21Mon":"on","surveyOnTime18_21Tue":"on","surveyOnTime18_21Wed":"on","surveyOnTime18_21Thu":"on","surveyOnTime18_21Fri":"on","surveyOnTime18_21Sat":"on","surveyOnTime18_21Sun":"on"
      }).done(function(data) { console.log(data.responseText); });
   * @param  {[type]} req [description]
   * @param  {[type]} res [description]
   * @return {[type]}     [description]
   */
  app.post('/prImporter', function(req, res) {
    cbs.dbgLog('CWD = ' + process.cwd());
    var route = 'prImporter';
    var logSrcPrefix = 'server.js:' + route;

    // // DBG: log the input
    cbs.dbgLog('_.keys(req) = ' + _.keys(req), logSrcPrefix);
    cbs.dbgLog('_.values(req.headers) = ' + _.values(req.headers), logSrcPrefix);
    // cbs.dbgLog('_.keys(req.body) = ' + _.keys(req.body), logSrcPrefix);
    // cbs.dbgLog('_.values(req.body) = ' + _.values(req.body), logSrcPrefix);

    // cbs.dbgLog('req.rawBody = ' + req.rawBody, logSrcPrefix);
    // cbs.dbgLog('req.body.json = ' + req.body.json, logSrcPrefix);
    cbs.dbgLog('req.body.length = ' + (JSON.stringify(req.body)).length + '; req.body = ' + JSON.stringify(req.body), logSrcPrefix);
    cbs.dbgLog('req.rawBody.length = ' + (JSON.stringify(req.rawBody)).length + '; req.rawBody = ' + JSON.stringify(req.rawBody), logSrcPrefix);
    // cbs.dbgLog('_.keys(req.body.json) = ' + _.keys(req.body.json), logSrcPrefix);
    // cbs.dbgLog('_.values(req.body.json) = ' + _.values(req.body.json), logSrcPrefix);

    // cbs.dbgLog('_.values(req.params) = ' + _.values(req.params), logSrcPrefix);
    // cbs.dbgLog('_.values(req.query) = ' + _.values(req.query), logSrcPrefix);
    // cbs.dbgLog('_.values(req._route) = ' + _.values(req._route), logSrcPrefix);


    // TODO: handle authentication!


    var pi = new PrImporter(cfgInCurrEnv.MetamorphooModules.PrImporter);

    // first, parse the JSON, if possible; if not, then send-back an error and return...
    var msgObj = null;
    try{
      msgObj = JSON.parse(req.body.json);
    }
    catch(e1) {
      try {
        cbs.dbgLog('Running alternate form-decoding function', logSrcPrefix);
        var querystring = require('querystring');
        var reDecoded = querystring.parse(req.body);
        // var qs = require('qs');
        // var reDecoded = qs.parse(req.body);
        msgObj = JSON.parse(req.body.json);
      }
      catch(e2) {
        // if parsing fails, try this fn, then retry parse
        pi.sendAndEndResponse(res, "Could not JSON.parse() the request's body.json value. Error on first attempt = " + e1 + "; Error on second attempt = " + e2, 'error', logSrcPrefix + ":initial parse");
        return;
      }
    }

    // else, validate the input and process it...
    try {
      // validate input
      var validationErrors = pi.validatePrImporterRequestMessage(msgObj);
      if (validationErrors.length == 0) {
          pi.importSensorData(req, res, msgObj);
      }
      else {
        pi.sendAndEndResponse(res, "Validation errors = " + validationErrors, 'error', logSrcPrefix + ":validation error");
      }
    }
    catch(e) {
      pi.sendAndEndResponse(res, 'An error occurred: ' + (e.stack), 'error', logSrcPrefix + ":exception");
    }
  });



  /**
   * Gets a document list for some level of visibility, which is stored and maintained in a Google Spreadsheet.
   * @param  {[type]} req          [description]
   * @param  {[type]} res)         [description]
   * @param  {[type]} logSrcPrefix [description]
   * @return {[type]}              [description]
   */
  app.get('/docList/:visibility', function(req, res) {
    var route = '/docList/' + req.params.visibility;
    var logSrcPrefix = 'server.js:' + route;
    cbs.dbgLog('entered; visibility = ' + req.params.visibility, logSrcPrefix);

    // ***** APPROACH #4: raw HTTP API (https://gist.github.com/1215175)
    // var user = 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com';
    // var pass = 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE';
    // var path = '/feeds/list/REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/od6/public/values?alt=json';
    // var accessControlList = {
    //   "www": ["www"],
    //   "cbits": ["www", "cbits"]
    // };
    
    // get the document list cfg params from the MM config file
    var user = cfgInCurrEnv.MetamorphooModules.DocumentManagement.docList.user;
    var pass = cfgInCurrEnv.MetamorphooModules.DocumentManagement.docList.pass;
    var path = cfgInCurrEnv.MetamorphooModules.DocumentManagement.docList.path;
    var accessControlList = cfgInCurrEnv.MetamorphooModules.DocumentManagement.docList.accessControlList;

    // create Google authN objs
    var gac = google2.GoogleClientLogin;
    var ga = new gac({
        email: user,
        password: pass,
        service: 'docs',
        accountType: gac.accountTypes.google
      });
    
    // login event
    var gd = new GoogleDocs(null);  // create GD instance with the valid function refs necessary
    var data = {
      "googleAuth": ga,
      "gdRequest": {
        "path": path,
        "callback": gd.resFunc
      },
      "gdResponse": {
        "onEnd": gd.filterGSheetByColumnVisibility,
        "onEndData": {
          "accessControlList": accessControlList
        },
        "onEndCb": function(filteredResponseObj) {
          var variablizedFilteredResponseObj = "var researchList = " + JSON.stringify(filteredResponseObj) + ";";
          res.send(variablizedFilteredResponseObj);
        },
        "finalData": "",
        "responseData": ""
      },
      "origReq": req,
      "origRes": res,
      "route": route
    };
    gd = new GoogleDocs(data);

    // get the Google Doc data and respond to this request
    // googleDocFilterResponse(data, gac, ga, gd, logSrcPrefix);
    
        // 'Authorization': 'GoogleLogin auth=' + data.googleAuth.getAuthId()
        // ,'GData-Version': '3.0'
    // data is refreshed via a cron-like job on CF, which calls a URL like this: http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/utility/grabhttp.cfm?url=https%3A%2F%2Fspreadsheets.google.com%2Ffeeds%2Flist%2FREDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE%2Fod6%2Fpublic%2Fvalues%3Falt%3Djson&filename=REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE
    gd.httpReq(
      // 'http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/utility/files/0AvJAYaAsL7rJdFhzZTh0Q2dyVG0tM1ppLXk0Z1pGOHc.txt'
      // visit this folder to find the file: \\REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE\wwwroot\utility\files
      data.gdRequest.path
      );
  });


  /**
   * Gets a list of CBITS people, which is stored and maintained in a Google Spreadsheet.
   *   EX1 (default filters): http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/peopleList
   *   EX2 (filter terms in visibleCategories): http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/peopleList?visibleCategories=["CBITs Core", "Staff"]
   * @param  {[type]} req          [description]
   * @param  {[type]} res)         [description]
   * @param  {[type]} logSrcPrefix [description]
   * @return {[type]}              [description]
   */
  app.get('/peopleList', function(req, res) {
    var route = '/peopleList/' + req.params.visibility;
    var logSrcPrefix = 'server.js:' + route;

    // ***** APPROACH #4: raw HTTP API (https://gist.github.com/1215175)
    // var user = 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com';
    // var pass = 'REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE';
    // var path = '/feeds/list/REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/od6/public/values?alt=json';
    // var visibleCategories = u.exists(req.query.visibleCategories) 
    //   ? JSON.parse(req.query.visibleCategories) 
    //   : [ "CBITs Core", "Staff", "Students"];
    var user = cfgInCurrEnv.MetamorphooModules.DocumentManagement.peopleList.user;
    var pass = cfgInCurrEnv.MetamorphooModules.DocumentManagement.peopleList.pass;
    var path = cfgInCurrEnv.MetamorphooModules.DocumentManagement.peopleList.path;
    var visibleCategories = u.exists(req.query.visibleCategories) 
      // ? JSON.parse(req.query.visibleCategories)
      ? req.query.visibleCategories.split(',')
      : cfgInCurrEnv.MetamorphooModules.DocumentManagement.peopleList.visibleCategories;
    
    cbs.dbgLog('visibleCategories = ' + visibleCategories, logSrcPrefix);

    // create Google authN objs
    var gac = google2.GoogleClientLogin;
    var ga = new gac({
        email: user,
        password: pass,
        service: 'docs',
        accountType: gac.accountTypes.google
      });
    
    // login event
    var gd = new GoogleDocs(null);  // create GD instance with the valid function refs necessary
    var data = {
      "googleAuth": ga,
      "gdRequest": {
        "path": path,
        "callback": gd.resFunc
      },
      "gdResponse": {
        "onEnd": gd.filterPeopleSheetByCategory,
        "onEndData": {
          "visibleCategories": visibleCategories
        },
        "onEndCb": function(filteredResponseObj) {
          var variablizedFilteredResponseObj = "var peopleList = " + JSON.stringify(filteredResponseObj) + ";";
          res.send(variablizedFilteredResponseObj);
        },
        "finalData": "",
        "responseData": ""
      },
      "origReq": req,
      "origRes": res,
      "route": route
    };
    gd = new GoogleDocs(data);

    // get the Google Doc data and respond to this request
    // googleDocFilterResponse(data, gac, ga, gd, logSrcPrefix);
    
    //20130327: To be part of a caching layer; intended (then stopped at MB's request) to be a temp. hack around a downed server...
    // getCached(data, "miraj3_docList.json.txt");
    
    // APPROACH 2
    // gd.httpsReq('http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/utility/files/REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE.txt');
    // data is refreshed via a cron-like job on CF, which calls a URL like this: http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/utility/grabhttp.cfm?url=https%3A%2F%2Fspreadsheets.google.com%2Ffeeds%2Flist%2FREDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE%2Fod6%2Fpublic%2Fvalues%3Falt%3Djson&filename=REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE
    gd.httpReq(data.gdRequest.path);
  });

      /**
       * Gets a Google Document and runs a callback function.
       * @param  {[type]}   url      [description]
       * @param  {Function} callback [description]
       * @return {[type]}            [description]
       */
  var getCached = function(cfg, filePath) {
    fs.readFile(filePath, function(err, data) {
      data.gdResponse.onEnd(cfg);
    });
  };



  /**
   * Saves arbitrary POST data to a static output folder where the data will be accessible via some URL.
   * @param  {[type]} req      [description]
   * @param  {[type]} res)     {             var route = '/savePost';  var logSrcPrefix = 'server.js:' + route;  var fn = (withTimestampInFilename == "true") ? cbs.getHierarchicalDateTimeStr(new Date()) + "-" + fileName;  var dstFilePath = outputFolderPath + '/' + fileName;                var dstUrl = reqProtocol + ":  var postData = req.body.json;  cbs.dbgLog('dstUrl = ' + dstUrl);  cbs.dbgLog('dstFilePath = ' + dstFilePath);  fs.writeFileSync(dstFilePath [description]
   * @param  {[type]} postData [description]
   * @return {[type]}          [description]
   */
  app.post('/savePost/:projName/:origFileName/:withTimestampInFilename', function (req, res) {
    var route = '/savePost';
    var logSrcPrefix = 'server.js:' + route;

    var fileName = (req.params.withTimestampInFilename == "true") ? cbs.getHierarchicalDateTimeStr(new Date()) + "-" + req.params.origFileName : req.params.origFileName;
    fileName += ".json.txt";

    // var routeDstFolder = '/savePost';
    var dstFolder = outputFolderPath + '/' + req.params.projName;
    var dstFilePath = dstFolder + '/' + fileName;

    // // TODO: refactor to use the MM DataSrcHandler/DataDstHandler structure.
    // // 
    // // var mmOp = new MetamorphooOperation().createMetamorphooOperation(req, res, 
    // //   "post", route, route, function(op) { new DataDstHandler().defaultResponse(op); },
    // //   "file", "json", dstFilePath, dstUrl + outputFolderBasePath + origFileName, function (p1) { cbs.dbgLog(p1); },
    // //   "export", userObj, cfgInCurrEnv);

    // // new RouteHandler().genericHandler(mmOp);

    // var dstUrl = reqProtocol + "://" + req.headers.host + outputFolderBasePath + routeDstFolder + '/' + fileName;
    var postData = JSON.stringify(req.body);

    // cbs.dbgLog('dstUrl = ' + dstUrl);
    // cbs.dbgLog('dstFilePath = ' + dstFilePath);
    var dstUrl = reqProtocol + "://" + req.headers.host + outputFolderBasePath + '/' + req.params.projName + '/' + fileName;
    // var postData = JSON.stringify(req.body);

    cbs.dbgLog('dstUrl = ' + dstUrl, logSrcPrefix + ':savePostHandler');
    cbs.dbgLog('dstFilePath = ' + dstFilePath, logSrcPrefix + ':savePostHandler');

    // check for folder existence, then write the file
    writeFileInFolder(
      function(req, res, route, dstFilePath, dstUrl, fileData) { 
        cbs.dbgLog('User cfg saved to: ' + dstFilePath, logSrcPrefix + route);
        res.send('successful write; URL = ' + dstUrl);
        res.end();
      },
      req, res, route, dstFolder, dstFilePath, dstUrl, postData);
  });



  /**
   * Writes a Purple Robot configuration file for a particular user in a particular project/intervention/scope/domain. An example of an input POST document is in the example below.
   * WARNING: THIS COULD BREAK ON FILE-WRITE OF THE FILENAME BASED ON THE USER ID!!! ROBUSTIFICATION/FILENAME NORMALIZATION NEEDED!
   * @example POST document
   * 
   {
    "userCfg": {
      "patientId":"MA345","email":"REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com","phonePassword":"p4ssw0rd","typeOfMedPromptPopup":"on","forceIfNonResponseYes":"on","medName_1":"prozac","medStrength_1":"100","medDispensationUnit_1":"dose","medName_2":"cymbalta","medStrength_2":"200","medDispensationUnit_2":"dose","medName_3":"effexor","medStrength_3":"300","medDispensationUnit_3":"dose","psychiatristName":"John Doe, PhD","psychiatristAddress":"123 Any St, Chicago","psychiatristPhone":"123-456-7890","pharmacyName":"Walgreens","pharmacyAddress":"456 Any St, Chicago","pharmacyPhone":"098-765-4321","clinicName":"Therapy Inc.","clinicAddress":"789 Any St, Chicago","clinicPhone":"555-555-1212","surveyOnTime06_09Mon":"on","surveyOnTime06_09Tue":"on","surveyOnTime06_09Wed":"on","surveyOnTime06_09Thu":"on","surveyOnTime06_09Fri":"on","surveyOnTime06_09Sat":"on","surveyOnTime06_09Sun":"on","surveyOnTime09_12Mon":"on","surveyOnTime09_12Tue":"on","surveyOnTime09_12Wed":"on","surveyOnTime09_12Thu":"on","surveyOnTime09_12Fri":"on","surveyOnTime09_12Sat":"on","surveyOnTime09_12Sun":"on","surveyOnTime12_15Mon":"on","surveyOnTime12_15Tue":"on","surveyOnTime12_15Wed":"on","surveyOnTime12_15Thu":"on","surveyOnTime12_15Fri":"on","surveyOnTime12_15Sat":"on","surveyOnTime12_15Sun":"on","surveyOnTime15_18Mon":"on","surveyOnTime15_18Tue":"on","surveyOnTime15_18Wed":"on","surveyOnTime15_18Thu":"on","surveyOnTime15_18Fri":"on","surveyOnTime15_18Sat":"on","surveyOnTime15_18Sun":"on","surveyOnTime18_21Mon":"on","surveyOnTime18_21Tue":"on","surveyOnTime18_21Wed":"on","surveyOnTime18_21Thu":"on","surveyOnTime18_21Fri":"on","surveyOnTime18_21Sat":"on","surveyOnTime18_21Sun":"on"
    },
    "prCfg": {
      "userId": "REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com",
      "init_script": "",
      "features": "",
      "triggers": ""
    },
    "meta": {
      "prCfg": {
        "initScriptFn": "generateInitScriptForShowNativeDialogForUMB"
      }
    }
  }
   *
   * @example EX1 of a POST with jQuery:
   *
    $.post('http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/writePrCfgFile/UMBMA', {
      "userCfg": {
        "patientId":"MA345","email":"REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com","phonePassword":"p4ssw0rd","typeOfMedPromptPopup":"on","forceIfNonResponseYes":"on","medName_1":"prozac","medStrength_1":"100","medDispensationUnit_1":"dose","medName_2":"cymbalta","medStrength_2":"200","medDispensationUnit_2":"dose","medName_3":"effexor","medStrength_3":"300","medDispensationUnit_3":"dose","psychiatristName":"John Doe, PhD","psychiatristAddress":"123 Any St, Chicago","psychiatristPhone":"123-456-7890","pharmacyName":"Walgreens","pharmacyAddress":"456 Any St, Chicago","pharmacyPhone":"098-765-4321","clinicName":"Therapy Inc.","clinicAddress":"789 Any St, Chicago","clinicPhone":"555-555-1212","surveyOnTime06_09Mon":"on","surveyOnTime06_09Tue":"on","surveyOnTime06_09Wed":"on","surveyOnTime06_09Thu":"on","surveyOnTime06_09Fri":"on","surveyOnTime06_09Sat":"on","surveyOnTime06_09Sun":"on","surveyOnTime09_12Mon":"on","surveyOnTime09_12Tue":"on","surveyOnTime09_12Wed":"on","surveyOnTime09_12Thu":"on","surveyOnTime09_12Fri":"on","surveyOnTime09_12Sat":"on","surveyOnTime09_12Sun":"on","surveyOnTime12_15Mon":"on","surveyOnTime12_15Tue":"on","surveyOnTime12_15Wed":"on","surveyOnTime12_15Thu":"on","surveyOnTime12_15Fri":"on","surveyOnTime12_15Sat":"on","surveyOnTime12_15Sun":"on","surveyOnTime15_18Mon":"on","surveyOnTime15_18Tue":"on","surveyOnTime15_18Wed":"on","surveyOnTime15_18Thu":"on","surveyOnTime15_18Fri":"on","surveyOnTime15_18Sat":"on","surveyOnTime15_18Sun":"on","surveyOnTime18_21Mon":"on","surveyOnTime18_21Tue":"on","surveyOnTime18_21Wed":"on","surveyOnTime18_21Thu":"on","surveyOnTime18_21Fri":"on","surveyOnTime18_21Sat":"on","surveyOnTime18_21Sun":"on"
      },
      "prCfg": {
        "userId": "REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com",
        "init_script": "",
        "features": "",
        "triggers": ""
      },
      "meta": {
        "prCfg": {
          "initScriptFn": "generateInitScriptForShowNativeDialogForUMB"
        }
      }
    }).done(function(data) { console.log(data.responseText); });
   *
   * @example EX2 of a POST with jQuery:
   *
    $.post('http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE:REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/writePrCfgFile/UMBMA', {
      "prCfg": {
        "userId": "REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com",
        "init_script": "",
        "features": "",
        "triggers": ""
      },
      "meta": {
        "projName": "UMBMA",
        "prCfg": {
          "initScriptFn": "generateInitScriptForShowNativeDialogForUMB",
          "initScript": {
            "showNativeDialog": {
              "title": "'Med Adherence Dialog (H2H)'",
              "msg": "'Did you take your 0:00 dose of ' + (JSON.parse(PurpleRobot.fetchEncryptedString('UMBMA-userCfg'))).medName_1 + '?'",
              "confirmTitle": "'OK'",
              "cancelTitle": "'Cancel'",
              "confirmScript": "'http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/h2h/medprompt/index.html'",
              "cancelScript": "'null'"
            }
          }
        }
      }
    }).done(function(data) { console.log(data.responseText); });
   * 
   * @param  {[type]} req  [description]
   * @param  {[type]} res) {             var route = '/writePrCfgFile';  var logSrcPrefix = 'server.js:' + route;  var fileName = req.params.userId;  var routeDstFolder = outputFolderPath + '/' + projName;  var dstUrl = reqProtocol + ":  var u = new Util();  var emptyStrIfNullOrUndef = function(v) { return u.exists(v) ? v : ""; }  var validPostData = function(postData) { return u.exists(postData) && (JSON.stringify(postData)).length > 0 && u.exists(postData.userId); };    var generatePersistUserConfigTrigger = function(postData) {    if(!u.exists(postData.userCfg)) {      res.send('A key "userCfg" is required.');      res.end( [description]
   * @return {[type]}      [description]
   */
  app.post('/writePrCfgFile/:projName', function (req, res) {
    var route = '/writePrCfgFile';
    var logSrcPrefix = 'server.js:' + route;

    var u = new Util();
    var emptyStrIfNullOrUndef = function(v) { return u.exists(v) ? v : ""; }
    var validPostData = function(postData) { return u.exists(postData) && (JSON.stringify(postData)).length > 0 && u.exists(postData.prCfg.userId); };  
    

    /**
     * Sets the user configuration in Purple Robot.
     * @param  {[type]} req                [description]
     * @param  {[type]} projName           [description]
     * @param  {[type]} dstUserCfgFilePath [description]
     * @param  {[type]} dstUserCfgUrl      [description]
     * @return {[type]}                    [description]
     */
    var generateScriptHavingUserCfg = function(req, projName, dstUserCfgFilePath, dstUserCfgUrl) {
      var key = "userCfg";
      var script = "" +
        "PurpleRobot.persistEncryptedString('" + projName + "', '" + key + "', '" + fs.readFileSync(dstUserCfgFilePath) + "');";
      cbs.dbgLog('script = ' + script, logSrcPrefix + ":generateScriptHavingUserCfg");
      return script;
    };

    /**
     * Sets the application configuration in Purple Robot.
     * @param  {[type]} req      [description]
     * @param  {[type]} projName [description]
     * @param  {[type]}          [description]
     * @return {[type]}          [description]
     */
    var generateScriptHavingAppCfg = function(req, projName) {
      var key = "appCfg";
      var appCfgStr = JSON.stringify(req.body.appCfg);
      var script = ""
        + "PurpleRobot.log('*********************************************************');"
        + "PurpleRobot.log('Updating and persisting appCfg for: (\"" + projName + "\", \"" + key + "\")');"
        
        + "var currAppCfgPrStr = PurpleRobot.fetchEncryptedString('" + projName + "', '" + key + "');"
        + "var currAppCfgStr = '' + (currAppCfgPrStr != null && currAppCfgPrStr != undefined ? currAppCfgPrStr.toString() : '');"
        // + "PurpleRobot.log('currAppCfgStr = ' + currAppCfgStr);"
        // + "PurpleRobot.loadLibrary('underscore.js');"
        // + "var appCfgExists = currAppCfgStr.length == 0;"
        + "var appCfgExists = currAppCfgStr.search(/^\{/) != -1 && currAppCfgStr.search(/\}$/) != -1;"
        // + "PurpleRobot.log('appCfgExists = ' + appCfgExists);"
        + "PurpleRobot.log('appCfgExists: ' + appCfgExists + '; currAppCfgStr = (' + currAppCfgStr + ')');"
        + "var currAppCfg = appCfgExists ? JSON.parse(currAppCfgStr) : {};"

        // + "var appCfgExists = (_.keys(currAppCfg)).length == 0;"
        // + "PurpleRobot.log('WTF111111');"
        // + "PurpleRobot.log('currAppCfgStr.length = ' + currAppCfgStr.length);"
        // + "PurpleRobot.log('WTF222222');"
        // + "PurpleRobot.log('_.isString(currAppCfgStr) = ' + _.isString(currAppCfgStr));"
        // + "PurpleRobot.log('typeof currAppCfgStr = ' + (typeof currAppCfgStr));"
        // + "PurpleRobot.log('currAppCfgStr = ' + JSON.stringify(currAppCfgStr));"

        // + "for (var i = 0; i < currAppCfgStr.length; i++) { PurpleRobot.log('currAppCfgStr[' + i + ' = ' + currAppCfgStr[i]); }"

        // + "var currAppCfg = !appCfgExists ? currAppCfg : {};"
        + "var newAppCfgStr = '" + appCfgStr + "';"
        + "PurpleRobot.log('newAppCfgStr = ' + newAppCfgStr);"
        + "var newAppCfg = JSON.parse(newAppCfgStr);"

        // update the current app cfg obj with the new one
        + "currAppCfg.logLevel = newAppCfg.logLevel;"
        + "currAppCfg.staticOrDefault = newAppCfg.staticOrDefault;"
        + "currAppCfg.dynamicOrModified = appCfgExists ? newAppCfg.dynamicOrModified : currAppCfg.dynamicOrModified;"
        
        + "var updatedNewAppCfg = JSON.stringify(currAppCfg);"
        + "PurpleRobot.log('updatedNewAppCfg = ' + updatedNewAppCfg);"
        
        // save the updated app cfg
        + "PurpleRobot.persistEncryptedString('" + projName + "', '" + key + "', updatedNewAppCfg);"
        + "PurpleRobot.log('Successfully updated and persisted appCfg for: (\"" + projName + "\", \"" + key + "\")');"
        ;

      cbs.dbgLog('script = ' + script, logSrcPrefix + ":generateScriptHavingAppCfg");
      return script;
    };


    /**
     * Generates a Purple Robot Notification Manager (PRNM) trigger. This enables the PRNM script to run periodically.
     * @param  {[type]} req                                  [description]
     * @param  {[type]} projName                             [description]
     * @param  {[type]} purpleRobotNotificationManagerConfig [description]
     * @return {[type]}                                      [description]
     */
    var generatePurpleRobotNotificationManagerTrigger = function(req, projName, purpleRobotNotificationManagerConfig) { var fn = 'generatePurpleRobotNotificationManagerTrigger';
      // var filePath = "/home/samba/dev/metamorphoo/static/output_files/" + projName
      var filePath = outputFolderPath + "/" + projName
          ,fileName = "PurpleRobotNotificationManager.js"
          ,trigger = null
          // ,untilDateICalStr = getICalDateString(untilDateTime);
          ,prnmConfig = {
            "env": {
              "prCfg": {
                "namespace": projName,
                "key": "PRNM"
              },
              "userCfg": {
                "namespace": projName,
                "key": "userCfg"
              },
              "appCfg": {
                "namespace": projName,
                "key": "appCfg"
              }
            }
          }
        ;

      var MetamorphooTransformer = require('./MetamorphooTransformer.js');
      var mt = new MetamorphooTransformer();

      if(!fs.existsSync(filePath)) { fs.mkdirSync(filePath); }
      // if(!fs.existsSync()) { fs.writeFile(prnmFilePath, fs.readFileSync()); }
      var prnmFileText = fs.readFileSync(cfgInCurrEnv.writePrCfgFile.PurpleRobotNotificationManagerScriptPath);
      
      // cbs.dbgLog('prnmConfig.env.prCfg.namespace = ' + prnmConfig.env.prCfg.namespace + '; prnmConfig.env.prCfg.key = ' + prnmConfig.env.prCfg.key, fn);

      trigger = {
        "id": "Purple Robot Notification Manager",
        "type": "datetime",
        "name": "Purple Robot Notification Manager",
        "action": (function() {
          try{
            return ";"
              // Inject the PurpleRobotNotificationManager code here.
              + prnmFileText
              + "; "
              // persist PRNM to a key for this app
              // + " PurpleRobot.persistString('" + prnmConfig.env.prCfg.namespace +  "','" + prnmConfig.env.prCfg.key + "',{'txt':" + JSON.stringify(prnmFileText) + "});"

              // ACTUALLY RUNS PRNM IN PR!
              // instantiate main PRNM module
              // + " var prnm = exports.ctor(" + JSON.stringify(prnmConfig) + ");"
              + " var prnm = PurpleRobotNotificationManager.ctor(" + JSON.stringify(prnmConfig) + ");"
              
              // append self-loading module: on-user-response actions code
              // + req.body.meta.PurpleRobotNotificationManager.actions
              + (isNullOrUndefined(req.body.cfgVersion) ? req.body.meta.PurpleRobotNotificationManager.actions : req.body.actions)
              + " prnm.actions = new Actions({\"prnm\": prnm});"
              // + " PurpleRobot.log('prnm.actions = ' + _.keys(prnm.actions));"

              // execute the PRNM entry-point.
              + " prnm.main();"
              ;
          }
          catch(e) {
            return "console.err('ERROR from PR cfg server: " + e + "');";
          }
        })(),
        "datetime_start": purpleRobotNotificationManagerConfig.datetime_start,
        "datetime_end": purpleRobotNotificationManagerConfig.datetime_end,
        "datetime_repeat": purpleRobotNotificationManagerConfig.datetime_repeat
      };

      return trigger;
    };


    /**
     * Generates a Purple Robot configuration object.
     * @param  {[type]} req                [description]
     * @param  {[type]} projName           [description]
     * @param  {[type]} dstUserCfgFilePath [description]
     * @param  {[type]} dstUserCfgUrl      [description]
     * @return {[type]}                    [description]
     */
    var generatePurpleRobotConfig = function(req, projName, dstUserCfgFilePath, dstUserCfgUrl) {
      if(!isNullOrUndefined(req.body.cfgVersion)) {
        cbs.dbgLog('Writing script at version level: ' + req.body.cfgVersion, 'generatePurpleRobotConfig');
        // if(req.body.cfgVersion == "2.0") {
        switch(req.body.cfgVersion) {
          case "2.0":
            return {
              "generated_on": (new Date()).toString(),
              "user_id": emptyStrIfNullOrUndef(req.body.prCfg.userId),
              "init_script": emptyStrIfNullOrUndef(req.body.prCfg.init_script) == "" 
                ?   generateScriptHavingUserCfg(req, projName, dstUserCfgFilePath)
                  + generateScriptHavingAppCfg(req, projName)
                : emptyStrIfNullOrUndef(req.body.prCfg.init_script),
              "features": (u.exists(req.body.prCfg.features) && _.isArray(req.body.prCfg.features)) 
                ? req.body.prCfg.features 
                : [],
              "triggers": (u.exists(req.body.prCfg.triggers)) && _.isArray(req.body.prCfg.triggers) 
                ? req.body.prCfg.triggers 
                : [ generatePurpleRobotNotificationManagerTrigger(req, projName, (isNullOrUndefined(req.body.cfgVersion) ? req.body.meta.PurpleRobotNotificationManager : req.body.PurpleRobotNotificationManager)) ]
            };
            break;
        }
      }
      // else, the cfg type is v1.0
      else {
        cbs.dbgLog('Writing script at version level: 1.0', 'generatePurpleRobotConfig');
        return {
          "generated_on": (new Date()).toString(),
          "user_id": emptyStrIfNullOrUndef(req.body.prCfg.userId),
          "init_script": emptyStrIfNullOrUndef(req.body.meta.prCfg.initScript) != "" 
            ? generateScriptHavingUserCfg(req, projName, dstUserCfgFilePath) 
            : emptyStrIfNullOrUndef(req.body.prCfg.init_script),
          "features": (u.exists(req.body.prCfg.features) && _.isArray(req.body.prCfg.features)) 
            ? req.body.prCfg.features 
            : [],
          "triggers": (u.exists(req.body.prCfg.triggers)) && _.isArray(req.body.prCfg.triggers) 
            ? req.body.prCfg.triggers 
            : [ generatePurpleRobotNotificationManagerTrigger(req, projName, (isNullOrUndefined(req.body.cfgVersion) ? req.body.meta.PurpleRobotNotificationManager : req.body.PurpleRobotNotificationManager)) ]
        };
      }
    };


    /**
     * Generates a Purple Robot configuration and outputs it to a JSON file.
     * @param  {[type]} req                [description]
     * @param  {[type]} res                [description]
     * @param  {[type]} route              [description]
     * @param  {[type]} dstUserCfgFilePath [description]
     * @param  {[type]} dstUserCfgUrl      [description]
     * @param  {[type]} fileData           [description]
     * @return {[type]}                    [description]
     */
    var createPurpleRobotConfig = function(req, res, route, dstUserCfgFilePath, dstUserCfgUrl, fileData) { 
      if(validPostData(req.body)) {
        
        // cbs.dbgLog('req.body.meta.prCfg.initScriptFn = ' + req.body.meta.prCfg.initScriptFn, logSrcPrefix);

        // gen the PR cfg doc
        var prCfg = generatePurpleRobotConfig(req, req.params.projName, dstUserCfgFilePath, dstUserCfgUrl);

        // set file-pathing vars
        var prCfgFileName = req.body.prCfg.userId + '.prCfg.json.txt';
        var dstPrCfgFilePath = dstProjSpecificCfgFolder + '/' + prCfgFileName;
        var dstPrCfgUrl = reqProtocol + "://" + req.headers.host + outputFolderBasePath + '/' + routeDstFolder + '/' + prCfgFileName;

        // check for project  folder existence, then write the file
        cbs.dbgLog('prCfg = ' + JSON.stringify(prCfg), logSrcPrefix);
        writeFileInFolder(
          function(req, res, route, dstPrCfgFilePath, dstPrCfgUrl, fileData) {
            cbs.msgLog('Saved PR cfg file to path: ' + dstPrCfgFilePath, logSrcPrefix);
            res.send('Successful PR cfg file write; URL = ' + dstPrCfgUrl);
            res.end();
          },
          req, res, route, dstProjSpecificCfgFolder, dstPrCfgFilePath, dstPrCfgUrl, JSON.stringify(prCfg)
        );
      }
      else {
        cbs.errLog('req.body is invalid! req.body = ' + JSON.stringify(req.body), logSrcPrefix);
      }
    };


    // define cfg vars
    var userCfgFileName = req.body.prCfg.userId + ".userCfg.json.txt";

    var routeDstFolder = req.params.projName;
    var dstProjSpecificCfgFolder = outputFolderPath + '/' + routeDstFolder;
    var dstUserCfgFilePath = dstProjSpecificCfgFolder + '/' + userCfgFileName;
    var dstUserCfgUrl = reqProtocol + "://" + req.headers.host + outputFolderBasePath + '/' + routeDstFolder + '/' + userCfgFileName;

    cbs.dbgLog('req.body.prCfg = \n' + JSON.stringify(req.body), route);

    // verify that a user cfg obj exists
    if(!u.exists(req.body.userCfg) || req.body.userCfg.length == 0) {
      createPurpleRobotConfig(req, res, route, dstUserCfgFilePath, dstUserCfgUrl, null);
    }
    else
    {

      // 1) save the userCfg file.
      writeFileInFolder(
        function(req, res, route, dstUserCfgFilePath, dstUserCfgUrl, fileData) {
          cbs.dbgLog('Saved user cfg file to: ' + dstUserCfgFilePath + '; URL = ' + dstUserCfgUrl, logSrcPrefix);
          createPurpleRobotConfig(req, res, route, dstUserCfgFilePath, dstUserCfgUrl, fileData);
        },      
        req, res, route, dstProjSpecificCfgFolder, dstUserCfgFilePath, dstUserCfgUrl, JSON.stringify(req.body.userCfg)
      );
    }
  });




  /**
   * Writes a file in a folder.
   * @param  {[type]} req         [description]
   * @param  {[type]} res         [description]
   * @param  {[type]} route       [description]
   * @param  {[type]} dstFolder   [description]
   * @param  {[type]} dstFilePath [description]
   * @param  {[type]} dstUrl      [description]
   * @param  {[type]} fileData    [description]
   * @return {[type]}             [description]
   */
  var writeFileInFolder = function(cb, req, res, route, dstFolder, dstFilePath, dstUrl, fileData) {
    // check for folder existence, then write the file
    path.exists(dstFolder, function(exists) {
      // create folder if it doesn't exist
      if (!exists) {
        cbs.msgLog("Creating folder path: " + dstFolder, "server.js:" + route);
        fs.mkdirSync(dstFolder);
      }
      // write the file.
      fs.writeFile(dstFilePath, fileData, function(err) {
        if(err) { cbs.errLog('error: ' + err, 'server.js:' + route); }
        cb(req, res, route, dstFilePath, dstUrl, fileData);
      });
    });
  };



  /**
   * Default Google Docs entry-point. Performs: login/authN, then an HTTP GET for the specified doc path. The get() executes a specified callback, which performs processing once get() is complete.
   * @param  {[type]} data         [description]
   * @param  {[type]} gac          [description]
   * @param  {[type]} ga           [description]
   * @param  {[type]} gd           [description]
   * @param  {[type]} logSrcPrefix [description]
   * @return {[type]}              [description]
   */
  var googleDocFilterResponse = function(data, gac, ga, gd, logSrcPrefix) {
    ga.on(gac.events.login, function(){
      gd.get(data);
    });
    
    // error event
    ga.on(gac.events.error, function(e) {
      cbs.errLog('ERROR: ' + e, logSrcPrefix);
    });
    
    // execute the Google Docs login
    ga.login();
  };






  var isNullOrUndefined = function(v) {
    return (v == null || v == undefined);
  };

  /***** START THE APP *****/
  app.listen(cfgInCurrEnv.node.port);
  console.log("Express server listening to port %d", cfgInCurrEnv.node.port);

  // })
  // .listen(cfgInCurrEnv.node.port);
}
