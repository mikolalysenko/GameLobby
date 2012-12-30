"use strict";
var misc = require('./misc.js');

//Get a list of all rooms
function updateRooms() {
  misc.http_request('/rooms/list', {}, function(err, rooms_json) {
    if(err) {
      throw new Error(err);
    }
    
    var rooms = JSON.parse(rooms_json)
      , room_div = document.getElementById("roomsList");
    room_div.innerHTML = "<p>Rooms:</p>";
    for(var id in rooms) {
      var element = document.createElement("p");
      element.appendChild(document.createTextNode(id + "(" + rooms[id].num_players + "/" + rooms[id].capacity + ")"));
      element.onclick = (function(id) { return function() { joinRoom(id); }; })(id);
      room_div.appendChild(element);
    }
  });
};

//Update account status
function updateAccount() {
  misc.http_request('/account/status', {}, function(err, account_json) {
    if(err) {
      throw new Error(err);
    }
  
    var account = JSON.parse(account_json);
  
    //TODO: UPDATE ACCOUNT FIELDS
    var lobbyPlayerName = document.getElementById("lobbyPlayerName");
    lobbyPlayerName.innerHTML = "";
    if(account.can_change_name) {
      var playerElement = document.createElement('a');
      playerElement.onclick = editName;
      playerElement.appendChild(document.createTextNode(account.player_name));
      lobbyPlayerName.appendChild(playerElement);
    } else {
      lobbyPlayerName.appendChild(document.createTextNode(account.player_name));
    }
  });
};

//Edit player name
function editName() {
  var new_name = prompt("Enter your desired name:", "Anonymous");
  misc.http_request("/account/set_name", {player_name: new_name}, function(err, response) {
    if(err) {
      throw new Error(err);
    }
    refresh();
  });
}

//Refresh items on page
function refresh() {
  updateRooms();
  updateAccount();
}

//Creates a room
function createRoom() {
  misc.http_request('/rooms/create', {
    room_name: document.getElementById("lobbyRoomName").value
  }, function(err, room_json) {
    if(err) {
      refresh();
      throw new Error(err);
    }
    //Room is created
    enterRoom();
  });
}

//Joins a room
function joinRoom(room_name) {
  misc.http_request('/rooms/join', {
    room_name: room_name
  }, function(err, room_json) {
    if(err) {
      refresh();
      throw new Error(err);
    }
    //Join room
    enterRoom();
  });
}

function enterRoom() {
  require('./entry.js').setPage(require('./room_page.js'));
}

var refresh_interval
  , error_handler = null;

//Sets the lobby page
exports.startPage = function() {
  error_handler = require('./error_handler.js').createErrorHandler('lobbyErrors');

  refresh();
  refresh_interval = setInterval(refresh, 10 * 1000);
  
  var lobbyPage = document.getElementById("lobbyPage");
  lobbyPage.style.display = "block";
  
  document.getElementById("lobbyRefresh").onclick = refresh;
  document.getElementById("lobbyEdit").onclick = function() { require('./entry.js').setPage(require('./edit_page.js')); };
  document.getElementById("lobbyCreateRoom").onclick = createRoom;  
}

//Tear down lobby page
exports.stopPage = function() {
  clearInterval(refresh_interval);
  var lobbyPage = document.getElementById("lobbyPage");
  lobbyPage.style.display = "none";
  error_handler.destroy();
}
