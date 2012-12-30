var EventEmitter = require('events').EventEmitter
  , url = require('url');

exports.createLobbyService = function(app, cb) {
  "use strict";

  console.log("Starting lobby service...");

  var rooms = new Object();

  function Room(params) {
    EventEmitter.call(this);
    this.room_name    = params.room_name;
    this.players      = [];
    this.capacity     = params.capacity || 2;
    this.min_capacity = params.min_capacity || 2;
    this.state        = "AwaitPlayers";
    this.created_at   = new Date();
  }
  Room.prototype = new EventEmitter();
  
  Room.prototype.summary = function() {
    return {
        room_name:    this.room_name
      , capacity:     this.capacity
      , num_players:  this.players.length
      , state:        this.state
      , created_at:   this.created_at
    };
  };
  
  Room.prototype.detailed_summary = function() {
    var summary = this.summary();
    summary.players = [];
    for(var i=0; i<this.players.length; ++i) {
      var pl = this.players[i];
      summary.players.push({
          name: pl.account.player_name
        , ready: pl.ready_for_battle
      });
    }
    this.emit("summary", summary);
    return summary;
  };
  
  //Send a message to all players in the room
  Room.prototype.broadcast = function(data) {
    var str = JSON.stringify(data);
    for(var i=0; i<this.players.length; ++i) {
      this.players[i].send(str);
    }
  };
  
  //Set the ready state on the room
  Room.prototype.set_ready = function(session, ready) {
    if(this.state !== "AwaitPlayers") {
      return;
    }
  
    this.emit("set_ready", session, ready);
  
    session.ready_for_battle = ready;
    var ready_count = 0;
    for(var i=0; i<this.players.length; ++i) {
      if(this.players[i].ready_for_battle) {
        ++ready_count;
      }
    }
    
    //Check if player game is ready to start
    if((this.players.length >= this.min_capacity)
      && (ready_count >= this.players.length)) {
      
      this.state = "Battle";
      for(var i=0; i<this.players.length; ++i) {
        this.players[i].state = "Battle";
      }

      var battle_event = {
        event: 'start_battle'
      };

      this.emit("start_battle", battle_event);
      this.broadcast(battle_event);
    }
  };
  
  //Close room
  Room.prototype.close = function() {
    if(this.state === "Closed") {
      return;
    }
    //Set state to closed
    this.state = "Closed";
    //Fire event
    this.emit('close');
    //Notify players and clear out list
    for(var i=0; i<this.players.length; ++i) {
      leaveRoom(this.players[i]);
    }
    this.players.length = "";
    //Remove from rooms list
    delete rooms[this.room_name];
  };
  
  
  function createRoom(session, room_name) {
    if((room_name in rooms)
      || session.room ) {
      return null;
    }
    var room = new Room({
      room_name: room_name
    });
    rooms[room_name] = room;
    app.emit("create_room", room);
    return room;
  }
  
  function joinRoom(session, room, res) {
    if(session.room ) {
      res.writeHead(400);
      res.end("Already in room");
      return;
    }
    if(room.state !== "AwaitPlayers") {
      res.writeHead(400);
      res.end("Game in progress");
      return;
    }
    if(room.players.length >= room.capacity) {
      res.writeHead(400);
      res.end("Room full");
      return;
    }
    
    room.players.push(session);
    session.room = room;
    session.state = "Room";
    room.emit("join_room", session);
    
    res.writeHead(200);
    res.end("Success");
    
    //Send event
    var join_event = {
        event: 'join_room'
      , room_name: room.room_name
      , player_name: session.account.player_name
    };
    room.broadcast(join_event);
    
    return;
  }
  
  function leaveRoom(session) {
    if(!session.room) {
      return;
    }
    
    var room = session.room;
    room.emit("leave_room", session);
    for(var i=0; i<room.players.length; ++i) {
      if(room.players[i] === session) {
        room.players.splice(i, 1);
        break;
      }
    }
    
    session.room = null;
    session.state = "Lobby";
    
    var leave_event = {
        event:        'leave_room'
      , room_name:    room.room_name
      , player_name:  session.account.player_name
    };
    room.broadcast(leave_event);
    
    //Close room when player count reaches 0
    if(room.players.length === 0) {
      room.close();
    }
  };
  
  app.on('login', function(session) {
    session.room = null;
    session.ready_for_battle = false;
    
    session.on('client_chat', function(data) {
      if(session.room) {
        var chat_str = data.chat;
        if(!chat_str) {
          return;
        }
        if(chat_str.length > 256) {
          chat_str.length = 256;
        }
        var chat_event = {
            event:        'chat'
          , room_name:    session.room.room_name
          , player_name:  session.account.player_name
          , chat:         chat_str
        };
        session.room.emit("chat", chat_event);
        session.room.broadcast(chat_event);
      }
    });
    
    session.on('logout', function() {
      leaveRoom(session);
    });
  });
  
    
  //Retrieves the room list
  app.server.get('/rooms/list', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , session = app.accounts.getSession(session_id);
    
    if(!session) {
      console.log("Invalid session:", session_id);
      res.writeHead(400);
      res.end("Invalid session");
      return;
    }
    
    session.poke();
    
    var room_packet = {};
    for(var id in rooms) {
      room_packet[id] = rooms[id].summary();
    }
    
    res.writeHead(200);
    res.end(JSON.stringify(room_packet));
  });


  app.server.get('/rooms/status', function(req, res) {

    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"];
      
    var session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(400);
      res.end("Invalid session");
      return;
    }
    
    session.poke();
    
    if(session.room) {
      res.writeHead(200);
      res.end(JSON.stringify(session.room.detailed_summary()));
    } else {
      res.writeHead(200);
      res.end("{}");
    }
  });

  
  //Create a room
  app.server.get('/rooms/create', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , room_name = parsed_url.query["room_name"];
      
    var session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session ||
       (room_name in rooms)) {
      res.writeHead(400);
      res.end("Error creating room");
      return;
    }
    
    //Create the room
    var room = createRoom(session, room_name);
    if(!room) {
      res.writeHead(400);
      res.end("Error creating room");
      return;
    }
    joinRoom(session, room, res);
  });
  
  //Join a room
  app.server.get('/rooms/join', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , room_name = parsed_url.query["room_name"];
    
    var session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session ||
       !(room_name in rooms) ) {
      res.writeHead(400);
      res.end("Error joining room");
      return;
    }
    
    var room = rooms[room_name];
    joinRoom(session, room, res);
  });
  
  //Leave a room
  app.server.get('/rooms/leave', function(req, res) {
    console.log("Leaving");
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"];    
    var session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(400);
      res.end("Invalid session id");
      return;
    }
    
    leaveRoom(session);
    res.writeHead(200);
    res.end("Success");
  });
  
  app.server.get('/rooms/set_ready', function(req, res) {

    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , ready_state = parsed_url.query["ready"] == "true";
    
    var session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(400);
      res.end("Invalid session");
      return;
    }
    if(!session.room) {
      res.writeHead(400);
      res.end("Not in room");
      return;
    }
    if(session.room.state !== "AwaitPlayers") {
      res.writeHead(400);
      res.end("Invalid room state");
      return;
    }
    
    //Set ready
    session.room.set_ready(session, ready_state);
    res.writeHead(200);
    res.end("Success");
    return;
  });
  
  //Continue
  cb(null);
}


