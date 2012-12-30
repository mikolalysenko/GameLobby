var tools = require('../common/tools.js')
  , util = require('util')
  , url = require('url')
  , querystring = require('querystring')
  , openid = require('openid');

exports.createAuthenticationService = function(app, cb) {
  "use strict";

  console.log("Starting authentication service...");

  //URL for lobby
  var lobby_url = app.options.http_url + app.options.lobby_page + '?session_id='
    , login_url = app.options.http_url + app.options.login_page;

  //Create OpenID relying party
  var relying_party = new openid.RelyingParty(
      app.options.http_url + 'verify'
    , null
    , false
    , false
    , []);

  //Try authenticating
  app.server.get('/authenticate', function(req, res) {
  
    var parsed_url = url.parse(req.url, true)
      , identifier = parsed_url.query["identifier"];
    
    if(!identifier) {
      res.writeHead(302, { Location: login_url + '?error=Missing%20identifier' });
      res.end();
      return;
    }
    
    //Check for temporary login
    if(identifier === "temporary") {
      app.accounts.temporaryLogin(function(err, session_id) {
        if(err) {
          res.writeHead(302, { Location: login_url + '?error=' + tools.escape_query("Error creating temporary login:" + err) });
          res.end();
          return;
        } else {
          res.writeHead(302, { Location: lobby_url + tools.escape_query(session_id) });
          res.end();
          return;
        }
      });
      return;
    }
    
    relying_party.authenticate(identifier, false, function(error, auth_url) {
      if (error || !auth_url) {
        res.writeHead(302, { Location: login_url + '?error=' + tools.escape_query("Error authenticating:" + error) });
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
        res.writeHead(302, { Location: login_url + '?error=' + escape("Error verifying:" + error) });
        res.end();
        return;
      }
      app.accounts.tryLogin(result.claimedIdentifier, function(err, session_id) {
        if(err) {
          res.writeHead(302, { Location: login_url + '?error=' + escape("Error getting account:" + err) });
          res.end();
          return;
        } else {
          res.writeHead(302, { Location: lobby_url + session_id });
          res.end();
        }
      });
    });
  });

  cb(null);
}

