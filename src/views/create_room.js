var $ = require('jquery-browserify');

exports.create = function(client) {
  return {
    name: "create_room",
    
    html: [
      "<div align=center>",
        "<p>Create a room</p>",
        "<div>",
          "<p>Game Name: <input type='text' id='room_name' value='Your game' /></p>",
          "<p>",
            "<input type='button' id='create_room' value='Start'/>",
            "<input type='button' id='back_to_lobby' value='Back'/>",
          "</p>",
        "</div>",
        "<div id='error_text'></div>",
      "</div>"
    ].join("\n"),
    
    init: function() {
      $("#back_to_lobby").click(function() {
        client.gotoState("lobby");
      });
      
      $("#create_room").click(function() {
        $("#create_room").disabled = true;
        
        var qstr = ["?room_name=" + escape($("#room_name")[0].value)];
        
        //Read in room parameters
        
        $.get("/create_room" + qstr.join("&"), function(data) {
          $("#create_room").disabled = false;

          var response = JSON.parse(data);
          if(!response.success) {
            $("#error_text").text(response.reason);
            return;
          }
          
          client.gotoState("in_room", data);          
        });
      });
    },
    
    deinit: function() {
    }
  };
}