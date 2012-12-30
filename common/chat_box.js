"use strict";

//Adds a chatbox control to the selected DOM element
exports.createChatBox = function(dom_element) {
  var socket = require('./misc.js').socket
    , chat_box = document.getElementById(dom_element);
  
  chat_box.innerHTML = "";
    
  var chat_log = document.createElement("div");
  chat_log.style["overflow-y"] = "auto";
  chat_log.style["overflow-x"] = "hidden";
  chat_log.style.height = "100%";
  chat_box.appendChild(chat_log);
  chat_log.innerHTML = "<b>Joining chat...</b>";
  
  var chat_text = document.createElement("input");
  chat_text.type = "text";
  chat_text.onkeydown = function(ev) {
    if(ev.keyCode === 13) {
      socket.send({
          event: "chat"
        , chat: chat_text.value
      });
      chat_text.value = "";
      ev.preventDefault();
    }
  };  
  chat_box.appendChild(chat_text);
  chat_box.style.width = "100%";
  
  function chatListener(obj) {
    chat_log.appendChild(document.createElement("br"));
    chat_log.appendChild(document.createTextNode(obj.player_name + ": " + obj.chat));
  }
  socket.on("chat", chatListener);
  
  function joinListener(obj) {
    chat_log.appendChild(document.createElement("br"));
    var bold = document.createElement("b");
    bold.appendChild(document.createTextNode(obj.player_name + " joined"));
    chat_log.appendChild(bold);
  }
  socket.on("join_room", joinListener);
  
  function leaveListener(obj) {
    chat_log.appendChild(document.createElement("br"));
    var bold = document.createElement("b");
    bold.appendChild(document.createTextNode(obj.player_name + " left"));
    chat_log.appendChild(bold);
  }
  socket.on("leave_room", leaveListener);
  
  return {
    destroy: function() {
      socket.removeListener("chat", chatListener);
      socket.removeListener("join_room", joinListener);
      socket.removeListener("leave_room", leaveListener);
    }
  };
}
