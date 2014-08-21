// XElementDependencyManager.js
//
// Created on: 20120618
// Created by: Evan Story (evan.story@northwestern.edu)
//
// Doc'd using JSDoc-style documentation, for use in JSDoc or this Docco fork: https://github.com/tnyuan/docco


// libs
var _ = require('underscore');

// app-specific requires
var cbs = require('./cbitsSys.js');
var DataSrcHandler = require('./DataSrcHandler.js');
var MetamorphooTransformer = require('./MetamorphooTransformer.js');
var Util = require('./Util.js');


// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};
if (!edu.northwestern.cbits.metamorphoo.xelement) edu.northwestern.cbits.metamorphoo.xelement = {};
if (!edu.northwestern.cbits.metamorphoo.xelement.DependencyManager) edu.northwestern.cbits.metamorphoo.xelement.DependencyManager = {};


/**
 * TRAVERSAL.
 * @return {[type]} [description]
 */
edu.northwestern.cbits.metamorphoo.xelement.DependencyManager.Traversal = (function() {

  var privateVar = "";                                  // "private" variable


  // ***** Ctor *****
    /**
   * @description: 
   * @param:
   */
   var ctor = function TraversalCtor() {
    util = new Util();
   };


  // ***** Implementation fns *****

  // *** Private fns ***
  /**
   * @description: 
   * @param:
   */
  var privateMethod = function() {                      // "private" method
    console.log("called privateMethod");
    };


  var util = null;


  // *** "public" members ***
  /**
   * @description: 
   * @param:
   */
  ctor.prototype.getByGUID = function(mmOp) {
    mmOp.srcDataHandler = new DataSrcHandler();
    mmOp.srcCallback = function(op) { op.res.send(op.srcOpResult.data); };
    mmOp.srcDataHandler.getJSONDataFromTrireme(mmOp);
  },


  /**
   * @description: Gets the child XElements of the specified XElement, and removes the metacontent_internal field for each XElement.
   * @param:
   */
  ctor.prototype.getChildren = function(mmOp, currCallDepth, callDepthLimit) {
    // currCallDepth++;
    cbs.dbgLog("(ENTER) @currCallDepth = " + currCallDepth + ", for srcRoute = " + mmOp.srcRoute, "XElementDependencyManager.Traversal.getChildren")
    var self = this;

    mmOp.srcDataHandler = new DataSrcHandler();
    mmOp.srcCallback = function(op) {

      // *** ATTEMPT #2: Just get all the XElements from the DB, and loop-through them here, avoiding async hell. ***
      var entryRoute = op.srcRoute;

      var allXElsArray = null;
      var keyValue = null;

      var data = op.srcOpResult.data;
      var guid = op.req.params.guid;
      var key = op.req.params.key;

      var isDataDefined = util.exists(data);
      var isGuidDefined = util.exists(guid);
      var isKeyDefined = util.exists(key);

      // do we have data and a key?
      if (isDataDefined && isGuidDefined && isKeyDefined) {

        // cbs.dbgLog("For srcRoute = " + entryRoute + ": data = " + data, "XElementDependencyManager.Traversal.getChildren");
        cbs.dbgLog("For srcRoute = " + entryRoute, "XElementDependencyManager.Traversal.getChildren");
        allXElsArray = JSON.parse(data);

        cbs.dbgLog('For srcRoute = " + entryRoute: calling: self.getRequiredXElements(' + guid + ', ' + key + ', ' + allXElsArray + ', ' + currCallDepth + ', ' + callDepthLimit + ', ' + mmOp.req.query.distinct + ')', "XElementDependencyManager.Traversal.getChildren");
        var childXElements = self.getRequiredXElements(guid, key, allXElsArray, currCallDepth, callDepthLimit, mmOp.req.query.distinct);
        // remove metacontent_internal
        var mt = new MetamorphooTransformer();
        childXElements = mt.remove.metacontent_internal(childXElements);

        cbs.dbgLog('CHILDREN OF GUID (' + guid + '): ' + (childXElements.length > 0 ? _.reduce(_.map(childXElements, function(xel) { return xel.guid; }), function(memo, g) { return memo + "," + g; }) : "(none)"), "XElementDependencyManager.Traversal.getChildren");

        // op.res.send(childXElements);
        op.res.json(childXElements);
      }
    };
    mmOp.srcDataHandler.getJSONDataFromTrireme(mmOp);
  },



  // /**
  //  * Recursive breadth-first search through the children specified in the op parameter's object structure.
  //  * @param  {[type]} op             A Metamorphoo operation object.
  //  * @param  {[type]} allXElsArray   An array of the universe of XElements.
  //  * @param  {[type]} currCallDepth  The current depth in the traversal.
  //  * @param  {[type]} callDepthLimit The depth-limit for traversal. Set to -1 to get the entire subtree (all children/descendents) of the specified XElement.
  //  * @return {[type]}                A non-distinct, unsorted set of XElements.
  //  */
  // ctor.prototype.getChildrenRecursive = function(guid, key, allXElsArray, currCallDepth, callDepthLimit, returnDistinctSet) {
  //   var childXElements = new Array();

  //   currCallDepth++;
  //   var withinCallDepthConstraint = (
  //       (callDepthLimit > -1 && currCallDepth <= callDepthLimit) || // depth-limited
  //       (callDepthLimit <= -1)                                      // depth-unlimited; go to leaf-nodes. (beware stack-overflow, given current design...)
  //     );

  //   // cbs.dbgLog('ENTERED: @currCallDepth = ' +  currCallDepth + ': withinCallDepthConstraint = ' + withinCallDepthConstraint, 'XElementDependencyManager.Traversal.getChildrenRecursive');

  //   if (withinCallDepthConstraint) {

  //     cbs.dbgLog('@currCallDepth = ' +  currCallDepth + ': guid = ' + guid + "; key = " + key, 'XElementDependencyManager.Traversal.getChildrenRecursive');

  //     // v2.0 (elimination of outer-looping): get the IDs of the children of this XElement
  //     childXElements = 
        
  //         // 1) reduce all the child/descendent XElements of the current XElement, for the given key, to a single array...
  //         _.reduce(
  //           // 2) ...by mapping...
  //           _.map(
  //             // 3) ...the 1 XElement matching the passed-in GUID...
  //             _.filter(
  //               allXElsArray,
  //               function(xel) {
  //                 if (xel.guid == guid) {
  //                   return xel;
  //                 }
  //             }),     // end filter
  //             // 4) ...to a function that returns the set of child XElement objects relating to this XElement...
  //             function(xelAtCurrGuid) {
  //               // 4.1) Parse the children IDs from the specified array that lives at this XElement's key location as a string.
  //               var childIds = eval("xelAtCurrGuid." + key);
  //               // cbs.dbgLog('childIds = ' + childIds + '; !_.isString(childIds) = ' + (!_.isString(childIds)) + "; childIds.length == 0 = " + (childIds.length == 0), "XElementDependencyManager.Traversal.getChildrenRecursive");
  //               var childIdsIsParseable = !(_.isNull(childIds) || _.isUndefined(childIds) || !_.isString(childIds) || childIds.length == 0);
  //               var childIdsParsed = childIdsIsParseable ? JSON.parse(childIds) : null;
  //               var childIdsExists = childIdsParsed != null && _.isArray(childIdsParsed) && childIdsParsed.length > 0;
  //               // cbs.dbgLog("xelAtCurrGuid.guid = " + xelAtCurrGuid.guid + "; key = " + key+ "; childIds = " + (childIdsExists ? childIds : "(none)"), "XElementDependencyManager.Traversal.getChildrenRecursive");

  //               // 4.2.1) If this XElement has children described in the field specified by the key...                
  //               var children = new Array();
  //               if(childIdsExists) {
  //                 children = 
  //                   // 4.2.2) ...then find them all in the universe of XElements.
  //                   _.filter(allXElsArray, 
  //                     function(xel) { 
  //                       // cbs.dbgLog('xel.guid =' +  xel.guid);
  //                       return _.any(childIdsParsed, function (childId) { return childId == xel.guid; }); 
  //                   });   // end filter
  //               }
  //               // var childrenExists = children.length > 0;
  //               // cbs.dbgLog("xelAtCurrGuid.guid = " + xelAtCurrGuid.guid + "; key = " + key+ "; children = " + (childrenExists ? children : "(none)"), "XElementDependencyManager.Traversal.getChildrenRecursive");
  //               // 4.3) Return the child XElement objects.
  //               return children;
  //             }),       // end map
  //         // 5) ...and joining each of those child XElements to each other as an array.
  //         function (childArray, childrenOfCurrXEl, i) {
  //           return childArray.concat(childrenOfCurrXEl);
  //         });     // end reduce

  //       // v2.0: recurse through the children.
  //       if(!_.isNull(childXElements) && !_.isUndefined(childXElements)) {
  //         var self = this;
  //         _.each(childXElements, function (child) {
  //           // cbs.dbgLog('Calling: self.getChildrenRecursive(' + child.guid + ', ' + key + ', ' + allXElsArray + ', ' + childXElements + ', ' + currCallDepth + ', ' + callDepthLimit + ')', "XElementDependencyManager.Traversal.getChildrenRecursive");
  //           cbs.dbgLog('BEFORE @currCallDepth = ' + currCallDepth + ': guid = ' + guid + '; childXElements = ' + self.getGUIDsDelimited(childXElements, ','), "XElementDependencyManager.Traversal.getChildrenRecursive");
  //           childXElements = childXElements.concat(self.getChildrenRecursive(child.guid, key, allXElsArray, currCallDepth, callDepthLimit, returnDistinctSet));
  //         });
  //       }
  //     // }
  //   }

  //   // cbs.dbgLog('AFTER: @currCallDepth = ' + currCallDepth + ': guid = ' + guid + '; childXElements = ' + (childXElements.length == 0 ? "(empty)" : _.reduce(_.map(childXElements, function(xel) { return xel.guid; }), function(memo, g) { return memo + "," + g; })), "XElementDependencyManager.Traversal.getChildrenRecursive");
  //   // cbs.dbgLog('EXITING: @currCallDepth = ' + currCallDepth, 'XElementDependencyManager.Traversal.getChildrenRecursive');

  //   // return _.uniq(childXElements, function(xel) { return xel.guid; });
  //   // return childXElements;
  //   var retSet = returnDistinctSet
  //     ? _.uniq(childXElements, function(xel) { return xel.guid; })
  //     : childXElements;
  //   // cbs.dbgLog('AFTER: @currCallDepth = ' + currCallDepth + ': guid = ' + guid + '; retSet = ' + this.getGUIDsDelimited(retSet, ','), "XElementDependencyManager.Traversal.getChildrenRecursive");
  //   return retSet;
  // },

    /**
   * Recursive depth-first search through the XElement dependency tree specified in the op parameter's object structure.
   * @param  {[type]} op             A Metamorphoo operation object.
   * @param  {[type]} allXElsArray   An array of the universe of XElements.
   * @param  {[type]} currCallDepth  The current depth in the traversal.
   * @param  {[type]} callDepthLimit The depth-limit for traversal. Set to -1 to get the entire subtree (all children/descendents) of the specified XElement.
   * @return {[type]}                A non-distinct, unsorted set of XElements.
   */
  ctor.prototype.getRequiredXElements = function(guid, key, allXElsArray, currCallDepth, callDepthLimit, returnDistinctSet) {
    var childXElements = new Array();

    currCallDepth++;
    var withinCallDepthConstraint = (
        (callDepthLimit > -1 && currCallDepth <= callDepthLimit) || // depth-limited
        (callDepthLimit <= -1)                                      // depth-unlimited; go to leaf-nodes. (beware stack-overflow, given current design...)
      );

    // cbs.dbgLog('ENTERED: @currCallDepth = ' +  currCallDepth + ': withinCallDepthConstraint = ' + withinCallDepthConstraint, 'XElementDependencyManager.Traversal.getRequiredXElements');

    if (withinCallDepthConstraint) {

      var self = this;
      cbs.dbgLog('@currCallDepth = ' +  currCallDepth + ': guid = ' + guid + "; key = " + key + "; callDepthLimit = " + callDepthLimit + "; returnDistinctSet = " + returnDistinctSet, 'XElementDependencyManager.Traversal.getRequiredXElements');

      // v2.0 (elimination of outer-looping): get the IDs of the children of this XElement
      childXElements = 
        
          // 1) reduce all the child/descendent XElements of the current XElement, for the given key, to a single array...
          _.reduce(
            // 2) ...by mapping...
            _.map(
              // 3) ...the 1 XElement matching the passed-in GUID...
              _.filter(
                allXElsArray,
                function(xel) {
                  if (xel.guid == guid) {
                    return xel;
                  }
              }),     // end filter
              // 4) ...to a function that returns the set of child XElement objects relating to this XElement...
              function(xelAtCurrGuid) {
                // 4.1) Parse the children IDs from the specified array that lives at this XElement's key location as a string.
                var childIds = eval("xelAtCurrGuid." + key);
                // cbs.dbgLog('childIds = ' + childIds + '; !_.isString(childIds) = ' + (!_.isString(childIds)) + "; childIds.length == 0 = " + (childIds.length == 0), "XElementDependencyManager.Traversal.getRequiredXElements");
                var childIdsIsParseable = !(_.isNull(childIds) || _.isUndefined(childIds) || !_.isString(childIds) || childIds.length == 0);
                var childIdsParsed = childIdsIsParseable ? JSON.parse(childIds) : null;
                var childIdsExists = childIdsParsed != null && _.isArray(childIdsParsed) && childIdsParsed.length > 0;
                // cbs.dbgLog("1 xelAtCurrGuid.guid = " + xelAtCurrGuid.guid + "; key = " + key+ "; childIds = " + (childIdsExists ? JSON.stringify(childIdsParsed) : "(none)"), "XElementDependencyManager.Traversal.getRequiredXElements");

                // 4.2.1) If this XElement has children described in the field specified by the key...                
                var children = new Array();
                if(childIdsExists) {
                  children = 
                    // 4.2.2) ...then find them all in the universe of XElements.
                    _.filter(allXElsArray, 
                      function(xel) { 
                        // cbs.dbgLog('xel.guid = ' +  xel.guid);
                        return _.any(childIdsParsed, function (childId) { return childId == xel.guid; }); 
                    });   // end filter
                }
                var childrenExists = children.length > 0;
                // cbs.dbgLog("2 xelAtCurrGuid.guid = " + xelAtCurrGuid.guid + "; key = " + key+ "; children = " + (childrenExists ? children : "(none)"), "XElementDependencyManager.Traversal.getRequiredXElements");
                
                // v2.0: recurse through the children.
                if(!_.isNull(children) && !_.isUndefined(children)) {
                  _.each(children, function (child) {
                    // cbs.dbgLog('Calling: self.getRequiredXElements(' + child.guid + ', ' + key + ', ' + allXElsArray + ', ' + childXElements + ', ' + currCallDepth + ', ' + callDepthLimit + ')', "XElementDependencyManager.Traversal.getRequiredXElements");
                    // cbs.dbgLog('BEFORE @currCallDepth = ' + currCallDepth + ': guid = ' + guid + '; childXElements = ' + self.getGUIDsDelimited(children, ','), "XElementDependencyManager.Traversal.getRequiredXElements");
                    var deeperChildren = self.getRequiredXElements(child.guid, key, allXElsArray, currCallDepth, callDepthLimit, returnDistinctSet);
                    children = deeperChildren.concat(children);
                  });
                }

                // 4.3) Return the child XElement objects.
                return children;
              }),       // end map
          // 5) ...and joining each of those child XElements to each other as an array.
          function (childArray, childrenOfCurrXEl, i) {
            return childArray.concat(childrenOfCurrXEl);
          });     // end reduce
    }

    // cbs.dbgLog('AFTER: @currCallDepth = ' + currCallDepth + ': guid = ' + guid + '; childXElements = ' + (childXElements.length == 0 ? "(empty)" : _.reduce(_.map(childXElements, function(xel) { return xel.guid; }), function(memo, g) { return memo + "," + g; })), "XElementDependencyManager.Traversal.getRequiredXElements");
    // cbs.dbgLog('EXITING: @currCallDepth = ' + currCallDepth, 'XElementDependencyManager.Traversal.getRequiredXElements');

    // return _.uniq(childXElements, function(xel) { return xel.guid; });
    // return childXElements;
    
    var uniqueChildXElementGuids = [];
    // If a distinct set of XElements is requested...
    if(returnDistinctSet) { 
      // ...then get the distinct set of GUIDs among the XElements.
      uniqueChildXElementGuids = _.uniq(_.pluck(childXElements, "guid"));
    }
    // cbs.dbgLog("uniqueChildXElementGuids = " + JSON.stringify(uniqueChildXElementGuids), "XElementDependencyManager.Traversal.getRequiredXElements");
    var seenGuids = [];
    var retSet = returnDistinctSet
      // To return a distinct set of XElements, maintain a "seen" list, and only push into our array the XElements not seen yet.
      ? _.map(childXElements, function(x) {
        if (_.any(uniqueChildXElementGuids, function(u) { return u == x.guid; }) && !_.any(seenGuids, function(s) { return s == x.guid; })) {
          seenGuids.push(x.guid);
          return x;
        }
      })
      : childXElements;
    // ignore the null or undefined values in the the unique set of GUIDs determined a few lines above
    retSet = _.reject(retSet, function(x) { return (_.isNull(x) || _.isUndefined(x)); });
    cbs.dbgLog('AFTER: @currCallDepth = ' + currCallDepth + ': guid = ' + guid + '; retSet = ' + this.getGUIDsDelimited(retSet, ','), "XElementDependencyManager.Traversal.getRequiredXElements");
    return retSet;
  },



  /**
   * A Depth-First Search that returns all the the GUIDs in an XElement
   * @param  {[type]} xelDataTypes  [description]
   * @param  {[type]} xelDataValues [description]
   * @param  {[type]} currCallDepth [description]
   * @param  {[type]} arrayType     [description]
   * @return {[type]}               [description]
   */
  ctor.prototype.getGuidsInXElement = function(xelDataTypes, xelDataValues, currCallDepth, arrayType) {
    currCallDepth++;
    // cbs.dbgLog('ENTERED: currCallDepth = ' + currCallDepth, 'XElementDependencyManager.getGuidsInXElement');
    var guids = new Array();

    // cbs.dbgLog('1: guids = ' + guids, 'XElementDependencyManager.getGuidsInXElement');

    // recurse into this obj to get objs from the next level
    var keysOfDataValues = _.keys(xelDataValues);
    // cbs.dbgLog('keysOfDataValues = ' + keysOfDataValues, 'XElementDependencyManager.getGuidsInXElement');
    var xelKeysOfObjsAtCurrCallDepth = _.filter(keysOfDataValues, function(k) { 
        // cbs.dbgLog('_.isObject(' + xelDataValues[k] + ') && !_.isArray(' + xelDataValues[k] + ') = ' + (_.isObject(xelDataValues[k]) && !_.isArray(xelDataValues[k])));
        return _.isObject(xelDataValues[k]) && !_.isArray(xelDataValues[k]);
      });
    // cbs.dbgLog('xelKeysOfObjsAtCurrCallDepth = ' + xelKeysOfObjsAtCurrCallDepth, 'XElementDependencyManager.getGuidsInXElement');

    // create limited data-type and data-value objects to pass to the recursion, making this a DFS.
    var xelDataTypesAtNextLevel = {};
    var xelDataValuesAtNextLevel = {};
    var self = this;
    _.each(xelKeysOfObjsAtCurrCallDepth, function(k) {
      xelDataTypesAtNextLevel = xelDataTypes[k];
      xelDataValuesAtNextLevel = xelDataValues[k];

      // concat the results of the recursion
      // cbs.dbgLog('OUT: xelDataTypesAtNextLevel  = ' + JSON.stringify(xelDataTypesAtNextLevel), 'XElementDependencyManager.getGuidsInXElement');
      // cbs.dbgLog('OUT: xelDataValuesAtNextLevel = ' + JSON.stringify(xelDataValuesAtNextLevel), 'XElementDependencyManager.getGuidsInXElement');
      guids = guids.concat(self.getGuidsInXElement(xelDataTypesAtNextLevel, xelDataValuesAtNextLevel, currCallDepth, arrayType));
    });
    
    // get GUIDs from the current level
    var xelGuidArrayKeysAtCurrCallDepth = _.filter(_.keys(xelDataTypes), function(k) {
      // cbs.dbgLog('(xelDataTypes[' + k + '] ( = ' + xelDataTypes[k] + ') == ' + arrayType + ') == ' + (xelDataTypes[k] == arrayType), 'XElementDependencyManager.getGuidsInXElement');
      return xelDataTypes[k] == arrayType;
    });
    // cbs.dbgLog('xelGuidArrayKeysAtCurrCallDepth = ' + xelGuidArrayKeysAtCurrCallDepth, 'XElementDependencyManager.getGuidsInXElement');
    if (xelGuidArrayKeysAtCurrCallDepth.length > 0) {
      guids = guids.concat(
        _.reduce(
          _.map(xelGuidArrayKeysAtCurrCallDepth, function(k) {
            // cbs.dbgLog('xelDataValues[k] = ' + xelDataValues[k], 'XElementDependencyManager.getGuidsInXElement');
            return xelDataValues[k];
          }), function(memo, nextArr) {
            return memo.concat(nextArr);
        })
      );
    }

    // return the GUIDs we've found.
    // cbs.dbgLog('2: guids = ' + guids, 'XElementDependencyManager.getGuidsInXElement');
    return guids;
  },


  /**
   * Returns a set of GUIDs from a GUID array delimited by some delimiter, or "(empty)" if the array has 0 length.
   * @param  {[type]} xelementArray [description]
   * @param  {[type]} delimiter [description]
   * @return {[type]}           [description]
   */
  ctor.prototype.getGUIDsDelimited = function(xelementArray, delimiter) {
    return (xelementArray.length == 0 
      ? "(empty)" 
      : _.reduce(
          _.map(xelementArray, 
            function(xel) { return '"' + xel.guid + '"'; }), 
          function(memo, g) { return memo + delimiter + g; })
      );
  };

  return ctor;
}());




/**
 * SORTING.
 * @return {[type]} [description]
 */
edu.northwestern.cbits.metamorphoo.xelement.DependencyManager.Sorting = (function() {

  var privateVar = "";                                  // "private" variable


  // ***** Ctor *****
    /**
   * @description: 
   * @param:
   */
   var ctor = function SortingCtor() {};


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
   * Sorts a set of XElements by some key.
   * @param  {[type]} xelements [description]
   * @param  {[type]} sortKey   [description]
   * @return {[type]}           [description]
   */
  ctor.prototype.sortXElementsBy = function(xelements, sortKey) {
    return _.sortBy(xelements, function(xel) {
      return eval("xel." + sortKey);
    });
  },


  /**
   * Groups an array of XElements by the specified XElement type order.
   * @param  {[type]} xelements         The set of XElements to sort.
   * @param  {[type]} xelementTypeOrder An array of the XElement types describing the order in which each type must occur in the result set.
   * @return {[type]}                   The same set of xelements, sorted by the arbitrary order defined in the xelementTypeOrder parameter.
   */
  ctor.prototype.groupByXElementTypes = function(xelements, xelementTypeOrder) {

    // for each element in an array of XElement types, append matching XElements to the sorted list
    var sortedXElements = new Array();
    var xelementTypeOrderNormalized = _.map(xelementTypeOrder, function(xelType) { return xelType.toLowerCase(); });

    _.each(xelementTypeOrderNormalized, function(xelementType) {
      sortedXElements = sortedXElements.concat(_.filter(xelements, function(xel) { return xel.xel_data_values.xelement_type.toLowerCase() == xelementType; }));
    });

    // get the elements not in the sorted XElements list...
    var remainingXElements = _.difference(xelements, sortedXElements);

    // ...and simply append them at the end so the returned set remains complete.
    var retXElements = new Array();
    retXElements = sortedXElements.concat(remainingXElements);

    return retXElements;
  };

  return ctor;
}());




module.exports = edu.northwestern.cbits.metamorphoo.xelement.DependencyManager;