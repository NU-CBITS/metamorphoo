// self.js
//
// A library for systems-oriented functions usable in Node.js.
//
// Created: 20120405
// Author: Evan Story (REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE@gmail.com)

var nodeModulesRoot = './node_modules/';
// var asyncblock = require('asyncblock');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
// var _ = require('./underscore-dev.js');
var _ = require('underscore');
var self = require('./cbitsSys');
var nodefs = require(nodeModulesRoot + 'node-fs/lib/fs.js');
var log4js = require('log4js');





// *******************
// BEGIN DEFAULT CONFIG (TODO: refactor to cfg file)
// *******************
var logLevel = 4;
exports.logLevel = logLevel;
// ******************
// END DEFAULT CONFIG (TODO: refactor to cfg file)
// ******************



// *********************************
// ***** BEGIN: Consts/globals *****
// *********************************
var binPath =
{
	// coffee: "/usr/local/bin/coffee",
	// cp:     "/bin/cp"
	sed: "/bin/sed",
	expand: "/usr/bin/expand"
};
exports.binPath = binPath;
// *******************************
// ***** END: Consts/globals *****
// *******************************


// ******************************
// ***** BEGIN: Logging fns *****
// ******************************

var log4jslogger = null;
exports.configureLogging = function(fullLogFilePath, cfgFileCheckInterval) {
	// src: https://github.com/nomiddlename/log4js-node
	log4js.configure(fullLogFilePath, { reloadSecs: 300 });
	log4jslogger = log4js.getLogger();
}


// log level = 0: error (always log errors!)
exports.errLog = function(str, fnName) {
	if (logLevel >= 0) {
		// var msg = this.currDateStr() + "[ERR][" + fnName + "] " + str;
		var msg = "[" + fnName + "] " + str;
		// console.log(msg);
		log4jslogger.error(msg);
	}
}
// log level = 1: high-level informational message
exports.msgLog = function(str, fnName) {
	if (logLevel >= 1) {
		// var msg = this.currDateStr() + "[INF][" + fnName + "] " + str;
		var msg = "[" + fnName + "] " + str;
		// console.log(msg);
		log4jslogger.info(msg);
  }
}
// log level = 2: warning
exports.wrnLog = function(str, fnName) {
	if (logLevel >= 2) {
		var msg = this.currDateStr() + "[WRN][" + fnName + "] " + str;
		var msg = "[" + fnName + "] " + str;
		// console.log(msg);
		log4jslogger.warn(msg);
  }
}
// log level = 3: command-logging (for spawning other processes)
exports.cmdLog = function(str, fnName) {
	if (logLevel >= 3) {
		// var msg = this.currDateStr() + "[CMD][" + fnName + "] " + str;
		var msg = "[" + fnName + "] " + str;
		// console.log(msg);
		log4jslogger.info(msg);
  }
}
// log level = 4: debug-logging
exports.dbgLog = function(str, fnName) {
	if (logLevel >= 4) {
		// var msg = this.currDateStr() + "[DBG][" + fnName + "] " + str;
		var msg = "[" + fnName + "] " + str;
		// console.log(msg);
		log4jslogger.debug(msg);
  }
}

// ******************************
// ***** END: Logging fns *****
// ******************************



// ******************************
// ***** BEGIN: Utility fns *****
// ******************************

exports.puts = function(error, stdout, stderr) { 
	console.log(stdout);
	console.log(stderr);
	if (error !== null) {
      console.log('exec error: ' + error);
    }
}

// Determines whether the passed value is null, undefined, or 0-length.
exports.isEmpty = function(x) {
	return (!x || 0 === x.length);
}

// Takes an array an returns a string of the array's values, separated by spaces.
exports.arrayToSpacedStr = function(arr) {
	return _.reduce(arr, function(memo, arg) { 
		// return memo + ' ' + arg;
		return memo + ' ' + (arg.match(/^[>\|&;!]+/g) ? arg : '"' + arg + '"');
		}, '');
}

// ******************************
// ***** END: Utility fns *****
// ******************************



// ******************************
// ***** BEGIN: Date fns *****
// ******************************

// // Generates a date string given a Date object, d, in the format "yyyyMMdd-hhmmss:lll" (where "lll" .
// // This is similar-to, but non-compliant with, an ISO 8601 date-time string: http://en.wikipedia.org/wiki/ISO_8601
exports.currDateStr = function() {
	var d = new Date();
	return "[" +
		d.getFullYear() +
		((d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1)) + 
		(d.getDate() < 10 ? "0" + d.getDate() : d.getDate()) + 
		'-' +
		(d.getHours() < 10 ? "0" + d.getHours() : d.getHours()) + 
		(d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()) + 
		(d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds()) +
		":" +
		(d.getMilliseconds() < 10 ? "00" + d.getMilliseconds() : d.getMilliseconds() < 100 ? "0" + d.getMilliseconds() : d.getMilliseconds()) +
		"] "
}

exports.getHierarchicalDateStr = function (d) {
	return d.getFullYear() +
			((d.getMonth() + 1) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1)).toString() + 
			(d.getDate() < 10 ? "0" + d.getDate() : d.getDate()).toString();
}

exports.getHierarchicalTimeStr = function(d) {
	return (d.getHours() < 10 ? "0" + d.getHours() : d.getHours()).toString() + 
			(d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()).toString() + 
			(d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds()).toString();
}

// Generates a date string given a Date object, d, in the format "yyyyMMdd-hhmmss".
// This is similar-to, but non-compliant with, an ISO 8601 date-time string: http://en.wikipedia.org/wiki/ISO_8601
exports.getHierarchicalDateTimeStr = function (d) {
	return (this.getHierarchicalDateStr(d) + '-' + this.getHierarchicalTimeStr(d));
}

// Calculates the number of minutes between 2 dates.
exports.minutesBetween = function (newerDate, olderDate) {
	return (newerDate.getTime() - olderDate.getTime()) / (1000*60);
}

// ******************************
// ***** END: Date fns *****
// ******************************



// ******************************
// ***** BEGIN: OS process fns *****
// ******************************

// Spawns a sed instance to process a file according to the specified replacement pattern.
exports.spawnSed = function(dstFilePath, sedReplacementPattern) {
	// this.dbgLog("sedReplacementPattern = \"" + sedReplacementPattern + "\"");
	// EX: /bin/sed -i s/\.CBITSforeverIgnore//g ../staging/app02/clientjs/testCBITSsed.js
	// this.cmdLog("Spawning: " + binPath.sed + ' -i ' + sedReplacementPattern + ' ' + dstFilePath, arguments.callee.name);
	this.spawnProcess(binPath.sed, [ '-i', sedReplacementPattern, dstFilePath ],
		function (code) {
			if (code != 0) {
				self.errLog('child process exited with code ' + code);			
			}
			// verify file still exists and has contents...
			if (!path.existsSync(dstFilePath) || 
				(path.existsSync(dstFilePath) && fs.statSync(dstFilePath).size == 0)
				) {
				this.errLog("spawn(" + binPath.sed + ") clobbered the file: " + dstFilePath);
			}
		});
}

// Spawns a process with the given args, and calls the given callback function on exit.
// onExitCallback takes the form as follows: function(spawnProcessReturnCode) { //...your code here... }
exports.spawnProcess = function(exePath, exeArgArray, onExitCallback, spawnStreamHandlersCallback) {
	self.cmdLog("Spawning: " + exePath + ' ' + self.arrayToSpacedStr(exeArgArray), 'cbitsSys.spawnProcess');
	try{
		var child = spawn(exePath, exeArgArray);

		// stream-handlers: override
		if (spawnStreamHandlersCallback && _.isFunction(spawnStreamHandlersCallback)) { spawnStreamHandlersCallback(child); }
		// stream-handlers: default
		else { self.spawnStreamHandlers(child); }
	}
	catch(e) {
		self.errLog("In: spawn(\"" + exePath + ", " + exeArgArray + "\"), error = " + e, 'cbitsSys.spawnProcess');
		throw e;
	}

	child.on('exit', onExitCallback);
}
// Defines behaviors for std I/O streams with the "spawn" function.
exports.spawnStreamHandlers = function(spawnedChild) {
	spawnedChild.stdout.on('data', function (data) {
	  self.cmdLog('spawn stdout: ' + data, 'cbitsSys.spawnStreamHandlers');
	});

	spawnedChild.stderr.on('data', function (data) {
	  self.errLog('spawn stderr: ' + data, 'cbitsSys.spawnStreamHandlers');
	});
}


// Execs a process with the given args.
// Required: exePath, exeArgArray, ioStreamHandlerUserFn (but may be null if using the default function).
// Optional: logStdErr and logStdOut.
exports.execProcess = function(exePath, exeArgArray, nodeExecOptions, ioStreamHandlerUserCallback, logStdErr, logStdOut) {
	var exeStr = exePath + ' ' + self.arrayToSpacedStr(exeArgArray);
	self.cmdLog("exec(\"" + exeStr + "\")", 'cbitsSys.execProcess');
	ioStreamFn = !self.isEmpty(ioStreamHandlerUserCallback) ? ioStreamHandlerUserCallback : self.ioStreamFn;
	try {
		if(nodeExecOptions) { exec(exeStr, nodeExecOptions, ioStreamFn); }
		else 								{ exec(exeStr, ioStreamFn); }
	}
	catch(e) {
		self.errLog("In: exec(\"" + exeStr + "\"), error = " + e, 'cbitsSys.execProcess');
		throw e;
	}
}
// Defines a standard output stream handler function (for STDOUT and STDERR).
// This is the default output callback function for the execProcess function.
exports.ioStreamFn = function(error, stdout, stderr, logStdErr, logStdOut) {
	// do not log stdout by default; only enable if caller demands it.
	if(logStdOut == true) {
		self.cmdLog('exec stdout: ' + stdout, 'cbitsSys.ioStreamFn');			
	}
	// log stderr by default; only disable if caller demands it.
    if(logStdErr != false && !self.isEmpty(stderr)){
	    self.errLog('exec stderr: ' + stderr, 'cbitsSys.ioStreamFn');
    }
    // always log exec() errors.
    if (error !== null) {
      self.errLog('exec error: ' + error, 'cbitsSys.ioStreamFn');
    }
}

// ******************************
// ***** END: OS process fns *****
// ******************************



// Reads a JSON config file and returns an object representing the structure of that file.
exports.getAppConfig = function(configFilePath) {
	// console.log("cfgFilePath = " + cfgFilePath);
	// console.log('appEnv = ' + appEnv);
	var cfgContents = fs.readFileSync(configFilePath,'utf8');
	// console.log("cfgContents = " + cfgContents);
	var cfg = JSON.parse(cfgContents);
	return cfg;
}

// Reads a value from a config file object (see getAppConfig).
// Example:
// appConfigObject = getAppConfig("myconfig.json")
// jsonPathInAppConfig = "dev.node.port"
exports.getAppConfigValue = function(appConfigObject, jsonPathInAppConfig) {
	var v = eval("appConfigObject." + jsonPathInAppConfig);
	return v;
}
// Reads a value from a config file object for a specific environment.
// Example:
// appConfigObject = getAppConfig("myconfig.json")
// env = "dev"
// jsonPathInAppConfig = "node.port"
exports.getAppConfigValueForEnv = function(appConfigObject, env, jsonPathInAppConfigBelowEnv) {
	var v = self.getAppConfigValue(appConfigObject, env + "." + jsonPathInAppConfigBelowEnv);
	return v;
}

// Verifies whether the logging folder structure exists, and if not, creates it.
exports.verifyAndCreateLoggingStructure = function(foreverFolder, pidFolder, logsFolder, foreverFolderMode, foreverFolderUID, foreverFolderGID) {
	self.dbgLog('Entered...', 'cbitsSys.verifyAndCreateLoggingStructure');
	// Ensure the logging folder structure exists.
	if (!path.existsSync(foreverFolder)) {
		self.msgLog("Creating Forever folder: " + foreverFolder);
		nodefs.mkdirSync(foreverFolder, foreverFolderMode, true);
		nodefs.chownSync(foreverFolder, foreverFolderUID, foreverFolderGID);
	}
	if (!path.existsSync(pidFolder)) {
		self.msgLog("Creating Forever PID folder: " + pidFolder);
		nodefs.mkdirSync(pidFolder, foreverFolderMode, true);
		nodefs.chownSync(pidFolder, foreverFolderUID, foreverFolderGID);
	}
	if (!path.existsSync(logsFolder)) {
		self.msgLog("Creating Forever logs folder: " + logsFolder);
		nodefs.mkdirSync(logsFolder, foreverFolderMode, true);
		nodefs.chownSync(logsFolder, foreverFolderUID, foreverFolderGID);
	}
	if(!path.existsSync(logsFolder + '/forever.log')) {
		fs.writeFile(logsFolder + '/forever.log', '', function (err) {
			if (err) {
				throw err;
			}
			console.log('Created log file at: ' + logsFolder + '/forever.log');
		});
	}

	self.msgLog("Forever logs folder: " + logsFolder);
	self.msgLog("Forever PID folder: " + pidFolder);
}