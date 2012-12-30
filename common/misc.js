var tools = require('./tools.js');

var qstr = window.location.search
  , toks = (qstr.charAt(0)==='?'?qstr.substr(1):qstr).split('&')
  , query = {};
for(var i=0; i<toks.length; ++i) {
  var pair = toks[i].split('=');
  query[unescape(pair[0])] = unescape(pair[1]);
};

exports.query       = query;
exports.session_id  = query['session_id'];

var url_base = 'http://' + window.location.host
  , query_base = '?session_id=' + tools.escape_query(query['session_id']);

exports.http_request = function(path, params, cb) {
  var url = url_base + path + query_base;
  for(var id in params) {
    url += '&' + tools.escape_query(id) + '=' + tools.escape_query(params[id]);
  }
  var XHR = new XMLHttpRequest();
  XHR.open('GET', url, true);
  
  var timeout = setTimeout(function() {
    cb("Request timed out", null);
    XHR.abort();
  }, 30 * 1000);
  
  XHR.onreadystatechange = function(ev) {
    if(XHR.readyState !== 4) {
      return;
    }
    clearTimeout(timeout);
    if(XHR.status !== 200) {
      cb(XHR.responseText, null);
    } else {
      cb(null, XHR.responseText);
    }
  };
  
  XHR.send();
};



exports.http_post = function(path, params, cb) {
  var url = url_base + path + query_base;
  var XHR = new XMLHttpRequest();
  XHR.open('POST', url, true);
  XHR.setRequestHeader("Content-Type", "application/json");
  
  var timeout = setTimeout(function() {
    cb("Request timed out", null);
    XHR.abort();
  }, 30 * 1000);
  
  XHR.onreadystatechange = function(ev) {
    if(XHR.readyState !== 4) {
      return;
    }
    clearTimeout(timeout);
    if(XHR.status !== 200) {
      cb(XHR.responseText, null);
    } else {
      cb(null, XHR.responseText);
    }
  };
  
  XHR.send(JSON.stringify(params));
};


//Wrapper over web socket connection
var EventEmitter = require("events").EventEmitter
  , connection = new EventEmitter()
  , ws = null
  , buffer = []
  , rcon_count = 0;

connection.send = function(data) {
  var str = JSON.stringify(data);
  if(ws && ws.readyState === ws.OPEN) {
    ws.send(str);
  } else {
    buffer.push(str);
  }
};

function installSocket() {
  ++rcon_count;
  if(rcon_count > 30) {
    throw new Error("Can't connect to server");
    window.location = "/";
    return;
  }
  if(!exports.session_id) {
    return;
  }
  
  ws = new WebSocket("ws://" + window.location.host);
  ws.onopen = function() {
    ws.send(exports.session_id);
    for(var i=0; i<buffer.length; ++i) {
      ws.send(buffer[i]);
    }
    buffer.length = 0;
  };
  ws.onerror = function(ev) {
    throw new Error("Error in websocket");
  };
  ws.onclose = function(ev) {
    ws = null;
    installSocket();
  };
  ws.onmessage = function(ev) {
    var obj = JSON.parse(ev.data);
    if(obj.event) {
      connection.emit(obj.event, obj);
    } else {
      connection.emit("message", obj);
    }
  };
}
installSocket();

exports.socket = connection;


//http://js-tut.aardon.de/js-tut/tutorial/position.html
exports.getElementPosition = function(element) {
  var elem=element, tagname="", x=0, y=0;
 
  while((typeof(elem) == "object") && (typeof(elem.tagName) != "undefined")) {
     y += elem.offsetTop;
     x += elem.offsetLeft;
     tagname = elem.tagName.toUpperCase();

     if(tagname == "BODY")
        elem=0;

     if(typeof(elem) == "object") {
        if(typeof(elem.offsetParent) == "object")
           elem = elem.offsetParent;
     }
  }

  return {x: x, y: y};
}

