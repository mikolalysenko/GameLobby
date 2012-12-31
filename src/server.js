var fs = require('fs')
  , path = require('path')
  , optimist = require('optimist')
  , EventEmitter = require('events').EventEmitter
  , async = require('async');

exports.createServer = function(RC_FILE, options) {

  //Use config files for overriding default values
  var overrides = [
        path.join("/ext/", RC_FILE)
      , path.join("~/", RC_FILE)
      , path.join("./", RC_FILE)
    ];
  
  //Add optional config file if specified
  if('config' in optimist.argv) {
    overrides.push(optimist.argv['config']);
  }
  
  //Apply overrides in order
  for(var i=0; i<overrides.length; ++i) {
    var fname = overrides[i];
    if(fs.existsSync(fname)) {
      try {
        var params = JSON.parse(fs.readFileSync(fname));
        for(var id in params) {
          if(id in options) {
            options[id] = params[id];
          }
        }
      } catch(e) {
        console.log("Warning!  Error reading config file : '" + fname + "'");
      }
    }
  }

  //Override config files with results from commandline
  var argv = optimist.argv;
  for(var arg in argv) {
    if(arg in options) {
      options[arg] = argv[arg];
    }
  }
  
  //Initialize application and various subsystems
  var app = new EventEmitter();
  app.options = options;

  //Initialize subsystems
  console.log("Initializing basic services...");
  async.series([
    function(cb) {
      require('./services/logger.js').createLoggingService(app, cb);
    }, function(cb) {
      require('./services/web.js').createWebService(app, cb);
    }, function(cb) {
      require('./services/db.js').createDBService(app, cb);
    }, function(cb) {
      require('./services/authenticate.js').createAuthenticationService(app, cb);
    }, function(cb) {
      require('./services/accounts.js').createAccountService(app, cb);
    }, function(cb) {
      require('./services/lobby.js').createLobbyService(app, cb);
    }
    /*
    , function(cb) {
      require('./services/sockets.js').createSocketService(app, cb);
    }
    */
  ], function(err) {
    if(err) {
      console.log("Error initializing server:", err);
      process.exit(-1);
    }
    if(!app.options.halt_on_error) {
      process.on('uncaughtException', function(err) {
        console.log("Uncaught error:", err.stack);
      });
    }
    app.emit("started");
    console.log("Server initialized");
  });
}