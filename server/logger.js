
exports.createLoggingService = function(app, cb) {

  console.log("Starting logging service...");

  app.on('login', function(session) {
    console.log("Session Created:", session.session_id, session.account);
    session.on("connect", function() {
      console.log("Session Connected:", session.session_id);
    });
    
    session.on('logout', function() {
      console.log("Session Terminated", session.session_id, session.account);
    });
    
    session.on('client_message', function(data) {
      console.log("Client data("+session.session_id + "): ", data);
    });
    
    session.on('name_changed', function(old_name, new_name) {
      console.log("Name changed(", session.session_id, "):", old_name, "->", new_name);
    });
  });
  
  app.on('create_room', function(room) {
    console.log("Room Created:", room.detailed_summary());
    room.on('join_room', function(session) {
      console.log("Join:", "'" + room.room_name + "' ++ ", session.session_id); 
    });
    room.on('leave_room', function(session) {
      console.log("Leave:", "'" + room.room_name + "' -- ", session.session_id); 
    });
    room.on('chat', function(chat) {
      console.log("Chat:", chat);
    });
    room.on('set_ready', function(session, ready) {
      console.log("Set Ready:", room.room_name, session.session_id, ready);
    });
    room.on('close', function() {
      console.log("Room Closed: ", room.detailed_summary());
    });
    room.on('start_battle', function() {
      console.log("Starting Battle:", room.detailed_summary());
    });
  });
  
  app.on('create_creature', function(creature, params) {
    console.log("Creating creature:", creature, ', params: ', params);
  });
  app.on('update_creature', function(old_creature, params) {
    console.log("Updating creature:", old_creature, ", params: ", params);
  });
  app.on('get_creature', function(response, creature_doc, session) {
    console.log("Retreiving creature (", session.account._id, ") : ", response, ";  Database: ", creature_doc);
  });
  app.on('delete_creature', function(creature) {
    console.log("Deleting creature:", creature);
  });
  
  app.browserify.on('syntaxError', function(error) {
    console.log("Syntax Error:", error);
  });
  
  app.browserify.on("bundle", function() {
    console.log("Bundle Regenerated");
  });

  
  cb(null);
};
