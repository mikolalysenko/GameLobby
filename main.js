"use strict";

//Name of configuration .rc file
var RC_FILE = ".gamerc";

//Hard coded default options
var default_options = {
    db_url : "mongodb://localhost:27017/test"
  , http_url : "http://localhost:8080/"
  , http_port : 8080
  , www_root : 'www'
  , app_page : 'index.html'
  , session_timeout: 5 * 60 * 1000
  , cookie_secret: "CHANGE_THIS_SECRET_COOKIE_STRING"
  , debug: true
  , halt_on_error: true
};

//Now initialize server with options
require("./src/server.js").createServer(RC_FILE, default_options);
