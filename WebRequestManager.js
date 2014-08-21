// WebRequestManager.js
//
// Defines functionality to handle web-requests.
//
// Created by: Evan Story
// Created on: 20120828

var _ = require('underscore');

var cbs = require('./cbitsSys.js');
var sal = require('./serverAppLib');


var WebRequestManager = function() {};



// class variables and fns
WebRequestManager.prototype = {
  handlerMap: null,

  /**
   * Performs an HTTP(S) request (GET, POST, etc.) operation. The purpose of this function is to simplify the Node.js interface for doing-so, for both the HTTP and HTTPS protocols, into a single function.
   * @param  {[type]} req           An Express request object, if defined.
   * @param  {[type]} res           An Express response object, if defined.
   * @param  {[type]} proto         'https' to request via HTTPS, else the request will occur via HTTP.
   * @param  {[type]} requestParams Parameters to the HTTP(S) object.
   * @param  {[type]} postData      A JSON string of data to pass. Is the result of (require('querystring')).stringify(postObj), where postObj is a JSON object you've constructed.
   * @param  {[type]} endCallback   null for default function, else callback for the response-end event.
   * @param  {[type]} dataCallback  null for default function, else callback for the response-data event
   * @param  {[type]} errorCallback null for default function, else callback for the response-error event.
   * @param  {[type]} resCallback   null for default function, else callback for the overall response function. Must implement your own end, data, and error callbacks if this is not null.
   * @param  {[type]} socketTimeToLive Time-to-live (for a socket timeout).
   * @return {[type]}               void.
   */
  sendRequest: function(req, res, proto, requestParams, postData, endCallback, dataCallback, errorCallback, resCallback, socketTimeToLive) {
  	// cbs.dbgLog([proto, JSON.stringify(requestParams), JSON.stringify(postData), endCallback, dataCallback, errorCallback, resCallback, socketTimeToLive], "WebRequestManager.sendRequest");
  	cbs.dbgLog([proto, _.keys(requestParams), JSON.stringify(postData), endCallback, dataCallback, errorCallback, resCallback, socketTimeToLive], "WebRequestManager.sendRequest");

		// If a response callback is defined, use it, else use the default below.
		// Relies-upon other callbacks, each having their own default functions which may be overridden.
		var rc = resCallback != null 
			? (function() { cbs.dbgLog("Using custom response callback.", "WebRequestManager.sendRequest:resCallback"); return resCallback; } )()
			: (function() { cbs.dbgLog("Using default response callback.", "WebRequestManager.sendRequest:resCallback"); return function(postRes) {
			    cbs.dbgLog("statusCode: " + postRes.statusCode, 'WebRequestManager.sendRequest:resCallback');
			    cbs.dbgLog("headers: " + JSON.stringify(postRes.headers), 'WebRequestManager.sendRequest:resCallback');

			    postRes.body = '';
			    postRes.setEncoding(requestParams.encoding != null ? requestParams.encoding : 'utf-8');

			    postRes.on('data', function(d) { 
			    	postRes.body += d; 
			    	if(dataCallback != null) { dataCallback(req, res, d); }
			    	// else { cbs.dbgLog('d = ' + d, 'WebRequestManager.sendRequest:data'); }
			    });
			    postRes.on('error', function(e) {
			    	if(errorCallback != null) { errorCallback(req, res, e); }
			    	else { cbs.errLog('postRes err = ' + e, 'WebRequestManager.sendRequest:error'); }
			    });
			    postRes.on('end', function() {  
			    	cbs.dbgLog('entered', 'WebRequestManager.sendRequest:end');
			      if(endCallback != null) { endCallback(req, res, postRes); }
			      else {
				      // cbs.dbgLog('_.keys(postRes) = ' + _.keys(postRes), 'WebRequestManager.sendRequest:end');
				      cbs.dbgLog('postRes.body = ' + postRes.body, 'WebRequestManager.sendRequest:end');
				      // send results & end the response.
				      if (res) {
				      	res.write(postRes.body);
				      	res.end();
				      }
				      else { cbs.dbgLog('Not running res.body because res is null or undefined.', 'WebRequestManager.sendRequest:end'); }				      
			      }
			      cbs.cmdLog('done...', 'WebRequestManager.sendRequest:end');
			      return;
			    });
		  	}; 
			} ) ();

		// select HTTP or HTTPS
	  var http = proto == 'https' ? require('https') : require('http');
	  // cbs.dbgLog('beginning HTTP(S) request; requestParams = ' + JSON.stringify(requestParams), 'WebRequestManager.sendRequest');
	  cbs.cmdLog('beginning HTTP(S) request; requestParams = ' + _.keys(requestParams), 'WebRequestManager.sendRequest');
	  // cbs.dbgLog('rc = ' + rc, 'WebRequestManager.sendRequest');
	  
	  // create & execute the request
	  var outboundReq = http.request(requestParams, rc);

	  // set request event callbacks
	  outboundReq.on('error', function(e) {
	  	cbs.errLog('Request error: ' + e.message, "WebRequestManager.sendRequest");
	  });
	  // outboundReq.on('data', function(chunk) {
	  // 	cbs.dbgLog('chunk = ' + chunk, "WebRequestManager.sendRequest");
	  // });
	  // outboundReq.on('end', function() {
	  // 	cbs.dbgLog('request ended.', "WebRequestManager.sendRequest");
	  // });

	  // set a socket TTL, for long-running requests
	  if (socketTimeToLive) {
		  outboundReq.on('socket', function(socket) {
	    	// cbs.dbgLog('entered; socketTimeToLive = ' + socketTimeToLive, 'WebRequestManager.sendRequest:socket');
		  	socket.setTimeout(socketTimeToLive);
		  	// cbs.dbgLog('after setTimeout...', 'WebRequestManager.sendRequest:socket');
		  	socket.on('timeout', function() {
		  		cbs.msgLog('socketTimeToLive of ' + socketTimeToLive + ' reached; aborting the request to ' + requestParams.host + ':' + requestParams.port + requestParams.path + '.', 'WebRequestManager.sendRequest:timeout');
		  		outboundReq.abort();
		  	});
		  	// cbs.dbgLog('exiting...', 'WebRequestManager.sendRequest:socket');
		  });
		}

	  // if POST and there's data to write, then write it.
	  if (requestParams.method == 'POST' && postData && _.isString(postData) && postData.length > 0) { 
	  	outboundReq.write(postData);
	  }
	  // end the request
  	cbs.dbgLog('ending the request', 'WebRequestManager.sendRequest');
	  outboundReq.end();
  }

};


module.exports = WebRequestManager;
