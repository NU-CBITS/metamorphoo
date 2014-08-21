// MetamorphooTransformer
//
// Concatenates, minifies, and obfuscates HTML, CSS, and JS code.
//
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: June 6, 2012

// libs
var _ = require('underscore');
var uglParser = require("uglify-js").parser;
var uglProc = require("uglify-js").uglify;
var cleanCSS = require("clean-css");
var packer = require("packer");

var cbs = require('./cbitsSys.js');
var MetamorphooOperation = require('./MetamorphooOperation.js');
var Util = require('./Util.js');


// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};
if (!edu.northwestern.cbits.metamorphoo.xelement) edu.northwestern.cbits.metamorphoo.xelement = {};


edu.northwestern.cbits.metamorphoo.xelement.MetamorphooTransformer = (function() {
	// ctor
	var ctor = function() {};

	var self = this;
	// class vars & fns
	ctor.prototype = {

	  /***** Beautifier Fns *****/
	  
	  beautify: {

	    // Beautifies Javascript or JSON text.
	    //
	    // Params:
	    //    srcCodeText = JS or JSON text.
	    // Returns: A beautified JS/JSON string.
	    javascript: function(srcCodeText) {
	      var jsbeautifier = require('beautifier');
	      // opts example: https://github.com/einars/js-beautify/blob/master/index.html
	      var opts = {
	        indent_size: 2,
	        indent_char: ' ',
	        preserve_newlines: true,
	        brace_style: 'collapse',
	        keep_array_indentation: true,
	        space_after_anon_function: true,
	        space_before_conditional: true,
	        indent_scripts: true
	        };
	      var beautifiedJSON = jsbeautifier.js_beautify(srcCodeText, opts);
	      return beautifiedJSON;
	    }
	  },
	  

		/***** Concatenation Fns *****/
		concat: {

	    // Concatenates an array of strings.
	    //
	    // Params:
	    //    srcCodeTextArray = An array in which each element is a body of JS code to be concantenated. (Likely, 1 element = 1 source file or XElement.)
	    // Returns: A string containing the concatenated JS code.
			genericConcat: function(srcCodeTextArray) {
	      var concatText = (new Util().exists(srcCodeTextArray) && srcCodeTextArray.length > 0)
	      	? _.reduce(srcCodeTextArray, function(memo, srcText) { return memo + srcText; })
	      	: "";
				return concatText;
			},

			// Concatenates an array of JS code strings.
			//
			// Params:
			//		srcCodeTextArray = An array in which each element is a body of JS code to be concantenated. (Likely, 1 element = 1 source file or XElement.)
			// Returns: A string containing the concatenated JS code.
			javascript: function(srcCodeTextArray) {
	      return this.genericConcat(srcCodeTextArray);
			},

			// Concatenates an array of CSS code strings.
			//
			// Params:
			//		srcCodeTextArray = An array in which each element is a body of CSS code to be concantenated. (Likely, 1 element = 1 source file or XElement.)
			// Returns: A string containing the concatenated CSS code.
			css: function(srcCodeTextArray) {
	      return this.genericConcat(srcCodeTextArray);
			},

			// Concatenates an array of HTML code strings.
			//
			// Params:
			//		srcCodeTextArray = An array in which each element is a body of HTML code to be concantenated. (Likely, 1 element = 1 source file or XElement.)
			// Returns: A string containing the concatenated HTML code.
			html: function(srcCodeTextArray) {
	      return this.genericConcat(srcCodeTextArray);
			},


			/**
		   * Concatenates a set of XElement xel_data_values objects or a specified object hierarchy in each XElement, given the specified XElement GUID and the dependencies contained therein.
		   * @param  {[type]} xelementGUID [description]
		   * @return {[type]}              [description]
		   */
		  xelementAndChildrenContent: function(mmOp, mt) {
				var XElementDependencyManager = require('./XElementDependencyManager.js');
	      var xedmTraversal = new XElementDependencyManager.Traversal();
		  	var util = new Util();
				var data = mmOp.srcOpResult.data;

				// cbs.dbgLog('4 data = ' + data, 'MetamorphooTransformer.xelementAndChildrenContent');
				var allXElements = JSON.parse(data);
				var guid = mmOp.req.params.guid;

				// get children
	      cbs.dbgLog('mmOp.req.query = ' + JSON.stringify(mmOp.req.query));
	      // BFS
				// var childXElements = xedmTraversal.getChildrenRecursive(guid, mmOp.req.params.childrenKey, allXElements, 0, -1, !_.isUndefined(mmOp.req.query.distinct));
				// DFS
				var childXElements = xedmTraversal.getRequiredXElements(guid, mmOp.req.params.childrenKey, allXElements, 0, -1, !_.isUndefined(mmOp.req.query.distinct));

				cbs.dbgLog("childXElements = " + xedmTraversal.getGUIDsDelimited(childXElements, ","), "MetamorphooTransformer.xelementAndChildrenContent");

				// if the XElements must be grouped by type, then do-so here.
				if (util.existsAndIsString(mmOp.req.query.groupByXElementTypes)) { // !_.isNull(mmOp.req.query.groupByXElementTypes) && !_.isUndefined(mmOp.req.query.groupByXElementTypes) && _.isString(mmOp.req.query.groupByXElementTypes)) {
					var xedmSorting = new XElementDependencyManager.Sorting();
					// convert the comma-separated sort-key parameter into an array
					var xelementTypeOrder = mmOp.req.query.groupByXElementTypes.split(',');
					cbs.dbgLog("xelementTypeOrder = " + xelementTypeOrder);
					// sort by XElement type
					// cbs.dbgLog('BEFORE: childXElements = ');
					// console.log(JSON.stringify(childXElements));
					childXElements = xedmSorting.groupByXElementTypes(childXElements, xelementTypeOrder);
					// cbs.dbgLog('AFTER: childXElements = ');
					// console.log(JSON.stringify(childXElements));
				}

				// if the user wants the root XElement, then prepend it to the set.
				if (util.existsAndIsString(mmOp.req.query.includeRoot)) {
					var parentXElement = _.find(allXElements, function(xel) { return xel.guid == guid; });
					// cbs.dbgLog("parentXElement = " + JSON.stringify(parentXElement))	;
					childXElements.splice(0, 0, parentXElement);
				}

		    // remove metacontent_internal from output
		    childXElements = mt.remove.metacontent_internal(childXElements);

				// concatenate the content into a single string.
				// cbs.dbgLog('childXElements = ' + xedmTraversal.getGUIDsDelimited(childXElements, ','), 'MetamorphooTransformer.concat.xelementAndChildrenContent');
				// does the caller want the whole XElement, or just a particular field?
				var getSpecificField = util.existsAndIsString(mmOp.req.params.outputField); // (!_.isNull(mmOp.req.params.outputField) && !_.isUndefined(mmOp.req.params.outputField) && _.isString(mmOp.req.params.outputField));
				var concatContent = null;
				if (getSpecificField) {
					concatContent = 
						_.map(childXElements, function(childXEl) { 
						  return eval("childXEl." + mmOp.req.params.outputField);
						});
				}
				else {
					concatContent = 
						_.map(childXElements, function(childXEl) { 
							var obj = childXEl.xel_data_values;
							obj["guid"] = childXEl.guid;
						  return obj;
						});
				}

				// stringify, then beautify the concatenated contents.
				// mmOp.dstOpResult.displayMsg = mt.beautify.javascript(JSON.stringify(concatContent));

				return concatContent;
		  }
		},


		/***** Minifier Fns *****/
		minify: {
			
			// Minifies a string containing JS code.
			//
			// Params:
			//		srcCodeText = JS source code text.
			// Returns: A string containing the minified JS code.
	    // SeeAlso: https://github.com/mishoo/UglifyJS
			javascript: function(srcCodeText) {
	      var ast = uglParser.parse(srcCodeText);
	      ast = uglProc.ast_squeeze(ast);
	      var minifiedText = uglProc.gen_code(ast);
	      return minifiedText;
			},


			// Minifies a string containing CSS code.
			//
			// Params:
			//		srcCodeText = CSS source code text.
			// Returns: A string containing the minified CSS code.
	    // SeeAlso: https://github.com/GoalSmashers/clean-css
			css: function(srcCodeText) {
	      var minifiedText = cleanCSS.process(srcCodeText);
	      return minifiedText;
			},


			// Minifies a string containing HTML code.
			//
			// Params:
			//		srcCodeText = HTML source code text.
			// Returns: A string containing the minified HTML code.
			html: function(srcCodeText) {
				throw "Not implemented.";
			}
		},


		/***** Obfuscator Fns *****/

		obfuscate: {

			// Obfuscates a string containing JS code.
			//
			// Params:
			//		srcCodeText = JS source code text.
			// Returns: A string containing the obfuscated JS code.
			javascript: function(srcCodeText) {
	      var mangledText = packer.pack(srcCodeText, true);
	      return mangledText;
			}
		},



	  /***** Document-Construction Fns *****/

	  construct: {

	  	page: function(mmOp) {
	  		throw "Not implemented.";
	  	}
	  },



	  /***** Removal Fns *****/
	  remove: {

	  	metacontent_internal: function(xelementArray) {
	    	var util = new Util();
	    	var xelsMinusMI = _.map(xelementArray, function(xel) {
		      delete xel["metacontent_internal"];
		      if (util.exists(xel["xel_data_types"])) { delete xel["xel_data_types"]["metacontent_internal"]; }
		      if (util.exists(xel["xel_data_values"])) { delete xel["xel_data_values"]["metacontent_internal"]; }      
		      return xel;
	    	});
	    	return xelsMinusMI;
	  	}
	  },



	  /***** Window Fns *****/

	  /**
	   * Contains a set of functions for windowing over a data set.
	   * @type {Object}
	   */
	  window: {

	  	/**
	  	 * For each XElement in the array, returns a view limited to the xelementRootKeyPath point and deeper, as well as the GUID of the XElement.
	  	 * @param  {[type]} xelementArray       [description]
	  	 * @param  {[type]} xelementRootKeyPath [description]
	  	 * @return {[type]}                     [description]
	  	 */
	  	xelements: function(xelementArray, xelementRootKeyPath) {
	  		return _.map(xelementArray, function(xel) {
		      var scopeLimitedXEl = eval("xel." + xelementRootKeyPath);
		      scopeLimitedXEl["guid"] = xel.guid;
		      return scopeLimitedXEl;
		    });
	  	}
	  }
	};

 	return ctor;
}());
console.log(JSON.stringify(edu.northwestern.cbits.metamorphoo.xelement.MetamorphooTransformer));



module.exports = edu.northwestern.cbits.metamorphoo.xelement.MetamorphooTransformer;