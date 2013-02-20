
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
  , assert = require('assert')
  , spawn = require('child_process').spawn
  , lifegraph = require("lifegraph")
  , rem = require('rem')
  , async = require('async');

/**
 * Configure application
 */

var app = express();
var hostUrl = 'http://entrance-tutorial.herokuapp.com';
var db;

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('dburl', process.env.MONGOLAB_URI || 'mongodb://localhost:27017/entranceDBtemp');
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

/**
 * Configure Lifegraph.
 */

lifegraph.configure('entrance-tutorial', "481848201872129", "f2696ba2416ae6a4cc9cbde1dddd6a5b");

/**
 * Routes
 */

app.get('/', function (req, res){
  res.render('index');
});

// Electric imp endpoint for Entrance taps.
app.post('/eimp/tap', function(req, res) {
  // Parse content.
  var deviceId = req.body.target;
  var pid = req.body.value; // assume whole body is the deviceId
  deviceId = deviceId.replace(/\u0010/g, ''); // don't know why this is here
  console.log("eimp with pid: %s and device id: %s", pid, deviceId);
  handleTap(deviceId, pid, function (json) {
    res.json(json);
  });
});

// NON-Electric imp endpoint for Entrance taps.
app.post('/tap', function(req, res) {
  // Parse content.
  var deviceId = req.body.deviceUUID;
  var pid = req.body.pID; // assume whole body is the deviceId
  console.log("device with pid: %s and device id: %s", pid, deviceId);
  handleTap(deviceId, pid, function (json) {
    res.json(json);
  });
});

app.get('/:deviceId/:pid/tap', function (req, res) {
  handleTap(req.params.deviceId, req.params.pid, function(json) {
    res.json(json);
  });
});

app.get('/:deviceId/party/json', function (req, res) {
  console.log("request for /party");
  getCurrentStreamingSession(req.params.deviceId, function (error, currentStreamingSession) {
    if (currentStreamingSession && currentStreamingSession.tracks) {
      res.json(currentStreamingSession.tracks);      
    } else {
      res.json([]);
    }
  });
});

app.get('/:deviceId/party/', function (req, res) {
  res.render('party', {title: 'Party'});
});

/**
 * Logic
 */

function handleTap (deviceId, pid, hollaback) {
  lifegraph.connect(pid, function (error, user) {
    // If we have an error, then there was a problem with the HTTP call
    // or the user isn't in the db and they need to sync
    if (error) {
      console.log("We had an error with lifegraph: " + error.message);
      
      return hollaback({'error': "We had an error with lifegraph: " + error.message});
      // Send something to the local entrance device to let it know if
      // a.) there was a network error or b.) the device needs to sync
    } 

    // Grab those who are already in the room 
    getCurrentStreamingSession(deviceId, function (error, currentStreamingSession) {


      indexOfStreamingUser(deviceId, user, function (err, index) {
        // If the user is in the room, delete them
        if (index != -1) {
          console.log("User already in room... deleting user from room.")
          // Update the current streaming users

          removeUserFromStreamingUsers(deviceId, user, function (err, newStreamingSession) {

            // If there are no more users 
            if (!newStreamingSession.streamingUsers.length) {

              console.log("No users remaining in room!");

              // Let the client know to stop playing

              setTracksToStreamingSession(deviceId, [], function(err, streamingSession) {
                
              });

              return hollaback({'action' : 'stop', 'message' : 'Empty session. Stopping Streaming.'});

            } else {
              // User left room, but people are still in room
              return hollaback({'action' : 'continue', 'message' : 'User removed from session. Reforming track list on server.'});
            }
          });
        } 
        else {
          console.log("User NOT already in room!");

          // Add the user to the array
          console.log("Adding user to array.");

          addUserToStreamingUsers(deviceId, user, function() {
            // console.log("num users in currentStreamingSession:" + currentStreamingSession.users.length);
            // if (currentStreamingSession.users.length > 0) {
              console.log("STOPPING THE PLAYER.")
            // }

            getFacebookFavoriteArtists(user, function (artists) {

              getTracksFromArtists(artists, function (tracks) {

                setTracksToStreamingSession(deviceId, tracks, function (err, streamingSession) {

                  console.log("Added", streamingSession.tracks.length, "tracks to", deviceId, "room");

                  if (err) {

                    console.log(err.message);

                    return hollaback({'error': err.message});
                  }
                    return hollaback({'action': 'play', 'message': 'User added to session. Reforming track list on server.'});
                });
              });
            });  
          });
        }
      });
    });
  });
}

/*
 * Poll Facebook to find the favorite artists
 * of a user, then call a callback with the list of artists' names
 */
function getFacebookFavoriteArtists (facebookUser, callback) {

  // console.log("ACCESS TOKEN: " + facebookUser.access_token);

  // Use the Facebook API to get all the music likes of a user
  var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: '/me/music?access_token=' + facebookUser.tokens.oauthAccessToken
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

function getTracksFromArtists (artists, callback) {
  if (!artists.length) {
    console.log("There are no artists.");
    return callback([]);
  }

  // Search tracks by each artist.
  async.map(artists.slice(0, 10), function (artist, next) {
    rem.json('http://ws.spotify.com/search/1/track.json').get({
      q: artist
    }, function (err, json) {
      next(null, json.tracks.filter(function (track) {
        return parseFloat(track.popularity) > 0.4;
      }).map(function (track) {
        return {
          artist: artist,
          track: track.name,
          url: track.href,
          popularity: parseFloat(track.popularity)
        };
      }));
    });
  }, function (err, tracks) {
    tracks = Array.prototype.concat.apply([], tracks);
    shuffle(tracks);
    callback(tracks);
  });
}

// Shuffles list in-place

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

function getUserFromStreamers(deviceId, userJSON, callback) {
  getCurrentStreamers(deviceId, function (err, currentStreamers) {
    if (!currentStreamers || err) {
      callback(err, null);
    } else {
      callback(err, streamingUserForUserJSON(currentStreamers, userJSON));
    }
  });
}

function setCurrentStreamingSession(deviceId, streamingSession, callback) {
  streamingSession.deviceId = deviceId;
  console.log(streamingSession);
  streamingSession.save(function (err) {
    return callback(err, streamingSession);
  });
}

function getCurrentStreamingSession(deviceId, callback) {

  assert(deviceId);
  StreamingSession.findOne({
    deviceId: deviceId
  }, function (err, streamingSession) {
    if (err) {
      return callback (err, null);
    } else {
      if (!streamingSession) {
        streamingSession = new StreamingSession({ deviceId : deviceId });
        streamingSession.save(function (err) {
          if (err) return callback(err);
          else {
            return callback(null, streamingSession);
          }
        })
      }
      // Else if blah blah blah 
      else {
        return callback(null, streamingSession);
      }
    }
  })
}

function addUserToStreamingUsers(deviceId, user, callback) {
  getCurrentStreamingSession(deviceId, function (err, streamingSession) {
    streamingSession.streamingUsers.push(user);
    setCurrentStreamingSession(deviceId, streamingSession, function (err) {
      return callback(err, streamingSession);
    });
  });
}

function setTracksToStreamingSession(deviceId, tracks, callback) {
  getCurrentStreamingSession(deviceId, function (err, streamingSession) {
    streamingSession.tracks = tracks;
    setCurrentStreamingSession(deviceId, streamingSession, function (err) {
      if (err) console.log("Error saving tracks!");
      return callback(err, streamingSession);
    });
  });
}

function removeTrackFromStreamingSession(deviceId, track, callback) {
  getCurrentStreamingSession(deviceId, function (err, streamingSession) {
    streamingSession.tracks.splice(streamingSession.tracks.indexOf(track), 1);
    setCurrentStreamingSession(deviceId, streamingSession, function (err, revisedStreamingSession) {
      if (err) console.log("Error saving tracks! " + err);
      return callback(err, revisedStreamingSession);
    });
  });
}

function removeUserFromStreamingUsers(deviceId, userInQuestion, callback) {

  getCurrentStreamingSession(deviceId, function (err, streamingSession) {
    for (var i = 0; i < streamingSession.streamingUsers.length; i++) {
      if (streamingSession.streamingUsers[i].id == userInQuestion.id) {
        streamingSession.streamingUsers.splice(i, 1);
        break;
      }
    }

    return setCurrentStreamingSession(deviceId, streamingSession, callback);
  });
}

function indexOfStreamingUser (deviceId, userInQuestion, callback) {
  console.log("Get Current Streaming Session");
  assert(userInQuestion, "user must not be null");
  getCurrentStreamingSession(deviceId, function (err, streamingSession) {

    if (err) return callback(err, -1);

    for (var i = 0; i < streamingSession.streamingUsers.length; i++) {
      if (streamingSession.streamingUsers[i].id == userInQuestion.id) {
        return callback(null, i);
      }
    }
    return callback(null, -1);
  });
}

/**
 * Connect
 */

// Start database and get things running
console.log("connecting to database at " + app.get('dburl'));

mongoose.connect(app.get('dburl'));
db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {

  console.log("Connected to mongo.");
  // Start server.
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });
})