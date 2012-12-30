
var misc = require('./misc.js')
  , error_handler
  , chat_box
  , refresh_interval = null;

function updateRoomStatus() {
  misc.http_request("/rooms/status", {}, function(err, status_json) {
    if(err) {
      throw new Error(err);
    }
    
    var status = JSON.parse(status_json);
    
    var roomName = document.getElementById("roomName");
    roomName.innerHTML = "";
    roomName.appendChild(document.createTextNode('Room: "'+status.room_name+'"'));
    
    var roomPlayers = document.getElementById("roomPlayers");
    roomPlayers.innerHTML = "<b>Players:</b>";
    for(var i=0; i<status.players.length; ++i) {
      roomPlayers.appendChild(document.createElement("br"));
      
      var name = document.createTextNode(status.players[i].name)
      if(status.players[i].ready) {
        var bold = document.createElement("b");
        bold.appendChild(name);
        name = bold;
      }
      roomPlayers.appendChild(name);
    }
  });
}

function refresh() {
  updateRoomStatus();
}

function leaveRoom() {
  misc.http_request("/rooms/leave", {}, function(err, status) {
    if(err) {
      throw new Error(err);
    }
    
    //Go back to lobby
    require('./entry.js').setPage(require('./lobby_page.js'));
  });
}

function setReady() {
  var ready = document.getElementById("roomReady")
    , state = ready.checked;
  
  misc.http_request("/rooms/set_ready", { ready: state }, function(err, status) {
    if(err) {
      throw new Error(err);
    }
    refresh();
  });
}

function startBattle() {
  require('./entry.js').setPage(require('./battle_page.js'));
}

exports.startPage = function() {
  error_handler = require('./error_handler.js').createErrorHandler('roomErrors');
  chat_box = require('./chat_box.js').createChatBox('roomChat');

  var room_page = document.getElementById("roomPage");
  room_page.style.display = "block";

  document.getElementById("roomLeave").onclick = leaveRoom;
  
  var ready_check = document.getElementById("roomReady");
  ready_check.checked = false;
  ready_check.onchange = setReady;
  
  misc.socket.on("start_battle", startBattle);
  
  refresh_interval = setInterval(refresh, 5 * 1000);
  refresh();
}

exports.stopPage = function() {
  clearInterval(refresh_interval);
  
  var room_page = document.getElementById("roomPage");
  room_page.style.display = "none";
  
  misc.socket.removeListener("start_battle", startBattle);

  chat_box.destroy();
  error_handler.destroy();
}

