function Creature() {
  this.bodies     = [];
  this.joints     = [];
}

Creature.prototype.addBody = function(x, y, w, h, r) {
  var num = this.bodies.length;
  this.bodies.push({
      x: x
    , y: y
    , w: w
    , h: h
    , r: r
  });
  return num;
}

Creature.prototype.removeBody = function(num) {
  this.bodies.splice(num, 1);
  for(var i=this.joints.length-1; i>=0; --i) {
    var J = this.joints[i];
    if(  J.a === num
      || J.b === num) {
      this.removeJoint(i);
      continue;
    }
    if(J.a > num) {
      --J.a;
    }
    if(J.b > num) {
      --J.b;
    }
  }
}

Creature.prototype.addJoint = function(b0, b1, c_x, c_y, power) {
  var num = this.joints.length;
  this.joints.push({
      a: b0
    , b: b1
    , x: c_x
    , y: c_y
    , p: power
  });
  return num;
}

Creature.prototype.removeJoint = function(num) {
  this.joints.splice(num, 1);
}

Creature.prototype.serialize = function() {
  return {
      bodies: this.bodies
    , joints: this.joints
  };
}

Creature.prototype.deserialize = function(obj) {
  if(!obj.bodies || !obj.joints) {
    return false;
  }
  this.bodies.length = 0;
  for(var i=0; i<obj.bodies.length; ++i) {
    var b = obj.bodies[i];
    if(  typeof(b.x) === 'number'
      && typeof(b.y) === 'number'
      && typeof(b.w) === 'number'
      && typeof(b.h) === 'number'
      && typeof(b.r) === 'number' ) {
        this.addBody(b.x, b.y, b.w, b.h, b.r);
    }
  }
  this.joints.length = 0;
  for(var i=0; i<obj.joints.length; ++i) {
    var j = obj.joints[i];
    if(  typeof(j.a) === 'number'
      && typeof(j.b) === 'number'
      && typeof(j.x) === 'number'
      && typeof(j.y) === 'number'
      && 0 <= j.a && j.a < this.bodies.length
      && 0 <= j.b && j.b < this.bodies.length ) {
        this.addJoint(j.a, j.b, j.x, j.y);
    }
  }
  return true;
}

Creature.prototype.clone = function() {
  var copy = new Creature();
  copy.deserialize(this.serialize);
  return copy;
}

//Check creature
Creature.prototype.validate = function() {
  if(bodies.length > 30 || joints.length > 50) {
    return "Too many bodies";
  }

  //TODO: Perform other validation checks here

  return "";
}

exports.Creature = Creature;
