var crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter
  , url = require("url");

exports.createAccountService = function(app, cb) {
  "use strict";
  
  console.log("Starting account service...");

  //Create a random string (FIXME: not cryptographically secure)
  function randomString() {
    var hash = crypto.createHash('sha256');
    hash.update("ashfh134na" + (new Date()).toISOString() + Math.floor(0xffffff * Math.random()).toString(32));
    return hash.digest('base64');
  }
  
  //The session data set
  var sessions = {}
    , account_index = {};
  
  //Session data
  function Session(account, session_id) {
    EventEmitter.call(this);
    
    this.account    = account;
    this.session_id = session_id;
    this.last_poked = new Date();
    this.logged_in  = true;
    this.state      = "Lobby";

    //Save in account index
    account_index[account._id] = this;
  }
  
  //Inherit from event emitter
  Session.prototype = new EventEmitter();
  
  //Save state of session immediately
  Session.prototype.save_immediate = function() {
    if(!this.logged_in) {
      return;
    }
    this.emit("save");
    app.db.accounts.save(this.account);
  }
  
  //Update the session
  Session.prototype.poke = function() {
    if(!this.logged_in) {
      return;
    }
    this.last_poked = new Date();
  }
  
  //Close session immediately
  Session.prototype.logout = function() {
    if(!this.logged_in) {
      return;
    }
  
    this.emit("save");
  
    this.account.logged_in = false;
    delete account_index[this.account._id];
    delete sessions[this.session_id];
    
    this.emit('logout');
    app.db.accounts.save(this.account);
  }
  
  //Once ever minute, do a check point and clear out old sessions.
  //FIXME:  Do we really need to check point like this?
  setInterval(function() {
    var timeout = (new Date()).getTime() - app.options.session_timeout;
    for(var id in sessions) {
      var session = sessions[id];
      if(session.last_poked.getTime() < timeout) {
        session.logout();
      } else {
        app.db.accounts.save(session.account);
      }
    }
  }, 60 * 1000);
  
  //Creates a new session
  function login(openid_token, cb) {

    //Creates an identity
    function createIdentity(account_id, cb) {
      var identity = { openid_token: openid_token, account_id: account_id };
      app.db.openid.insert(identity, function(err) {
        cb(err, identity);
      });
    }    
    
    //Creates an account
    function createAccount(cb) {
      var account = { 
          created_at: new Date()
        , logged_in: false
        , last_login: new Date()
        , temporary: false 
        , player_name: 'Anonymous'
        , can_change_name: true
      };
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
        var session_id = account_index[identity.account_id];
        sessions[session_id].poke();
        cb(null, session_id);
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
        
        app.db.accounts.save(account, function(err) {
          if(err) {
            cb(err);
            return;
          }
          var session_id = randomString()
            , session = new Session(account, session_id);
          sessions[session_id] = session;
          app.emit('login', session);        
          cb(err, session_id);
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
    tryLogin : function(openid_token, cb) {
      login(openid_token, cb);
    }
    , temporaryLogin : function(cb) {
      login("temp:" + randomString(), cb);
    }  
    , getSession : function(session_id) {
      return sessions[session_id];
    }
    , foreachSession : function(visitor) {
      for(var id in sessions) {
        visitor( sessions[session_id] );
      }
    }
  };

  //REST API for setting player name
  app.server.get('/account/set_name', function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , player_name = parsed_url.query["player_name"]
      , session = app.accounts.getSession(session_id);
    
    if(!session 
      || !player_name 
      || !(/^\w+$/.test(player_name))
      || player_name.length > 16) {
      res.writeHead(400);
      res.end("Invalid session");
      return;
    }
    
    //Try inserting player name into database
    var can_change = session.account.can_change_name;
    if(!can_change) {
      res.writeHead(400);
      res.end("Name already set");
      return;
    }
    
    app.db.accounts.findOne({'player_name':player_name}, function(err, account) {
      if(err) {
        console.log("Error setting player name:", err, session, player_name);
        res.writeHead(400);
        res.end("Unspecified Error");
        return;
      }
      if(account) {
        res.writeHead(400);
        res.end("Name in use");
        return;
      }
      
      //Update player name immediately
      var old_name = session.account.player_name;
      session.account.player_name = player_name;
      session.account.can_change_name = false;
      session.save_immediate();
      
      //Send a name changed event
      session.emit("name_changed", old_name, player_name);
      
      res.writeHead(200);
      res.end("Success");
      return;
    });    
  });
  
  //API to retrieve account status
  app.server.get("/account/status", function(req, res) {
  
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , session = app.accounts.getSession(session_id);

    if(!session) {
      res.writeHead(400);
      res.end("Missing session id");
      return;
    }
    
    //Update player status
    var account_data = {
        player_name: session.account.player_name
      , can_change_name: session.account.can_change_name
      , state: session.state
    };
    session.emit("get_status", account_data);
  
    res.writeHead(200);
    res.end(JSON.stringify(account_data));
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

