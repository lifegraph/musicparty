Music Party Tutorial
=========

What it is
----------
Music Party is a device that passively streams your favorite music with the tap of an RFID-enabled device. It links the unique ID of your RFID device (like [Charlie Cards](http://www.mbta.com/fares_and_passes/charlie/) and [Clipper Cards](https://www.clippercard.com/ClipperWeb/index.do)) to the Facebook ID of the user, which gives it the ability to find a user’s favorite artists from Facebook and stream them through [Tomahawk](http://blog.tomahawk-player.org/post/41518909327/toma-hk-api-making-music-hacks-easier-since-2013). 

You can see an example of what you're going to build [here](http://musicparty.herokuapp.com/westhall/party)!

All the final code for the project can be found in this repository. We've also have open-sourced the [Music Party API server](https://github.com/lifegraph/musicparty-server) repository in case you want to glimpse at the back end or make your own.

__Note: this tutorial will only work for OSX and Linux users (unless you already have the .NET Framework already installed on your Windows PC) because of a requirement in the serialport package we use. We're working to make it cross platform and we'll update this tutorial as soon as we do.__
What you'll learn
-----------------
You'll learn how to read RFID cards, communicate between an Arduino and a server, and how to interface with [Lifegraph Connect](http://connect.lifegraphlabs.com/) for authentication and device ID storage.

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

Now we'll need to set up our Arduino to read RFID tags. If you haven't used Arduino before or you have trouble along the way, the [Official Getting Started page](http://arduino.cc/en/Guide/HomePage) is very useful. Connect your Arduino to your computer with a USB cable. If you haven’t already, you’ll need to download and install the [Arduino developing environment](http://arduino.cc/en/main/software). 

We'll also want to intall some libraries to make this coding less tedious. If you have Lady AdaFruit's board, download the library [here](https://github.com/adafruit/Adafruit_NFCShield_I2C) and if you have the Sparkfun board, download the library [here](https://github.com/lifegraph/sm130) Store it in the Libraries folder of your Arduino (on OSX, the default directory would be ~/Documents/Arduino/libraries/ and on Windows, it would be My Documents\Arduino\libraries\) (if you have problems with this, check out [Lady AdaFruit's advice](http://arduino.cc/en/Guide/Libraries). If you already had the Arduino environment open before placing the code in the Libraries folder, restart it now.

Place the RFID Shield on top of the Arduino. Now we can get to the code. All the code you'll need can be found in the link below. 

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> arduino_rfid_reader.ino](https://raw.github.com/lifegraph/musicparty/master/arduino_rfid_reader/arduino_rfid_reader.ino)

Create a new Arduino sketch by selecting the Arduino application and clicking the dog-eared paper icon, copy the code from the link above right in, and save it in your project directory. All you have to do now is uncomment three lines at the top of the file depending on which RDID reader you have. 


If you have the Sparkfun sm130 RFID board, uncomment these three blocks:
```
// #include <SoftwareSerial.h>
// #include <sm130.h>
// NFCReader rfid(7, 8);

```

And if you have the Lady Adafruit RFID board, uncomment these three blocks:
```
//#include <Wire.h>
//#include <Adafruit_NFCShield_I2C.h>
//Adafruit_NFCShield_I2C rfid(2, 3);
```

The rest of the sketch is the same for both boards because we wrote the sm130 library to match that of the Lady Adafruit library. Now, click the right-facing arrow on the sketch to load the code on the Arduino and start running it. To see the output, open the serial monitor by going to File->Tools->Serial Monitor then make sure your baud rate is set to 9600 (the dropdown on the lower right of the serial monitor).

Now, if you tap your RFID card on the reader, it should print out the Unique ID! Awesome.

Now I will explain the code line by line if you're interested, or else you can skip to the "Sending the UUID to the Local Server" section. Let's start with the importing code:

```
// Uncomment these three lines to use the Sparkfun RFID shield
// #include <SoftwareSerial.h>
// #include <sm130.h>
// NFCReader rfid(7, 8);

// Uncomment these three lines to use the AdaFruit RFID shield
//#include <Wire.h>
//#include <Adafruit_NFCShield_I2C.h>
//Adafruit_NFCShield_I2C rfid(2, 3);

// The number of seconds to wait before accepting another tag
const uint8_t TIME_DELAY = 2;
// Var to keep track of time between tags
long lastReadTime = 0;

```

In this chunk we're importing either the Sparkfun library or the Lady AdaFruit library depending on which one you uncomment. Sparkfun's board uses the Software Serial (A.K.A. UART) for communication while the Lady AdaFruit board uses the Wire (A.K.A I2C). Then we make to global variables to keep track of the time between tags for later (to make sure it doesn't keep reporting your tag over and over as you keep it close to the reader). Now let's look at the setup method:

```
// Setup method is called once every time Arduino is restarted
void setup(void) {

  // Start communication with our serial monitor
  Serial.begin(9600);

  // Start running the RFID shield
  rfid.begin();

  // Print out a message to make sure Serial is working
  Serial.println("Initialized!");
  Serial.println("Requesting Firmware Version to make sure comm is working...");

  // Grab the firmware version
  uint32_t versiondata = rfid.getFirmwareVersion();
  
  // If nothing is returned, it didn't work. Loop forever
  if (!versiondata) {
    Serial.print("Didn't find RFID Shield. Check your connection to the Arduino board.");
    while (1); 
  }
 
  // Got ok data, good enough!
  Serial.println("Found Version Data. Comm is working.");

  // Let us know RFID shield is waiting for a tag
  Serial.println("Waiting for an RFID Card ...");
}
```

In this first chunk of code, we add the 'setup' method which is a special method that only gets called once everytime the Arduino is restarted. In this method, we'll start running Serial which is a communication protocol. Then, we'll start running the RFID shield library itself. Next, we grab the firmware version just to make sure that our communciation with the board is working effectively - if not, we just loop forever. Now the looping method:

```
void loop() {
  
  // We will store the results of our tag reading in these vars
  uint8_t success;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)

  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate the length
  success = rfid.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);

  // If we succesfully received a tag and it has been greater than the time delay (in seconds)
  if (success &&  (millis() - lastReadTime > (TIME_DELAY * 1000))) {
    Serial.println("Got a tag!");
    // Print out the length
    Serial.print("Length: ");
    Serial.print(uidLength, HEX);
    Serial.print(", ID: ");
    
    // Print the ID in hex format
    rfid.PrintHex(uid, uidLength);
    Serial.println("");
    
    // Same the last read time
    lastReadTime = millis();
  }
}

```
The loop method is called over and over again by Arduino. As soon as it's code completes, it starts over. In our loop method, we create the success, uid, and uidLength variables to store the results of a discovered tag. We then attempt to read a tag, and if we do, the uid will be stored in the uid variable and the length of that uid will be store in uidLength. Then we simply print it out, and note what time it was printed out to make sure it doesn't print over and over again.

Pretty simple. Now we'll configure the server that will be the middleman between the Arduino and our external server so that we can make easy network calls (like telling our server who tagged in). 

Sending the UUID to the Local Server
------------------------------
Now we'll put the Arduino code to the side and modify the local server code so that it can read in the Serial data from the Arduino. This will let us use the internet connection of our computer to send the information about our tag to the Music Party Server (which handles actual web traffic). We’re going to open up a serial port to the Arduino and write out whatever UUID we get over. Replace the contents of your ‘app.js’ file with the code below; the only thing you’ll need to change is the serial port of your Arduino (the variable names 'arduino_port', which is the 6th line of code. You can find the serial port your Arduino is using by going to Tools->Serial Port in the Arduino application.

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> app.js](https://raw.github.com/lifegraph/musicparty/master/tutorial_code_snippets/app-readUUID.js)

If you keep your arduino powered, run this local server code by running 'node app-readUUID.js' (from the terminal) in the project directory, tap your RFID card on the reader, you should see it print out the UUID of that card in the terminal! This code works by simply opening up a serial port, and reading what the Arduino prints out. Feel free to read the extremely verbose comments in that code snippet to learn more about how exactly it works.

	
Creating a Music Party ID
-------------------------

Our RFID tags have a unique ID that allows us to keep track of which person is tagging in, but in order to keep track of which Music Party device is contacting it, we need to generate another unique ID. UUIDs are just long numbers that are very likely to be unique (there are 3.4 x 10^38 different combinations).

In code we’ll create a config.json file in which we store the Unique ID of our streaming device. Then, when we start the server, we can check if the ID has been created, and if not, generate one and store it in the file.

Copy the code from the link below and paste it into your 'app.js' file. Again, feel free to read the verbose comments to understand how it's working. Run 'node app.js' and make sure the terminal reports that it created a new UUID in the config file!

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> app-deviceUUID.js](https://raw.github.com/lifegraph/musicparty/master/tutorial_code_snippets/app-readUUID.js)

Alternatively, you can simply make a config.json file (or edit the one that is made automatically), to have a custom device ID. For example, in the config.json, you can have:

```
{"deviceUUID":"lifegraph-lab"}
```

It will make your music party room name more memorable (just make sure it's not too generic or else you risk sharing it with a random other person!).

Connecting With the Music Party Server
-----------------------

Now we'll need to send up the tag ID and the device ID to the server so it knows to add users to our music party. We're going to use the 'rem' node package to make sending the HTTP call (with our tag ID and device ID) to the server really simple.

The code for this section can be found at the link below. Copy it and paste it into your 'app.js' file. 

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> app-rem.js](https://raw.github.com/lifegraph/musicparty/master/tutorial_code_snippets/app-rem.js)

We made very few additions. We simply imported rem:

```
var rem = require('rem');
```

We defined the hostname of our server:

```
var host = "http://musicparty.herokuapp.com";
```
We wrote the method to send the device ID and tap ID to the server and receive the reponse:

```
function postTap(deviceUUID, pID, callback) {
  rem.json(host + '/tap').post({
    deviceUUID: deviceUUID,
    pID: pID
  }, function (err, json) {
    return callback(err, json);
  });
}
```

And finally, we posted the tap to the server after reading it through serial:

```
// Post the tap to the server
postTap(deviceUUID, pID, function (err, res) {
  console.log("res")
});
        
```

Now, if we run that code, it should send out the ID's to the server and return with a response. The response should tell you to connect your device to Lifegraph Connect which is what we'll do next.



The last thing we need before receiving music from the server is to sync our RFID tag with our Facebook ID. The team at [Lifegraph Labs](http://lifegraphlabs.com) has created a website and an API called [Lifegraph Connect](http://connect.lifegraphlabs.com/) to let you easily sync a physical identity (your RFID tag) with a virtual identity (your Facebook ID) that we’ll take advantage of for this tutorial. If you would like to know more about how to make a backend API yourself, let us know and we’ll update the tutorial!

We need to add some code to our node server that will let Lifegraph Connect know that we received a tap from our RFID tag. Our server will then tell us if the RFID tag is synced to a Facebook account. We are going to use the Rem node module to send information because it wraps a lot of tedious code into a simple API and makes it easy to parse the response.

Great, now we’re ready to start streaming music. The Music Party server, which we passed the tag information to, will keep track of which songs would be most suitable for the users currently listening to it. After we tag in, it will generate JSON with the music information and if we open our Internet browser to http://musicparty.herokuapp.com/deviceID/party, it will start playing the music.

If you run that code and tap your RFID tag, you should get an error because your personal device (RFID tag) isn’t synced to a Facebook account. In your web browser, go to the [Lifegraph Connect](http://connect.lifegraphlabs.com/) website. Click the ‘connect’ button and sign in with your Facebook account. After you've signed in to your Facebook account, tap your RFID device and click the button that pops up to sync your personal device.

We can now use a really cool API called [Tomahawk](http://blog.tomahawk-player.org/post/41518909327/toma-hk-api-making-music-hacks-easier-since-2013), which will automatically check many different sources such as SoundCloud, YouTube, Spotify, etc. for a song. When you hit the “party” URL mentioned above, the Tomahawk API will search for each song in the JSON array we provide it and play it when found. The remote Music Party back end will take care of all of this for us! Now we just need the code that will automatically open the browser. Paste the following code into your ‘app.js’ file, restart your server, tap your device, and enjoy your music. ☺

### [<img src="http://game-icons.net/icons/lorc/originals/png/papers.png" height="24"> app.js](https://github.com/lifegraph/musicparty/blob/master/app.js)

