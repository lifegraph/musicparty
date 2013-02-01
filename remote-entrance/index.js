
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , StreamingSession = require('./models/StreamingSession')
  , mongoose = require('mongoose')
  , sp = require('libspotify')
  , assert = require('assert');

var app = express();
var hostUrl = 'http://entranceapp.herokuapp.com';
var gateKeeper = require("./gate-keeperClient.js");
var db;

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
    getCurrentStreamingSession(req.params.localEntranceId, function (error, currentStreamingSession) {

      // If this person is already in the room, delete them
      indexOfStreamingUser(req.params.localEntranceId, user, function (err, index) {

        // If the 
        if (index != -1) {
          console.log("User already in room!");

          console.log("User already in room... deleting user from room.")
          // Update the current streaming users

          removeUserFromStreamingUsers(req.params.localEntranceId, user, function () {

            // If there are no more users 
            if (!currentStreamingSession.streamingUsers.length) {

              console.log("No users remaining in room!");

              // Let the client know to stop playing
              return res.send(stringify({'action' : 'stop'}));
            }
          });
        } 
        else {
          console.log("User NOT already in room!");

          // Add the user to the array
          console.log("Adding user to array.");

          addUserToStreamingUsers(req.params.localEntranceId, user, function() {
          // Grab the tracks for these new users
            // getTracksForUsers(currentStreamingUsers);


              // Once we have the user, retrieve all the user source preferences from the db 
              // (we may need several access tokens for different services?)

              // Retrieve appropriate songs from each of the sources

              // Package up the songs into JSON?

            // getFacebookFavoriteArtists(user, null);
            getFacebookFavoriteArtists(user, function (artists) {
              getSongsFromArtists(artists, function(songs) {
                console.log(songs);
                res.send(songs);
              });
            });  
          });
        }
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
 * Poll Facebook to find the favorite artists
 * of a user, then call a callback with the list of artists' names
 */
function getFacebookFavoriteArtists(facebookUser, callback) {

  // console.log("ACCESS TOKEN: " + facebookUser.access_token);

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
        // console.log("favtracks output for %s:", facebookUser.name);
        // console.log(output);
        var data = JSON.parse(output).data;
        callback(data.map(function (artist) { return artist.name;}));
      });
  });
}
/**
 * Gets the songs associated with each artist in the array artists.
 */

function getSongsFromArtists(artists, callback) {
      var loadedTracks = 0;
      if (!artists.length) {
        console.log("There are no artists.");
        return callback([]);
      }

      // For each artist
      artists.forEach(function(artist) {

        // Create a spotify search
        var search = new sp.Search("artist:" + artist);
        search.trackCount = 1; // we're only interested in the first result for now;

        // Execute the search
        search.execute();

        // When the search has been completed
        search.once('ready', function() {

          // If there aren't any searches
          if(!search.tracks.length) {
              console.error('there is no track to play :[');
              return;

          } else {

            // Add the track to the rest of the tracks
            tracks = tracks.concat(search.tracks);
          }

          // Keep track of how far we've come
          loadedTracks++;

          // If we've checked all the artists
          if (loadedTracks == artists.length) {
            // Shuffle up the tracks
            shuffle(tracks);

            // Call our callback
            callback(tracks);
          }
        });
      });
}

/*
 * Shuffles list in-place
 */
function shuffle(list) {
  var i, j, t;
  for (i = 1; i < list.length; i++) {
    j = Math.floor(Math.random()*(1+i));  // choose j in [0..i]
    if (j != i) {
      t = list[i];                        // swap list[i] and list[j]
      list[i] = list[j];
      list[j] = t;
    }
  }
}

function getUserFromStreamers(localEntranceId, userJSON, callback) {
  getCurrentStreamers(localEntranceId, function(err, currentStreamers) {
    if (!currentStreamers || err) {
      callback(err, null);
    } else {
      return callback(err, streamingUserForUserJSON(currentStreamers, userJSON));
    }
  });
}

function setCurrentStreamingSession(localEntranceId, streamingSession, callback) {
  getCurrentStreamingSession(localEntranceId, function (err, oldStreamingSession) {
    if (err) callback(err);
    if (!oldStreamingSession) oldStreamingSession = streamingSession;

    oldStreamingSession.streamingUsers = streamingSession.streamingUsers;
    
    oldStreamingSession.save(function (err) {
      callback(err);
    });
  });
}

function getCurrentStreamingSession(localEntranceId, callback) {
  assert(localEntranceId);
  StreamingSession.findOne( { localEntranceId : localEntranceId }, function(err, streamingSession) {
    if (err) {
      callback (err, null);
    } 
    else {
      if (!streamingSession) {
        streamingSession = new StreamingSession( {localEntranceId : localEntranceId});
        streamingSession.save(function (err) {
          if (err) return callback(err);
          else {
            return callback(null, streamingSession);
          }
        })
      } 
      callback(null, streamingSession);
    }
  })
}

function addUserToStreamingUsers(localEntranceId, user, callback) {
  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {
    streamingSession.streamingUsers.push(user);
    setCurrentStreamingSession(localEntranceId, streamingSession, function (err) {
      callback(err, streamingSession);
    });
  });
}

function removeUserFromStreamingUsers(localEntranceId, userInQuestion, callback) {

  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {
    for (var i = 0; i < streamingSession.streamingUsers.length; i++) {
      if (streamingSession.streamingUsers[i].id == userInQuestion.id) {
        streamingSession.streamingUsers.splice(i, 1);
        break;
      }
    }

    setCurrentStreamingSession(localEntranceId, streamingSession, callback);
  });
}

function indexOfStreamingUser (localEntranceId, userInQuestion, callback) {
  assert(userInQuestion, "user must not be null");
  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {

    if (err) return callback(err, -1);

    for (var i = 0; i < streamingSession.streamingUsers.length; i++) {
      if (streamingSession.streamingUsers[i].id == userInQuestion.id) {
        return callback(null, i);
      }
    }
    return callback(null, -1);
  });
}


function stringify(object) {
  return JSON.stringify(object, undefined, 2);
}

function initializeServerAndDatabase() {

  // Start database and get things running
  console.log("connecting to database at " + app.get('dburl'));
  mongoose.connect(app.get('dburl'));

  db = mongoose.connection;

  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback () {
    // yay!
    console.log("Connected to mongo.");

    // Start server.
    http.createServer(app).listen(app.get('port'), function(){
      console.log("Express server listening on port " + app.get('port'));
    });
  });
}


initializeServerAndDatabase();