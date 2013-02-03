
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


app.get('/:localEntranceId/:deviceId/tap', function (req, res) {

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
          console.log("User already in room... deleting user from room.")
          // Update the current streaming users

          removeUserFromStreamingUsers(req.params.localEntranceId, user, function () {

            // If there are no more users 
            if (!currentStreamingSession.streamingUsers.length) {

              console.log("No users remaining in room!");

              // Let the client know to stop playing
              return res.json({'action' : 'stop', 'message' : 'Empty session. Stopping Streaming.'});
            } else {
              // User left room, but people are still in room
              // TODO compute new tracks, send them down
              return res.json({'action' : 'continue', 'message' : 'User removed from session. Reforming track list on server.'});
            }
          });
        } 
        else {
          console.log("User NOT already in room!");

          // Add the user to the array
          console.log("Adding user to array.");

          addUserToStreamingUsers(req.params.localEntranceId, user, function() {

            getFacebookFavoriteArtists(user, function (artists) {

              getTracksFromArtists(artists, function(tracks) {

                setTracksToStreamingSession(req.params.localEntranceId, tracks, function (err, streamingSession) {

                  if (err) {
                    console.log(err.message);
                    return res.json({'error': err.message});
                  }
                    return res.json({'action': 'play', 'message': 'User added to session. Reforming track list on server.'});
                });
              });
            });  
          });
        }
      });
    });
  });
});

app.get('/:localEntranceId/stream', function (req, res) {
  getCurrentStreamingSession(req.params.localEntranceId, function (error, currentStreamingSession) {
    assert(currentStreamingSession.tracks);
    var url = currentStreamingSession.tracks[0];

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
        res.redirect('/' + req.params.localEntranceId + '/stream');
      });
    });
  });
});

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
              console.error('there is no track to play :[ for artist ' + artist);
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
          console.log("loaded: " + loadedTracks + "/" + artists.length + " : " + tracks.length);

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

function setTracksToStreamingSession(localEntranceId, tracks, callback) {
  getCurrentStreamingSession(localEntranceId, function (err, streamingSession) {
    streamingSession.tracks = tracks;
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

  var player = spotifySession.getPlayer();  

  // Once we're logged in, continue with the callback
  spotifySession.once('login', function (err) {
    if (err) return console.error('Error:', err);
    callback(spotifySession);
  });
}

initializeServerAndDatabase();
