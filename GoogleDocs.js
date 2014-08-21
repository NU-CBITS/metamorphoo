// GoogleDocs.js
//
// Defines Google Docs-related handlers for Metamorphoo.
//
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20130103

var _ = require('underscore');

var cbs = require('./cbitsSys.js');
var Util = require("./Util.js");


// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};


edu.northwestern.cbits.metamorphoo.GoogleDocs = (function() {
  var self = null;

  var u;
  var data = null;
  
  // ctor
  var ctor = function(d) {
    data = d;
    u = new Util();
    self = this;
  };


  // class variables and fns
  ctor.prototype = {

    entry: {
      /**
       * Gets all the non-"gsx$" keys.
       * @param  {[type]} entry)   {            return _.reject(_.keys(entry) [description]
       * @param  {[type]} function (k)           {     return                 k.indexOf('gsx$') == 0; } [description]
       * @return {[type]}          [description]
       */
      getAllNonGsxKeys: function(entry) { return _.reject(_.keys(entry), function (k) { return k.indexOf('gsx$') == 0; }); },
      /**
       * Gets all the "gsx$" keys.
       * @param  {[type]} entry)   {            return _.filter(_.keys(entry) [description]
       * @param  {[type]} function (k)           {     return                 k.indexOf('gsx$') == 0; } [description]
       * @return {[type]}          [description]
       */
      getAllGsxKeys: function(entry) { return _.filter(_.keys(entry), function (k) { return k.indexOf('gsx$') == 0; }); },
      /**
       * Replaces all the entry keys beginning with "gsx$" with the substring after that string, and deletes all the keys from an entry that do not match "gsx$".
       * @param  {[type]} entry [description]
       * @return {[type]}       [description]
       */
      removeAllNonGsxKeysAndRenameGsxKeys: function(entry) {
        _.each(self.entry.getAllNonGsxKeys(entry), function(k) { delete entry[k]; });
        _.each(self.entry.getAllGsxKeys(entry), function(k) { 
          var v = entry[k];
          delete entry[k];
          var newKey = k.substring(4, k.length);
          entry[newKey] = v;
        });
        return entry;
      },
      /**
       * Get visibility settings from the "CBITS All Projects Site" Google Spreadsheet.
       * @param  {[type]} firstEntry [description]
       * @return {[type]}            [description]
       */
      getVisibilitySettings: function(firstEntry) {
        var visibilityEntry = firstEntry;
        var visibilitySettings = {};
        _.each(_.keys(visibilityEntry), function(k) { 
          visibilitySettings[k] = visibilityEntry[k]["$t"];
        });
        return visibilitySettings;
      },
      /**
       * Removes the "$t" from a Google Spreadsheet's entry values.
       * @param  {[type]} entry         [description]
       * @param  {[type]} keysToInclude [description]
       * @return {[type]}               [description]
       */
      sanitizeKeyNames: function(entry, keysToInclude) {
        var newEntry = {};
        _.each(keysToInclude, function(k) {
          newEntry[k] = (entry[k]["$t"]).trim();
        });
        return newEntry;
      }
    },


    /**
     * Filters the JSON of a People sheet.
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    filterPeopleSheetByCategory: function(data) {
      var logSrcPrefix = "GoogleDocs.filterGSheetByColumnVisibility:" + data.route;
      var sheetObj = JSON.parse(data.gdResponse.responseData);
      var entries = sheetObj.feed.entry;

      // Step 1: cleanup the data.
      data.gdResponse.finalData = _.map(entries, self.entry.removeAllNonGsxKeysAndRenameGsxKeys);

      // Step 2: filter the response data on the Category column.
      data.gdResponse.finalData = _.filter(entries, function(e) {
         // Miraj's original conditions: if (gDocVal(entry, "category") == core || gDocVal(entry, "category") == staff || gDocVal(entry, "category") == students)
         var categoryVal = e['category']["$t"];
         return _.contains(data.gdResponse.onEndData.visibleCategories, categoryVal);
      });

      // Step 3: remove the "$t" key.
      data.gdResponse.finalData = _.map(data.gdResponse.finalData, function(e) {
        return self.entry.sanitizeKeyNames(e, _.keys(e));
      })

      // do whatever the caller tells us to after filtering
      data.gdResponse.onEndCb(data.gdResponse.finalData);
    },


    /**
     * Filters the JSON of a Google Spreadsheet by visibility in the request.
     * @param  {[type]}   res          [description]
     * @param  {[type]}   sheetJsonTxt [description]
     * @param  {Function} callback     [description]
     * @return {[type]}                [description]
     */
    filterGSheetByColumnVisibility: function(data) {
      cbs.dbgLog('entered...', 'filterGSheetByColumnVisibility');
      var logSrcPrefix = "GoogleDocs.filterGSheetByColumnVisibility:" + data.route;
      cbs.dbgLog('data.gdResponse.responseData = ' + data.gdResponse.responseData);
      var sheetObj = JSON.parse(data.gdResponse.responseData);
      var entries = sheetObj.feed.entry;

      // Step 1: Reduce the dataset size by reducing the column set. Get only the keys whose name starts with "gsx$". Sanitize these keys by removing that prefix.
      data.gdResponse.finalData = _.map(entries, self.entry.removeAllNonGsxKeysAndRenameGsxKeys);

      // Step 2: Row 2 represents the visibility control on each column of the sheet. Get this row as an object.
      var visibilitySettings = self.entry.getVisibilitySettings(data.gdResponse.finalData[0]);
      cbs.dbgLog('visibilitySettings = ' + JSON.stringify(visibilitySettings), logSrcPrefix);

      // Step 3: check that the request wants a defined visibility type.
      if(_.contains(_.keys(data.gdResponse.onEndData.accessControlList), data.origReq.params.visibility)) {

        // Step 4: filter the set of entries...
        data.gdResponse.finalData = _.map(data.gdResponse.finalData, function(e) {
          // ...by getting the set of keys in the visibility settings whose values match those in the access-control list...
          var filteredKeys = _.filter(_.keys(visibilitySettings), function (k) { 
            return _.contains(data.gdResponse.onEndData.accessControlList[data.origReq.params.visibility], visibilitySettings[k]);
          });

          // ...then, for each authorized value, create a new object containing only those values...
          return self.entry.sanitizeKeyNames(e, filteredKeys);
        });      
      }
      // DANGEROUS: gets everything from the spreadsheet; unfiltered.
      else if (data.origReq.params.visibility == "ALLGSXENTRIESANDCOLS") {}
      else if (data.origReq.params.visibility == "RAWSHEET") { data.gdResponse.finalData = sheetObj; }
      else { cbs.errLog('Invalid visibility value.', logSrcPrefix); }

      // do whatever the caller tells us to after filtering.
      data.gdResponse.onEndCb(data.gdResponse.finalData);
    },


    /**
     * Response function.
     * @param  {[type]} localRes [description]
     * @return {[type]}          [description]
     */
    resFunc: function (localRes)
    {
      cbs.dbgLog('STATUS: ' + localRes.statusCode);
      cbs.dbgLog('HEADERS: ' + JSON.stringify(localRes.headers));
      localRes.setEncoding('utf8');

      localRes.on('data', function(chunk) {
        cbs.dbgLog('resFunc:data');
        data.gdResponse.responseData += chunk;
      });

      req.on('error', function(e) {
        cbs.errLog('problem with request: ' + e.message);
      });

      localRes.on('end', function() {
        cbs.dbgLog('resFunc:end');
        data.gdResponse.onEnd(data);
      });
    },


    /**
     * Gets a Google Document and runs a callback function.
     * @param  {[type]}   url      [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    get: function(data)
    {
      var options = u.exists(data.gdRequest.options) ? data.options : {
        host: 'spreadsheets.google.com',
        port: 443,
        path:  data.gdRequest.path,
        method: 'GET',
        headers: {
          'Authorization': 'GoogleLogin auth=' + data.googleAuth.getAuthId()
          ,'GData-Version': '3.0'
        }
      };
      
      var req = require('https')
        .request(options, data.gdRequest.callback);
      req.end();
    },


    /**
     * Performs an HTTPS request.
     * @param  {[type]}   host     [description]
     * @param  {[type]}   port     [description]
     * @param  {[type]}   path     [description]
     * @param  {[type]}   method   [description]
     * @param  {[type]}   headers  [description]
     * @param  {[type]}   data     [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    // httpReq: function(host, port, path, method, headers, callback) {
    httpReq: function(url) {
      // APPROACH 2
      var http = require('http');
      // http://REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE/utility/files/REDACTED_AND_SHOULD_BE_REFACTORED_TO_CONFIG_FILE.txt
      http.get(url, function(res) {
        // console.log("statusCode: ", res.statusCode);
        // console.log("headers: ", res.headers);
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
          // cbs.dbgLog('res:data');
          data.gdResponse.responseData += chunk;
        });

        res.on('end', function() {
          cbs.dbgLog('res:end');
          data.gdResponse.onEnd(data);
        });

      }).on('error', function(e) {
        cbs.errLog('ERROR: ' + e);
      });

      // cbs.dbgLog('called http.get');
    }
  };
    
  return ctor;
} ());


module.exports = edu.northwestern.cbits.metamorphoo.GoogleDocs;