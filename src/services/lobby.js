var EventEmitter = require('events').EventEmitter
  , url = require('url')
  , Room = require('../models/room.js').Room;

exports.createLobbyService = function(app, cb) {
  "use strict";

  console.log("Starting lobby service...");
  
  var rooms = new Object();
  
  function createRoom(session, params) {
    var room_name = params.room_name;
  
    if(!room_name ||
      (room_name in rooms)
      || session.room ) {
      return null;
    }
    
    //Check if session has permission to create room
    params.valid = true;
    app.emit("validate_room", session, params);
    if(!params.valid) {
      return null;
    }
    
    var room = new Room(params);
    rooms[room_name] = room;
    app.emit("create_room", room);
    app.log("Created room: ", room);
    
    //Remove reference to room
    room.on('close', function() {
      if(room_name in rooms) {
        delete rooms[room_name];
      }
    });
    
    return room;
  }
  
  function joinRoom(session, room, res) {
  
    if(session.room ) {
      res.writeHead(200);
      res.end('{"succcess":false,"reason":"Already in room"}');
      return;
    }
    if(room.state !== "await_players") {
      res.writeHead(200);
      res.end('{"succcess":false,"reason":"Game in progress"}');
      return;
    }
    if(room.players.length >= room.capacity) {
      res.writeHead(200);
      res.end('{"succcess":false,"reason":"Room full"}');
      return;
    }
    
    session.join(room);
    room.addPlayer(session);
    
    var summary = room.detailed_summary();
    summary.success = true;
    res.writeHead(200);
    res.end(JSON.stringify(summary));
    
    app.log("Player: ", session.toString(), "Joined room:", room.room_name);
    
    return;
  }
  
  function leaveRoom(session) {
    if(!session.room) {
      return;
    }
    
    var room = session.room;
    room.removePlayer(session);
    session.leave();
    
    //Close room when player count reaches 0
    if(room.players.length === 0) {
      room.close();
    }
  };
  
  //Retrieves the room list
  app.server.get('/list_rooms', function(req, res) {
    var session_id = req.signedCookies.session_id
      , session = app.accounts.getSession(session_id);
    
    if(!session) {
      console.log("Invalid session:", session_id, "IP Address:", req.ip);
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid session"}');
      return;
    }
    
    var room_packet = {};
    for(var id in rooms) {
      room_packet[id] = rooms[id].summary();
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({success:true, rooms:room_packet}));
  });


  app.server.get('/room_status', function(req, res) {

    var parsed_url = url.parse(req.url, true)
      , session_id = req.signedCookies.session_id
      , session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid session"}');
      return;
    }
    
    var room_name = parsed_url.query["room_name"];
    
    if(room_name in rooms) {
      res.writeHead(200);
      var summary = rooms[room_name].detailed_summary();
      summary.success = true;
      res.end(JSON.stringify(summary));
    } else {
      res.writeHead(200);
      res.end('{"success":false,"reason":"No such room"}');
      return;
    }
  });

  
  //Create a room
  app.server.get('/create_room', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = req.signedCookies.session_id
      , session    = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid session"}');
      return;
    }
    
    //Create the room
    var room = createRoom(session, parsed_url.query);
    if(!room) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Error creating room, try a different name"}');
      return;
    }
    joinRoom(session, room, res);
  });
  
  //Join a room
  app.server.get('/join_room', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = req.signedCookies.session_id
      , room_name = parsed_url.query["room_name"]
      , session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session ||
       !(room_name in rooms) ) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Error joining room, try a different room"}');
      return;
    }
    
    var room = rooms[room_name];
    joinRoom(session, room, res);
  });
  
  //Leave a room
  app.server.get('/leave_room', function(req, res) {
    var session_id = req.signedCookies.session_id
      , session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid session id"}');
      return;
    }
    
    leaveRoom(session);
    res.writeHead(200);
    res.end('{"success":true}');
  });
  
  app.server.get('/set_ready', function(req, res) {

    var parsed_url = url.parse(req.url, true)
      , session_id = req.signedCookies.session_id
      , ready_state = parsed_url.query["ready"] == "true";
    
    var session = app.accounts.getSession(session_id);
    
    //Validate input
    if(!session) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid session"}');
      return;
    }
    if(!session.room) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Not in room"}');
      return;
    }
    if(session.room.state !== "await_players") {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid room state"}');
      return;
    }
    
    //Set ready
    session.room.set_ready(session, ready_state);
    res.writeHead(200);
    res.end('{"success":true}');
    return;
  });
  
  //Continue
  cb(null);
}


