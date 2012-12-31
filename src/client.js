var $ = require("jquery-browserify");

//Load up all the client states
var client_states = [
    require("./views/loading.js")
  , require("./views/error.js")
  , require("./views/login.js")
  , require("./views/lobby.js")
  , require("./views/create_room.js")
  , require("./views/in_room.js")
  , require("./views/game.js")
  , require("./views/edit_profile.js")
];

var EventEmitter = require('events').EventEmitter;

var client = new EventEmitter()
  , states = {}
  , session = null;

client.querystring = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

client.state = null;

client.gotoState = function(nstate, params) {
  if(client.state) {
    client.emit("leave_state");
    client.state.deinit();
  }
  client.state = states[nstate];
  client.container.innerHTML = client.state.html;
  client.state.init(params);
  client.emit("enter_state");
}

function init(container) {
  client.container = container;
  for(var i=0; i<client_states.length; ++i) {
    var state = client_states[i].create(client);
  
    states[state.name] = state;
  }
  client.gotoState("loading");
}

exports.client = client;

window.onload = function() {
  var container = document.getElementById("game-container");
  if(container) {
    init(container);
  } else {
    container = document.createElement("div");
    document.body.appendChild(container);
    init(container);
  }
};
