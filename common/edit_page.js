"use strict";

var EDIT_DAMPING = 10.0;

var misc = require('./misc.js')
  , error_handler
  , Game = require('./game.js').Game
  , Box2D = require('./box2d.js')
  , tick_interval
  , animate = require('./animation.js')
  , simulation
  , mouse
  , box_start
  , drag_joint = null
  , creature = null
  , page_loaded = false
  , creature_list = null;

var b2AABB          = Box2D.Collision.b2AABB
  , b2Vec           = Box2D.Common.Math.b2Vec2
  , b2Mat           = Box2D.Common.Math.b2Mat22
  , b2BodyDef       = Box2D.Dynamics.b2BodyDef
  , b2Body          = Box2D.Dynamics.b2Body
  , b2FixtureDef    = Box2D.Dynamics.b2FixtureDef
  , b2Fixture       = Box2D.Dynamics.b2Fixture
  , b2World         = Box2D.Dynamics.b2World
  , b2MassData      = Box2D.Collision.Shapes.b2MassData
  , b2PolygonShape  = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape   = Box2D.Collision.Shapes.b2CircleShape
  , b2DebugDraw     = Box2D.Dynamics.b2DebugDraw
  , b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;

function tickEditPage() {
  var gravity = document.getElementById("editGravity").checked;
  
  if(gravity) {
    simulation.setGravity(0, 10);
  } else {
    simulation.setGravity(0, 0);
  }
  
  if(drag_joint) {
    drag_joint.SetTarget(new b2Vec(mouse.x, mouse.y));    
  }
  simulation.step();
}

function drawEditPage() {
  simulation.draw();
  
  var ctx = document.getElementById("editCanvas").getContext("2d");
  if(box_start.active) {  
    var x0 = Math.min(mouse.x, box_start.x) * simulation.draw_scale
      , x1 = Math.max(mouse.x, box_start.x) * simulation.draw_scale
      , y0 = Math.min(mouse.y, box_start.y) * simulation.draw_scale
      , y1 = Math.max(mouse.y, box_start.y) * simulation.draw_scale;
    ctx.fillStyle = "rgba(200, 20, 40, 50)";
    ctx.fillRect(x0, y0, x1-x0, y1-y0);
  }
}

function resetCreature() {
  simulation.addCreature(creature, false, {x:0, y:0}, "EditCreature", [0.8, 0.8, 0.8]);
  refresh();
}

function newCreature() {
  creature = {
      name: "Untitled"
    , bodies: []
    , joints: []
  };
  resetCreature();
}

function saveCreatureAs() {
  var creatureName = prompt("Enter a name for this creature:");
  if(!creatureName) {
    return;
  }
  
  if('_id' in creature) {
    delete creature._id;
  }
  
  //Serialize and save creature
  var serialized = simulation.getCreature("EditCreature").serialize();
  creature.name = creatureName;
  creature.bodies = serialized.bodies;
  creature.joints = serialized.joints;
  refresh();
   
  misc.http_post("/creatures/save", creature, function(err, result) {
    if(!page_loaded) {
      return;
    }
    if(err) {
      throw new Error(err);
    }
    
    creature._id = result;
    refresh();
  });
}

function saveCreature() {
  if(!creature._id) {
    saveCreatureAs();
    return;
  }
  
  //Serialize and save creature
  var serialized = simulation.getCreature("EditCreature").serialize();
  creature.bodies = serialized.bodies;
  creature.joints = serialized.joints;
   
  misc.http_post("/creatures/save", creature, function(err, result) {
    if(!page_loaded) {
      return;
    }
    if(err) {
      throw new Error(err);
    }
    refresh();
  });
}

function loadCreature() {
  var entry = creature_list.getSelectedCreature();
  if(!entry) {
    return;
  }

  //Load creature
  misc.http_request("/creatures/get", { creature_id: entry.creature_id }, function(err, result) {
    if(err) {
      throw new Error(err);
    } 
    creature = JSON.parse(result);
    resetCreature();
    refresh();
  });
}

function deleteCreature(creature_id) {
  var entry = creature_list.getSelectedCreature();
  if(!entry) {
    return;
  }

  if(entry.creature_id == creature._id) {
    creature.name = "Untitled";
    delete creature._id;
    refresh();
  }
  
  misc.http_request("/creatures/delete", {creature_id: entry.creature_id}, function(err, result) {
    if(err) {
      throw new Error(err);
    }
    refresh();
  });
}

function goBack() {
  var ok = confirm("Unsaved changes will be lost.  Continue?");
  if(ok) {
    require('./entry.js').setPage(require('./lobby_page.js'));
  }
}

//Update page
function refresh() {
  creature_list.update();  
  var name = document.getElementById("editCreatureName");
  name.innerHTML = "";
  name.appendChild(document.createTextNode(creature.name));
}


function toggleGravity() {
  var gravity = document.getElementById("editGravity").checked
    , bodies = simulation.getCreature("EditCreature").getBodies();
  if(!gravity) {
    simulation.edit_mode = true;
    for(var i=0; i<bodies.length; ++i) {
      bodies[i].SetLinearDamping(EDIT_DAMPING);
      bodies[i].SetAngularDamping(EDIT_DAMPING);
      bodies[i].SetAwake(true);
    }
    simulation.damping_factor = EDIT_DAMPING;
  } else {
    simulation.edit_mode = false;
    for(var i=0; i<bodies.length; ++i) {
      bodies[i].SetLinearDamping(0.01);
      bodies[i].SetAngularDamping(0.01);
      bodies[i].SetAwake(true);
    }
    simulation.damping_factor = 0.01;
  }
}

//Mouse click events
function handleClick(tool) {  
  if(tool === "box") {
    //Create a box
    if(mouse.down) {
      box_start.x = mouse.x;
      box_start.y = mouse.y;
      box_start.active = true;
    } else {
      box_start.active = false;      
      var x0 = Math.min(mouse.x, box_start.x)
        , x1 = Math.max(mouse.x, box_start.x)
        , y0 = Math.min(mouse.y, box_start.y)
        , y1 = Math.max(mouse.y, box_start.y);
      if(   y1 - y0 > 0.5
         && x1 - x0 > 0.5) {
        simulation.getCreature("EditCreature").addBody({
            x: (x0+x1) * 0.5
          , y: (y0+y1) * 0.5
          , r: 0
          , w: (x1-x0)
          , h: (y1-y0)
        });
      }
    }
  } else if(tool === "move") {
    //Move body on top
    if(mouse.down) {
      var result = simulation.queryBox(mouse.x-0.001, mouse.y-0.001, mouse.x+0.001, mouse.y+0.001);
      if(result.bodies.length === 0) {
        return;
      }
      var body = result.bodies[0];
      
      var md = new b2MouseJointDef();
      md.bodyA = simulation.world.GetGroundBody();
      md.bodyB = body;
      md.target.Set(mouse.x, mouse.y);
      md.collideConnected = true;
      md.maxForce = 300.0 * body.GetMass();
      drag_joint = simulation.world.CreateJoint(md);
      drag_joint.SetUserData({
          creature: null
        , power: 9000
      });
      body.SetAwake(true);
    
    } else if(drag_joint) {
      //Remove mouse joint
      simulation.world.DestroyJoint(drag_joint);
      drag_joint = null;
    }
    
  } else if(tool === "joint") {
    //Create a joint between two bodies
    
    if(mouse.down) {
      var result = simulation.queryBox(mouse.x-0.001, mouse.y-0.001, mouse.x+0.001, mouse.y+0.001);
      if(result.bodies.length >= 2) {
        simulation.getCreature("EditCreature").addJoint({
            a: result.bodies[0]
          , b: result.bodies[1]
          , p: 10
          , x: mouse.x
          , y: mouse.y
        });
      }
    }
    
  } else if(tool === "delete") { 
    //Delete stuff
    if(mouse.down) {
      var result = simulation.queryBox(mouse.x-0.5, mouse.y-0.5, mouse.x+0.5, mouse.y+0.5);
      if(result.joints.length > 0) {
        simulation.getCreature("EditCreature").removeJoint(result.joints[0]);
      } else if(result.bodies.length > 0) {
        for(var i=0; i<result.bodies.length; ++i) {
          var B = result.bodies[i];
          if(B.GetFixtureList().TestPoint(new b2Vec(mouse.x, mouse.y) ) ) {
            simulation.getCreature("EditCreature").removeBody(result.bodies[i]);
            break;
          }
        }
      }
    }
  }
}

//Start page
exports.startPage = function() {

  page_loaded = true;

  error_handler = require('./error_handler.js').createErrorHandler('editErrors');
  var edit_page = document.getElementById("editPage");  
  edit_page.style.display = "block";

  //Create creature list
  creature_list = require('./creature_list.js').createCreatureList("editCreatureList");
  
  mouse = {x: 0, y:0, down:false };
  box_start = { x:0, y:0, active: false };
  drag_joint = null;

  //Register simulation stuff
  simulation = new Game(600/30.0, 400/30.0);
  simulation.setCanvas("editCanvas", 30.0);
  
  //Reset current creature 
  newCreature();

  //Set up buttons
  document.getElementById("editNew").onclick = newCreature;
  document.getElementById("editSave").onclick = saveCreature;
  document.getElementById("editSaveAs").onclick = saveCreatureAs;
  document.getElementById("editLoad").onclick = loadCreature;
  document.getElementById("editDelete").onclick = deleteCreature;
  document.getElementById("editBack").onclick = goBack;

  //Set up gravity control
  document.getElementById("editGravity").checked = false;
  document.getElementById("editGravity").onchange = toggleGravity;
  toggleGravity();
  
  
    
  //Hook mouse listeners
  var canvas = document.getElementById("editCanvas");
  canvas.onmousedown = function(ev) {
    if(!mouse.down) {
      mouse.down = true;
      handleClick(document.getElementById("editTool").value);
    }
  }; 
  canvas.onmouseup = function(ev) {
    if(mouse.down) {
      mouse.down = false;
      handleClick(document.getElementById("editTool").value);
    }
  };
  canvas.onmousemove = function(ev) {
    var pos = misc.getElementPosition(canvas);
    mouse.x = (ev.clientX - pos.x) / simulation.draw_scale;
    mouse.y = (ev.clientY - pos.y) / simulation.draw_scale;
    
    //Don't let mouse drag outside region
    if(mouse.down && (
        mouse.x < 0 
     || mouse.y < 0 
     || mouse.x > canvas.width / simulation.draw_scale
     || mouse.y > canvas.height / simulation.draw_scale ) ) {
     
      mouse.down = false;
      handleClick(document.getElementById("editTool").value);
    }
  };
  canvas.onmouseout = function(ev) {
    if(mouse.down) {
      mouse.down = false;
      handleClick(document.getElementById("editTool").value);
    }
  };
  
  //Hook hotkeys
  document.onkeydown = function(ev) {
    //TODO: Handle hotkeys here
  }

  //Start animations
  tick_interval = setInterval(tickEditPage, 20);
  animate.onframe = drawEditPage;
  
  refresh();
}

exports.stopPage = function() {
  
  page_loaded = false;
  
  creature_list.destroy();

  var canvas = document.getElementById("editCanvas");
  canvas.onmousedown = canvas.onmouseup = canvas.onmousemove = canvas.onmouseout = null;
  document.onkeypress = null;
  clearInterval(tick_interval);
  simulation = null;
  drag_joint = null;
  animate.onframe = null;
  document.getElementById("editPage").style.display = "none";
  error_handler.destroy();
}

