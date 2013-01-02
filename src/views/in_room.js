"use strict";
var $ = require('jquery-browserify');

exports.create = function(client) {
  return {
    name: "in_room",
    
    html: [
      "<div align=center>",
        "<p>Waiting for players...</p>",
        "<div id='room_name'></div>",
        "<div>",
          "<p> Ready? <input type='checkbox' id=ready /> </p>",
          "<input type='button' id='back_to_lobby' value='Back to Lobby' />",
        "</div>",
        "<div id='players'></div>",
      "</div>"
    ].join("\n"),
    
    init: function(params) {
      $("#back_to_lobby").click(function() {
        $.get("/leave_room");
        client.gotoState("lobby");
      });
      
      $("#ready").change(function(ev) {
        var checked = $("#ready").val();
        $.get("/set_ready?ready_state="+checked);
      });
    },
    
    deinit: function() {
    }
  };
}