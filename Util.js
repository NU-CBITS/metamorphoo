// Util.js
//
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20120709

// libs
var _ = require('underscore');

var cbs = require('./cbitsSys.js');


// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};


/**
 * Util.
 * @return {[type]} [description]
 */
edu.northwestern.cbits.metamorphoo.Util = (function() {

  var privateVar = "";                                  // "private" variable


  // ***** Ctor *****
  /**
   * @description: 
   * @param:
   */
	var ctor = function UtilCtor() {};


  // ***** Implementation fns *****

  // *** Private fns ***
  /**
   * @description: 
   * @param:
   */
  var privateMethod = function() {                      // "private" method
    console.log("called privateMethod");
    };


	// class vars & fns
	
	/**
	 * Checks whether an object exists.
	 * @param  {[type]} o [description]
	 * @return {[type]}   [description]
	 */
	ctor.prototype.exists = function(o) {
		return (!_.isNull(o) && !_.isUndefined(o));
	},

	/**
	 * Checks whether an object exists and is a string.
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	ctor.prototype.existsAndIsString = function(str) {
		return (this.exists(str) && _.isString(str));
	}

	return ctor;
})();




module.exports = edu.northwestern.cbits.metamorphoo.Util;