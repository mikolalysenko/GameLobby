
exports.startPage = function() {
  error_handler = require('./error_handler.js').createErrorHandler('battleErrors');
  chat_box = require('./chat_box.js').createChatBox('battleChat');  
  var battle_page = document.getElementById("battlePage");
  battle_page.style.display = "block";
  
  //Initialize battle page
  
}

exports.stopPage = function() {

  //Stop battle page

  document.getElementById("battlePage").style.display = "none";
  chat_box.destroy();
  error_handler.destroy();
}

