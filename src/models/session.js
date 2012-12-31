var EventEmitter = require('events').EventEmitter
  , crypto = require('crypto');


//Create a random string
function randomString() {
  var hash = crypto.createHash('sha256');
  hash.update("ashfh134na" + (new Date()).toISOString() + Math.floor(0xffffff * Math.random()).toString(32));
  return hash.digest('base64');
}

//Session data
function Session(account) {
  EventEmitter.call(this);
  
  this.account        = account;
  this.session_id     = randomString();
  this.last_poked     = new Date();
  this.logged_in      = true;
  this.state          = "lobby";
  this.room           = null;
  this.ready_for_game = false;
}

//Inherit from event emitter
Session.prototype = new EventEmitter();

//Update the session
Session.prototype.poke = function() {
  if(!this.logged_in) {
    return;
  }
  this.last_poked = new Date();
}

//Go to a state
Session.prototype.gotoState = function(nstate) {
  this.emit("leave_state");
  this.state = nstate;
  this.emit("enter_state");
}

//Save session
Session.prototype.save = function() {
  this.emit('save');
}

//Close session
Session.prototype.logout = function() {
  if(!this.logged_in) {
    return;
  }
  
  this.gotoState("logout");
  this.logged_in = false;
  this.account.logged_in = false;
  this.emit('logout');
  this.save();
}

Session.prototype.join = function(room) {
  this.room = room;
  this.ready_for_game = false;
  this.gotoState("in_room");
}

Session.prototype.leave = function() {
  this.room = null;
  this.ready_for_game = false;
  this.gotoState("lobby");
}

Session.prototype.toString = function() {
  return this.account.player_name + "(" + this.account.last_ip_address + ")";
}

exports.Session = Session;
