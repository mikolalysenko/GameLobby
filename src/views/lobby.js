var $ = require('jquery-browserify');

exports.create = function(client) {
  
  function joinRoom(evt) {
    evt.preventDefault();    
    $.get(evt.target.href, function(data) {
      var data = JSON.parse(data);
      if(!data.success) {
        $("#error_text").text(data.reason);
      } else {
        client.gotoState("in_room", data);
      }
    });
    return false;
  }
  
  function refreshRooms() {
    $.get("/list_rooms", function(data) {
      var room_data = JSON.parse(data);
      
      if(room_data.success) {
        var room_list = document.getElementById("game_rooms");
        if(!room_list) {
          return;
        }
        room_list.innerHTML = "";
        for(var id in room_data.rooms) {
          var room = room_data[id];
          
          var element = document.createElement("div");
          var link = document.createElement("a");
          link.href = "/join_room?room_name=" + escape(id);
          var text = document.createTextNode(id);
          link.appendChild(text);
          link.addEventListener("click", joinRoom);
          element.appendChild(link);
          
          room_list.appendChild(element);
        }
      } else {
        $("#error_text").text(room_data.reason);
      }
    });
  
  };
  
  var refreshInterval = null;
  
  return {
    name: "lobby",
    
    html: [
      "<div align=center>",
        "<p>Lobby</p>",
        "<div>",
          "<input type='button' id='create_room' value='Start a new game'/>",
          "<input type='button' id='edit_profile' value='Upgrade character'/>",
          "<input type='button' id='logout' value='Logout'/>",
        "</div>",
        "<div id='game_rooms'></div>",
        "<div id='error_text'></div>",
      "</div>"
    ].join("\n"),
    
    init: function() {
      
      $("#create_room").click(function() {
        client.gotoState("create_room");
      });
      
      $("#edit_profile").click(function() {
        client.gotoState("edit_profile");
      });
      
      $("#logout").click(function() {
        $.get("/logout", function(){
          client.gotoState("login");
        });
      });
      
      refreshRooms();
      refreshInterval = setInterval(refreshRooms, 10 * 1000);
    },
    
    deinit: function() {
      clearInterval(refreshInterval);
    }
  };
}