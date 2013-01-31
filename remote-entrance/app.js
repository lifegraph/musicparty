
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , Db = require('mongodb').Db
  , assert = require('assert');

var app = express();
var hostUrl = 'http://entranceapp.herokuapp.com'
var mongo = require('mongodb');
var gateKeeper = require("./gate-keeperClient.js");
var db;
var mongoUri = process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/mydb'; 

var streamingUsersDBNamespace = "streaming_users_db";
var currentStreamingUsers;


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


app.get('/:localEntranceId/:deviceId/tracks', function (req, res) {

  gateKeeper.requestUser(req.params.deviceId, function (error, user) {
    // If we have an error, then there was a problem with the HTTP call
    // or the user isn't in the db and they need to sync
    if (error) {
      console.log("We had an error with Gatekeeper: " + error.message);

      // Send something to the local entrance device to let it know if
      // a.) there was a network error or b.) the device needs to sync
    } 

    // Grab those who are already in the room 
    getCurrentStreamers(req.params.localEntranceId, function (error, currentStreamingUsers) {

      console.log(currentStreamingUsers);
      // If this person is already in the room, delete them
      if (currentStreamingUsers.indexOf(user) == 0) {

      console.log("User already in room!");
      removeUserFromStreamingSession(user);

      // Update the current streaming users
      delete currentStreamingUsers[user];

      // If there are no more users 
      if (!currentStreamingUsers.length) {

        console.log("No users remaining in room!");

        // Let the client know to stop playing
        return res.send(stringify({'action' : 'stop'}));
      }
    }

      console.log("User NOT already in room!");

      // Add the user to the array
      console.log("Adding user to array.");

      currentStreamingUsers.push(user);

      // Push the array back into the db
      setCurrentStreamers(req.params.localEntranceId, currentStreamingUsers, function(err, result) {


        getCurrentStreamers(req.params.localEntranceId, function (error, currentStreamingUsers) {

          console.log("Streamers after insert: " + currentStreamingUsers);

          // Grab the tracks for these new users
          getTracksForUsers(currentStreamingUsers);


          // Once we have the user, retrieve all the user source preferences from the db 
          // (we may need several access tokens for different services?)

          // Retrieve appropriate songs from each of the sources

          // Package up the songs into JSON?

          // getFacebookFavoriteArtists(user, null);

          // Send them out
          var tracks = {
            'tracks' : [
              { 'artist' : 'Incubus', 'song' : 'Drive' } , 
              { 'artist' : 'The Postal Service', 'song' : 'Such Great Heights'} ,
              { 'artist' : 'Death Cab For Cutie', 'song' : 'Summer Skin'},
              { 'artist' : 'The Last Bison', 'song' : 'Switzerland'} ,
              { 'artist' : 'Passion Pit', 'song' : 'Silvia'}
          ]};

          res.send(tracks);
        });
      });
    });
  });
});

/*
 * Wrapper method for HTTP GETs
 */
function HTTP_GET (hostname, path, callback) {
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

function getTracksForUsers(users) {

}

/*
 * Poll the appropriate sources to find the favorite artists and songs
 * of a user, then call a callback
 */
function getFacebookFavoriteArtists(facebookUser, callback) {

  console.log("ACCESS TOKEN: " + facebookUser.access_token);

  // Use the Facebook API to get all the music likes of a user
  var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: '/me/music?access_token=' + facebookUser.access_token
    };
  https.get(options, function(fbres) {
      var output = '';
      fbres.on('data', function (chunk) {
          //console.log("CHUNK:" + chunk);
          output += chunk;
      });

      fbres.on('end', function() {
        console.log("favtracks output for %s:", facebookUser.name);
        console.log(output);
        var data = JSON.parse(output).data;
        console.log(stringify(data.map(function (artist) { return artist.name;})));
        
      });
  });
}

// Start database and get things running
console.log("connecting to database at " + app.get('dburl'));
Db.connect(app.get('dburl'), {}, function (err, _db) {

  // Escape our closure.
  db = _db;

  // Define some errors.
  db.on("error", function(error){
    console.log("Error connecting to MongoLab.");
    console.log(error);
  });

  console.log("Connected to mongo.");

  // Start server.
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
});

function setCurrentStreamers(localDeviceId, streamingUsers, callback) {
  db.collection(streamingUsersDBNamespace, function(err, collection) {
    console.log("Setting streaming users: " + streamingUsers);    
    if (err) callback(err);
    else {
      collection.insert({localDeviceId: localDeviceId}, {
        'localDeviceId': localDeviceId,
        'streamingUsers': streamingUsers
      }, {upsert:true}, callback);
    }
  }); 
}

function getCurrentStreamers(localDeviceId, callback) {
  db.collection(streamingUsersDBNamespace, function(err, collection) {
    collection.findOne({'localDeviceId': localDeviceId}, function(err, item) {
      if (!item) {
        callback(err, []);
        return;
      } 
      console.log("Result: " + stringify(item));
      callback(err, item.streamingUsers);
    });
  });
}

// function getStreamers(localDeviceId, callback) {
//   db.collection(streamingUsersDBNamespace, function (err, collection) {
//     collection.findOne({
//       'localDeviceId': localDeviceId,
//     }, function(err, sessionStatus) {
//         if (err) callback(err, null);
//         else if (sessionStatus) callback(null, sessionStatus);
//         else callback(null, []);
//     });
//   });
// }

// function setStreamers (localDeviceId, streamers, callback) {
//   db.collection(streamingUsersDBNamespace, function(err, collection) {
//     collection.update({'localDeviceId': localDeviceId}, {
//       'streamers': streamers,
//     }, {safe: true, upsert: true}, callback);
//   });
// }

function removeUserFromStreamingSession(user, localDeviceId) {

}

function stringify(object) {
  return JSON.stringify(object, undefined, 2);
}
