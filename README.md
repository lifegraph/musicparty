enTrance
=========

Helps you make an enTrance with your music

To get it working:
- Clone this directory
- Make sure sox is install ('brew install sox')
- Get a [LibSpotify API key](https://developer.spotify.com/technologies/libspotify/)
- Set environment variables SPOTIFY_KEYPATH, SPOTIFY_USERNAME, SPOTIFY_PASSWORD to the path to your Spotify API key, your spotify username, and your spotify password, respectively.
- Make sure the serial port in local_app.js is where your Arduino is connected to (we'll make this automatic later)

List of "Favorite" music sources to support:
* Facebook Favorite Artists... _done!_
* Facebook Latest List... _working on it_
* Facebook Music related likes
* Spotify (Starred Artists)
* Rdio (User Collections)
* Last.fm (Starred Tracks)




V1 - Streams music from computer

V2 - Work with student prox cards

V3 - Find intersection of music taste of people who tagged in

V4 - Attach a speaker to the device

V5 - Stream over bluetooth (first via Jambox)

When creating a Heroku Server, we need a build pack to deal with libspotify installation:
```heroku create --stack cedar --buildpack https://github.com/lifegraph/heroku-buildpack-nodejs-libspotify.git```


Libspotify may be a bitch on Heroku. The Library path has to be set correctly:

```heroku config:set LD_LIBRARY_PATH=/app/.heroku/vender/lib:/app/.heroku/libspotify/lib```

```heroku config:add PKG_CONFIG_PATH=/app/.heroku/vendor/lib/pkgconfig```

