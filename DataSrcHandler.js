// DataSrcHandler.js
//
// Responsible for data source functionality.
// 
// Created: May 16, 2012
// Creator: Evan Story (evan.story@northwestern.edu)

// external libs
var http = require('http');
var https = require('https');
var _ = require('underscore');
var url = require('url');

// internal libs
var cbs = require('./cbitsSys.js');
var sal = require('./serverAppLib');
var urlMgr = require('./UrlManager.js');



// ctor
var DataSrcHandler = function() {};


// class variables and fns
DataSrcHandler.prototype = {

	/**
	 * Gets JSON data from Trireme, using the mmOp.envCfg and mmOp.srcRoute variables as routing inputs.
	 * @param  {[type]} mmOp A MetamorphooOperation instance.
	 * @return {[type]}      None.
	 */
	getJSONDataFromTrireme: function(mmOp) {
	  var dataAccessConn = this.getDataAccessConnection(mmOp);

	  try{

		 	// ATTEMPT #2: (via HTTPS)
		 	// create the settings for the request
			var requestSettings = {
				host: dataAccessConn.host,
				port: dataAccessConn.port,
				path: dataAccessConn.path,
				method: 'GET'
			};

			cbs.dbgLog('host = ' + requestSettings.host + '; port = ' + requestSettings.port + '; path = ' + requestSettings.path, 'DataSrcHandler.getJSONDataFromTrireme');

			// connect to the host and perform the HTTPS GET
			var req = https.request(requestSettings, function(response) {
			  cbs.dbgLog("statusCode: " + response.statusCode, 'DataSrcHandler.getJSONDataFromTrireme');
			  cbs.dbgLog("headers: " + JSON.stringify(response.headers), 'DataSrcHandler.getJSONDataFromTrireme');

			  response.body = '';
			  response.setEncoding('utf-8');

			  response.on('error', function(e) { cbs.errLog(e); });
				response.on('data', function(chunk) { response.body += chunk; });

			  // complete response received; do stuff!
			  response.on('end', function() {

			  	// set the srcOpResult values in the mmOp DTO
			  	mmOp.srcOpResult.data = response.body;
			  	mmOp.srcOpResult.status = 0;
			  	mmOp.srcCallback.msg = "Success";

			  	// run the destination-handler router
			    if (!_.isNull(mmOp.dstDataHandler) && !_.isUndefined(mmOp.dstDataHandler) && !_.isNull(mmOp.dstDataHandler.router) && !_.isUndefined(mmOp.dstDataHandler.router) && _.isFunction(mmOp.dstDataHandler.router)) { mmOp.dstDataHandler.router(response, mmOp); }
			    else { cbs.wrnLog("Did not execute mmOp.dstDataHandler.router because it did not meet executable-function requirements. Is your mmOp object specified correctly?", "DataSrcHandler.getJSONDataFromTrireme"); }

			    // run the data-source handler's callback
					if (!_.isNull(mmOp.srcCallback) && !_.isUndefined(mmOp.srcCallback) && _.isFunction(mmOp.srcCallback)) { mmOp.srcCallback(mmOp); }
			    else { cbs.wrnLog("Did not execute mmOp.srcCallback because it did not meet executable-function requirements. Is your mmOp object specified correctly?", "DataSrcHandler.getJSONDataFromTrireme"); }
			  });
			});

			req.on('error', function(e) { cbs.errLog(e); });
			this.addErrorListenersToReqAndConn(req, dataAccessConn, arguments.callee.name);

			// end the request so we don't hang the server
			req.end();
		}
		catch (e) {
			mmOp.data = e;
			mmOp.srcOpResult.msg = "ERROR: " + e, "DataSrcHandler.getJSONDataFromTrireme";
			mmOp.srcOpResult.status = 1;
			cbs.errLog(mmOp.srcOpResult.msg);
		}
	},



	/**
	 * [addErrorListenersToReqAndConn description]
	 * @param {[type]} requestObj        [description]
	 * @param {[type]} connectionObj     [description]
	 * @param {[type]} callingMethodName [description]
	 */
	addErrorListenersToReqAndConn: function(requestObj, connectionObj, callingMethodName) {
	  requestObj.addListener('error', function(exception){
      if (exception.errno === 61 /*ECONNREFUSED*/) {
          cbs.errLog('ECONNREFUSED: connection refused to '
              + connectionObj.host + ':' + connectionObj.port, callingMethodName + '->request->error');
      } else {
          cbs.errLog(exception);
      }
	  });

	  if (requestObj.socket != null && requestObj.socket != undefined) {
	    requestObj.socket.addListener('error', function(socketException){
        if (socketException.errno === 61 /*ECONNREFUSED*/) {
            cbs.errLog('ECONNREFUSED: connection refused to '
                + connectionObj.host + ':' + connectionObj.port, callingMethodName + '->request->socket->error');
        } else {
            cbs.errLog(socketException);
        }
	    });
	  }
	},


	getDataAccessConnection: function(mmOp) {
	  var dataAccessConn =
	  {
	    host: mmOp.envCfg.trireme.hostName,
	    port: mmOp.envCfg.trireme.port,
	    path: mmOp.srcRoute,
	    method: "GET"
	  };
	  dataAccessConn.path = new urlMgr.UrlManager().addSessionVarsToUrl(dataAccessConn.path, mmOp.user);

	  cbs.dbgLog('dataAccessConn.host = ' + dataAccessConn.host, 'DataSrcHandler.getDataAccessConnection');
	  cbs.dbgLog('dataAccessConn.port = ' + dataAccessConn.port, 'DataSrcHandler.getDataAccessConnection');
	  cbs.dbgLog('dataAccessConn.path = ' + dataAccessConn.path, 'DataSrcHandler.getDataAccessConnection');

	  return dataAccessConn;
	}
};




module.exports = DataSrcHandler;