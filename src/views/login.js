exports.create = function(client) {

  var providers = [
    {
      name: 'Google',
      url: 'https://www.google.com/accounts/o8/id'
    }, {
      name: 'Yahoo!',
      url: 'https://me.yahoo.com/'
    }, {
      name: 'MyOpenID',
      url: 'https://www.myopenid.com/'
    }, {
      name: 'Skip it',
      url: 'temporary'
    }
  ];
  
  var html = [ '<div align="center">' ];
  
  html.push('<p>');
  for(var i=0; i<providers.length; ++i) {
    html.push('<a href="authenticate?identifier=' + providers[i].url + '">' + providers[i].name + '</a>');
  }
  html.push('</p>');
  
  if("error" in client.querystring) {
    html.push('<p>');
    html.push(client.querystring["error"]);
    html.push('</p>');
  }
  
  html.push('</div>');

  return {
    name: "login",
    html: html.join("\n"),
    init: function() {
    },
    deinit: function() {
    }
  };
}