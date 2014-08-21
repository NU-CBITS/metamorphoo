// DataDstHandler.js
//
// Responsible for data destination functionality.
// 
// Created: May 16, 2012
// Creator: Evan Story (evan.story@northwestern.edu)

// external libs
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
// var Backbone = require('backbone');
var clone = require('clone');

// internal libs
var cbs = require('./cbitsSys.js');
var sal = require('./serverAppLib');
var MetamorphooTransformer = require('./MetamorphooTransformer.js');
var Util = require('./Util.js');


// ctor
var DataDstHandler = function() { };


// class variables and fns
DataDstHandler.prototype = {

  // A heuristic value indicating the max byte size of a string to be minified.
  minifySizeLimit: 125000,

	routeMap: null,
  htmlPageXElementTypeDistinctions: ["stylesheet", "library_code", "application_code", "launch_code", "static_html"],


  router: function (res, mmOp) {
    sal.logRoute(mmOp.srcRoute);
    
    // Define the combinations of parameter paths, each of which lead to evaluable functions. Instantiate this map only once per RouteHandler instantiation.
    if (!this.routeMap) {
      this.routeMap = {
        export: {
          file: {
            appPkg: "this.writeApplicationPackage(mmOp)",
            concatText: "this.writeTextFileOfXElementAndChildren(mmOp)",
            html: "this.writeHTMLFile(mmOp)",
            json: "this.writeJsonFile(mmOp)"
          // },
          // http: {
          //   json: {
          //     edu_northwestern_cbits_metamorphoo_xelement_Traversal_getByGUID: "new XlEementDependencyManager().getByGUID(mmOp)"
          //   }
          }
        }
      };
    }

    // find the desired function in the map, then execute it.
    return eval(this.routeMap[mmOp.cmd][mmOp.dstPhysicalType][mmOp.dstLogicalType]);
  },



  /**
   * Writes a simple text file.
   * @param  {[type]} res  [description]
   * @param  {[type]} mmOp [description]
   * @return {[type]}      [description]
   */
  writeTextFileOfXElementAndChildren: function(mmOp) {
    // create the params for the transform fn for this op
    var u = new Util();
    var params = {
      self: this,
      mt: (new MetamorphooTransformer()),
      debugMode: (u.exists(mmOp.req.query.debugMode)),
      displayedOutputPath: ""
    };
    params.displayedOutputPath = (params.debugMode ? mmOp.dstPath : mmOp.dstUrl);

    // define the transform fn
    var transformFn = function(params, mmOp) {
      // get the xelement children
      mmOp.dstDataFinal = params.mt.beautify.javascript(JSON.stringify(params.mt.concat.xelementAndChildrenContent(mmOp, params.mt)));
      // generate the display message returned to the caller
      mmOp.dstOpResult.displayMsg = params.self.generateDataForHTMLOutput(params.displayedOutputPath, mmOp.dstDataFinal, params.debugMode);  
    };

    // write the file
    this.writeFile(mmOp, params, transformFn, mmOp.dstPath, 'Saved text file: ' + mmOp.dstPath, "DataDstHandler.writeTextFileOfXElementAndChildren");
  },


	/**
	* @description: Writes a beautified JSON file to the specified file path.
	* @param: {response} HTTP response.
	* @param: {json} JSON data to write.
	* @param: {string} displayedOutputPath 
	* @returns: {html} An HTML string defining a simple page to display the file to be written.
	*/
	writeJsonFile: function(mmOp) {
    // create the params for the transform fn for this op
    var u = new Util();
    var params = {
      self: this,
      mt: (new MetamorphooTransformer()),
      debugMode: (u.exists(mmOp.req.query.debugMode)),
      isRootKeyQuery: u.existsAndIsString(mmOp.req.query.rootKey),
      displayedOutputPath: ""
    };
    params.displayedOutputPath = (params.debugMode ? mmOp.dstPath : mmOp.dstUrl);

    // define the transform fn
    var transformFn = function(params, mmOp) {
      // if querying for a specific root key, then get just the object at that level, and append the XElement GUID to the returned obj,
      // else, return the whole object.
      var parsedData = JSON.parse(mmOp.srcOpResult.data);
      var newData = params.isRootKeyQuery
        ? params.mt.window.xelements(parsedData, mmOp.req.query.rootKey)
        : parsedData;

      // IMPORTANT: strip metacontent_internal, as this contains private stuff!!
      newData = params.mt.remove.metacontent_internal(newData);

      // beautify the data for output
      mmOp.dstDataFinal = params.mt.beautify.javascript(JSON.stringify(newData));

      // generate the display message returned to the caller
      mmOp.dstOpResult.displayMsg = params.self.generateDataForHTMLOutput(params.displayedOutputPath, mmOp.dstDataFinal, params.debugMode);
    };

    // write the file
    this.writeFile(mmOp, params, transformFn, mmOp.dstPath, 'Saved JSON file: ' + mmOp.dstPath, "DataDstHandler.writeJsonFile");
	},


  /**
   * Writes an HTML file given the parameters carried by mmOp.
   * @param  {[type]} mmOp [description]
   * @return {[type]}      [description]
   */
  writeHTMLFile: function(mmOp) {
    // create the params for the transform fn for this op
    var u = new Util();
    var params = {
      self: this,
      mt: (new MetamorphooTransformer()),
      debugMode: (u.exists(mmOp.req.query.debugMode)),
      isRootKeyQuery: u.existsAndIsString(mmOp.req.query.rootKey),
      displayedOutputPath: "",
      util: u
    };
    params.displayedOutputPath = (params.debugMode ? mmOp.dstPath : mmOp.dstUrl);

    // define the transform fn
    var transformFn = function(params, mmOp) {
      var XEDM = require('./XElementDependencyManager.js');
      var xedm = new XEDM.Traversal();
      
      // V0.5: now using real data...
      // *** get the XElement dependencies ***
      // cbs.dbgLog("1: " + xedm.getGUIDsDelimited(parsedData, ","), "DataDstHandler.writeHTMLFile->transformFn");
      var parsedResultData = JSON.parse(mmOp.srcOpResult.data);
      cbs.dbgLog("mmOp.srcOpResult.data guids = " + xedm.getGUIDsDelimited(parsedResultData, ","), "DataDstHandler.writeHTMLFile->transformFn");
      var parsedChildData = params.mt.concat.xelementAndChildrenContent(mmOp, params.mt);
      cbs.dbgLog("parsedChildData guids = " + xedm.getGUIDsDelimited(parsedChildData, ","), "DataDstHandler.writeHTMLFile->transformFn");
      var appXEl = _.first(parsedResultData);
      var appXElMetacontentExternal = JSON.parse(appXEl.xel_data_values.metacontent_external);

      // *** get data to fill the template ***
      var templateData = params.self.getTemplateData(params, mmOp, parsedChildData, appXElMetacontentExternal);

      // *** get the HTML template ***
      var templateContent = "";
      
      // if the application defines a custom template...
      if (_.has(appXElMetacontentExternal, "layoutTemplate") && appXElMetacontentExternal.layoutTemplate.length > 0) {
        var guidToXElWithCustomTemplate = appXElMetacontentExternal.layoutTemplate;
        var xelementContainingCustomTemplate = _.find(parsedResultData, function(x) { return x.guid == guidToXElWithCustomTemplate; });
        cbs.dbgLog('Using custom template from: ' + guidToXElWithCustomTemplate, "DataDstHandler.writeHTMLFile->transformFn");
        templateContent = xelementContainingCustomTemplate.xel_data_values.content;
      }
      // else, the application will rely on the default template.
      else {
        var filePath = "/var/www/nodeserver/dev/metamorphoo/static/views/htmlGeneratorTemplate.html";
        if (!path.existsSync(filePath)) {
          throw "Template doesn't exist: " + filePath;
        }
        cbs.dbgLog('Using default template from: ' + filePath, "DataDstHandler.writeHTMLFile->transformFn");        
        // TODO: convert this structure and the writeFile call to async.
        templateContent = fs.readFileSync(filePath, 'utf8');
      }

      // *** generate the HTML ***
      mmOp.dstDataFinal = _.template(templateContent, templateData);
      // cbs.dbgLog('mmOp.dstDataFinal = ' + mmOp.dstDataFinal, 'DataDstHandler.writeHTMLFile.transformFn');
    };

    // write the file
    this.writeFile(mmOp, params, transformFn, mmOp.dstPath, 'Saved HTML file: ' + mmOp.dstPath, "DataDstHandler.writeHTMLFile");
  },


  /**
   * Creates and returns a template data object based on the XElement dataset.
   * @param  {[type]} params     [description]
   * @param  {[type]} parsedChildData [description]
   * @return {[type]}            [description]
   */
  getTemplateData: function(params, mmOp, parsedChildData, appXElMetacontentExternal) {
      // generate the output data
// cbs.dbgLog('1', "DataDstHandler.getTemplateData->transformFn");
      var css =
        params.mt.minify.css(
          params.mt.concat.css(
            _.map(
              _.filter(parsedChildData, function(xelement) {
                return (xelement.xelement_type == params.self.htmlPageXElementTypeDistinctions[0]);
              }), function(xelement) {
                return xelement.content;
            })
          )
        );
// cbs.dbgLog('2', "DataDstHandler.getTemplateData->transformFn");
      var libCodeUncompressed = 
        params.mt.concat.javascript(
          _.map(
            _.filter(parsedChildData, function(xelement) {
              return (xelement.xelement_type == params.self.htmlPageXElementTypeDistinctions[1]);
            }), function(xelement) {
              // cbs.dbgLog('xelement.title = ' + xelement.title);
              return xelement.content;
          })
        );
      // 20120725: Uglify-JS seems to die when trying to run ast_squeeze on jQuery. This is our experience and that of others (https://github.com/mishoo/UglifyJS/issues/437).
      // For now, only minify smaller files. As a heuristic, the limit below is approximately half the byte size of uncompressed jQuery-1.7.2.
      var libCode = (libCodeUncompressed.length > params.self.minifySizeLimit)
        ? libCodeUncompressed
        : (params.mt.minify.javascript(libCodeUncompressed));
// cbs.dbgLog('3', "DataDstHandler.getTemplateData->transformFn");
      var appCodeUncompressed = 
        params.mt.concat.javascript(
          _.map(
            _.filter(parsedChildData, function(xelement) {
              return (xelement.xelement_type == params.self.htmlPageXElementTypeDistinctions[2]);
            }), function(xelement) {
              return xelement.content;
          })
        );
      var appCode = (appCodeUncompressed.length > this.minifySizeLimit)
        ? appCodeUncompressed
        : (params.mt.minify.javascript(appCodeUncompressed));
// cbs.dbgLog('4', "DataDstHandler.getTemplateData->transformFn");
      var launchCodeUncompressed =
        params.mt.concat.javascript(
          _.map(
            _.filter(parsedChildData, function(xelement) {
              return (xelement.xelement_type == params.self.htmlPageXElementTypeDistinctions[3]);
            }), function(xelement) {
              return xelement.content;
          })
        );
      var launchCode = (launchCodeUncompressed.length > this.minifySizeLimit)
        ? launchCodeUncompressed
        : (params.mt.minify.javascript(launchCodeUncompressed));
// cbs.dbgLog('5', "DataDstHandler.getTemplateData->transformFn");
      var bodyContent =
        params.mt.concat.html(
          _.map(
            _.filter(parsedChildData, function(xelement) {
              return (xelement.xelement_type == params.self.htmlPageXElementTypeDistinctions[4]);
            }), function(xelement) {
            return xelement.content;
          })
        );
// cbs.dbgLog('6', "DataDstHandler.getTemplateData->transformFn");

      var templateData = {
        metaTagContentArr: 
          // [ 
          //   {name: "meta1_name", content: "meta1_content - TODO: source currently undefined" }, 
          //   {name: "meta2_name", content: "meta2_content" }
          // ],
          params.util.exists(appXElMetacontentExternal.metatags) ? appXElMetacontentExternal.metatags : [],
        concatCssStr: css,
        concatJsLibraryCode: libCode,
        concatJsApplicationCode: appCode,
        xelementsFileName: mmOp.dstLeafName,
        clientTemplateContentArr: [ 
          { id: "T1", content: "T1_content", type: "T1_type" }, 
          { id: "T2", content: "T2_content", type: "T2_type" }
        ],
        concatJsLaunchCode: launchCode,
        pageTitle: _.first(parsedChildData).title,
        body: {
          attrs: "TODO",
          content: bodyContent
        }
      };

      return templateData;
  },


  /**
   * Creates the package of application data. Specifically, this function writes the HTML file and XElements file referenced by the app.
   * @param  {[type]} mmOp [description]
   * @return {[type]}      [description]
   */
  writeApplicationPackage: function(mmOp) {
    var XEDM = require('./XElementDependencyManager.js');
    var xedm = new XEDM.Traversal();
    // create the params for the transform fn for this op
    var u = new Util();
    var params = {
      self: this,
      mt: (new MetamorphooTransformer()),
      debugMode: (u.exists(mmOp.req.query.debugMode)),
      isRootKeyQuery: u.existsAndIsString(mmOp.req.query.rootKey),
      displayedOutputPath: ""
    };
    params.displayedOutputPath = (params.debugMode ? mmOp.dstPath : mmOp.dstUrl);


    // OVERRIDE: get the first-level GUID set from the 'application' XElement's content field, instead of from the required_xelement_ids array.
    var parsedData = JSON.parse(mmOp.srcOpResult.data);
    var applicationXElement = _.find(parsedData, function(xel) { return xel.guid == mmOp.req.params.guid; });
    cbs.dbgLog('applicationXElement = ' + params.mt.beautify.javascript(JSON.stringify(applicationXElement)), 'DataDstHandler.writeApplicationPackage');
    var applicationXElementDataTypesContent = JSON.parse(applicationXElement.xel_data_types.content);
    var applicationXElementDataValuesContent = JSON.parse(applicationXElement.xel_data_values.content);

    // determine whether to depend on the required_xelement_ids or content based on whether the content field not only contains JSON (determined by the .parse above), but also whether that object contains what we need.
    var useContentGuidsInsteadOfRequiredXElementIds = 
      _.any(_.keys(applicationXElementDataValuesContent), function (k) { 
        return (
          // top-level has "required_xelement_ids"
          k == "required_xelement_ids" && 
          // "required_xelement_ids" has "xelements"
          _.any(_.keys(applicationXElementDataValuesContent[k]), function(subKey) {
            return (subKey == "xelements");
          })
        );
      });

    // if there is content in the application XElement from which we should extract GUIDs and derive the app's XElement set, then do so...
    cbs.dbgLog('useContentGuidsInsteadOfRequiredXElementIds = ' + useContentGuidsInsteadOfRequiredXElementIds, 'DataDstHandler.writeApplicationPackage');
    if (useContentGuidsInsteadOfRequiredXElementIds) {
      // now that we have the GUIDs in the application, get the order-independent XElements they identify.
      var orderIndependentXElements = 
        _.filter(parsedData, function(xel) { 
          return (_.any(applicationXElementDataValuesContent.required_xelement_ids.xelements, function(x) { 
            return x == xel.guid; 
          }));
        });
      orderIndependentXElements.splice(0,0, applicationXElement);
      cbs.dbgLog('orderIndependentXElements = ' + xedm.getGUIDsDelimited(orderIndependentXElements, ','), 'DataDstHandler.writeApplicationPackage');
      // get the order-dependent XElements by...
      var orderDependentXElements =
          _.map(
            // ...getting a single, concatenated array from...
            _.reduce(
              _.map(
                // ...the set of arrays over-which order matters (i.e., reject the "xelements" key, since that contains the order-independent XElement GUIDs)...
                  _.reject(
                    _.keys(
                      applicationXElementDataValuesContent.required_xelement_ids
                    ),
                    function(k) {
                      return (k == "xelements");
                    }
                  ),
                  function(k) {
                    return applicationXElementDataValuesContent.required_xelement_ids[k];
                  }
                ),
              // ...which is concatenated into a single array to be returned... (i.e., flatten the tree)
              function(returnedArray, currArray, idx) {
                return returnedArray.concat(currArray);
              }
            ),
            // ...to the filter function, which uses each relatedXElGuid to lookup the XElement in the universe of XElements.
            function(relatedXElGuid) {
              return _.find(parsedData, function(xel) { return xel.guid == relatedXElGuid; });
            }
        );
      // insert the XElement Zero
      var xelZeroGuid = _.first(JSON.parse(applicationXElement.xel_data_values.required_xelement_ids));
      orderDependentXElements.splice(0,0, _.find(parsedData, function(xel) { return xel.guid == xelZeroGuid; }));
      // insert the application XElement
      orderDependentXElements.splice(0,0, applicationXElement);
      cbs.dbgLog('orderDependentXElements = ' + xedm.getGUIDsDelimited(orderDependentXElements, ','), 'DataDstHandler.writeApplicationPackage');
    }

    // write just the XElements relevant to this app.
    var mmOp_json = clone(mmOp, true);
    mmOp_json.srcOpResult.data = useContentGuidsInsteadOfRequiredXElementIds 
      ? JSON.stringify(orderIndependentXElements)
      : mmOp_json.srcOpResult.data;
    var jsonFileSuffix = u.existsAndIsString(mmOp.req.query.jsonFileSuffix) ? mmOp.req.query.jsonFileSuffix : ".xelements.json";
    mmOp_json.dstCallbackShouldRun = false;
    mmOp_json.dstPath = mmOp.dstPath + jsonFileSuffix;
    cbs.dbgLog('mmOp_json.dstFilePath = ' + mmOp_json.dstPath, 'DataDstHandler.writeApplicationPackage');
    this.writeJsonFile(mmOp_json);

    // write the app's HTML loader page.
    var mmOp_html = clone(mmOp, true);
    mmOp_html.srcOpResult.data = useContentGuidsInsteadOfRequiredXElementIds
      ? JSON.stringify(orderDependentXElements.concat(orderIndependentXElements))
      : mmOp_html.srcOpResult.data;
    mmOp_html.dstPath = mmOp.dstPath + ".html";
    mmOp_html.dstLeafName = mmOp_html.dstLeafName + jsonFileSuffix;
    cbs.dbgLog('mmOp_html.dstFilePath = ' + mmOp_html.dstPath, 'DataDstHandler.writeApplicationPackage');
    this.writeHTMLFile(mmOp_html);
  },


  /**
   * Writes the file asynchronously.
   * @param  {[type]} mmOp            [description]
   * @param  {[type]} params          [description]
   * @param  {[type]} dataTransformFn [description]
   * @param  {[type]} dstFilePath     [description]
   * @param  {[type]} successDbgMsg   [description]
   * @param  {[type]} callingFnName   [description]
   * @return {[type]}                 [description]
   */
  writeFile: function(mmOp, params, dataTransformFn, dstFilePath, successDbgMsg, callingFnName) {
    // run the logical-type-specific tranform
    dataTransformFn(params, mmOp);

    // write file
    try {
      fs.writeFile(dstFilePath, mmOp.dstDataFinal, function(err) { if (err) { throw err; } else { cbs.dbgLog(successDbgMsg);  } });      
    } 
    catch(e) {
      cbs.errLog(e, "DataDstHandler.writeFile");
    }

    // run dst callback
    if (mmOp.dstCallback && mmOp.dstCallbackShouldRun) {
      mmOp.dstCallback(mmOp);
    }
  },


  /**
   * Generates a simple HTML page to display some formatted data and destination path to which the data was written.
   * @param  {[type]} displayedOutputPath      [description]
   * @param  {[type]} formattedData [description]
   * @return {[type]}               [description]
   */
  generateDataForHTMLOutput: function(dstPath, formattedData, debugMode) {
    if (debugMode) {
      return '<html><head><title>Write XElements to file</title></head><body><p>Writing to file: "<b>'
        + dstPath 
        + '</b>". It contains the following data:</p><p><textarea rows="40" style="width: 100%;">' 
        + formattedData 
        + '</textarea></p></body></html>';
    }
    else {
      return dstPath;
    }
  },



	/**
	 * @description: Callback for routes. Just sends the body of whatever the implementing destination function gives.
	 * @param  {string} body Body to return to the client.
	 * @param  {response} res  Response object.
	 */
	defaultResponse: function(mmOp) {
		cbs.dbgLog('called', 'DataDstHandler.defaultResponseCallback')
	  mmOp.res.send(mmOp.dstOpResult.displayMsg);
	}
};


module.exports = DataDstHandler;
