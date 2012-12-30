var misc = require('./misc.js')
  , current_page = {
      name:       "Default"
    , startPage:  function() {}
    , stopPage:   function() {}
  };

var pages = {
    "Login":  require('./login_page.js')
  , "Lobby":  require('./lobby_page.js')
  , "Edit":   require('./edit_page.js')
  , "Room":   require('./room_page.js')
  , "Battle": require('./battle_page.js')  
};

exports.setPage = function(next_page) {
  current_page.stopPage();
  current_page = next_page;
  current_page.startPage();
}


if(misc.session_id) {
  misc.http_request("/account/status", {}, function(err, data) {
    if(err) {
      window.location = "/index.html";
      return;
    }
    
    //Handle window load state
    var obj = JSON.parse(data)
      , state = obj.state;
    if(document.readyState === "complete") {
      exports.setPage(pages[state]);
    } else {
      document.onreadystatechange = function() {
        if(document.readyState === "complete") {
          exports.setPage(pages[state]);
        }
      }
    }
  });
} else {
  if(document.readyState === "complete") {
    exports.setPage(pages["Login"]);
  } else {
    document.onreadystatechange = function() {
      if(document.readyState === "complete") {
        exports.setPage(pages["Login"]);
      }
    }
  }
}
