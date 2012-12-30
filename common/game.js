"use strict";
var Box2D = require('./box2d.js')
  , EventEmitter = require('events').EventEmitter;
  
var b2AABB          = Box2D.Collision.b2AABB
  , b2Vec           = Box2D.Common.Math.b2Vec2
  , b2Mat22         = Box2D.Common.Math.b2Mat22
  , b2Transform     = Box2D.Common.Math.b2Transform
  , b2BodyDef       = Box2D.Dynamics.b2BodyDef
  , b2Body          = Box2D.Dynamics.b2Body
  , b2FixtureDef    = Box2D.Dynamics.b2FixtureDef
  , b2Fixture       = Box2D.Dynamics.b2Fixture
  , b2World         = Box2D.Dynamics.b2World
  , b2MassData      = Box2D.Collision.Shapes.b2MassData
  , b2Shape         = Box2D.Collision.Shapes.b2Shape
  , b2PolygonShape  = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape   = Box2D.Collision.Shapes.b2CircleShape
  , b2DebugDraw     = Box2D.Dynamics.b2DebugDraw
  , b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;


//Validates a creature serialization
exports.validateCreature = function(obj) {
  if(!obj.bodies || !obj.joints) {
    return false;
  }
  this.bodies.length = 0;
  for(var i=0; i<obj.bodies.length; ++i) {
    var b = obj.bodies[i];
    if(!(typeof(b.x) === 'number'
      && typeof(b.y) === 'number'
      && typeof(b.w) === 'number'
      && typeof(b.h) === 'number'
      && typeof(b.r) === 'number')) {
        return false;
    }
  }
  this.joints.length = 0;
  for(var i=0; i<obj.joints.length; ++i) {
    var j = obj.joints[i];
    if(!(typeof(j.a) === 'number'
      && typeof(j.b) === 'number'
      && typeof(j.x) === 'number'
      && typeof(j.y) === 'number'
      && 0 <= j.a && j.a < this.bodies.length
      && 0 <= j.b && j.b < this.bodies.length)) {
        return false;
    }
  }
  return true;
}


function Creature(params) {
  this.simulation = params.simulation;
  this.name       = params.name;
  this.color      = params.color;
}

Creature.prototype.addBody = function(def) {
  var bodyDef   = new b2BodyDef
    , fixDef    = new b2FixtureDef;
    
  bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.x = def.x;
  bodyDef.position.y = def.y;
  bodyDef.angle      = def.r;
  bodyDef.linearDamping = this.simulation.damping_factor;
  bodyDef.angularDamping = this.simulation.damping_factor;

  fixDef.shape = new b2PolygonShape;
  fixDef.shape.SetAsBox(def.w/2.0, def.h/2.0);
  fixDef.density      = 1.0;
  fixDef.friction     = 0.5;
  fixDef.restitution  = 0.2;
  
  var body      = this.simulation.world.CreateBody(bodyDef)
    , fixture   = body.CreateFixture(fixDef);
    
  body.SetUserData({
      creature: this
    , color:    this.color
    , width:    def.w
    , height:   def.h
  });
  
  return body;
}

Creature.prototype.removeBody = function(body) {
  var ud = body.GetUserData();
  if(ud.creature != this) {
    return;
  }
  this.simulation.world.DestroyBody(body);
}

Creature.prototype.addJoint = function(def) {
  
  var jointDef = new b2RevoluteJointDef;
  jointDef.collideConnected = false;
  jointDef.bodyA = def.a;
  jointDef.bodyB = def.b;
  jointDef.maxMotorTorque = def.p;

  var fix_p = new b2Vec(def.x, def.y);
  
  jointDef.localAnchorA = jointDef.bodyA.GetLocalPoint(fix_p);
  jointDef.localAnchorB = jointDef.bodyB.GetLocalPoint(fix_p);
  
  var joint = this.simulation.world.CreateJoint(jointDef);
  joint.SetUserData({
      creature: this
    , power:    def.p
  });
  
  return joint;
}

Creature.prototype.removeJoint = function(joint) {
  var ud = joint.GetUserData();
  if(ud.creature != this) {
    return;
  }
  this.simulation.world.DestroyJoint(joint);
}

Creature.prototype.getBodies = function() {
  var result = []
    , cur = this.simulation.world.GetBodyList();
  while(cur) {
    var ud = cur.GetUserData();
    if(ud && (ud.creature === this)) {
      result.push(cur);
    }
    cur = cur.GetNext();
  }
  return result;
}

Creature.prototype.getJoints = function() {
  var result = []
    , cur = this.simulation.world.GetJointList();
  while(cur) {
    var ud = cur.GetUserData();
    if(ud && (ud.creature === this)) {
      result.push(cur);
    }
    cur = cur.GetNext();
  }
  return result;
}

Creature.prototype.serialize = function() {
  var bodies = this.getBodies()
    , joints = this.getJoints()
    , bodies_serialized = []
    , joints_serialized = []; 
  for(var i=0; i<bodies.length; ++i) {
    var B = bodies[i]
      , pos = B.GetPosition()
      , ang = B.GetAngle()
      , ud  = B.GetUserData(); 
    bodies_serialized.push({
        x: pos.x
      , y: pos.y
      , r: ang
      , w: ud.width
      , h: ud.height
    });
  }
  for(var i=0; i<joints.length; ++i) {
    var J = joints[i]
      , abod = J.GetBodyA()
      , bbod = J.GetBodyB()
      , aidx = 0
      , bidx = 0
      , pos = J.GetAnchorA();
    for(var j=0; j<bodies.length; ++j) {
      if(bodies[j] === abod) {
        aidx = j;
      }
      if(bodies[j] === bbod) {
        bidx = j;
      }
    }
    joints_serialized.push({
        a: aidx
      , b: bidx
      , x: pos.x
      , y: pos.y
      , p: J.GetUserData().power
    });
  }
  return {
      bodies: bodies_serialized
    , joints: joints_serialized
  };
}

Creature.prototype.clone = function() {
  var copy = new Creature();
  copy.deserialize(this.serialize);
  return copy;
}

function Game(world_x, world_y) {
  this.world = new b2World(new b2Vec(0, 10), true);
  this.world_dims = new b2Vec(world_x, world_y);
  this.draw_scale = 30.0;
  this.creatures = {};
  this.damping_factor = 0.01;
  this.edit_mode = false;
  
  //Create arena boundaries
  var fixDef = new b2FixtureDef;
  fixDef.density      = 1.0;
  fixDef.friction     = 0.5;
  fixDef.restitution  = 0.2;
  fixDef.shape        = new b2PolygonShape;
  
  var bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_staticBody;
  
  //Create floors
  fixDef.shape.SetAsBox(world_x*0.5, world_y * 0.05);  
  bodyDef.position.Set(world_x*0.5, 0);
  this.world.CreateBody(bodyDef).CreateFixture(fixDef);
  bodyDef.position.Set(world_x*0.5, world_y);
  this.world.CreateBody(bodyDef).CreateFixture(fixDef);
  
  fixDef.shape.SetAsBox(world_y*0.05, world_x * 0.5);  
  bodyDef.position.Set(0, world_y*0.5);
  this.world.CreateBody(bodyDef).CreateFixture(fixDef);
  bodyDef.position.Set(world_x, world_y*0.5);
  this.world.CreateBody(bodyDef).CreateFixture(fixDef);
  
  //Create contact filter
  this.world.SetContactFilter({
      simulation: this
    , RayCollide: function() { return true; }
    , ShouldCollide: function(f0, f1) {
      if(this.simulation.edit_mode) {
        var b0 = f0.GetBody()
          , b1 = f1.GetBody()
          , u0 = b0.GetUserData()
          , u1 = b1.GetUserData();
        return u0 && u1 && (u0.creature != u1.creature);
      } else {
        return true;
      }
    }
  });
}

//Set gravity for the game
Game.prototype.setGravity = function(x, y) {
  this.world.SetGravity(new b2Vec(x,y));
}

//Serialize game state
Game.prototype.serialize = function() {
}

//Deserialize world
Game.prototype.deserialize = function(state) {
}

//Step 1x
Game.prototype.step = function() {
  this.world.Step(
      1.0 / 60.0   //frame-rate
    , 10           //velocity iterations
    , 10           //position iterations
  );
  this.world.ClearForces();
}

//Set drawing canvas
Game.prototype.setCanvas = function(canvas_id, scale) {
  var canvas      = document.getElementById(canvas_id)
    , context     = canvas.getContext("2d")
    , debugDraw   = new b2DebugDraw();
    
  this.draw_scale = scale;
  debugDraw.SetSprite(context);
  debugDraw.SetDrawScale(scale);
  debugDraw.SetFillAlpha(0.3);
  debugDraw.SetLineThickness(1.0);
  debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
  this.world.SetDebugDraw(debugDraw);
}

//Draw the game
Game.prototype.draw = function() {
  this.world.DrawDebugData();
}

//Add a creature
Game.prototype.addCreature = function(obj, flip, t, name, color) {
  if(name in this.creatures) {
    this.removeCreature(name);
  }

  //Create creature
  var creature  = new Creature({
      simulation: this
    , name:       name
    , color:      color
  });
  this.creatures[name] = creature;
  
  //Create bodies
  var bodies = [];
  for(var i=0; i<obj.bodies.length; ++i) {
    var B = obj.bodies[i];
    bodies.push(creature.addBody({
        x: t.x + (flip ? -B.x-B.w : B.x)
      , y: t.y + B.y
      , r: flip ? -B.r : B.r
      , w: B.w
      , h: B.h
    }));
  }
  
  //Create joints
  for(var i=0; i<obj.joints.length; ++i) {
    var J = obj.joints[i];
    creature.addJoint({
        a: bodies[J.a]
      , b: bodies[J.b]
      , x: t.x + (flip ? -J.x : J.x)
      , y: t.y + J.y
      , p: J.p
    });
  }
  
  return this.creatures[name];
}

Game.prototype.removeCreature = function(name) {
  if(!(name in this.creatures)) {
    return;
  }
  var C = this.creatures[name]
    , joints = C.getJoints()
    , bodies = C.getBodies();
  for(var i=0; i<joints.length; ++i) {
    C.removeJoint(joints[i]);
  }
  for(var i=0; i<bodies.length; ++i) {
    C.removeBody(bodies[i]);
  }
  delete this.creatures[name];
}

Game.prototype.getCreature = function(name) {
  return this.creatures[name];
}

//Selects a body or joint
Game.prototype.queryBox = function(x0, y0, x1, y1) {
  var bodies = []
    , joints = [];
  
  var aabb = new b2AABB();
  aabb.lowerBound.Set(x0, y0);
  aabb.upperBound.Set(x1, y1);
  
  var box_shape = new b2PolygonShape()
    , mat = new b2Mat22()
  mat.SetIdentity();
  var xform = new b2Transform(new b2Vec(x0, y0), mat);
  box_shape.SetAsBox((x1-x0)*0.5, (y1-y0)*0.5);
  
  this.world.QueryAABB(function(fixture) {
    var B = fixture.GetBody();
    if(B.GetType() !== b2Body.b2_staticBody) {
      var poly_shape = fixture.GetShape()
        , poly_xform = B.GetTransform(); 
      if(b2Shape.TestOverlap(box_shape, xform, poly_shape, poly_xform)) {
        bodies.push(B);
      }
    }
    return true;
  }, aabb);
  
  var cur = this.world.GetJointList();
  while(cur) {
    var anchor = cur.GetAnchorA();
    if(   x0 <= anchor.x && anchor.x <= x1
      &&  y0 <= anchor.y && anchor.y <= y1 ) {
        joints.push(cur);
    }
    cur = cur.GetNext();
  }
  
  return {
      bodies: bodies
    , joints: joints
  };
}

exports.Game = Game;

