exports.onframe = null;

var nextFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();


function frame() {
  if(exports.onframe) {
    exports.onframe();
  }
  nextFrame(frame);
}

frame();
