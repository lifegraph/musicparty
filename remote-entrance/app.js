
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
var gateKeeper = require("./gate-keeperClient.js");
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


app.get('/:localEntranceId/:facebookID/tracks', function(req, res) {
  gateKeeper.requestUser(req.params.facebookID, function(error, user) {
    // If we have an error, then there was a problem with the HTTP call
    // or the user isn't in the db and they need to sync
    if (error) {
      console.log("We had an error with Gatekeeper: " + error.message);
    } 

    // Else, we have the user... wooh!
    else if (user) {
      console.log("We got the user: " + user);
    }

  // Once we have the user, retrieve all the user source preferences from the db 
  // (we may need several access tokens for different services?)

  // Retrieve appropriate songs from each of the sources

  // Package up the songs into JSON?

  // Send them out
    var tracks = {'tracks' : [
      {'artist' : 'Incubus', 'song' : 'Drive' } , {'artist' : 'The Postal Service', 'song' : 'Such Great Heights' }
  ]};

  res.send(tracks);
  });
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
