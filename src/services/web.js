var path = require('path')
  , express = require('express')
  , http = require('http')
  , ecstatic = require('ecstatic');

exports.createWebService = function(app, cb) {

  console.log("Starting web service...");

  //Initialize server
  var server = express();
  server.use(ecstatic({
      root: app.options.www_root
    , cache: app.options.debug ? 1 : 3600
    , gzip: app.options.debug
  }));
  server.use(express.bodyParser());
  server.use(express.cookieParser(app.options.cookie_secret));
  server.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));

  //Add browserify
  var client_path = path.join(__dirname, '../client.js');
  var browserify = require('browserify')(
    (app.options.debug ? {
        watch:  true
      , debug:  true
      , cache:  false
    } : {
        cache:  true
      , filter: require('uglify-js')
    }));
  
  if(app.options.debug) {
    browserify.on('syntaxError', function(err) {
      app.log("Syntax error:", err);
    });

    browserify.on('bundle', function() {
      app.log("Rebuilt bundle");
    });
  }
  
  browserify.addEntry(client_path);
  server.use(browserify);

  //Add server to application
  app.server = server;
  server.listen(app.options.http_port);

  cb(null);
}
