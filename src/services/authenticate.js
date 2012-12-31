var querystring = require('querystring')
  , util = require('util')
  , url = require('url')
  , querystring = require('querystring')
  , openid = require('openid');

exports.createAuthenticationService = function(app, cb) {
  "use strict";
  
  console.log("Starting authentication service...");

  //URL for lobby
  var app_url = app.options.http_url + app.options.app_page;

  console.log("APP URL = ", app_url);

  //Create OpenID relying party
  var relying_party = new openid.RelyingParty(
      app.options.http_url + 'verify'
    , null
    , false
    , false
    , []);

  //Try authenticating via OpenID
  app.server.get('/authenticate', function(req, res) {
  
    var parsed_url = url.parse(req.url, true)
      , identifier = parsed_url.query["identifier"];
    
    if(!identifier) {
      res.writeHead(302, { Location: app_url + '?error=Missing%20identifier' });
      res.end();
      return;
    }
    
    //Check for temporary login
    if(identifier === "temporary") {
      app.accounts.temporaryLogin(req.ip, function(err, session_id) {
        if(err) {
          res.writeHead(302, { Location: app_url + '?error=' + querystring.escape("Error creating temporary login:" + err) });
          res.end();
          return;
        } else {
          app.log("Temporary account created: ", session_id, "IP Address: ", req.ip);
          res.cookie('session_id', session_id, {signed: true});
          res.writeHead(302, { Location: app_url });
          res.end();
          return;
        }
      });
      return;
    }
    
    relying_party.authenticate(identifier, false, function(error, auth_url) {
      if (error || !auth_url) {
        app.log("Error authenticating: ", error);
        res.writeHead(302, { Location: app_url + '?error=' + querystring.escape("Error authenticating:" + error) });
        res.end();
        return;
      } else {
        res.writeHead(302, { Location: auth_url });
        res.end();
        return;
      }
    });
  });
    
  //Verify identity assertion
  app.server.get('/verify', function(req, res) {
    relying_party.verifyAssertion(req, function(error, result) {
      if(error || !result.authenticated) {
        app.log("Error verifying login: ", error);
        res.writeHead(302, { Location: app_url + '?error=' + querystring.escape("Error verifying:" + error) });
        res.end();
        return;
      }
      app.accounts.tryLogin(result.claimedIdentifier, req.ip, function(error, session_id) {
        if(error) {
          app.log("Error creating account: ", error);
          res.writeHead(302, { Location: app_url + '?error=' + querystring.escape("Error getting account:" + error) });
          res.end();
          return;
        } else {
          app.log("Logged in: ", session_id, "IP Address: ", req.ip);
          res.cookie('session_id', session_id, {signed: true});
          res.writeHead(302, { Location: app_url });
          res.end();
        }
      });
    });
  });

  cb(null);
}

