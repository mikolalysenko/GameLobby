var EventEmitter = require('events').EventEmitter
  , url = require("url")
  , Session = require('../models/session.js').Session
  , Account = require('../models/account.js').Account;


exports.createAccountService = function(app, cb) {
  "use strict";
  
  console.log("Starting account service...");


  //The session data set
  var sessions = {}
    , account_index = {};
  
  function makeSession(account) {
    var session = new Session(new Account(account));
    
    //Save in account index
    sessions[session.session_id] = session;
    account_index[account._id] = session;
    
    app.emit('login', session);
    
    session.on('save', function() {
      app.db.accounts.save(session.account);
    });
    
    session.on('logout', function() {
      app.log("Account logged out");
      if(session.session_id in sessions) {
        delete sessions[session.session_id];
      }
      if(session.account._id in account_index) {
        delete account_index[session.account._id];
      }
    });
    
    return session;
  }
  
  //Once ever minute, do a check point and clear out old sessions.
  //FIXME:  Do we really need to check point like this?
  setInterval(function() {
    var timeout = (new Date()).getTime() - app.options.session_timeout;
    for(var id in sessions) {
      var session = sessions[id];
      if(session.last_poked.getTime() < timeout) {
        session.logout();
      }
      app.db.accounts.save(session.account);
    }
  }, 60 * 1000);
  
  //Creates a new session
  function login(openid_token, ip, cb) {

    //Creates an identity
    function createIdentity(account_id, cb) {
      var identity = { openid_token: openid_token, account_id: account_id };
      app.db.openid.insert(identity, function(err) {
        cb(err, identity);
      });
    }    
    
    //Creates an account
    function createAccount(cb) {
      var account = new Account({});
      account.last_ip_address = ip;
      if(openid_token.indexOf("temp") === 0) {
        account.temporary = true;
      }
      app.emit('create_account', account);
      app.db.accounts.insert(account, function(err) {
        cb(err, account);
      });
    }
    
    //Creates a session
    function createSession(identity) {
    
      //Check if already logged in
      if(identity.account_id in account_index) {
        var session = account_index[identity.account_id];
        session.poke();
        cb(null, session.session_id);
        return;
      }  
    
      //Otherwise, need to create new session
      app.db.accounts.findOne({ _id: identity.account_id }, function(err, account) {
        if(err) {
          cb(err);
          return;
        }
        if(!account) {
          cb("Missing account!");
          return;
        }
        
        //Set account to logged in state
        account.logged_in = true;
        account.last_login = new Date();
        account.last_ip_address = ip;
        
        app.db.accounts.save(account, function(err) {
          if(err) {
            cb(err);
            return;
          }
          
          var session = makeSession(account);
          cb(err, session.session_id);
        });
      });
    }

    //First, look up identity
    app.db.openid.findOne({ openid_token: openid_token }, function(err, identity) {
      if(err) {
        cb(err);
      } else if(!identity) {
        //If new identity, then need to create account
        createAccount(function(err, account) {
          if(err) {
            cb(err);
            return;
          }
          createIdentity(account._id, function(err, identity) {
            if(err) {
              cb(err);
              return;
            }
            createSession(identity);
          });
        });
      } else {
        //Otherwise, login using existing account
        createSession(identity);
      }
    });
  }

  //Create the account handler
  app.accounts = {
    tryLogin : function(openid_token, ip, cb) {
      login(openid_token, ip, cb);
    }
    , temporaryLogin : function(ip, cb) {
      login("temp:" + (new Date()).getMilliseconds() + Math.random(), ip, cb);
    }  
    , getSession : function(session_id) {
      var session = sessions[session_id];
      if(session) {
        session.poke();
      }
      return session;
    }
    , foreachSession : function(visitor) {
      for(var id in sessions) {
        visitor( sessions[session_id] );
      }
    }
  };

  //REST API for setting player name
  app.server.get('/set_name', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = req.signedCookies.session_id
      , player_name = parsed_url.query["player_name"]
      , session = app.accounts.getSession(session_id);
    
    if(!session 
      || !player_name 
      || !(/^\w+$/.test(player_name))
      || player_name.length > 16) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"Invalid session"}');
      return;
    }
    
    //Try inserting player name into database
    var can_change = session.account.can_change_name;
    if(!can_change) {
      res.writeHead(200);
      res.end('{"success":false,"reason":"You can only select a name once"}');
      return;
    }
    
    app.db.accounts.findOne({'player_name':player_name}, function(err, account) {
      if(err) {
        console.log("Error setting player name:", err, session, player_name);
        res.writeHead(200);
        res.end('{"success":false,"reason":"Unspecified error"}');
        return;
      }
      if(account) {
        res.writeHead(200);
        res.end('{"success":false,"reason":"Name already in use"}');
        return;
      }
      
      //Update player name immediately
      var old_name = session.account.player_name;
      session.account.player_name = player_name;
      session.account.can_change_name = false;
      session.save();
      
      //Send a name changed event
      session.emit("name_changed", old_name, player_name);
      
      res.writeHead(200);
      res.end('{"success":true}');
      return;
    });    
  });
  
  //API to retrieve account status
  app.server.get("/status", function(req, res) {
  
    var session_id = req.signedCookies.session_id
      , session = app.accounts.getSession(session_id);

    app.log("Status request: ", session_id, "IP address: ", req.ip);

    if(!session) {
      res.writeHead(200);
      res.end('{"state":"login"}');
      return;
    }
    
    //Update player status
    var account_data = {
        player_name:      session.account.player_name
      , can_change_name:  session.account.can_change_name
      , state:            session.state
    };
    session.emit("status", account_data);
  
    res.writeHead(200);
    res.end(JSON.stringify(account_data));
    return;
  });
  
  app.server.get("/logout", function(req, res) {
  
    res.clearCookie("session_id");
    res.writeHead(200);
    res.end('{"success":true}');
    
    var session_id = req.signedCookies.session_id
      , session = app.accounts.getSession(session_id);

    if(session) {
      session.logout();
    }
    
    return;
  });

  //Initialize database stuff  
  app.db.bind('openid');
  app.db.bind('accounts');  
  app.db.openid.ensureIndex([['openid_token', 1]], true, function(err, replies) {
    if(err) {
      cb(err);
      return;
    }
    app.db.openid.ensureIndex([['account_id', 1]], false, function(err, replies) {
      if(err) {
        cb(err);
        return;
      }
      app.db.accounts.ensureIndex([['player_name', 1]], false, function(err, replies) {
        if(err) {
          cb(err);
          return;
        }
        app.db.accounts.update({}, {$set: {logged_in: false}}, function(err) {
          cb(null);
        });
      });
    });
  }); 
}

