"use strict";
var misc = require('./misc.js');

exports.createCreatureList = function(element_id) {

  var container = document.getElementById(element_id)
    , alive = true
    , select_element = null
    , creature_list = [];
  container.innerHTML = "Downloading creatures...";

  var result = {
      update: function() {  
        misc.http_request("/creatures/list", {}, function(err, result) {
        if(!alive) {
          return;
        }
        if(err) {
          throw new Error(err);
        }
        container.innerHTML = "";        
        creature_list = JSON.parse(result);
        select_element = document.createElement("select");
        select_element.multiple = true;
        for(var i=0; i<creature_list.length; ++i) {
          select_element.add(new Option(creature_list[i].name, creature_list[i]._id));
        }
        container.appendChild(select_element);
      });
    }
    , getSelectedCreature: function() {
      if(!select_element || !alive) {
        return null;
      }
      var idx = select_element.selectedIndex;
      if(idx >= 0 && idx < creature_list.length) {
        return creature_list[idx];
      }
      return null;
    }
    , destroy: function() {
      alive = false;
      creature_list = [];
    }
  };

  result.update();
  return result;
}
