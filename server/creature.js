var ObjectID = require('mongoskin').ObjectID
  , url = require('url');

exports.createCreatureService = function(app, cb) {
  function validateCreature(creature_doc, session, cb) {
    if(!('name' in creature_doc)) {
      cb("Missing name", null);
      return;
    }
    
    if('_id' in creature_doc) {
      if(typeof(creature_doc._id) !== 'string') {
        cb("Invalid creature id", null);
        return;
      }
    }
    
    //Do a local synchronous validation
    var validate_status = {
        valid: true
      , error_reason: "Invalid"
      , callbacks: []             //Any asynchronous validation happens here
    };
    app.emit("validate_creature", creature_doc, session, validate_status);
    if(!validate_status.valid) {
      cb(validate_status.error_reason, null);
      return;
    }

    //TODO: Add more validation

    if(validate_status.callbacks.length > 0) {
      function do_validate(err) {
        if(err) {
          cb(err, null);
          return;
        }
        var next_cb = validate_status.callbacks[0];
        validate_status.callbacks.shift();
        next_cb(do_validate);
      }
      do_validate(null);
    } else {
      cb(null, creature_doc);
    }
  }
  
  function updateCreature(old_creature, new_creature) {  
    old_creature.last_modified = new Date();
    
    old_creature.bodies = new_creature.bodies;
    old_creature.joints = new_creature.joints;
    
    app.emit("update_creature", old_creature, new_creature);
  }
  
  function createNewCreature(creature_doc) {
    var new_creature = {
        created_at:     new Date()
      , last_modified:  new Date()
      , deleted:        false
      , name:           creature_doc.name
      , account_id:     creature_doc.account_id
      , bodies:         creature_doc.bodies
      , joints:         creature_doc.joints
    };
    
    app.emit("create_creature", new_creature, creature_doc);
    
    return new_creature;
  }
  
  app.on('login', function(session) {
    session.creatures = [];
    session.wait_for_creatures = true;
    
    session.getCreature = function(creature_id) {
      if(session.wait_for_creatures) {
        return null;
      }
      var obj_id = new ObjectID(creature_id);
      for(var i=0; i<session.creatures.length; ++i) {
        if(obj_id.equals(session.creatures[i]._id)) {
          return session.creatures[i];
        }
      }
      return null;
    };
  
    app.db.creatures.find({'account_id': session.account._id, deleted: false}).toArray(function(err, result) {
      if(err) {
        throw new Error(err);
      }
      //Save any old creatures
      if(session.creatures.length > 0) {      
        app.db.creatures.insert(session.creatures)
      }
      console.log("Finished downloading creatures");
      session.creatures = result.concat(session.creatures);
      session.wait_for_creatures = false;
    });
    
    //Save all records
    session.on("save", function() {
      for(var i=0; i<session.creatures.length; ++i) {
        app.db.creatures.save(session.creatures[i]);
      }
    });
  });

  //Retrieve a creature
  app.server.get("/creatures/get", function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , session = app.accounts.getSession(session_id);

    if(!session) {
      res.writeHead(400);
      res.end("Missing/invalid session id");
      return;
    }
  
    var creature_id = parsed_url.query["creature_id"];
    if(!creature_id) {
      res.writeHead(400);
      res.end("Missing creature id");
      return;
    }
    
    console.log(parsed_url);
    
    console.log(creature_id);
    
    var creature = session.getCreature(creature_id);
    if(creature) {
      
      var local_copy = {
          _id:    creature._id.toString()
        , name:   creature.name
        , bodies: creature.bodies
        , joints: creature.joints
      };
      
      app.emit("get_creature", local_copy, creature, session);
    
      res.writeHead(200);
      res.end(JSON.stringify(local_copy));
      return;
    } else {
      res.writeHead(400);
      res.end("Insufficient privileges to access creature");
      return;
    }
  });
  
  //Save a creature
  app.server.post("/creatures/save", function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , session = app.accounts.getSession(session_id);

    if(!session) {
      res.writeHead(400);
      res.end("Missing/invalid session id");
      return;
    }
    
    //TODO: Read creature from request body
    var creature = req.body;
    if(!creature) {
      res.writeHead(400);
      res.end("Missing creature");
      return;
    }
    
    validateCreature(creature, session, function(err, creature_doc) {
      if(err) {
        res.writeHead(400);
        res.end(err);
        return;
      }
      
      creature_doc.account_id = session.account._id;
      
      console.log(creature_doc);
      
      if('_id' in creature_doc) {
        if(session.wait_for_creatures) {
          res.writeHead(400);
          res.end("Waiting for database");
          return;
        }
        
        //Look up creature in list
        var creature = session.getCreature(creature_doc._id);
        if(creature) {
          updateCreature(creature, creature_doc);
          res.writeHead(200);
          res.end(creature._id.toString());
          return;
        } else {
          res.writeHead(400);
          res.end("Invalid creature id");
          return;
        }
      } else {
        var creature = createNewCreature(creature_doc);
        session.creatures.push(creature);
        if(!session.wait_for_creatures) {
          app.db.creatures.save(creature, function(err, result) {
            res.writeHead(200);
            res.end(result._id.toString());
            return;
          });
        } else {
          res.writeHead(400);
          res.end("Database is lagging.  Please wait a few moments for changes to propagate.");
          return;
        }
      }
    });
  });
  
  //Remove a creature
  app.server.get("/creatures/delete", function(req, res) {
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , session = app.accounts.getSession(session_id);

    if(!session) {
      res.writeHead(400);
      res.end("Missing/invalid session id");
      return;
    }
    
    var creature_id = parsed_url.query["creature_id"];
    if(!creature_id || typeof(creature_id) != "string") {
      res.writeHead(400);
      res.end("Missing creature_id");
      return;
    }
    
    if(session.wait_for_creatures) {
      res.writeHead(400);
      res.end("Not connected to database");
      return;
    }
    
    var obj_id = new ObjectID(creature_id);
    for(var i=0; i<session.creatures.length; ++i) {
      if(obj_id.equals(session.creatures[i]._id)) {
        var C = session.creatures[i];
        session.creatures.splice(i, 1);
        
        C.deleted = true;
        C.deleted_at = new Date();
        app.emit("delete_creature", C);
        app.db.creatures.save(C);
        
        res.writeHead(200);
        res.end("Success");
        return;
      }
    }
    
    res.writeHead(400);
    res.end("Error deleting creature/invalid id");
    return;
  });

  //List all creatures attached to an account
  app.server.get("/creatures/list", function(req, res) {  
    var parsed_url = url.parse(req.url, true)
      , session_id = parsed_url.query["session_id"]
      , session = app.accounts.getSession(session_id);

    if(!session) {
      res.writeHead(400);
      res.end("Missing/invalid session id");
      return;
    }
    
    session.poke();
    
    var result = [];
    for(var i=0; i<session.creatures.length; ++i) {
      if(session.creatures[i]._id) {
        result.push({
            name:session.creatures[i].name
          , creature_id: session.creatures[i]._id.toString()
        });
      }
    }
    
    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  });

  app.db.bind('creatures');
  app.db.creatures.ensureIndex([['account_id', 1]], false, function(err, replies) {
    if(err) {
      cb(err);
      return;
    }
    cb(null);
  });
}
