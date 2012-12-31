var EventEmitter = require('events').EventEmitter;

function Room(params) {
  EventEmitter.call(this);
  this.room_name    = params.room_name;
  this.players      = [];
  this.capacity     = params.capacity || 2;
  this.min_capacity = params.min_capacity || 2;
  this.state        = "await_players";
  this.created_at   = new Date();
}

Room.prototype = new EventEmitter();

Room.prototype.gotoState = function(nstate) {
  this.emit("leave_state");
  this.state = nstate;
  this.emit("enter_state");
}

Room.prototype.summary = function() {
  return {
      room_name:    this.room_name
    , capacity:     this.capacity
    , num_players:  this.players.length
    , state:        this.state
    , created_at:   this.created_at
  };
};

Room.prototype.detailed_summary = function() {
  var summary = this.summary();
  summary.players = [];
  for(var i=0; i<this.players.length; ++i) {
    var pl = this.players[i];
    summary.players.push({
        name: pl.account.player_name
      , ready: pl.ready_for_game
    });
  }
  return summary;
};

Room.prototype.addPlayer = function(session) {
  this.players.push(session);
  this.emit("join", session);
}

Room.prototype.removePlayer = function(session) {
  this.emit("leave_room", session);
  for(var i=0; i<this.players.length; ++i) {
    if(this.players[i] === session) {
      this.players.splice(i, 1);
      break;
    }
  }
}

Room.prototype.close = function() {
  if(this.state === "closed") {
    return;
  }
  this.gotoState("closed");
  this.emit('close');
};

Room.prototype.set_ready = function(player, ready_state) {
  if(this.state === "await_players") {
    var all_ready = true
      , p_ready = true;
    for(var i=0; i<this.players.length; ++i) {
      p_ready &= this.players[i].ready_for_game;
      if(this.players[i] === player) {
        this.players[i].ready_for_game = ready_state;
      }
      all_ready &= this.players[i].ready_for_game;
    }
    if(all_ready !== p_ready) {
      if(all_ready) {
        this.emit("ready");
      } else {
        this.emit("stop_ready");
      }
    }
  }
}

exports.Room = Room;
