// MetamorphooOperation.js
//
// Defines the structure of a DTO that is used in defining the conditions of many requests in MM.
//
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20120626

// libs
var _ = require('underscore');

// app-specific requires
var cbs = require('./cbitsSys.js');



// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};
if (!edu.northwestern.cbits.metamorphoo.xelement) edu.northwestern.cbits.metamorphoo.xelement = {};


/**
 * @description: 
 * @param:
 */
edu.northwestern.cbits.metamorphoo.xelement.MetamorphooOperation = (function() {

  var privateVar = "";                                  // "private" variable


  // ***** Ctor *****
    /**
   * @description: 
   * @param:
   */
   var ctor = function MetamorphooOperationnCtor() {};


  // ***** Implementation fns *****

  // *** Private fns ***
  /**
   * @description: 
   * @param:
   */
  var privateMethod = function() {                      // "private" method
    console.log("called privateMethod");
    };


  /**
   * Returns a DTO representing an operation within Metamorphoo.
   * 
   * An "operation" in the MM context means there exists some data-source, and some data-destination -- an input and an output. This object intends to represent these things.
   * 
   * The purpose of a MetamorphooOperation is to allow you to avoid adding an unwieldly set of parameters to function definitions, and instead pass this single MetamorphooOperation instance to the functions dependent on the data it contains.
   * 
   * @param  {[type]} req             An HTTP request object (e.g. from Express).
   * @param  {[type]} res             An HTTP response object (e.g. from Express).
   * @param  {[type]} srcName         Data source name (e.g. "trireme").  Used for routing this operation to the appopriate handler.
   * @param  {[type]} srcRoute        Data source route (e.g. "/xelements").  Used for routing this operation to the appopriate handler.
   * @param  {[type]} srcUrl          Data source URL. (not really used... refactor-out?)
   * @param  {[type]} srcCallback     Callback function to execute upon the completion of the data-source operation.
   * @param  {[type]} dstPhysicalType Data destination physical type (file, http, etc.). i.e., how physically are we going to handle this data?  Used for routing this operation to the appopriate handler.
   * @param  {[type]} dstLogicalType  Data destination logical type (json, csv, etc). i.e., the data structure to represent the data in our response.  Used for routing this operation to the appopriate handler.
   * @param  {[type]} dstPath         Path to the destination of the destination data, e.g. file path.
   * @param  {[type]} dstCallback     Callback function to execute upon the completion of the data-destination operation.
   * @param  {[type]} dstDataFinal    Contains the final data result to be outputted (whether written to disk, or displayed on a page, etc.).
   * @param  {[type]} cmd             Command (internal to Metamorphoo) to execute.  Used for routing this operation to the appopriate handler.
   * @param  {[type]} user            User context in which the MetamorphooOperation will execute. Used for governing authorization.
   * @param  {[type]} envCfg          Environment configuration. This is the section in the metamorphoo.json config file that MM is using for its environment context -- for database connection values, for Trireme connection values, etc..
   * @return {[type]}                 Returns a DTO representing the passed-in parameters.
   */
  ctor.prototype.createMetamorphooOperation = function(req, res, 
    srcName, srcRoute, srcUrl, srcCallback, 
    dstPhysicalType, dstLogicalType, dstPath, dstUrl, dstCallback,
    cmd, user, envCfg) {
    
    var mmOp = {

      // initialized in createMetamorphooOperation
      req: req,
      res: res,

      srcName: srcName, 
      srcRoute: srcRoute,
      srcUrl: srcUrl,
      srcCallback: srcCallback,

      dstPhysicalType: dstPhysicalType,
      dstLogicalType: dstLogicalType,
      dstPath: dstPath,
      dstLeafName: "",
      dstUrl: dstUrl,
      dstCallback: dstCallback,
      dstCallbackShouldRun: true,
      dstDataFinal: "",

      cmd: cmd,
      user: user,
      envCfg: envCfg,

      // set dynamically after this fn runs
      srcDataHandler: null,
      dstDataHandler: null,
      srcOpResult: {
        data: {},                           // data returned by the operation
        msg: "",                            // a technical message about the operation
        status: "",                         // a status code about the operation
        displayMsg: ""                      // a user-visible message about the operation
      },
      dstOpResult: {
        data: {},                           // data returned by the operation
        msg: "",                            // a technical message about the operation
        status: "",                         // a status code about the operation
        displayMsg: ""                      // a user-visible message about the operation
      }
    };
    return mmOp;
  };


  return ctor;
}());




module.exports = edu.northwestern.cbits.metamorphoo.xelement.MetamorphooOperation;
