exports.createDBService = function(app, cb) {
  console.log("Starting database service...");
  app.db = require('mongoskin').db(app.options.db_url);
  cb(null);
}

