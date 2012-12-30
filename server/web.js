exports.createWebService = function(app, cb) {

  console.log("Starting web service...");

  //Initialize server
  var path = require('path')
    , express = require('express')
    , server = express();
    
  server.use(express.static(path.join(__dirname, 'www')));
  server.use(express.static(path.join(__dirname, 'common')));
  server.use(express.bodyParser());
  server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

  //Add browserify imports
  var browserify = require('browserify')(
    (app.options.debug ? {
        watch: true
      , cache: false
      , exports: ['require']
    } : {
        cache:true
      , exports: ['require']
    }));
  browserify.addEntry('./common/entry.js');
  if(!app.options.debug) {
    //TODO: Add uglify JS here
  }

  server.use(browserify);

  //Add server to application
  app.server = server;
  app.http_server = require('http').createServer(server);
  app.browserify = browserify;

  cb(null);
}
