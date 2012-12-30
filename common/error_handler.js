exports.createErrorHandler = function(dom_element) {
  var container = document.getElementById(dom_element);
  
  window.onerror = function(message, url, linenumber) {
    var error_element = document.createElement('p');
    container.appendChild(error_element);
    error_element.appendChild(document.createTextNode(message));
    var opacity = 5.0;
    error_element.style.opacity = 1.0;
    var interval = setInterval(function() {
      opacity -= 0.007;
      if(opacity <= 0.0) {
        container.removeChild(error_element);
        clearInterval(interval);
      } else if(opacity <= 1.0) {
        error_element.style.opacity = opacity;
      }
    }, 15);
  }


  return {
    destroy: function() {
      window.onerror = null;
      
    }
  };
}
