
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , mongo = require('mongodb');

var app = express();
var hostUrl = 'http://entranceapp.herokuapp.com'
var mongo = require('mongodb');
var Db = mongo.Db;
var mongoUri = process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/mydb'; 


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('dburl', process.env.MONGOLAB_URI || 'mongodb://localhost:27017/entranceDB');
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
    app.use(express.cookieParser());
  app.use(express.cookieSession({
    secret: 'entranceapp'
  }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


app.get('/:facebookID/tracks', function(req, res) {
  if (!req.session.access_token) {
    console.log("No access token. Asking gate-keeper for it.");

    // Request Access Token from GateKeeper
    HTTP_GET('fb-gate-keeper.herokuapp.com', '/entrance/' + req.params.facebookID + '/token', function(error, jsonResponse) {
      if (error) {
        console.log("Error retrieveing access token: " + error.message);
        return;
      }
      console.log(jsonResponse);
    })

  }

  // Once we have the access token, retrieve all the user source preferences from the db 
  // (we may need several access tokens for different services?)

  // Retrieve appropriate songs from each of the sources

  // Package up the songs into JSON?

  // Send them out

  var tracks = {'tracks' : [
      {'artist' : 'Incubus', 'song' : 'Drive' } , {'artist' : 'The Postal Service', 'song' : 'Such Great Heights' }
  ]};

  res.send(tracks);
});

/*
 * Wrapper method for HTTP GETs
 */
function HTTP_GET(hostname, path, callback) {
    console.log("Making GET to " + hostname + path);
    // Configure our get request
    var options = {
      host: hostname,
      path: path
    };

   http.get(options, function(res) {
    var output = '';
    var jsonResult;
    res.on('error', function(e) {
      console.log('HTTP Error!');
      callback(e, null);
    });

    res.on('data', function(chunk) {
      output+= chunk;
    });

    res.on('end', function() {
      // console.log("Server Response: " + output);
      console.log("Status Code: " + res.statusCode);
      callback (null, JSON.parse(output));
    });
  });
}


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
