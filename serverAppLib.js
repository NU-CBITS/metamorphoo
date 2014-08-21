/*****************************************************************************/
/*  serverAppLib															 */
/*****************************************************************************/
var cbs = require('./cbitsSys.js');
var self = require('./serverAppLib.js');


exports.logRoute = function(routeStr) {
  cbs.msgLog('', arguments.callee.name);
  cbs.msgLog('***** URL RCVD: ' + routeStr + ' *****', arguments.callee.name);
}