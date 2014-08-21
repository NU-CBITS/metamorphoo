// App-specific Forever script.
//
// Preconds:
//   1) Root folder of the app is writeable by the user acct under which this script is run (e.g. the "node" user).


// includes
var nodeModulesRoot = './node_modules/';
var forever = require('forever');
var nodefs = require(nodeModulesRoot + 'node-fs/lib/fs.js');
var path = require('path');
var cbs = require('./cbitsSys.js');



// BEGIN CONFIG (TODO: refactor to cfg file)
var dirRoot = '/var/www/nodeserver/dev/metamorphoo';

var foreverFolder = dirRoot + '/.forever';
var pidFolder = foreverFolder + '/pids';
var logsFolder = foreverFolder + '/logs';
var foreverFolderMode = 0775;
var foreverFolderUID = 65534;  // "nobody". Setting this requires the script be run via 'sudo forever {this script}'
var foreverFolderGID = 1000;   // "node"
// END CONFIG (TODO: refactor to cfg file)



// Check param inputs. Need at least config file path, environment, and directory root.
if (process.argv.length < 5) {
	throw "Syntax: " + process.argv[0] + " " + process.argv[1] + " {cfgFilePath} {appEnv} {dirRoot}";
}
// get command-line params
var cfgFilePath = process.argv[2];
var appEnv = process.argv[3];
dirRoot = process.argv[4];
foreverFolder = dirRoot + '/.forever';
pidFolder = foreverFolder + '/pids';
logsFolder = foreverFolder + '/logs';
serverScriptPath = dirRoot + '/server.js';

// read Node port value from config file
var port = cbs.getAppConfigValueForEnv(cbs.getAppConfig(cfgFilePath), appEnv, "node.port");
console.log("Starting (" + serverScriptPath + ") in env (" + appEnv + ") on port: " + port);

// Ensure the logging folder structure exists.
var cfg = cbs.getAppConfig(cfgFilePath);
var cfgInCurrEnv = cbs.getAppConfigValue(cfg, appEnv);
cbs.configureLogging(cfgInCurrEnv.log4js.cfgFilePath, 300);
cbs.verifyAndCreateLoggingStructure(foreverFolder, pidFolder, logsFolder, foreverFolderMode, foreverFolderUID, foreverFolderGID);


var child = new (forever.Monitor)(serverScriptPath, 
	{
		// max: 3,
		// silent: true,
		options: [ cfgFilePath, appEnv ],
		// options copy-pasted from: https://github.com/nodejitsu/forever

		//
		// Basic configuration options
		//
		'silent': false,            // Silences the output from stdout and stderr in the parent process
		'uid': 'node',           // Custom uid for this forever process. (default: autogen)
		'pidFile': pidFolder, // Path to put pid information for the process(es) started
		// 'max': 3,                  // Sets the maximum number of times a given script should run
		'killTree': true,            // Kills the entire child process tree on `exit`

		//
		// These options control how quickly forever restarts a child process
		// as well as when to kill a "spinning" process
		//
		'minUptime': 2000,     // Minimum time a child process has to be up. Forever will 'exit' otherwise.
		'spinSleepTime': 1000, // Interval between restarts if a child is spinning (i.e. alive < minUptime).

		//
		// Command to spawn as well as options and other vars 
		// (env, cwd, etc) to pass along
		//
		// 'command': 'perl',         // Binary to run (default: 'node')
		// 'options': ['foo','bar'],  // Additional arguments to pass to the script,
		// 'sourceDir': 'script/path' // Directory that the source script is in

		//
		// Options for restarting on watched files.
		//
		'watch': true,              // Value indicating if we should watch files.
		'watchIgnoreDotFiles': '.foreverignore', // Dot files we should read to ignore ('.foreverignore', etc).
		'watchIgnorePatterns': [ "*/logs/*", "*.log", "*.log.*", "*.txt", "*.gz", "*.CBITSforeverIgnore*", "*/output_files/*", "funf/*" ], // Ignore patterns to use when watching files.
		'watchDirectory': dirRoot,      // Top-level directory to watch from.

		//
		// All or nothing options passed along to `child_process.spawn`.
		//
		'spawnWith': {
		  env: process.env,        // Information passed along to the child process
		  customFds: [-1, -1, -1], // that forever spawns.
		  setsid: false
		},

		//
		// More specific options to pass along to `child_process.spawn` which 
		// will override anything passed to the `spawnWith` option
		//
		// 'env': { 'ADDITIONAL': 'CHILD ENV VARS' }
		//'cwd': '/var/www/nodeserver/dev',

		//
		// Log files and associated logging options for this instance
		//
		// append: true,
		//, // Path to log output from forever process (when daemonized)
		// 'logFile': logsFolder + "/forever.log"
		// 'outFile': logsFolder + '/forever.log', // Path to log output from child stdout
		// 'errFile': logsFolder + '/forever.log'  // Path to log output from child stderr
	});

	child.on('error', function(err) {
			console.log(Date() + ": child errored: " + err);
			return;
		});

	child.on('restart', function() {
			console.log(Date() + ": child restarted");
			return;
		});

	child.on('exit', function() 
		{ 
			console.log(Date() + ": child exited");
			return;
		});
	child.start();
