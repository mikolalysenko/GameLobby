exports.create = function(client) {
  return {
    name: "edit_profile",
    
    html: [
      "<div align=center>",
        "<p>Edit Profile</p>",
        "<div>",
          "<p>Player name: <input type='text' id='player_name' value='Your game' /></p>",
          "<p>",
            "<input type='button' id='create_room' value='Start'/>",
            "<input type='button' id='back_to_lobby' value='Back'/>",
          "</p>",
        "</div>",
        "<div id='game_rooms'></div>",
      "</div>"
    ].join("\n"),
    
    init: function() {
      $("#back_to_lobby").click(function() {
        client.gotoState("lobby");
      });
    },
    
    deinit: function() {
    }
  };
}