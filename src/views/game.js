exports.create = function(client) {
  return {
    name: "game",
    
    html: [
      "<div align=center>",
        "<p>Game</p>",
        "<canvas id='game_canvas'></canvas>",
      "</div>"
    ].join("\n"),
    
    init: function() {
    },
    
    deinit: function() {
    }
  };
}