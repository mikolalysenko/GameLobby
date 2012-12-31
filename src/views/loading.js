var $ = require('jquery-browserify');

exports.create = function(client) {
  return {
    name: "loading",
    html: '<div align="center">Loading...</div>',
    init: function() {
      $.get("/status", function(data) {
        var msg = JSON.parse(data);
        client.gotoState(msg.state);
      });
    },
    deinit: function() {
    }
  };
}