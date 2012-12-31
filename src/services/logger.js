exports.createLoggingService = function(app, cb) {

  console.log("Starting logging service...");
  
  app.debug = function() {
    if(app.options.debug) {
      var args = Array.prototype.slice.call( arguments, 0 );
      args.unshift("[DEBUG]:");
      console.log.apply(console, args);
    }
  };
  
  app.log = function() {
    var args = Array.prototype.slice.call( arguments, 0 );
    args.unshift("[LOG]:");
    console.log.apply(console, args);
  };
  
  cb(null);
};
