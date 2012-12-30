"use strict";

//Default options
var options = {
    db_url : "mongodb://localhost:27017/test"
  , http_url : "http://localhost:8080/"
  , http_port : 8080
  , login_page : 'index.html'
  , lobby_page : 'index.html'
  , session_timeout: 5 * 60 * 1000
  , debug: true
};

//Override any options from commandline
var argv = require('optimist').argv;
for(var arg in argv) {
  if(arg in options) {
    options[arg] = argv[arg];
  }
}

//Initialize application and various subsystems
var EventEmitter = require('events').EventEmitter
  , app = new EventEmitter();

app.options = options;

//Add mongo db server
app.db = require('mongoskin').db(options.db_url);

//Initialize subsystems
console.log("Initializing server...");
var async = require('async');
async.series([
  function(cb) {
    require('./server/logger.js').createLoggingService(app, cb);
  }, function(cb) {
    require('./server/web.js').createWebService(app, cb);
  }, function(cb) {
    require('./server/authenticate.js').createAuthenticationService(app, cb); 
  }, function(cb) {
    require('./server/accounts.js').createAccountService(app, cb);
  }, function(cb) {
    require('./server/sockets.js').createSocketService(app, cb);
  }, function(cb) {
    require('./server/lobby.js').createLobbyService(app, cb);
  }, function(cb) {
    require('./server/creature.js').createCreatureService(app, cb);
  }
], function(err, result) {
  if(err) {
    console.log("Error Initializing Server:", err);
    process.exit(-1);
  }
  process.on('uncaughtException', function(err) {
    console.log("Uncaught error:", err.stack);
  });
  app.http_server.listen(options.http_port);
  app.emit("started");
  console.log("Server initialized");
});


