// RouteHandler.js
//
// Defines route-handlers for Metamorphoo.
//
// Created by: Evan Story
// Created on: 20120607

var _ = require('underscore');

var cbs = require('./cbitsSys.js');
var sal = require('./serverAppLib');
var DataSrcHandler = require('./DataSrcHandler.js');
var DataDstHandler = require('./DataDstHandler.js');
var MetamorphooTransformer = require('./MetamorphooTransformer.js');


var RouteHandler = function() {};



// class variables and fns
RouteHandler.prototype = {
  handlerMap: null,


  /**
   * Generic MM routing function. Decides where to route MM requests, based on input parameters.
   * @param  {http.request} req          HTTP request.
   * @param  {http.response} res          HTTP response.
   * @param  {metamorphoo operation} mmOp         An object describing an operation in Metamorphoo.
   * @param  {config file section} cfgInCurrEnv Configuration parameters from the Metamorphoo config file.
   * @param  {user} userObj      User object describing the authN and authZ parameters.
   * @return {variable}              Returns the result of executing the selected function.
   */
  // genericHandler: function (req, res, mmOp, cfgInCurrEnv, userObj) {
  genericHandler: function (mmOp) {
    var XElementDependencyManager = require('./XElementDependencyManager.js');
    sal.logRoute(mmOp.req.url);
    
    // Define the combinations of parameter paths, each of which lead to evaluable functions. Instantiate this map only once per RouteHandler instantiation.
    if (!this.handlerMap) {
      this.handlerMap = {
        post: {
          file: {
            json: {
              export: "this.receiveData"
            }
          }
        },
        trireme: {
          file: {
            appPkg: {
              export: "this.xelementsToFile(mmOp)"
            },
            concatText: {
              export: "this.xelementsToFile(mmOp)"
            },
            html: {
              export: "this.xelementsToFile(mmOp)"
            },
            json: {
              export: "this.xelementsToFile(mmOp)"
            }
          },
          http: {
            json: {
              edu_northwestern_cbits_metamorphoo_xelement_Traversal_getByGUID: "new XElementDependencyManager.Traversal().getByGUID(mmOp)",
              edu_northwestern_cbits_metamorphoo_xelement_Traversal_getChildren: "new XElementDependencyManager.Traversal().getChildren(mmOp, 0, ((_.isNull(mmOp.req.params.maxDepth) || _.isUndefined(mmOp.req.params.maxDepth)) ? -1 : mmOp.req.params.maxDepth) )"
              //TODO: add more traversal functions!
            }
          }
        }
      };
    }

    // find the desired function in the map, then execute it.
    if (!this.handlerMap[mmOp.srcName][mmOp.dstPhysicalType][mmOp.dstLogicalType][mmOp.cmd]) {
      throw "RouteHandler.js: Could not find the following path in the map: this.handlerMap[" + mmOp.srcName + "][" + mmOp.dstPhysicalType + "][" + mmOp.dstLogicalType + "][" + mmOp.cmd + "]";
    }
    cbs.dbgLog('Executing: ' + this.handlerMap[mmOp.srcName][mmOp.dstPhysicalType][mmOp.dstLogicalType][mmOp.cmd], 'RouteHandler.genericHandler');
    return eval(this.handlerMap[mmOp.srcName][mmOp.dstPhysicalType][mmOp.dstLogicalType][mmOp.cmd]);
  },


  receiveData: function(mmOp) {
    cbs.errLog('Not implemented.', 'RouteHandler.receiveData');
    throw ('Not implemented.');
  },


  /**
   * Writes all XElements to a file.
   * @param  {[type]} mmOp [description]
   * @return {[type]}      [description]
   */
  xelementsToFile: function (mmOp) {
    mmOp.srcDataHandler = new DataSrcHandler();
    mmOp.dstDataHandler = new DataDstHandler();
    mmOp.srcDataHandler.getJSONDataFromTrireme(mmOp);
  }

};


module.exports = RouteHandler;