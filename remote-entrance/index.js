
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
  , assert = require('assert')
  , knox = require('knox');

var app = express();
var hostUrl = 'http://entranceapp.herokuapp.com';
var gateKeeper = require("./gate-keeperClient.js");
var db;
var spotifySession;
var i = 0;
var fakeListener;

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

// Electric imp endpoint for Entrance taps.
app.post('/eimp/tap', function(req, res) {
  // Parse content.
  var readerId = req.body.target;
  var deviceId = req.body.value; // assume whole body is the deviceId
  deviceId = deviceId.replace(/\u0010/g, ''); // don't know why this is here
  console.log("eimp with location: %s and device: %s", readerId, deviceId);
  handleTap(readerId, deviceId, function(json) {
    res.json(json);
  });
});

app.get('/:localEntranceId/:deviceId/tap', function (req, res) {
  handleTap(req.params.localEntranceId, req.params.deviceId, function(json) {
    res.json(json);
  });
});

function handleTap(localEntranceId, deviceId, hollaback) {
  gateKeeper.requestUser(deviceId, function (error, user) {
    // If we have an error, then there was a problem with the HTTP call
    // or the user isn't in the db and they need to sync
    if (error) {
      console.log("We had an error with Gatekeeper: " + error.message);

      // Send something to the local entrance device to let it know if
      // a.) there was a network error or b.) the device needs to sync
    } 

    // Grab those who are already in the room 
    getCurrentStreamingSession(localEntranceId, function (error, currentStreamingSession) {

    console.trace("Here I am!");


      indexOfStreamingUser(localEntranceId, user, function (err, index) {
        // If the user is in the room, delete them
        if (index != -1) {
          console.log("User already in room... deleting user from room.")
          // Update the current streaming users

          removeUserFromStreamingUsers(localEntranceId, user, function (err, newStreamingSession) {

            // If there are no more users 
            if (!newStreamingSession.streamingUsers.length) {

              console.log("No users remaining in room!");

              // Let the client know to stop playing

              setTracksToStreamingSession(localEntranceId, [], function(err, streamingSession) {
                spotifySession.getPlayer().stop();
              });

              return hollaback({'action' : 'stop', 'message' : 'Empty session. Stopping Streaming.'});

            } else {
              // User left room, but people are still in room
              // TODO compute new tracks, send them down
              return hollaback({'action' : 'continue', 'message' : 'User removed from session. Reforming track list on server.'});
            }
          });
        } 
        else {
          console.log("User NOT already in room!");

          // Add the user to the array
          console.log("Adding user to array.");

          addUserToStreamingUsers(localEntranceId, user, function() {

            getFacebookFavoriteArtists(user, function (artists) {

              getTracksFromArtists(artists, function (tracks) {

                setTracksToStreamingSession(localEntranceId, tracks, function (err, streamingSession) {

                  console.log("Added some tracks which are: " + streamingSession.tracks);

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

app.get('/:localEntranceId/stream', function (req, res) {
  getCurrentStreamingSession(req.params.localEntranceId, function (error, currentStreamingSession) {
    // (Hopefully this session has tracks)
    if (currentStreamingSession.tracks) {

      // Grab a random track URL
      // console.log("Beginning to send tracks with streaming session: " + stringify(currentStreamingSession));
     return streamTracks(req, res, currentStreamingSession);
      
    } else {

      // Something weird happened if there aren't any tracks
      res.send("Shit. There are no tracks.");
    }
  });
});

app.get('/:localEntranceId/fakeStream', function (req, res) {
  getCurrentStreamingSession(req.params.localEntranceId, function (error, currentStreamingSession) {

      // Grab a random track URL
      // console.log("Beginning to send tracks with streaming session: " + stringify(currentStreamingSession));
     return fakeStreamTracks(req, res, currentStreamingSession);
      
  });
});

function fakeStreamTracks (request, response, streamingSession) {

  console.log("received CSS: " + streamingSession);

  if (streamingSession.tracks.length == 0) {
      var player = spotifySession.getPlayer();

      player.pipe(response);

      fakeListener = setTimeout(function() { 
        getCurrentStreamingSession(request.params.localEntranceId, function (error, newCurrentStreamingSession) {
          fakeStreamTracks(request, response, streamingSession); }) }, 2000);
  } else {
    return streamTracks(request, response, streamingSession);
  }
}
var gooone = false;
function streamTracks(request, response, streamingSession) {
  
  if (streamingSession.tracks.length != 0) {

    // Grab a random URL
    var url = streamingSession.tracks[Math.floor(Math.random() * streamingSession.tracks.length)];

    console.log("Song starting : " + streamingSession.tracks.length + " songs left to play.");

    removeTrackFromStreamingSession(request.params.localEntranceId, url, function (err, revisedStreamingSession) {

      // Fetch a track from the URL
      var track = sp.Track.getFromUrl(url); 

      // When the track is ready
      track.on('ready', function() {

        // Grab the player
        var player = spotifySession.getPlayer();

        // Load the given track
        player.load(track);

        // Start playing it
        player.play();

        // Pipe the result
        player.pipe(response);

        // When the player finishes
        player.once('track-end', function() {

          // player.stop();

          // Log that it's over
          console.log("Song ended. " + revisedStreamingSession.tracks.length + "songs left to play.");

          streamTracks(request, response, revisedStreamingSession);
        });
        if (!gooone) {
          gooone = true;
          console.log(JSON.stringify(player, undefined, 2));
          streamTracks(request, response, revisedStreamingSession);
        }
      });
    });
  }  

  else {

    console.log("There are no more tracks");

    var player = spotifySession.getPlayer();

    // Stop the player
    player.stop();

        // End the response
    response.end();
  }
}
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

function getTracksFromArtists(artists, callback) {
      var loadedTracks = 0;
      var tracks = [];
      if (!artists.length) {
        console.log("There are no artists.");
        return callback([]);
      }

      // For each artist
      artists.forEach(function(artist) {
        // console.log("searching for artist: " + artist)
        // Create a spotify search
        var search = new sp.Search("artist:" + artist);
        search.trackCount = 1; // we're only interested in the first result for now;

        // Execute the search
        search.execute();

        // When the search has been completed
        search.once('ready', function() {
          // If there aren't any searches
          if(!search.tracks.length) {
              // console.error('there is no track to play :[ for artist ' + artist);
          } else {
            // Add the track to the rest of the tracks
            for (var i = 0; i < search.tracks.length; i++) {
              if (search.tracks[i].availability == "AVAILABLE") {
                tracks.push(search.tracks[i]);
              }
            }
            // tracks = tracks.concat(search.tracks);
          }

          // Keep track of how far we've come
          loadedTracks++;
          // console.log("loaded: " + loadedTracks + "/" + artists.length + " : " + tracks.length);

          // If we've checked all the artists
          if (loadedTracks == artists.length) {
            // Shuffle up the tracks
            // shuffle(tracks);

            // sort in decreasing popularity so most popular is first
            tracks.sort(function(a, b) {return b.popularity - a.popularity});
            // Call our callback
            callback(tracks.map(function(track) { return track.getUrl();}));
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
      return callback(err, null);
    } else {
      return callback(err, streamingUserForUserJSON(currentStreamers, userJSON));
    }
  });
}

function setCurrentStreamingSession(localEntranceId, streamingSession, callback) {
  streamingSession.save(function (err) {
    return callback(err, streamingSession);
  });
}

function getCurrentStreamingSession(localEntranceId, callback) {
  console.log("Get Current Streaming Session");
  assert(localEntranceId);
  StreamingSession.findOne( { localEntranceId : localEntranceId }, function(err, streamingSession) {
    if (err) {
      return callback (err, null);
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
      // Else if blah blah blah 
      else {
        return callback(null, streamingSession);
      }
    }
  })
}

function addUserToStreamingUsers(localEntranceId, user, callback) {
  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {
    streamingSession.streamingUsers.push(user);
    setCurrentStreamingSession(localEntranceId, streamingSession, function (err) {
      return callback(err, streamingSession);
    });
  });
}

function setTracksToStreamingSession(localEntranceId, tracks, callback) {
  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {
    streamingSession.tracks = tracks;
    setCurrentStreamingSession(localEntranceId, streamingSession, function (err) {
      if (err) console.log("Error saving tracks!");
      return callback(err, streamingSession);
    });
  });
}

function removeTrackFromStreamingSession(localEntranceId, track, callback) {
  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {
    streamingSession.tracks.splice(streamingSession.tracks.indexOf(track), 1, null);
    setCurrentStreamingSession(localEntranceId, streamingSession, function (err, revisedStreamingSession) {
      if (err) console.log("Error saving tracks!");
      return callback(err, revisedStreamingSession);
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

    return setCurrentStreamingSession(localEntranceId, streamingSession, callback);
  });
}

function indexOfStreamingUser (localEntranceId, userInQuestion, callback) {
  console.log("Get Current Streaming Session");
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

    console.log("Connected to mongo.");

    // Create our s3 klient
    var s3Client = knox.createClient({
      key: process.env.S3_KEY
    , secret: process.env.S3_SECRET
    , bucket: process.env.S3_BUCKET
    });

    // Make the call to grab out key
    s3Client.get('spotify_appkey.key').on('response', function(res){

      // Create the buffer to store bits
      var appKey = [];

      // Build the app key buffer
      res.on('data', function (chunk){
        appKey.push(chunk);
      });

      // When we're done collecting the key, connect to spotify
      res.on("end", function() {
        connectSpotify(Buffer.concat(appKey), function(spotifySession) {

          // We've succesfully connected!
          console.log("Connected to Spotify.");
          // Start server.
          http.createServer(app).listen(app.get('port'), function(){
          console.log("Express server listening on port " + app.get('port'));
          });
        });
      });
    }).end();
    // yay!
  });
}

/*
 * Beings a spotify session
 */
function connectSpotify (appKey, callback) {

  // Create a spotify session wth our api key
  spotifySession = new sp.Session({
    applicationKey: appKey
  });

  console.log("Connecting to Spotify...")
  // Log in with our credentials
  spotifySession.login(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PASSWORD); 

  // Once we're logged in, continue with the callback
  spotifySession.once('login', function (err) {
    if (err) return console.error('Error:', err);
    callback(spotifySession);
  });
}

app.get('/testtrackstream', function(req, res) {
  var trackurls = [
    "spotify:track:3kyxRga5wDGbKdmxXssbps",
    "spotify:track:4Sfa7hdVkqlM8UW5LsSY3F",
    "spotify:track:5JLv62qFIS1DR3zGEcApRt",
    "spotify:track:3FtYbEfBqAlGO46NUDQSAt",
    "spotify:track:3kZC0ZmFWrEHdUCmUqlvgZ",
    "spotify:track:0DiWol3AO6WpXZgp0goxAV",
    "spotify:track:02GjIfCpwttPAikjm5Hwcb",
    "spotify:track:6GskIhdM6TN6EkPgeSjVfW",
    "spotify:track:6cFGBqZhdunaq1QSeFcNxb",
    "spotify:track:6c9t15M38cWxyt3uLnLfD8",
    "spotify:track:7hExqd5aeA6cdDFx6sBfd3",
    "spotify:track:4WcCW10tnJCljX8Fhs0FdE",
    "spotify:track:1595LW73XBxkRk2ciQOHfr",
    "spotify:track:2GAIycsMaDVtMtdvxzR2xI",
    "spotify:track:6m5D7zGVbzAxceDXQTsRSX",
    "spotify:track:5OmcnFH77xm4IETrbEvhlq",
    "spotify:track:34dAuFhftSbjLWksf8c73i",
    "spotify:track:66AdsR6hDPlQxkASDqtRvK",
    "spotify:track:2uljPrNySotVP1d42B30X2",
    "spotify:track:2ZI6tCcxzTLwgbvUSHx1jQ",
    "spotify:track:1rihwqlxLr1kL7zg5193FF",
    "spotify:track:4x63WB2sLNrtBmuC1KpXL1",
    "spotify:track:5YuJhe1jfUYb8b3jf2IZM0",
    "spotify:track:14K3uhvuNqH8JUKcOmeea6",
    "spotify:track:5udnrY00yVUOAzupil2H56",
    "spotify:track:1Vf7Fq4CQovc7fcEau2pGk",
    "spotify:track:63vL5oxWrlvaJ0ayNaQnbX",
    "spotify:track:2UODQhPzz51lssoMPOlfy5",
    "spotify:track:3IA8ZvkUTdXC2IQVbZjWW7",
    "spotify:track:53OAjBw9irOKWuo8yhoQIE",
    "spotify:track:7raciFPVU5VuHmqVbw2c1h",
    "spotify:track:4M7z4iHTPyg8rbKdHQspkb",
    "spotify:track:0xdFtX8aovrebhSfUOYLJF",
    "spotify:track:4RIyjMUeIN98EmmL8pFXRZ",
    "spotify:track:28mDNsS5UqugybN5xRp3FB",
    "spotify:track:1zdGCM41JB7vPS5mfo9mez",
    "spotify:track:3GzKSyxXnVgjpg9tOZUcLa",
    "spotify:track:12jIOpe6I270V8hs0XDUOk",
    "spotify:track:41NjE1A4oAwGsBLqn6CiZx"
  ];
  var url = trackurls[Math.floor(Math.random() * trackurls.length)];

  var track = sp.Track.getFromUrl(url); 
  track.on('ready', function() {
    // Grab the player
    var player = spotifySession.getPlayer();

    // Load the given track
    player.load(track);

    // Start playing it
    player.play();
    player.pipe(res);
    player.once('track-end', function() {
      player.stop();
      res.end();
    });

  });
  
});

initializeServerAndDatabase();
