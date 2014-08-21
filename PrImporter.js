// PrImporter
//
// Defines the functionality to import Pr data from some source to a database.
//
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: June 6, 2012

// libs
var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var querystring = require('querystring');
var async = require('async');


var cbs = require('./cbitsSys.js');
var MetamorphooOperation = require('./MetamorphooOperation.js');
var Util = require('./Util.js');
var WebRequestManager = require('./WebRequestManager.js');


// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};


edu.northwestern.cbits.metamorphoo.PrImporter = (function() {
  var self = this;

  var wrm = null;
  var cfg = null;

  // ctor
  var ctor = function(prImporterCfg) {
    wrm = new WebRequestManager();
    this.appendToDatePrototype();
    cfg = prImporterCfg;
  };


  // CONSTS
  var logSrcPrefix = 'PrImporter';
  // table names

  // A matrix (2D array) providing a mapping between a string that is expected to be invalid in JS or MySQL, and its replacement string.
  // To permit greater flexibility, this structure allows n-many mappings, in position 2 and beyond, for each array.
  // Index structure: 
  //    0 = the string to normalize
  //    1 = regex pattern to match the string
  //    2 = the JS/MySQL replacement string
  var keyNormalizationMatrix = [
    [ "!",    "!",      "_BNG_" ],
    [ "@",    "@",      "_AT_" ],
    [ "#",    "#",      "_SHP_" ],
    [ "$",    "\\$",    "_DLR_" ],
    [ "%",    "%",      "_PCT_" ],
    [ "^",    "\\^",    "_CRT_" ],
    [ "&",    "&",      "_AMP_" ],
    [ "*",    "\\\*",   "_AST_" ],
    [ "(",    "\\(",    "_OPR_" ],
    [ ")",    "\\)",    "_CPR_" ],
    [ "[",    "\\[",    "_OSQ_" ],
    [ "]",    "\\]",    "_CSQ_" ],
    [ "<",    "<",      "_OAN_" ],
    [ ">",    ">",      "_CAN_" ],
    [ ":",    ":",      "_CLN_" ],
    [ ";",    ";",      "_SCL_" ],
    [ "\\",   "\\\\",   "_BKS_" ],
    [ "/",    "\\/",    "_FWS_" ],
    [ "|",    "\\|",    "_PIP_" ],
    [ "?",    "\\?",    "_QST_" ],
    [ "+",    "\\+",    "_ADD_" ],
    [ "-",    "-",      "_SUB_" ],
    [ "=",    "=",      "_EQL_" ],
    [ "~",    "~",      "_TLD_" ],
    [ "`",    "`",      "_BKT_" ],
    [ "'",    "'",      "_APO_" ],
    [ "\"",   "\\\"",   "_DBQ_" ],
    [ ".",    "\\.",    "_DT_" ]
  ];

  // GLOBAL VARS
  var finalResponseOutput = '';


  // class vars & fns
  ctor.prototype = {

    // Fns
    getProbeType: function(probeFullPath) { return ((probeFullPath.replace(/.*\.(\w+)'*/, '$1')).replace(/,.*/, '')); },
    getColObjPath: function(colName) { return colName.replace(/^.*?\./, ''); },

    exists: function(o) { return !(_.isNull(o) || _.isUndefined(o)); },

    groupByProbeType: function(prSampleArray) { 
      var self = this;
      return _.groupBy(prSampleArray, function(s) { 
        var probeName = self.exists(s.PROBE) ? self.getProbeType(s.PROBE) : "";
        return probeName;
      });
    },

    /**
     * Extracts and returns the values for a particular key from an HTTP(S) response body.
     * @param  {[type]} responseBody [description]
     * @param  {[type]} key          [description]
     * @return {[type]}              [description]
     */
    getValuesFromResponseBody: function(responseBody, key) {
      try {
        var r = _.pluck(_.map(_.values(JSON.parse(responseBody)), function(v) { return JSON.parse(v); }), key);
        return r;
      }
      catch (e) {
        var r = 'ERROR: ' + e;
        cbs.errLog(r, 'getValuesFromResponseBody');
        return r;
      }
    },

    /**
     * Encapsulates the set  of Postgres SQL commands necessary to manage the pr data from this library.
     * @type {Object}
     */
    sql: {
      // list DB contents
      list: {
        allDatabases: function() { return "SELECT datname FROM pg_database;"; },
        allTables: function() { return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"; },
        allColumnsInTable: function(tblName) { return "SELECT column_name FROM information_schema.columns WHERE table_name = '" + tblName + "';"; }
      },

      exists: {
        table: function(tblName) { return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' and table_name = '" + tblName + "';"; },
      },

      alter: {
        table: {
          addColumn: function(tblName, colName, colDataType) { return 'ALTER TABLE "' + tblName + '" ADD COLUMN "' + colName + '" ' + colDataType + ';'; }
        }
      },
      
      // create a DB
      create: {
        setDbConnLimit: function(dbName, limit) { return 'ALTER DATABASE "' + dbName + '" CONNECTION LIMIT ' + limit + ';'; },
        killDbConnections: function(dbName) { return 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = \'' + dbName + '\' AND pid <> pg_backend_pid();'; },
        database: function(dbName, owner) { return 'CREATE DATABASE "' + dbName + '" OWNER ' + owner + ';'; },
        table: {

          /**
           * Creates the SourceValue table, which stores the raw value of the sample's JSON.
           * @param  {[type]} self [description]
           * @return {[type]}      [description]
           */
          sourceValueTable: function(self) {
            var s = 'CREATE TABLE "' + self.sql.consts.tableNames.sourceValue + '"'
              +' ('
              + _.reduce(
                  _.map(
                    _.keys(self.sql.consts.colNames.sourceValue), function(colNameKey) { 
                      return '"' + colNameKey + '" ' + self.sql.consts.colNames.sourceValue[colNameKey] + ',';
                  }), function(memo, i) { 
                    return memo + ' ' + i; 
                })
              + ' CONSTRAINT "' + self.sql.consts.tableNames.sourceValue + '_pk" PRIMARY KEY (id)'
              +' )'
              +' WITH ('
              +  ' OIDS=FALSE'
              +' );'
            ;
            return s;
          },

          /**
           * Creates the sample table for a probe.
           * @param  {[type]} self    [description]
           * @param  {[type]} tblName [description]
           * @return {[type]}         [description]
           */
          newProbeTable: function(self, tblName) { 
            return 'CREATE TABLE "' + tblName + '"'
              +' ('
              + _.reduce(
                  _.map(
                    _.keys(self.sql.consts.colNames.sampleTblBase), function(colNameKey) { 
                      return '"' + colNameKey + '" ' + self.sql.consts.colNames.sampleTblBase[colNameKey] + ',';
                  }), function(memo, i) { 
                    return memo + ' ' + i; 
                })
              + ' CONSTRAINT "' + tblName + '_pk" PRIMARY KEY (id)'
              +' )'
              +' WITH ('
              +  ' OIDS=FALSE'
              +' );'
            ;
          },

          /**
           * Creates the sub-sample table for a probe.
           * @param  {[type]} self    [description]
           * @param  {[type]} tblName [description]
           * @return {[type]}         [description]
           */
          newProbeArrayValuesTable: function(self, tblName) {
            var seqName = tblName + '_id_seq';
            return 'CREATE SEQUENCE "' + seqName + '"'
              +' START WITH 1'
              +' INCREMENT BY 1'
              +' MINVALUE 1'
              +' MAXVALUE 9223372036854775807'
              +' NO CYCLE;'

              +' CREATE TABLE "' + tblName + '"'
              +' ('
              +' "id" ' + ((self.sql.consts.colNames.subSampleTblBase["id"]).replace('MYSEQUENCE', seqName)) + ', '
              + _.reduce(
                  _.map(
                    _.without(_.keys(self.sql.consts.colNames.subSampleTblBase), 'id'), function(colNameKey) { 
                      return '"' + colNameKey + '" ' + self.sql.consts.colNames.subSampleTblBase[colNameKey] + ',';
                  }), function(memo, i) { 
                    return memo + ' ' + i; 
                })
              + ' CONSTRAINT "' + tblName + '_pk" PRIMARY KEY (id)'
              +' )'
              +' WITH ('
              +  ' OIDS=FALSE'
              +' );'
              ;
          },
          alterOwner: function(tblName, newOwnerName) { return 'ALTER TABLE "' + tblName + '" OWNER TO ' + newOwnerName + ';'; },
          createIndex: function(tblName, colName) { return 'CREATE INDEX "' + tblName + '_' + colName + '_idx" ON "' + tblName + '" USING btree ("' + colName + '");'; },
          addForeignKey: function(localTblName, localTblColName, foreignTblName, foreignTblColName) { 
            return 'ALTER TABLE "' + localTblName + '"' +
              ' ADD CONSTRAINT "' + localTblName + '_sampleId_fk"' +
              ' FOREIGN KEY ("' + localTblColName + '") REFERENCES "' + foreignTblName + '"' +    // pattern in POSIX regex: || quote_ident(trim(trailing '.' from substring(myrow.table_name from '^.*\.'))) || 
              ' ("' + foreignTblColName + '") MATCH SIMPLE' +
              ' ON UPDATE NO ACTION ON DELETE NO ACTION;';
          }
        }
      },

      /**
       * Constants for the basic SQL database structure.
       * @type {Object}
       */
      consts: {
        tableNames: {
          sourceValue: "SourceValue"        
        },
        colNames: {
          sourceValue: {
            "id": "TEXT NOT NULL",
            "timestamp": "DOUBLE PRECISION",
            "insertedTime": "TIMESTAMP",
            "value": "TEXT"
          },
          sampleTblBase: { 
            "id" : "TEXT NOT NULL",
            "timestamp": "DOUBLE PRECISION",
            "eventDateTime": "TIMESTAMP without time zone",
            "insertedTime": "TIMESTAMP"
          },
          subSampleTblBase: { 
            "id" : "BIGINT DEFAULT NEXTVAL('\"MYSEQUENCE\"')",
            "sampleId": "TEXT NOT NULL",
            "arrayIdx" : "BIGINT",
            "timestamp": "DOUBLE PRECISION",
            "eventDateTime" : "TIMESTAMP without time zone",
            "insertedTime" : "TIMESTAMP"
          }
        }
      },

      insert: {

        /**
         * Generates a set of MySQL INSERT statements from the specified object.
         * @param  {[type]} objArr [description]
         * @param  {[type]} stmtArr  [description]
         * @param  {[type]} tblName  [description]
         * @return {[type]}          [description]
         */
        getSampleStaticColValues: function(obj, dateTimeInserted) { 
          return [
              obj.sampleId,
              obj.TIMESTAMP,
              'to_timestamp(' + obj.TIMESTAMP + ')',
              dateTimeInserted.toSQLFormat()
            ];
        },

        /**
         * Generates a set of MySQL INSERT statements from the specified object.
         * @param  {[type]} objArr [description]
         * @param  {[type]} stmtArr  [description]
         * @param  {[type]} tblName  [description]
         * @return {[type]}          [description]
         */
        getSubSampleStaticColValues: function(obj, arrayIdx, dateTimeInserted) { 
          return [
              obj.sampleId,
              arrayIdx,
              obj.TIMESTAMP,
              'to_timestamp(' + obj.TIMESTAMP + ')',
              dateTimeInserted.toSQLFormat()
            ];
        },

        /**
         * Returns a set of SQL INSERT statements for a probe/sample base-table, given a set of Pr samples (and other relevant params) for which to generate the statements.
         * @param  {[type]} self             [description]
         * @param  {[type]} keysArrayName    [description]
         * @param  {[type]} sampleArray      [description]
         * @param  {[type]} dateTimeInserted [description]
         * @param  {[type]} sampleTblName    [description]
         * @return {[type]}                  [description]
         */
        appendInsertsFromObjs: function(self, keysArrayName, sampleArray, dateTimeInserted, sampleTblName) {
          var logSrc = logSrcPrefix + '.appendInsertsFromObjs:' + sampleTblName;
          cbs.dbgLog('entered...', logSrc);

          var stmtArr = [];

          _.each(_.sortBy(sampleArray, function(o) { return o.TIMESTAMP; }), function(o) {
            var objStr = JSON.stringify(o);
            cbs.dbgLog('o = ' + objStr, logSrc);
            
            // get all the columns into which this object will insert
            var insertableCols = self.excludeKeys((self.allKeysInObjHavingNonObjValue("", o, 0))[keysArrayName]);
            cbs.dbgLog('keysArrayName = ' + keysArrayName + '; o[keysArrayName] = ' + o[keysArrayName] + '; insertableCols = ' + JSON.stringify(insertableCols), logSrc);

            // for this object, get the values for each column
            var probeSpecificColValues = self.getValsInObjForColumns(o, insertableCols);

            // sanity-check
            if(insertableCols.length != probeSpecificColValues.length) {
              throw ("Houston, we have a problem: the column array length (" + insertableCols.length + ") and the value array length (" + probeSpecificColValues.length + ") are not equal.");
            }

            // get the sample ID. From PurpleRobot, I expect this to be the "GUID" key in the root of the sample object hierarchy. If not found, then we'll generate an ID.
            o.sampleId = (self.exists(o.GUID))
              ? o.GUID
              : sampleTblName + ':' + (new Date()).toSQLFormat();

            // get the static col values
            var sampleStaticColValues = self.sql.insert.getSampleStaticColValues(o, dateTimeInserted);

            // generate the SourceValue INSERT statement
            stmtArr.push(
              'INSERT INTO "' + self.sql.consts.tableNames.sourceValue + '"' + 
              ' (' + 
                _.map(_.keys(self.sql.consts.colNames.sourceValue), self.colNameFormatterPostgres) +
              ') VALUES (' + 
                 "'" + o.sampleId + "', " + o.TIMESTAMP + ", '" + dateTimeInserted.toSQLFormat() + "', '" + (objStr.replace(/'/g, "''")) + "'" +
              ');'
            );

            // generate the sample-table INSERT statement
            stmtArr.push(
              self.sql.insert.generateSqlInsert(self, sampleTblName, _.keys(self.sql.consts.colNames.sampleTblBase), insertableCols, sampleStaticColValues, probeSpecificColValues)
            );
          });
          cbs.dbgLog('exiting...', logSrc);
          return stmtArr;
        },


        /**
         * Generates a SQL INSERT statmeent into a sample or sub-sample table.
         * @param  {[type]} self                   [description]
         * @param  {[type]} baseColNames           [description]
         * @param  {[type]} probeSpecificColNames  [description]
         * @param  {[type]} baseColValues          [description]
         * @param  {[type]} probeSpecificColValues [description]
         * @return {[type]}                        [description]
         */
        generateSqlInsert: function(self, tblName, baseColNames, probeSpecificColNames, baseColValues, probeSpecificColValues) {
          var logSrc = logSrcPrefix + '.generateSqlInsert:' + tblName;
          var stmt = 'INSERT INTO "' + tblName + '"' +
            ' (' +
              _.map(baseColNames, function(colName) { return self.colNameFormatterPostgres(self.keyNormalizationPrToJSAndDb(colName)); }) + ', ' + 
              _.map(probeSpecificColNames, function(colName) { return self.colNameFormatterPostgres(self.keyNormalizationPrToJSAndDb(colName)); }) + 
            ') VALUES (' + 
              // Map the values to a function that encloses strings in single-quotes, but leaves non-strings and the from_unixtime MySQL function without quotes. Also do some value-conversion to munge into the table.
              _.map(baseColValues.concat(probeSpecificColValues), function(v) {
                return (
                  (_.isString(v) && v.indexOf('to_timestamp') == -1)
                  ? (function(v) {
                      return '\'' + (v.replace(/'/g, "''")) + '\'';
                    })(v)
                  : v
                  );
              }) +
            ');';
          cbs.dbgLog('stmt = ' + stmt, logSrc);
          return stmt;
        },
      }
    },


    // Uses the keyNormalizationMatrix data to transform:
    //    SRC (key):    pr value-column JSON document key string, which may contain values not usable in the DST string.
    //    DST (retKey): a JS and MySQL-usable key string.
    keyNormalizationPrToJSAndDb: function(key) {
      var retKey = key;
      _.each(keyNormalizationMatrix, function(charMapArr) {
        retKey = retKey.replace(new RegExp(charMapArr[1], "g"), charMapArr[2]);
      });
      return retKey;
    },
    // Uses the keyNormalizationMatrix data to transform:
    //    SRC (key):    pr value-column JSON document key string, which may contain values not usable in the DST string.
    //    DST (retKey): a JS and MySQL-usable key string.
    keyNormalizationJSAndDbToPr: function(key) {
      var retKey = key;
      _.each(keyNormalizationMatrix, function(charMapArr) {
        retKey = retKey.replace(new RegExp(charMapArr[2], "g"), charMapArr[0]);
      });
      return retKey;
    },


    // recursive function to iterate through obj. structure & flatten the set of key names into a single array
    allKeysInObjHavingNonObjValue: function(keyPrefix, obj, level) {
      var logSrc = logSrcPrefix + '.allKeysInObjHavingNonObjValue';
      // cbs.dbgLog('ENTERED: keyPrefix = ' + keyPrefix + '; level = ' + level, logSrc);
      var keys = { "nonArrayKeys": [], "arrayKeys": [] };
      var self = this;

      // set the key-prefix
      keyPrefix = (level == 0) ? keyPrefix : keyPrefix + ".";

      _.each(_.keys(obj), function(k) {
        var normalizedKey = self.keyNormalizationPrToJSAndDb(k);
        var isArray = _.isArray(obj[k]);
        var isObj = _.isObject(obj[k]);

        if (!isArray && isObj) {
          var subValues = self.allKeysInObjHavingNonObjValue((keyPrefix + normalizedKey), obj[k], ++level);
          keys.nonArrayKeys = keys.nonArrayKeys.concat(subValues.nonArrayKeys);
          keys.arrayKeys = keys.arrayKeys.concat(subValues.arrayKeys);
        }
        else if (!isArray) {
          keys.nonArrayKeys.push(keyPrefix + normalizedKey);
        }
        else {
          keys.arrayKeys.push(keyPrefix + normalizedKey);
        }
      });

      var uniqueNonArrayKeys = _.uniq(keys.nonArrayKeys);
      var uniqueArrayKeys = _.uniq(keys.arrayKeys);
      var ret = { "nonArrayKeys": uniqueNonArrayKeys, "arrayKeys": uniqueArrayKeys };
      // cbs.dbgLog('level = ' + level + '; nonArrayKeys = ' + keys.nonArrayKeys + '; arrayKeys = ' + keys.arrayKeys, logSrc);
      // cbs.dbgLog('level = ' + level + '; arrayKeys = ' + keys.arrayKeys, logSrc);
      return ret;
    },


    /**
     * Determines the set of columns currently in the destination table,
     * then determines the set of unique keys in the probe-type-specific sample set,
     * then sets the uniqueKeys.nonArrayKeys and uniqueKeys.arrayKeys values, excluding specific keys.
     * @param {[type]} data [description]
     */
    getUniqueKeysFromSamples: function(self, probeTypeSamples, probeType) {
      var logSrc = logSrcPrefix + '.getUniqueKeysFromSamples:' + probeType;
      // // 2) Determines whether the necessary columns in the table exist; if not, then creates them.
      var uniqueKeys = (
          _.reduce(
            _.map(probeTypeSamples, function(s) { 
              return self.allKeysInObjHavingNonObjValue("", s, 0);
            }),
            function(memo, i) {
              var nak = _.uniq(memo.nonArrayKeys.concat(i.nonArrayKeys));
              var ak = _.uniq(memo.arrayKeys.concat(i.arrayKeys));
              return { "nonArrayKeys": nak, "arrayKeys": ak };
          })
        );

      // reject the set of keys below:
      //   PROBE -- Redundant to the table name, which takes the probe name. (And we don't care about the full probe namespace.)
      uniqueKeys.nonArrayKeys = self.excludeKeys(uniqueKeys.nonArrayKeys);
      uniqueKeys.arrayKeys = self.excludeKeys(uniqueKeys.arrayKeys);

      return uniqueKeys;
    },


    /**
     * Determines the set of table columns/keys that are missing from the tableColumnList of a table.
     * @param {[type]} data [description]
     */
    getMissingColNamesWithSQLDataTypes: function(self, probeType, probeTypeSamples, prJsonKeyPathList, tableColumnList) {
      var logSrc = logSrcPrefix + '.getMissingColNamesWithSQLDataTypes:' + probeType;
      cbs.dbgLog('entered with: probeType = ' + probeType + '; probeTypeSamples = ' + probeTypeSamples + '; prJsonKeyPathList = ' + prJsonKeyPathList + '; tableColumnList = ' + tableColumnList, logSrc);
      var missingKeys = _.difference(_.map(prJsonKeyPathList, self.keyNormalizationJSAndDbToPr), tableColumnList);
      missingKeys.sort();
      cbs.dbgLog('\n\tprJsonKeyPathList = ' + prJsonKeyPathList + '\n\tmissingKeys = ' + missingKeys, logSrc);

      // if the table doesn't have the requisite columns, then do datatype-inference and create those columns.
      var missingKeysSqlDataTypes = self.inferDataTypesForMissingCols(self, missingKeys, probeTypeSamples, probeType, tableColumnList);
      return missingKeysSqlDataTypes;
    },

    /**
     * Returns the arrayOfKeys without the set of keys specified.
     * @param  {[type]} arrayOfKeys [description]
     * @return {[type]}             [description]
     */
    excludeKeys: function(arrayOfKeys) {
      var self = this;
      return _.without(arrayOfKeys, 'PROBE');
    },


    /**
     * Infers/discovers SQL (Postgres or MySQL) datatypes of sample data.
     * Returns a set of key-value pairs that map a column name to its datatype.
     *
     * NOTE: As this function reasons inductively to classify the data-types of sample dimensions,
     * it should be obvious that classification-error decreases as the quantity of samples increases.
     * This function was originally tested & run given 2,000 samples, during our first trial. It was a very reliable classifier at this level.
     * 
     * @param  {[type]} missingCols [description]
     * @param  {[type]} samples     [description]
     * @return {[type]}             [description]
     */
    inferDataTypesForMissingCols: function(self, missingCols, samples, probeType, tableColumnList) {
      var logSrc = logSrcPrefix + ".inferDataTypesForMissingCols:" + probeType;
      cbs.dbgLog('entered with missingCols = ' + missingCols + '; tableColumnList = ' + tableColumnList + '...', logSrc);

      // resolve the data-type and length to determine the column type to create.
      var missingColsAndSQLTypes = [];
      _.each(missingCols, function(col) {
        // cbs.dbgLog('missing col: ' + col, logSrc);
        // extract obj path from the col name
        var missingColObjPath = self.getColObjPath(col);

        // get all the values in a column in this DB.
        var allValuesForColMapped =  _.map(samples, function(o) { 
                var val = self.getValInPrObj(o, col);
                return val;
              });
        // cbs.dbgLog('allValuesForColMapped = ' + allValuesForColMapped, logSrc);
        var allValuesForColReduced = _.reduce(allValuesForColMapped
             ,
              function(memo, i) {
                // if dealing w/ array-valued variables, then concat them.
                if(_.isArray(memo) && _.isArray(i)) { 
                  return memo.concat(i);
                }
                // else, return an array of the non-array-valued values
                else { 
                  return (!_.isArray(memo))
                    ? [memo, i]
                    : memo.concat(i);
                }
              });
        // cbs.dbgLog('allValuesForColReduced = ' + allValuesForColReduced, logSrc);
        
        // a reduce of a single value yields no array, above; therefore, for expediency, create one here.
        if(!_.isArray(allValuesForColReduced)) { allValuesForColReduced = [allValuesForColReduced]; }
        var allValuesForCol =
          _.filter(allValuesForColReduced
            ,
            function(v) { 
              return self.exists(v);
            }
          );

        var resolvedDataType = self.inferDataType(allValuesForCol);

        if(resolvedDataType == "PRIMPORTER_OBJECT") {
          // TODO: UNCOMMENT AND CONTINUE THIS CODE IF/WHEN WE NEED TO PROCESS SUB-SAMPLE OBJECTS CONTAINED IN ARRAYS. (e.g. BluetoothProbe.DEVICES or WifiProbe.SCAN_RESULTS)
          // logSrc = logSrc + ':' + col + ':PRIMPORTER_OBJECT';
          // cbs.dbgLog('do we need to unpack the obj for col: ' + col, logSrc);
          // probeType = probeType + ':' + col;
          // var objSubSamples = _.reduce(
          //  _.pluck(samples, col),
          //    function(memo, i) {
          //      return memo.concat(i);
          //    }
          //  );
          // var uniqueKeys = self.getUniqueKeysFromSamples(self, objSubSamples, probeType);
          // cbs.dbgLog('uniqueKeys.nonArrayKeys = ' + uniqueKeys.nonArrayKeys, logSrc);
          // // we just want to store the text of the subsample in its own col for now...
          // uniqueKeys.nonArrayKeys = _.without(uniqueKeys.nonArrayKeys, )
          // var missingKeysSqlDataTypes = self.getMissingColNamesWithSQLDataTypes(self, probeType, objSubSamples, uniqueKeys.nonArrayKeys, tableColumnList);
          // cbs.dbgLog('missingKeysSqlDataTypes = ' + JSON.stringify(missingKeysSqlDataTypes), logSrc);
          // missingColsAndSQLTypes = missingColsAndSQLTypes.concat(missingKeysSqlDataTypes);

          // 20121101: e-story: We aren't going to worry about dealing w/ objects-in-arrays in a sophisticated, complete way for now. For now, instead, create obj w/ dynamic key name, then parse into an object.
          var newColName = null;
          // if the "value" column doesn't exist, then return it as a column that is missing; else, forget about it.
          if(!_.any(tableColumnList, function(c) { return c == col; })) {
            cbs.dbgLog('col (' + col + ') not in tableColumnList = ' + tableColumnList, logSrc);
            resolvedDataType = "TEXT";
            missingColsAndSQLTypes.push(self.getColDescriptor(col, resolvedDataType, newColName));
          }
        }
        else {
          // create obj w/ dynamic key name, then parse into an object        
          missingColsAndSQLTypes.push(self.getColDescriptor(col, resolvedDataType, null));
        }
      });

      // cbs.dbgLog('exiting...', logSrc);
      return missingColsAndSQLTypes;
    },


    /**
     * Returns a column-descriptor object. Column name, data type, and if appropriate, a new column name.
     * @param  {[type]} keyName    [description]
     * @param  {[type]} dataType   [description]
     * @param  {[type]} newColName [description]
     * @return {[type]}            [description]
     */
    getColDescriptor: function(keyName, dataType, newColName) {
      return JSON.parse('{ "' + keyName + '": { "dataType": "' + dataType + '", "newColName": ' + (_.isString(newColName) && newColName.length > 0 ? ('"' + newColName + '"') : null)  + '} }');
    },


    /**
     * Infers (classifies) the data-type of a column from the set of values in that column.
     * @param  {[type]} allValuesForCol [description]
     * @return {[type]}                 [description]
     */
    inferDataType: function(allValuesForCol) {
      var logSrc = logSrcPrefix + '.inferDataType';

      // *** Type-Reflection - analyze each missing column's data to automatically determine the appropriate datatype for the soon-to-be-added column ***
      var valSpaceContainsOnlyNumbers = _.all(allValuesForCol, _.isNumber);
      var valSpaceContainsOnlyBooleans = _.all(allValuesForCol, _.isBoolean);
      var valSpaceIsEmpty = _.all(allValuesForCol, _.isUndefined);
      var valSpaceContainsOnlyArrays = _.all(allValuesForCol, _.isArray);

      // if any value contains a non-numeric char, then assume it's a string.
      var resolvedDataType = "";

      // handles observed edge-case: array-values array is empty, for all observed values.
      if      (valSpaceIsEmpty && valSpaceContainsOnlyArrays) { resolvedDataType = 'TEXT'; }
      else if (valSpaceContainsOnlyBooleans)                  { resolvedDataType = "BOOL"; }
      else if (valSpaceContainsOnlyNumbers) {
        // what kind of numeric? decimal, int, or bigint?
        var valSpaceContainsDecimal = _.any(allValuesForCol, function(v) { return (v.toString().indexOf('.') > -1); });    // \d*\.\d+
        // src: http://dev.mysql.com/doc/refman/5.0/en/numeric-types.html#integer-types
        var valSpaceContainsBigInt = _.any(allValuesForCol, function(v) { return (v > 2147483647 || v < -2147483648); });
        if(valSpaceContainsDecimal)                           { resolvedDataType = "FLOAT"; }
        else                                                  { resolvedDataType = "BIGINT"; }
      }
      // naively assume the max length of any current or future string in this column will be 4 * the length of the longest string in this DB.
      else { 
        // define a non-SQL type for PrImporter internal use
        resolvedDataType = 
          (_.all(allValuesForCol, _.isObject))
          ? "PRIMPORTER_OBJECT"
          : "TEXT";
      }

      return resolvedDataType;
    },


    /**
     * Appends ALTER TABLE ADD COLUMN statements to the SQL to be executed. Called only if the destination table does not represent the data structure of the pr JSON structure.
     * @param  {[type]} self                    [description]
     * @param  {[type]} data                    [description]
     * @param  {[type]} missingKeysSqlDataTypes [description]
     * @return {[type]}                         [description]
     */
    appendAddColumnStmts: function(data, missingKeysSqlDataTypes) {
      // non-array sample table: append the ALTER TABLE stmts
      data.sqlScript = data.sqlScript.concat(
        _.map(missingKeysSqlDataTypes, function(i) {
          var colName = (i.newColName) ? i.newColName : (_.keys(i))[0];
          var type = i[(_.keys(i))[0]].dataType;
          return data.self.sql.alter.table.addColumn(data.probeType, data.self.keyNormalizationPrToJSAndDb(colName), type);
        })
      );
    },


    /**
     * Takes the column names returned by a column-name query and assigns an array value containing the set of normalized column names.
     * @param {[type]} data         [description]
     * @param {[type]} postResponse [description]
     */
    getTableColumns: function(data, postResponse) {
      var logSrc = logSrcPrefix + '.getTableColumns:' + data.probeType;
      // 2) Determines whether the necessary columns in the table exist; if not, then creates them.
      return _.map(data.self.getValuesFromResponseBody(postResponse.body, 'column_name'), data.self.keyNormalizationJSAndDbToPr);
    },


    /**
     * For some pr JSON "value" value converted to object o, this function gets the values for all the columns into which an object's data will be inserted.
     * @param  {[type]} o             [description]
     * @param  {[type]} columnNameArr [description]
     * @return {[type]}               [description]
     */
    getValsInObjForColumns: function (obj, columnList) {
      var self = this;
      var logSrc = logSrcPrefix + '.getValsInObjForColumns';

      // for this object, get the values for each column
      var colValues = _.map(columnList, function (colName) {
        return self.getValInPrObj(obj, colName);
      });
      return colValues;
    },


    /**
     * Returns the value in a Pr object's key-value pair, given an object and a column name as a dot-path into the object.
     * @param  {[type]} obj     [description]
     * @param  {[type]} colNameAsDotPath [description]
     * @return {[type]}         [description]
     */
    getValInPrObj: function(obj, colNameAsDotPath) {
      var self = this;
      var logSrc = logSrcPrefix + '.getValInPrObj' + (self.exists(obj.PROBE) ? ":" + self.getProbeType(obj.PROBE) : "");
      var propPathSegments = colNameAsDotPath.split('.');

      evalStmt = "obj";
      var evalRslt = null;

      for(var i = 0; i < propPathSegments.length; i++) {
        var seg = propPathSegments[i];
        evalStmt += '["' + self.keyNormalizationJSAndDbToPr(seg) + '"]';
        evalRslt = eval(evalStmt);

        if (!self.exists(evalRslt) && (i+1) < propPathSegments.length) {
          break;
        }
        // 20120831: Evan and Mark: MULTIPLICITY PROBLEM (1 event sample, multiple sub-samples): For now, let's not handle the multiplicity problem that arrays (sub-samples?) pose. We will just store the array as a string/VARCHAR instead.
        if(_.isArray(evalRslt) && !_.isObject(evalRslt)) { 
          cbs.dbgLog('evalRslt = ' + evalRslt, logSrc + ':isArray');
          evalRslt = JSON.stringify(evalRslt);
        }
        // cbs.dbgLog('evalStmt = ' + evalStmt + '; evalRslt = ' + evalRslt, logSrcPrefix + ':getValInPrObj');
      }
      return evalRslt;
    },


    // Src: http://stackoverflow.com/questions/5129624/convert-js-date-time-to-mysql-datetime
    /**
     * You first need to create a formatting function to pad numbers to two digits…
     **/
    twoDigits: function(d) {
        if(0 <= d && d < 10) return "0" + d.toString();
        if(-10 < d && d < 0) return "-0" + (-1*d).toString();
        return d.toString();
    },
    leftPadZeroes: function(number, width) {
      var l = number.toString().length;
      for(var i = l; i < width; i++) {
        number = "0" + number;
      }
      return number;
    },
    /**
     * …and then create the method to output the date string as desired.
     * Some people hate using prototypes this way, but if you are going
     * to apply this to more than one Date object, having it as a prototype
     * makes sense.
     **/
    appendToDatePrototype: function() {
      var self = this;
      Date.prototype.toSQLFormat = function() {
          return this.getUTCFullYear() + "-" + self.twoDigits(1 + this.getUTCMonth()) + "-" + self.twoDigits(this.getUTCDate()) + " " + self.twoDigits(this.getUTCHours()) + ":" + self.twoDigits(this.getUTCMinutes()) + ":" + self.twoDigits(this.getUTCSeconds()) + "." + self.leftPadZeroes(this.getUTCMilliseconds());
      };
    },

    
    /**
     * Formats column names and their table aliases.
     * @param  {[type]} c        [description]
     * @param  {[type]} tblAlias [description]
     * @return {[type]}          [description]
     */
    colNameFormatterPostgres: function(c, tblAlias) { 
      return (_.isString(tblAlias) && tblAlias.length > 0)
        ? '"' + tblAlias + '"."' + c + '"'
        : '"' + c + '"'; 
    },

    
    /**
     * Generic JSON validation.
     * @param  {[type]} json [description]
     * @return {[type]}      [description]
     */
    validateJSONStr: function(json) {
      try {
        JSON.parse(json);
        return "";
      }
      catch(e) {
        return "Invalid JSON. error = " + e;
      }
    },

    /**
     * A set of Pr importer request message keys, and their validators.
     * @type {Object}
     */
    expectedPrImporterRequestMessageKeysAndValidators: function() {
      var self = this;
      return {
        "UserHash": function(prMsg) { 
          var cond = '(_.isString(prMsg.UserHash) && prMsg.UserHash.length > 0)';
          return {
            "isValid": function(prMsg) { return eval(cond); },
            "msg": "Invalid UserHash. Cond (" + cond + ") not true. UserHash = \"" + prMsg.UserHash + "\""
            };
        },
        "Operation": function (prMsg) {
          var cond = '_.contains(["SubmitProbes"], prMsg.Operation)';
          return {
            "isValid": function(prMsg) { return eval(cond); },
            "msg": "Invalid Operation. Cond (" + cond + ") not true. UserHash = \"" + prMsg.UserHash + "\""
            };
        },
        "Payload": function(prMsg) { 
          var cond = '(_.isString(prMsg.Payload) && prMsg.Payload.length > 0 && prMsg.Payload != "[]" && self.validateJSONStr(prMsg.Payload).length == 0)';
          var isJsonValidRslt = self.validateJSONStr(prMsg);
          return {
            "isValid": function(prMsg) { return eval(cond); },
            "msg": "Invalid Payload. Cond (" + cond + ") not true. Is it because self.validateJSONStr(prMsg.Payload) returns (" + isJsonValidRslt + ")? UserHash = \"" + prMsg.UserHash + "\""
            };
        },
        "Checksum": function(prMsg) {
          var cond = '(_.isString(prMsg.Checksum) && prMsg.Checksum.length > 0 && prMsg.Checksum == self.getMD5Hash(prMsg.UserHash + prMsg.Operation + prMsg.Payload))';
          var hash = self.getMD5Hash(prMsg.UserHash + prMsg.Operation + prMsg.Payload);
          return {
            "isValid": function(prMsg) { return eval(cond); },  // cbs.dbgLog('\nprMsg.UserHash = ' + prMsg.UserHash + '\n\nprMsg.Operation = ' + prMsg.Operation + '\n\nprMsg.Payload = ' + prMsg.Payload); 
            "msg": "Invalid Checksum. Cond (" + cond + ") not true. Given checksum \"" + prMsg.Checksum + "\" != calculated checksum \"" + hash + "\". UserHash = \"" + prMsg.UserHash + "\"; prMsg.length = " + (JSON.stringify(prMsg)).length + 
                    "; prMsg.ContentLength = " + ((prMsg.ContentLength != null && prMsg.ContentLength != undefined) ? prMsg.ContentLength : "unavailable") + " vs. (prMsg.UserHash + prMsg.Operation + prMsg.Payload).length = " + (prMsg.UserHash + prMsg.Operation + prMsg.Payload).length
            };
        }
      };
    },

    /**
     * Validates the set of incoming prImporter messages.
     * @param  {[type]} msg A PurpleRobot-formatted Pr sampling message.
     * @return {[type]}                       [description]
     */
    validatePrImporterRequestMessage: function(msg) {
      var errors = [];
      var u = new Util();
      var self = this;

      // basic structure tests
      if (!u.exists(msg)) { errors.push("Message does not exist."); }
      if (!_.isObject(msg)) { errors.push("Message is not an object."); }
      // if (!_.isArray(msg)) { errors.push("Message is not an array."); }
      else {
        // validate the message is JSON
        if(!self.validateJSONStr(msg).length > 0) { errors.push ("Message is not a JSON object.")}
        // it's valid JSON, so we can work w/ it programmatically..
        else {        
          // check the set of expected keys.
          var keysNotFound = _.reject(_.keys(self.expectedPrImporterRequestMessageKeysAndValidators()), function(k) { 
            return _.contains(_.keys(msg), k);
          });
          _.map(keysNotFound, function(k) { errors.push("Message must contain a key \"" + k + "\"."); });

          // validate the structure of the set of expected values.
          _.map(_.difference(_.keys(self.expectedPrImporterRequestMessageKeysAndValidators()), keysNotFound), function (k) {
            // validate a value exists
            if (!u.exists(msg[k])) { errors.push("Message must have a value for the \"" + k + "\" key.")}

            // apply the key-specific validator
            var keyValidation = self.expectedPrImporterRequestMessageKeysAndValidators()[k](msg);
            var errPrefix = (!_.isNull(msg.UserHash) && !_.isUndefined(msg.UserHash)) ? msg.UserHash + ": " : "";
            if (!keyValidation.isValid(msg)) { errors.push(errPrefix + "Message: The value (" + msg[k] + ") for key \"" + k + "\" is invalid. Reason = " + keyValidation.msg); }
          });
        }
      }

      return errors;
    },

    /**
     * Returns an MD5 hash value.
     * @param  {[type]} value [description]
     * @return {[type]}       [description]
     */
    getMD5Hash: function(value) {
      return crypto.createHash('md5').update(value, 'utf8').digest('hex');
    },

    /**
     * Sends a response to the caller.
     * @param  {[type]} res     [description]
     * @param  {[type]} payload [description]
     * @param  {[type]} status  [description]
     * @return {[type]}         [description]
     */
    sendAndEndResponse: function(res, payload, status, callerName) {
      var response = {
        "Payload": payload,
        "Status": status,
        "Checksum": this.getMD5Hash(status + payload)
      };
      res.send(response);
      res.end();
      if(status == "error") { cbs.errLog("From caller \"" + callerName + "\":" + JSON.stringify(response), logSrcPrefix + ".sendAndEndResponse"); }
    },

    /**
     * Handles errors in processing.
     * @param  {[type]} req          [description]
     * @param  {[type]} res          [description]
     * @param  {[type]} postResponse [description]
     * @param  {[type]} data         [description]
     * @param  {[type]} callerMsg    [description]
     * @return {[type]}              [description]
     */
    errorHandler: function(req, res, postResponse, data, callerMsg) {
      var logSrc = logSrcPrefix + '.errorHandler';
      var msg = "Error in: " + postResponse.body;
      cbs.errLog(msg, logSrc);
      data.self.sendAndEndResponse(data.origRes, Date() + ': ' + (callerMsg ? callerMsg : "(no callerMsg defined)") + ': ' + msg, 'error', logSrc);
    },


    /**
     * Parses a Dingo error string into an array.
     * @param  {[type]} dingoResponseBody [description]
     * @return {[type]}                   [description]
     */
    parseDingoErrorsToArray: function(data, dingoResponseBody) {
      var logSrc = logSrcPrefix + ".parseDingoErrorsToArray:" + data.prMsg.UserHash;

      var delim = "TriremeDingoError";
      var dingoErrors = [];
      // if Dingo responded with an error...
      if(dingoResponseBody.indexOf("ERROR") > -1) {
        cbs.dbgLog('dingoResponseBody = ' + dingoResponseBody, logSrc);
        dingoErrors = dingoResponseBody.split(delim);
      }
      // it's unclear why the .split() above causes the dingoErrors array to contain a 0th element of '[\"' -- but it does.
      // TODO: find a less-hacky fix for this. Probably easy, but I'm not seeing it.
      dingoErrors = _.filter(_.map(dingoErrors, function(e) { return delim + e; }), function(e) { return e.indexOf(delim + '[\"'); });
 
      // if(_.isNull(dingoErrors) || _.isUndefined(dingoErrors) || !_.isArray(dingoErrors)) { cbs.dbgLog('dingoErrors is null, undefined, or not an array; WHY?', logSrc); dingoErrors = []; }
      // cbs.dbgLog('dingoErrors.length = ' + dingoErrors.length + '; dingoErrors = ' + JSON.stringify(dingoErrors), logSrc);
      return dingoErrors;
    },


    /**
     * A set of rules for ignoring errors in the set returned by Dingo.
     * @return {[type]} [description]
     */
    ignoreErrors: function(data, dingoErrors) {
      var logSrc = logSrcPrefix + ".ignoreErrors:" + data.prMsg.UserHash;

      // cbs.dbgLog('dingoErrors.length = ' + dingoErrors.length + '; dingoErrors = ' + JSON.stringify(dingoErrors), logSrc);
      // ignore duplicate-key error
      var errs = _.reject(dingoErrors, function(errStr) {
        return errStr.indexOf('duplicate key value violates unique constraint') != -1;
      });

      // if(_.isNull(dingoErrors) || _.isUndefined(dingoErrors) || !_.isArray(dingoErrors)) { cbs.dbgLog('dingoErrors is null, undefined, or not an array; WHY?', logSrc); dingoErrors = []; }
      // cbs.dbgLog('post: errs.length = ' + errs.length + '; errs = ' + JSON.stringify(errs), logSrc);
      // _.each(errs, function(e) { cbs.dbgLog('e = ' + e, logSrc + "_.each(errs)"); });
      return errs;
    },


    /**
     * Rewrites long Dingo errors.
     * @param  {[type]} dingoResponseBody [description]
     * @return {[type]}                   [description]
     */
    // rewriteLongDingoErrors: function(dingoResponseBody, inDebugMode) {
    rewriteLongDingoErrors: function(data, dingoErrors, inDebugMode) {
      var logSrc = logSrcPrefix + ".rewriteLongDingoErrors:" + data.prMsg.UserHash;
      var delim = "TriremeDingoError";

      // if Dingo responded with an error...
      // if(dingoResponseBody.indexOf("ERROR") > -1) {
      if(dingoErrors.length > 0) {

        dingoErrors = _.map(dingoErrors, function(e) { 

          // debug mode: all info, except the excessively-long stuff
          if(inDebugMode) {
            // if a SourceValue-insertion error is longer than 4k bytes, then replace the error with a suggestion to check the log MM file.
            if(e.indexOf('SourceValue') != -1) {
              if(e.length > 4096) {
                e = "Long SourceValue error; check the Metamorphoo log file.";
              }
            }
          }
          // non-debug mode: no SQL in Dingo errors
          else {
            e = e.replace(/^(.*?for stmt = )(INSERT|SELECT|CREATE|ALTER|DROP|UPDATE|DELETE).*$/, "$1 (REDACTED)");
          }
          return e;
        });
      }

      cbs.dbgLog('dingoErrors.length = ' + dingoErrors.length + '; dingoErrors = ' + dingoErrors, logSrc);
      return dingoErrors;
    },


    /**
     * Sends an HTTP(S) request to Dingo. i.e., performs a database query.
     * @param  {[type]}   req         An HTTP request object instantiated by express.js.
     * @param  {[type]}   res         An HTTP response object instantiated by express.js.
     * @param  {[type]}   dbCmdArray An array of SQL statements to be executed.
     * @param  {[type]}   data        Data blob 
     * @param  {Function} callback    Callback function executed when the Dingo request completes.
     * @return {[type]}               Callback function for the callback function to execute when it completes (in case the callback function is itself also asynchronous, e.g. if you must make a subsequent Dingo request).
     */
    dingoRequest: function(req, res, dbCmdArray, data, callback, callbackForCallback) {
      var logSrc = logSrcPrefix + ".dingoRequest:" + data.prMsg.UserHash + (data.probeType != null ? (":" + data.probeType) : "");
      cbs.dbgLog('entered; dbCmdArray = ' + dbCmdArray + '; _.keys(data) = ' + _.keys(data), logSrc);

      // get the basic POST object from the loaded config-file value
      var postObj = cfg.dingoPostObj;
      // set the database name
      postObj.dbName = data.dbName;
      // set the array of SQL commands to execute
      postObj.sqlCmd = dbCmdArray;
      cbs.cmdLog('dbName = ' + postObj.dbName + '; sqlCmd = ' + postObj.sqlCmd, logSrc);
      // format the POST data
      var postData = querystring.stringify(postObj);
      // get the basic HTTP request parameters to connect to Dingo from the loaded config-file value
      var reqParams = cfg.dingoRequestParams;
      // set the content length header based on the POST data
      reqParams.headers['Content-Length'] = postData.length;

      // Send an HTTP POST request to Dingo.
      wrm.sendRequest(req, res, null, reqParams, postData, 
        // callback for response-end (all data received)
        function(req, res, postResponse) {
          cbs.dbgLog('postResponse.body = ' + postResponse.body, logSrc);
          // call the callback now that we have a complete response from Dingo
          callback(req, res, postResponse, data, callbackForCallback);
        },
        null, null, null, cfg.network.webRequestTTL);
      cbs.dbgLog('exiting...', logSrc);
    },

    /**
     * Dingo has returned an error if the body contains the string shown below.
     * @param  {[type]} responseBody [description]
     * @return {[type]}              [description]
     */
    dingoResponseHasError: function(responseBody) {
      return (responseBody.indexOf('TriremeDingoError') != -1);
    },


    getDataObj: function(valueArray) {
      return {
        "origReq": valueArray[0],
        "origRes": valueArray[1],
        "self": valueArray[2],
        "dbName": valueArray[3],
        "prMsg": valueArray[4],
        "payloadObj": valueArray[5],
        "samplesByProbeType": valueArray[6],
        "dingoCallbacks": valueArray[7],
        "sqlScript": []
      }
    },


    /**
     * Array of callbacks for processing as we progress through the pipeline.
     * Doing it this way enables unit-testability via loose-coupling: i.e., callback fns aren't defined in the calling
     * method; only an array reference to a callback is.
     * This enables arbitrarily-named callbacks to be specified as the follow-up functions for each async process that needs them.
     * @return {[type]} [description]
     */
    getDingoCallbacks: function() { return [
        this.databaseListCallback, 
        this.databaseCreatedCallback,
        this.nonSampleTablesExistsCallback,

        this.perProbeTypeTableAsync, 
        this.tableListCallback, 
        this.tableExistsCallback,
        
        this.columnsListCallback,
        this.sampleInsertionSqlSubmissionCallback,
        this.sendProbeDataToDingoCallback,

        this.arrayTableColumnsListCallback
      ];
    },


    /**
     * ENTRY POINT TO THE IMPORT PROCESS. Imports a set of sensor samples from Pr.
     * @param  {[type]} prMsg [description]
     * @return {[type]}                       [description]
     */
    importSensorData: function(req, res, prMsg) {
      var logSrc = logSrcPrefix + '.importSensorData';
      cbs.dbgLog('entered; prMsg = ' + JSON.stringify(prMsg), logSrc);

      var self = this;

      // v2: due to the new tbl structure, we must group by probe type.
      var payloadObj = JSON.parse(prMsg.Payload);
      var samplesByProbeType = self.groupByProbeType(payloadObj);

      // create a DTO to carry our dataset, callback set, etc. throughout the processing path.
      var data = this.getDataObj([
        req, 
        res, 
        self, 
        cfg.dingoPostObj.dbName, 
        prMsg, 
        payloadObj, 
        samplesByProbeType,
        self.getDingoCallbacks()
      ]);
      
      // create vars for performance analysis
      data.performance = {};
      data.performance.messageProcStartTime = new Date();

      // Get a list of databases.
      self.dingoRequest(req, res, self.sql.list.allDatabases(), data, data.dingoCallbacks[0], null);
    },



    /**** BEGIN: Import Sensor Data Handlers *****/

    /**
     * Handles the database list callback.
     * @param  {[type]} req          [description]
     * @param  {[type]} res          [description]
     * @param  {[type]} postResponse [description]
     * @param  {[type]} data         [description]
     * @return {[type]}              [description]
     */
    databaseListCallback: function(req, res, postResponse, data) {
      var logSrc = logSrcPrefix + '.databaseListCallback:' + data.prMsg.UserHash;
      console.log('entered', logSrc);

      // parse the body, then map each of its values to a function that parses the value,
      // and finally for each element in that set,
      // pluck the value for the key 'datname', to get the set of DB names.
      console.log('postResponse.body = ' + postResponse.body, 'databaseListCallback');
      var dbNames = data.self.getValuesFromResponseBody(postResponse.body, 'datname');
      
      // verify the user's DB exists; if not, then create it.
      console.log('dbNames = ' + dbNames, 'databaseListCallback');
      console.log('JSON.stringify(dbNames) = ' + JSON.stringify(dbNames), 'databaseListCallback');

      if(!_.any(dbNames, function(dbName) { return dbName == data.prMsg.UserHash; })) {
        cbs.dbgLog('data.prMsg.UserHash = ' + data.prMsg.UserHash + ' not found in dbNames = ' + dbNames, logSrc);
        // Create the database, then proceed as usual.
        data.self.dingoRequest(req, res, data.self.sql.create.database(data.prMsg.UserHash, cfg.database.owner), data, data.dingoCallbacks[1]);
      }
      else {
        cbs.dbgLog('data.prMsg.UserHash = ' + data.prMsg.UserHash + ' already exists in dbNames = ' + dbNames + '; not creating new DB...', logSrc);
        data.dingoCallbacks[3](req, res, postResponse, data);
      }
    },


    /**
     * Handles the callback when a new database is created.
     * @param  {[type]} req          [description]
     * @param  {[type]} res          [description]
     * @param  {[type]} postResponse [description]
     * @param  {[type]} data         [description]
     * @return {[type]}              [description]
     */
    databaseCreatedCallback: function(req, res, postResponse, data) {
      var logSrc = logSrcPrefix + '.databaseCreatedCallback:' + data.prMsg.UserHash;

      if(data.self.dingoResponseHasError(JSON.stringify(postResponse.body))) { 
        data.self.errorHandler(req, res, postResponse, data, "databaseCreatedCallback error occurred");
        return;
      }

      data.dbName = data.prMsg.UserHash;
      data.self.dingoRequest(req, res, [ data.self.sql.create.table.sourceValueTable(data.self) ], data, data.dingoCallbacks[2]);
    },


    /**
     * Handles the callback when the non-sample tables (e.g. SourceValue) are created for the newly-created databsae.
     * @param  {[type]} req          [description]
     * @param  {[type]} res          [description]
     * @param  {[type]} postResponse [description]
     * @param  {[type]} data         [description]
     * @return {[type]}              [description]
     */
    nonSampleTablesExistsCallback: function(req, res, postResponse, data) {
      var logSrc = logSrcPrefix + '.nonSampleTablesExistsCallback:' + data.prMsg.UserHash;

      if(data.self.dingoResponseHasError(JSON.stringify(postResponse.body))) { 
        data.self.errorHandler(req, res, postResponse, data, "nonSampleTablesExistsCallback error occurred");
        return;
      }
      
      // if no error, then continue processing.
      data.dingoCallbacks[3](req, res, postResponse, data);
    },


    /**
     * Handles the table-structure comparison callback.
     * Instantiates n-many asynchronous control-flows, where n = the number of probe types.
     * @param  {[type]} req          [description]
     * @param  {[type]} res          [description]
     * @param  {[type]} postResponse [description]
     * @param  {[type]} data         [description]
     * @return {[type]}              [description]
     */
    perProbeTypeTableAsync: function(req, res, postResponse, data) {
      cbs.dbgLog('entered', logSrcPrefix + '.perProbeTypeTableAsync:' + data.prMsg.UserHash);

      // For each probe type, call Dingo -- asynchronously! :)
      // Src: https://github.com/caolan/async#parallel
      async.parallel(
        // Generate an array of functions to run, per-probe type (per-table).
        _.reduce(
          // For each key in the groupings of samples by probe-type (i.e., for each probe-type)...
          _.map(_.keys(data.samplesByProbeType),
            // For some probe type...
            function(probeType) {
              // get the samples for this probe type...
              var probeTypeSamples = data.samplesByProbeType[probeType];
              var uniqueKeyAndColNames = [];

              // for each sample...
              _.each(data.samplesByProbeType[probeType], function(sample) {
                // Extract the unique set of keys from the PurpleRobot message payload, at all object levels.
                uniqueKeyAndColNames = uniqueKeyAndColNames.concat(_.difference(data.self.allKeysInObjHavingNonObjValue("", sample, 0), uniqueKeyAndColNames));
              });

              // Return an array containing 1 element: a function which is run by the async library... (https://github.com/caolan/async#parallel)
              return [
                function(callback) {
                  var logSrc = logSrcPrefix + '.perProbeTypeTableAsync:parallel:' + data.prMsg.UserHash + ":" + probeType;
                  cbs.dbgLog('entered...', logSrc);

                  // setup data to pass
                  var perProbeTypeDataObj = data.self.getDataObj([
                      req, 
                      res, 
                      data.self, 
                      data.prMsg.UserHash, 
                      data.prMsg, 
                      data.payloadObj, 
                      data.samplesByProbeType,
                      data.self.getDingoCallbacks()
                    ]
                    );
                  perProbeTypeDataObj.probeType = probeType;
                  perProbeTypeDataObj.probeTypeSamples = probeTypeSamples;
                  perProbeTypeDataObj.uniqueKeyAndColNames = uniqueKeyAndColNames;
                  perProbeTypeDataObj.insertedTime = new Date();

                  // setup performance data
                  perProbeTypeDataObj.performance = {};
                  perProbeTypeDataObj.performance.messageProcStartTime = data.performance.messageProcStartTime;
                  perProbeTypeDataObj.performance.probeProcStartTime = new Date();

                  // perform per-probetype/table processing.
                  // cbs.dbgLog('calling processProbeType; data.probeType = ' + data.probeType, logSrcPrefix + '.perProbeTypeTableAsync:make fn');
                  data.self.processProbeType(req, res, postResponse, perProbeTypeDataObj, callback);
                  cbs.dbgLog('exiting...', logSrc);
                }
              ];
            }),
          function(memo, i) {
            return memo.concat(i);
          })

        // callback when ALL parallel fns complete.
        , data.self.perProbeTypeTableAsyncCallback
      );

      cbs.dbgLog('exiting...', logSrcPrefix);
    },


    /**
     * Callback when ALL parallel fns complete.
     * @param  {[type]} err   [description]
     * @param  {[type]} rslts [description]
     * @return {[type]}       [description]
     */
    perProbeTypeTableAsyncCallback: function(err, rslts) {
      var probeTypes = _.map(rslts, function(r) { return r.data.probeType; });
      // cbs.dbgLog('probeTypes = ' + probeTypes, logSrc);

      var logSrc = logSrcPrefix + '.perProbeTypeTableAsyncCallback:async.parallel:callback:' + rslts[0].data.prMsg.UserHash;
      var data = rslts[0].data;
      var self = rslts[0].data.self;

      if(err) { cbs.errLog("Error = " + err, logSrc); }

      var filteredResponseBody = _.map(rslts, function(r) {
        var errors = 
          self.rewriteLongDingoErrors(
            data,
            self.ignoreErrors(
              data,
              self.parseDingoErrorsToArray(
                data, 
                r.sampleInsertionResponseBody
              )
            )
            , self.exists(rslts[0].data.origReq.query.debug)
          );
        cbs.dbgLog('errors = ' + errors, logSrc);
        
        return r.data.probeType + ": " + (errors.length > 0
          ? "Errors(" + errors.length + ") = " + errors
          : "No error.") + '\n';
      });
      var lastMsg = err
        ? '\nerror = ' + err + '\nresults = \n' + filteredResponseBody
        : '\nresults = \n' + filteredResponseBody;
      data.self.sendAndEndResponse(data.origRes, Date() + ': Message-processing completed!' + lastMsg, 'success', logSrc + ":success");
    },


    /**
     * Processes a probe-type. From this point, the following stack of steps are performed:
     * 1) Determine whether the necessary table exists; if not, then creates that table.
     * 2) Determine whether the necessary columns in the table exist; if not, then creates them.
     * 3) Insert the probe-table's values.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    processProbeType: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.processProbeType:' + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered...; data.probeTypeSamples = ' + data.probeTypeSamples + '; data.uniqueKeyAndColNames = ' + data.uniqueKeyAndColNames, logSrc);

      // if we need to create a probe table in the callback of the next fn, then this is the fn to do-so.
      data.createProbeTableFn = data.self.sql.create.table.newProbeTable;
      
      // get a list of tables in this user's DB
      data.self.dingoRequest(req, res, [data.self.sql.exists.table(data.probeType)], data, data.dingoCallbacks[4], perProbeTypeTableAsyncCb);
      cbs.dbgLog('exiting...', logSrc);
    },


    /**
     * Handles the callback from looking-up the list of tables this user's database.
     * @param  {[type]} res          [description]
     * @param  {[type]} req          [description]
     * @param  {[type]} postResponse [description]
     * @param  {[type]} data         [description]
     * @return {[type]}              [description]
     */
    tableListCallback: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.tableListCallback:' + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered with data.probeType = ' + data.probeType + '; postResponse.body = ' + postResponse.body, logSrc);

      var cb = data.dingoCallbacks[5];

      // 1) Determine whether the necessary table exists; if not, then creates that table.
      var tableList = data.self.getValuesFromResponseBody(postResponse.body, 'table_name');
      cbs.dbgLog('tableList = ' + tableList, logSrc);

      // if the probe-type table doesn't exist, then create it...
      if(!_.any(tableList, function(tblName) { return tblName == data.probeType; })) {
        cbs.cmdLog('data.probeType = ' + data.probeType + ' not a table name in tableList = ' + tableList, logSrc);
        // Create the table, then proceed as usual.
        var newTableCreationScript = [
          data.createProbeTableFn(data.self, data.probeType),
          data.self.sql.create.table.alterOwner(data.probeType, cfg.database.owner),
          data.self.sql.create.table.createIndex(data.probeType, 'timestamp'),
          data.self.sql.create.table.createIndex(data.probeType, 'eventDateTime')
        ];
        // for the array-values table ONLY: add a FK to the probe sample table. This condition arises in the arrayValuesHandler fn.
        if(data.isArrayValuesTable) {
          // set params (Local Table & Col, Foreign Table & Col)
          var 
            lt = data.probeType,
            lc = "sampleId",
            ft = data.probeType.replace(/^(.*)\..*$/, '$1'),
            fc = "id";
          // cbs.dbgLog('lt = ' + lt + '; lc = ' + lc + '; ft = ' + ft + '; fc = ' + fc, logSrc);
          newTableCreationScript.push(data.self.sql.create.table.addForeignKey(lt, lc, ft, fc));
        }
        data.self.dingoRequest(req, res, newTableCreationScript, data, cb, perProbeTypeTableAsyncCb);
      }
      else {
        cbs.dbgLog('data.probeType = ' + data.probeType + ' already exists as a table name in tableList = ' + tableList + '; not creating new table...', logSrcPrefix + '.tableListCallback');
        cb(req, res, postResponse, data, perProbeTypeTableAsyncCb);
      }
      cbs.dbgLog('exiting...', logSrc);
    },


    /**
     * Handles the callback for when we know the probe-type table exists.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    tableExistsCallback: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.tableExistsCallback:' +  + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered...', logSrc);
      
      // get the columns in the table
      data.self.dingoRequest(req, res, [data.self.sql.list.allColumnsInTable(data.probeType)], data, data.dingoCallbacks[6], perProbeTypeTableAsyncCb);
    },


    /**
     * Handles the callback for when we know the columns of the table exist.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    columnsListCallback: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.columnsListCallback:' + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered with postResponse.body = ' + postResponse.body, logSrc);

      // 2) Determines whether the necessary columns in the table exist; if not, then creates them.
      data.columnList = data.self.getTableColumns(data, postResponse);
      data.uniqueKeys = data.self.getUniqueKeysFromSamples(data.self, data.probeTypeSamples, data.probeType);

      data.missingNonArrayKeysSqlDataTypes = data.self.getMissingColNamesWithSQLDataTypes(data.self, data.probeType, data.probeTypeSamples, data.uniqueKeys.nonArrayKeys, data.columnList);
      cbs.dbgLog('missingNonArrayKeysSqlDataTypes = ' + JSON.stringify(data.missingNonArrayKeysSqlDataTypes), logSrc);

      data.missingArrayKeysSqlDataTypes = data.self.getMissingColNamesWithSQLDataTypes(data.self, data.probeType, data.probeTypeSamples, data.uniqueKeys.arrayKeys, data.columnList);
      cbs.dbgLog('missingArrayKeysSqlDataTypes = ' + JSON.stringify(data.missingArrayKeysSqlDataTypes), logSrc);


      // if columns are needed in the non-array sample table, then ALTER the non-array table to make it so.
      if(data.missingNonArrayKeysSqlDataTypes.length > 0) {
        // non-array sample table: append the ALTER TABLE stmts
        data.self.appendAddColumnStmts(data, data.missingNonArrayKeysSqlDataTypes);
      }

      // append the non-array-table SQL to the SQL script
      data.sqlScript = data.sqlScript.concat(
        data.self.sql.insert.appendInsertsFromObjs(data.self, "nonArrayKeys", data.probeTypeSamples, data.insertedTime, data.probeType)
      );

      // if there are array-values to store...
      if(data.uniqueKeys.arrayKeys.length > 0) {
        data.self.arrayValuesHandler(req, res, postResponse, data, perProbeTypeTableAsyncCb);
      }
      else {
        // 3) Inserts the probe-table's values.
        data.dingoCallbacks[8](req, res, postResponse, data, perProbeTypeTableAsyncCb);
      }
    },


    /**
     * Handles the case in which a sample has array values at the root level to handle.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    arrayValuesHandler: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.arrayValuesHandler:'  + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered...', logSrc);

      // change the table-creation function, in case it's needed
      data.createProbeTableFn = data.self.sql.create.table.newProbeArrayValuesTable;
      // change the callback for column-creation
      data.dingoCallbacks[6] = data.dingoCallbacks[9];
      data.isArrayValuesTable = true;   // TODO: I wanted to use one of the assignments above to test, in tableListCallback, whether that fn is operating on an array-values table, but it didn't like comparing functions. Still, can we eliminate this inelegant line of hackery?

      // Infer whether the table to check, create, alter, and fill represents an array of objects, or an array of data-primitives,
      // and from this, determine the array-values table name. Convention:
      //   object     ==> BaseProbeTypeTableName.{ArrayKeyName}. EX: BluetoothProbe.DEVICES
      //   primitive  ==> BaseProbeTypeTableName.ArrayValues. EX: LightSensorProbe.ArrayValues

      // if for any of the sample set's array-type keys...
      var keysToArrayOfObjs = _.filter(data.uniqueKeys.arrayKeys, function(k) {
          // ...if any of the samples...
          var isObj = _.any(data.probeTypeSamples, function(s) { 
            // _.each(data.self.getValInPrObj(s, k), function(arrayElement) {
              // cbs.dbgLog('for k = ' + k + ', arrayElement = ' + JSON.stringify(arrayElement), logSrc);
            // });
            
            // ...contains an array in which any element is an object, then,
            // return the fact that that array is an array of objects.
            return _.any(data.self.getValInPrObj(s, k), function(arrayElement) { return _.isObject(arrayElement); });
          });
          return isObj;
        });

      // set the arrayvalues table name!
      data.probeType += (keysToArrayOfObjs.length == 0)
        ? ".ArrayValues"              // table type represents a primitive (non-object)
        : "." + keysToArrayOfObjs;    // table type represents an object

      cbs.dbgLog('data.probeType = ' + data.probeType, logSrc);

      // ...and if the table does not exist...
        // ...then create it, including with the missingArrayKeys columns (since that knowledge exists at this point).
      data.self.dingoRequest(req, res, [data.self.sql.exists.table(data.probeType)], data, data.dingoCallbacks[4], perProbeTypeTableAsyncCb);
    },


    /**
     * Callback for when an array-values table is created, columns of that table have been fetched, and now the columns available must be compared to the columns required by the subsamples, so that:
     * 1) the cols can be created
     * 2) subsample data can be inserted.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    arrayTableColumnsListCallback: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.arrayTableColumnsListCallback:' + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered with postResponse.body = ' + postResponse.body, logSrc);

      // determine missing columns, if any, and their SQL data types
      data.columnList = data.self.getTableColumns(data, postResponse);
      data.missingArrayKeysSqlDataTypes = data.self.getMissingColNamesWithSQLDataTypes(
        data.self, data.probeType, data.probeTypeSamples, data.uniqueKeys.arrayKeys, data.columnList
        );
      cbs.dbgLog('missingArrayKeysSqlDataTypes = ' + JSON.stringify(data.missingArrayKeysSqlDataTypes), logSrc);

      // if columns are needed in the non-array sample table, then ALTER the non-array table to make it so.
      if(data.missingArrayKeysSqlDataTypes.length > 0) {
        // non-array sample table: append the ALTER TABLE stmts
        data.self.appendAddColumnStmts(data, data.missingArrayKeysSqlDataTypes);
      }

      // 3) Inserts the probe-table's values.
      var tblName = data.probeType;
      _.each(data.probeTypeSamples, function(s) {
        // get params to INSERT statement
        var insertableCols = data.self.excludeKeys((data.self.allKeysInObjHavingNonObjValue("", s, 0))['arrayKeys']);
        cbs.dbgLog('insertableCols = ' + JSON.stringify(insertableCols) + '; s = ' + JSON.stringify(s), logSrc);

        // generate INSERT statement
        // for each idx in the the array...
        var key = data.uniqueKeys.arrayKeys[0];
        var arrForIteration = data.self.getValInPrObj(s, key);
        var arrayColValues = data.self.getValsInObjForColumns(s, insertableCols);
        cbs.dbgLog('arrayColValues = ' + JSON.stringify(arrayColValues), logSrc);
        cbs.dbgLog('key = ' + key, logSrc);

        // loop-over one of the arrays in the sample, and for each element in the array,
        // generate an INSERT statement
        for (var i = 0 ; i < arrForIteration.length; i++) {
          var stmt = data.self.sql.insert.generateSqlInsert(
            data.self,
            data.probeType,
            _.without(_.keys(data.self.sql.consts.colNames.subSampleTblBase), 'id'),
            insertableCols,
            data.self.sql.insert.getSubSampleStaticColValues(s, i, data.insertedTime),
            _.map(arrayColValues, function(dim) { 
              var isObj = _.isObject(dim[i]),
                isUndef = _.isUndefined(dim[i])
                ;
              var v = isObj
                ? JSON.stringify(dim[i]) 
                : isUndef
                  ? ''
                  : dim[i];
              // cbs.dbgLog('isObj = ' + isObj + '; v = ' + v, logSrc);
              return v;
            })
            );
          data.sqlScript.push(stmt);
        }
      });
      
      // 3) Inserts the probe-table's values.
      data.dingoCallbacks[8](req, res, postResponse, data, perProbeTypeTableAsyncCb);
    },


    /**
     * Sends the probe-table creation and alteration SQL script to Dingo.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    sendProbeDataToDingoCallback: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.columnsListCallback:' + data.prMsg.UserHash + ":" + data.probeType;
      cbs.dbgLog('entered with postResponse.body = ' + postResponse.body, logSrc);

      data.self.dingoRequest(req, res, data.sqlScript, data, data.dingoCallbacks[7], perProbeTypeTableAsyncCb);
    },


    /**
     * Handles Dingo's response to the insertion of samples.
     * @param  {[type]} req                      [description]
     * @param  {[type]} res                      [description]
     * @param  {[type]} postResponse             [description]
     * @param  {[type]} data                     [description]
     * @param  {[type]} perProbeTypeTableAsyncCb [description]
     * @return {[type]}                          [description]
     */
    sampleInsertionSqlSubmissionCallback: function(req, res, postResponse, data, perProbeTypeTableAsyncCb) {
      var logSrc = logSrcPrefix + '.sampleInsertionSqlSubmissionCallback:' + data.prMsg.UserHash + ":" + data.probeType;
      // cbs.dbgLog('entered with postResponse.body = ' + postResponse.body, logSrc);

      // execution performance logging
      var endTime = new Date();
      cbs.msgLog(
        'EXECUTION TIME (excl client response):' +
        ' total time (end - messageProcStartTime) = ' + (endTime - data.performance.messageProcStartTime) + 'ms;' +
        ' endTime = ' + endTime + ';' +
        ' probeProcStartTime = ' + data.performance.probeProcStartTime + ';' +
        ' messageProcStartTime = ' + data.performance.messageProcStartTime,
        logSrc);

      // done processing, so return w/o error (1st param) to the async caller. (https://github.com/caolan/async#parallel)
      perProbeTypeTableAsyncCb(null, {
        data: data,
        sampleInsertionResponseBody: postResponse.body
      });
      cbs.dbgLog('exiting...', logSrc);
    },



    /**** END: Import Sensor Data Handlers *****/

  };

  return ctor;
}());


module.exports = edu.northwestern.cbits.metamorphoo.PrImporter;