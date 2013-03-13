Music Party Tutorial
=========

What it is
----------
Music Party is a device that passively streams your favorite music with the tap of an RFID-enabled device. It links the unique ID of your RFID device (like [Charlie Cards](http://www.mbta.com/fares_and_passes/charlie/) and [Clipper Cards](https://www.clippercard.com/ClipperWeb/index.do)) to the Facebook ID of the user, which gives it the ability to find a user’s favorite artists from Facebook and stream them through [Tomahawk](http://blog.tomahawk-player.org/post/41518909327/toma-hk-api-making-music-hacks-easier-since-2013). 

All the final code for the project can be found in this repository. We've also have open-sourced the [Music Party API server](https://github.com/lifegraph/musicparty-server) repository in case you want to glimpse at the back end or make your own.


What you'll learn
-----------------
You'll learn how to read RFID cards, communicate between an Arduino and a local Node server, and how to interface with [Lifegraph Connect](http://connect.lifegraphlabs.com/) for authentication and device ID storage.

What you’ll need
----------------
* A Computer
* An Internet Connection
* [An Arduino](https://www.sparkfun.com/products/11021)
* [Adafruit NFC/RFID Reader Shield](http://www.adafruit.com/products/789) or [Sparkfun RFID shield](https://www.sparkfun.com/products/10406) (& [Header Pins](https://www.adafruit.com/products/85) to connect to the Arduino)
* [An RFID Tag](http://www.adafruit.com/products/363) (Any 125kHz RFID card will work)
* A Facebook account (that has ‘liked’ bands/music)

**One more Note:** We’ll guide you through how to do this with the above mentioned shields but you can easily modify it to be able to work with a different RFID solution if you already own one. 

Let's get started!
	
Setting up the Node Server
-------------
We’re going to start by setting up our server using Node JS. Node JS is a really quick and easy framework for creating web servers. You can find installation instructions [here](http://nodejs.org/). If you’re on a Windows machine, you may need to restart your computer after installation (even if it doesn’t tell you that you need to). 

Great, now we’re ready to start coding. We'll be using the terminal (not the Node JS application) to complete these tasks and for a few similar tasks in the future. On Windows, this can be accessed by hitting the windows key, typing 'cmd', and then pressing enter. On OSX, just open the Terminal application. Run the following commands in the terminal.

```
mkdir music-party-tutorial
cd music-party-tutorial
npm install serialport fs node-uuid rem
```

This creates a project directory for us and tells Node Package Manager (AKA npm) to install four node modules (packages of code): serialPort for communicating with Arduino, fs which gives us control of our file system, REM for making easy network calls, and node-uuid, which will allow us to create a unique id for our Music Party device so that the server can keep track of which users are listening to which Music Party device. 

Now we can start creating our server. In your editor of choice ([<3 Sublime Text](http://www.sublimetext.com/)) create a file called “app.js", enter in the code below and save it in our project directory (music-party-tutorial). What we're doing in this chunk is simply importing the code from the module we need to run a web app ('http'), telling the server to listen on port 5000, and sending the same response (“Sweet, it seems to be working.”) to every client that tries to connect.

```js
// Include the http module
var http = require('http');

var port = 5000;

// Start the http server on port 5000
var server = http.createServer(function (request, response) {
  response.writeHead(200);
  response.end("Sweet, it seems to be working.");
});

server.listen(port, function () {
  console.log("Express server listening on port", port);
});
```

Now, that we have the code for the server written, we should start running our server. In your terminal window, type ‘node app.js’ to start the terminal (later, when you want to stop it, type control + c”). 

***Note:*** If you receive an error like 'Error: listen EADDRINUSE' when trying to run the server, you may need to change the active port. To do that, change line 12 of ‘app.js' to app.set(‘port’, X); where X is some number between 3000 and 9000 but not 5000.

With your web browser, go to ‘[http://localhost:5000](http://localhost:5000)’ (or, if you had to change your port, enter that number after the colon). You should see the message that tells you it’s working!


Detecting RFID
--------------

Now we'll need to set up our Arduino to read RFID tags. If you haven't used Arduino before or you have trouble along the way, the [Official Getting Started page](http://arduino.cc/en/Guide/HomePage) is very useful. Connect your Arduino to your computer with a USB cable. If you haven’t already, you’ll need to download and install the [Arduino developing environment](http://arduino.cc/en/main/software). We'll also want to intall some libraries to make this coding less tedious. If you have Lady AdaFruit's board, download the library [here](https://github.com/adafruit/Adafruit_NFCShield_I2C) and if you have the Sparkfun board, download the library [here](https://github.com/lifegraph/sm130) Store it in the Libraries folder of your Arduino (on OSX, the default directory would be ~/Documents/Arduino/libraries/ and on Windows, it would be My Documents\Arduino\libraries\). If you already had the Arduino environment open before placing the code in the Libraries folder, restart it now.

Place the RFID Shield on top of the Arduino. If you have Lady Adafruit's board, go to File->Examples->AdaFruit_NFCShield_I2C->ReadMifare and the Sparkfun board, go to File->Examples->musicparty->musicparty.ino and upload it to the Arduino by clicking the right-facing arrow on the sketch that opens up. Once it finishes uploading, open the Arduino Application's serial monitor by clicking Tools->Serial Monitor.  __Make sure that you’re listening with 9600 baud if you have Lady Adafruit's board and a 19200 baud if you're using the Sparkfun board (the drop down in the bottom right of the Arduino sketch).__ Tap your RFID card against the reader and it should print out the UUID of the card!

Now we’re going to send the UUID from the rfid tag to our node server. __If you're using the Sparkfun board, you can skip to the 'Creating a Music Party ID' section because we already wrote the code to interface with our Node server in the example__ (but you should read the code and the comments so you understand what's going on). If you have the Adafruit board, our first step is to make sure we only send one UUID over once every two seconds, or else we’ll just inundate our server with useless information.  Create a new Arduino sketch by selecting the Arduino application and clicking the dog-eared paper icon. 

We'll write our program in testable chunks by first giving you a link to each code chunk which you can copy into your Arduino sketch. Then we'll explain the code line by line below the link and you can run it to make sure it works. First, we'll 'setup' the Arduino:

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> arduino_rfid_reader.ino](https://github.com/lifegraph/musicparty/blob/master/arduino_rfid_reader/arduino_rfid_reader.ino)

In this first chunk of code, we import the Wire module for communication with our RFID shield and Lada AdaFruit's custom library because it gives us a really nice interface with the board. We then define the pins we'll use to communicate with the RFID shield and create an RFID object that we'll use to command the shield.

Then, we add the 'setup' method which is a special method that only gets called once everytime the Arduino is restarted. In this method, we'll start running Serial is a communication protocol. Then, we'll start running the RFID shield on line 24. Next, we grab the firmware version just to make sure that our communciation with the board is working effectively - if not, we just loop forever.

If it is, we print out the firmware version, 

Title the file ‘arduino_rfid_reader.ino’ and paste the following, slightly modified, Arduino code:



Now restart your server and tap your RFID tag. It should print it out the UUID in  terminal!
	
Creating a Music Party ID
-------------------------

Our RFID tags have a unique ID that allows us to keep track of which person is tagging in, but in order to keep track of which Music Party device is contacting it, we need to generate another unique ID. UUIDs are just long numbers that are very likely to be unique (there are 3.4 x 10^38 different combinations).

In code we’ll create a config.json file (no need to make it by hand) in which we store the UUID of our streaming device. Then, when we start the server, we can check if the UUID has been created, and if not, generate one and store it in the file.

Syncing With the Server
-----------------------

The last thing we need before receiving music from the server is to sync our RFID tag with our Facebook ID. The team at [Lifegraph Labs](http://lifegraphlabs.com) has created a website and an API called [Lifegraph Connect](http://connect.lifegraphlabs.com/) to let you easily sync a physical identity (your RFID tag) with a virtual identity (your Facebook ID) that we’ll take advantage of for this tutorial. If you would like to know more about how to make a backend API yourself, let us know and we’ll update the tutorial!

We need to add some code to our node server that will let Lifegraph Connect know that we received a tap from our RFID tag. Our server will then tell us if the RFID tag is synced to a Facebook account. We are going to use the Rem node module to send information because it wraps a lot of tedious code into a simple API and makes it easy to parse the response.

Great, now we’re ready to start streaming music. The Music Party server, which we passed the tag information to, will keep track of which songs would be most suitable for the users currently listening to it. After we tag in, it will generate JSON with the music information and if we open our Internet browser to http://musicparty.herokuapp.com/deviceID/party, it will start playing the music.

If you run that code and tap your RFID tag, you should get an error because your personal device (RFID tag) isn’t synced to a Facebook account. In your web browser, go to the [Lifegraph Connect](http://connect.lifegraphlabs.com/) website. Click the ‘connect’ button and sign in with your Facebook account. After you've signed in to your Facebook account, tap your RFID device and click the button that pops up to sync your personal device.

We can now use a really cool API called [Tomahawk](http://blog.tomahawk-player.org/post/41518909327/toma-hk-api-making-music-hacks-easier-since-2013), which will automatically check many different sources such as SoundCloud, YouTube, Spotify, etc. for a song. When you hit the “party” URL mentioned above, the Tomahawk API will search for each song in the JSON array we provide it and play it when found. The remote Music Party back end will take care of all of this for us! Now we just need the code that will automatically open the browser. Paste the following code into your ‘app.js’ file, restart your server, tap your device, and enjoy your music. ☺

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> app.js](https://github.com/lifegraph/musicparty/blob/master/app.js)

