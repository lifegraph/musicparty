enTrance
=========

Helps you make an enTrance with your music

To get it working:
- Clone this directory
- Make sure sox is installed (`brew install sox`)
- Make sure node is installed
- Get a [LibSpotify API key](https://developer.spotify.com/technologies/libspotify/)
- Set environment variables SPOTIFY_KEYPATH, SPOTIFY_USERNAME, SPOTIFY_PASSWORD to the path to your Spotify API key, your spotify username, and your spotify password, respectively.
- Load an Arduino Uno with local-entrance/entrance_arduino_ino/entrance_arduino_ino.ino
- Get an ElectricImp.com account
- Attach an Electric Imp shield and an Adafruit PN532 RFID/NFC Shield (13.56MHz RFID) to the Arduino
- Put an Electric Imp into the shield, get the Electric Imp app to use BlinkUp to send the wifi data to the Electric Imp
- Copy the contents of local-entrance/electric_imp/Entrance.nut into a new code block for Electric Imp in the Planner
- Change the deviceId in line 4 of local-entrance/teststream.js to be the deviceId of your Electric Imp Impee board
- Go to [Gate Keeper](http://fb-gate-keeper.herokuapp.com/) and sign up for Entrance
- On the Sync Your Device page, tap your RFID reader with your RFID, refresh the page, and click the sync link
- Ignore the preference page (work in progress). You are set up.
- Run `node local-entrance/teststream.js`
- Optionally, connect to a Jambox over Bluetooth because it is more awesome that way.
- Tap the RFID reader with your tag after the EImp has connected to the wifi. It's that easy.

List of "Favorite" music sources to support:
* Facebook Favorite Artists... _done!_
* Facebook Latest List... _working on it_
* Facebook Music related likes
* Spotify (Starred Artists)
* Rdio (User Collections)
* Last.fm (Starred Tracks)

What to do at hackathon tonight!:
* Squirrel (PAUL)
* Local Host -> Arduino (PAUL)
* Hack together a speaker 
* Music Intersection
* Streaming constantly (JON)
* Commands working (JON)
* Preferences
* Front End (JON)



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

