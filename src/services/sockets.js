"use strict";

var WebSocketServer = require('ws').Server;

exports.createSocketService = function(app, cb) {
    
  console.log("Starting socket service...");

  app.on('login', function(session) {
  
    session.socket = null;
    var message_queue = [];
    
    //Buffer messages before connection
    session.send = function(data) {
      if(session.socket) {
        session.socket.send(data);
      } else {
        message_queue.push(data);
      }
    };
    
    //When connected, fire off all messages in queue
    session.on('connect', function() {
      for(var i=0; i<message_queue.length; ++i) {
        session.socket.send(message_queue[i].data);
      }
      message_queue.length = 0;
    });
  });
    
    
  
  var wss = new WebSocketServer({server: app.server});
  wss.on('connection', function(ws) { 
    
    app.log("WebSocket Connected");
    
    //Check session id
    ws.once('message', function(session_id, flags) {
    
      console.log("WebSocket Handhake = ", session_id);
    
      //Must do hand shake in plain text
      if(flags.binary || flags.mask) {
        ws.close();
        return;
      }
      var session = app.accounts.getSession(session_id);
      if(!session) {
        console.log("Bad/expired session id");
        ws.close()
        return;
      }
      //Initialize socket
      var reconnect = false;
      if(session.socket) {
        session.emit('reconnect');
        reconnect = true;
      }
      //Connect session to socket
      var closed = false;
      session.poke();
      
      //On reconnect, kill old socket
      function reconnect_listener() {
        remove_listeners();
        closed = true;
        ws.close();
      }
      
      //Remove handlers
      function close_listener() {
        if(closed || reconnect) {
          return;
        }
        closed = true;
        remove_listeners();
        session.emit('disconnect');
      }
      
      //Handle message
      function message_listener(data, flags) {
        session.poke();
        if(flags.binary) {
          session.emit('binary', data);
        } else {
          var msg = JSON.parse(data);
          if(msg.event) {
            session.emit('client_'+msg.event, msg);
          }
          session.emit('client_message', msg);
        }
        if(flags.masked) {
          ws.close();
        }
      }
      
      //On log out close socket
      function logout_listener() {
        ws.close();
      }
      
      function remove_listeners() {
        session.removeListener('reconnect', reconnect_listener);
        session.removeListener('logout', logout_listener);
        ws.removeListener('close', close_listener);
        ws.removeListener('message', message_listener);
      }
      function add_listeners() {
        session.addListener('reconnect', reconnect_listener);
        session.addListener('logout', logout_listener);
        ws.addListener('close', close_listener);
        ws.addListener('message', message_listener);
      }
      
      //Connected
      add_listeners();
      session.socket = ws;
      session.emit("connect");
    });
  });
  
  //Continue
  cb(null);
}


