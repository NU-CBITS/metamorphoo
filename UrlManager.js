// UrlManager.js
//
// Created by: Evan Story (evan.story@northwestern.edu)
// Created on: 20120619


// consts & globals
if (!edu) var edu = {};
if (!edu.northwestern) edu.northwestern = {};
if (!edu.northwestern.cbits) edu.northwestern.cbits = {};
if (!edu.northwestern.cbits.metamorphoo) edu.northwestern.cbits.metamorphoo = {};


/**
 * @description: 
 * @param:
 */
edu.northwestern.cbits.metamorphoo.UrlManager = function() {

  var privateVar = "";                                  // "private" variable


  // ***** Ctor *****
    /**
   * @description: 
   * @param:
   */
   var ctor = function UrlManagerCtor() {

   }


  // ***** Implementation fns *****

  // *** Private fns ***
  /**
   * @description: 
   * @param:
   */
  var privateMethod = function() {                      // "private" method
    console.log("called privateMethod");
    }



  // *** "public" members ***

  ctor.prototype.addQueryVarToUrl = function(name, value, url) {
    var new_url;
    new_url = url;
    if (new_url.indexOf(name) === -1) {
      if (new_url.indexOf("?") === -1) {
        new_url = new_url + "?";
      } else {
        new_url = new_url + "&";
      }
      new_url = new_url + ("" + name + "=" + value);
    }
    return new_url;
  }

  ctor.prototype.addSessionVarsToUrl = function(url, user) {
    var new_url;
    new_url = this.addQueryVarToUrl("user_id", user.guid, url);
    new_url = this.addQueryVarToUrl("session_id", "YO-IMA-SESSION-ID", new_url);
    return new_url;
  }


  return ctor;
}();




module.exports = edu.northwestern.cbits.metamorphoo;