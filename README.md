Entrance Tutorial
=========

What it is
----------
Entrance is a device that passively streams your favorite music with the tap of an RFID-enabled device. It links the unique ID of your RFID device (like [Charlie Cards](http://www.mbta.com/fares_and_passes/charlie/) and [Clipper Cards](https://www.clippercard.com/ClipperWeb/index.do)) to the Facebook ID of the user, which gives it the ability to find a user’s favorite artists from Facebook and stream them through [Tomahawk](http://blog.tomahawk-player.org/post/41518909327/toma-hk-api-making-music-hacks-easier-since-2013). 

All the final code for the project can be found in this repository. We've also have open-sourced the [Entrance API server](https://github.com/lifegraph/entrance-tutorial-server) repository in case you want to glimpse at the back end or make your own.


What you'll learn
-----------------
You'll learn how to read RFID cards, communicate between an Arduino and a local Node server, and how to interface with [Lifegraph Connect](http://connect.lifegraphlabs.com/) for authentication and device ID storage.

What you’ll need
----------------
* A Computer
* An Internet Connection
* [An Arduino](https://www.sparkfun.com/products/11021)
* [Adafruit NFC/RFID Reader Shield](http://www.adafruit.com/products/789) (& [Header Pins](https://www.adafruit.com/products/85) to connect to the Arduino)
* [An RFID Tag](http://www.adafruit.com/products/363) (Any 125kHz RFID card will work)
* A Facebook account (that has ‘liked’ bands/music)

**One more Note:** We’ll guide you through how to do this with the Adafruit RFID Shield but you can easily modify it to be able to work with a different RFID solution if you already own one. 

Let's get started!
	
Setting up the Node Server
-------------
We’re going to start by setting up our server using Node JS. Node JS is a really quick and easy framework for creating web servers. You can find installation instructions [here](http://nodejs.org/). If you’re on a Windows machine, you may need to restart your computer after installation (even if it doesn’t tell you that you need to). 

Great, now we’re ready to start coding. We'll be using the terminal to complete these tasks and for a few similar tasks in the future. On Windows, this can be accessed by hitting the windows key, typing 'cmd', and then pressing enter. On OSX, just open the Terminal application. Run the following commands in the terminal.

```
mkdir entrance-tutorial
cd entrance-tutorial
npm install serialport fs node-uuid rem
```

This creates a project directory for us and tells Node Package Manager (AKA npm) to install four node modules (packages of code): serialPort for communicating with Arduino, fs which gives us control of our file system, REM for making easy network calls, and node-uuid, which will allow us to create a unique id for our Entrance device so that the server can keep track of which users are listening to which Entrance. 

Now we can start creating our server. In your editor of choice ([<3 Sublime Text](http://www.sublimetext.com/)) create a file called “app.js", enter in the code below and save it in our project directory. What we're doing in this chunk is simply importing the code from the module we need to run a web app ('http'), telling the server to listen on port 5000, and sending the same response (“Sweet it seems to be working.”) to every client that tries to connect.

```
// Include the http module
var http = require('http');

var port = 5000;

// Start the http server on port 5000
var server = http.createServer(function(request, response) {
  response.writeHead(200);
  response.end("Sweet, it seems to be working.");
});

server.listen(port, function(){

	console.log("Express server listening on port " + port);

});
```

Now, that we have the code for the server written, we should start running our server. In your terminal window, type ‘node app.js’ to start the terminal (later, when you want to stop it, type control + c”). 

***Note:*** If you receive an error like 'Error: listen EADDRINUSE' when trying to run the server, you may need to change the active port. To do that, change line 12 of ‘app.js' to app.set(‘port’, X); where X is some number between 3000 and 9000 but not 5000.

With your web browser, go to ‘[http://localhost:5000](http://localhost:5000)’ (or, if you had to change your port, enter that number after the colon). You should see the message that tells you it’s working!


Detecting RFID
--------------

Now that we can play music, we’ll need to detect which person is tagging in so that we can play music that they like.

Connect your Arduino to your computer with a USB cable. If you haven’t already, you’ll need to download and install the [Arduino developing environment](http://arduino.cc/en/main/software). We’ve decided to use [Adafruit’s NFC/RFID shield](http://www.adafruit.com/products/363) because it’s well documented, easy to use, and they provide a library to get you started. You’ll need to download the library from [here](https://github.com/adafruit/Adafruit_NFCShield_I2C) and store it in the Libraries folder of your Arduino (on OSX, the new directory would be ~/Documents/Arduino/libraries/ and on Windows, it would be My Documents\Arduino\libraries\). If you already had the Arduino environment open before placing the code in the Libraries folder, restart it now.


Place the RFID Shield on top of the Arduino. Go to File->Examples->AdaFruit_NFCShield_I2C->ReadMifare and upload it to the Arduino by clicking the right-facing arrow on the sketch that opens up. Once it finishes uploading, open your serial terminal by clicking Tools->Serial Monitor.  Make sure that you’re listening with 9600 baud. It should say that it’s waiting for an ISO14443A Card. Tap your RFID card against the reader and it should print out the UUID of the card!

Now we’re going to send the UUID from the rfid tag to our node server. Our first step is to make sure we only send one UUID over once every two seconds, or else we’ll just inundate our server with useless information.  Create a new Arduino sketch by selecting the Arduino application and clicking the dog-eared paper icon. Title the file ‘arduino_rfid_reader.ino’ and paste the following, slightly modified, Arduino code:

```
#include <Wire.h>
#include <Adafruit_NFCShield_I2C.h>

#define IRQ   (2)
#define RESET (3)  // Not connected by default on the NFC Shield

Adafruit_NFCShield_I2C nfc(IRQ, RESET);
long lastReadTime = 0;

void setup(void) {
  Serial.begin(9600);
  Serial.println("Hello!");

  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (! versiondata) {
    Serial.print("Didn't find PN53x board");
    while (1); // halt
  }
  // Got ok data, print it out!
  Serial.print("Found chip PN5"); Serial.println((versiondata>>24) & 0xFF, HEX); 
  Serial.print("Firmware ver. "); Serial.print((versiondata>>16) & 0xFF, DEC); 
  Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC);
  
  // configure board to read RFID tags
  nfc.SAMConfig();
  
  Serial.println("Waiting for an ISO14443A Card ...");
}


void loop(void) {
  uint8_t success;
  int block_num = 24;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)
  uint8_t shouldWrite = false;              // if should write to the fob
  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate
  // if the uid is 4 bytes (Mifare Classic) or 7 bytes (Mifare Ultralight)
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);
  
  if (success && millis() - lastReadTime > 2000) {
    // Display some basic information about the card
    Serial.println("Found an ISO14443A card");
    Serial.print("  UID Length: ");Serial.print(uidLength, DEC);Serial.println(" bytes");
    Serial.print("  UID Value: ");
    nfc.PrintHex(uid, uidLength);
    Serial.println("");
    lastReadTime = millis();
    
  }
}


/**************************************************************************/
/*! 
    @brief  Prints a hexadecimal value in plain characters

    @param  data      Pointer to the byte data
    @param  numBytes  Data length in bytes
*/
/**************************************************************************/
void printHexPlain(const byte * data, const uint32_t numBytes)
{
  uint32_t szPos;
  for (szPos=0; szPos < numBytes; szPos++) 
  {
    if (data[szPos] <= 0x1F)
      Serial.print("");
    else
      Serial.print((char)data[szPos]);
  }
  Serial.println("");
}
```

Upload the code to your Arduino again and verify that it can still successfully print out the UUID of your tag but it doesn’t print it again within two seconds. Now we need to modify the server code so that it can read in the Serial data. We’re going to open up a serial port to the Arduino and write out whatever UUID we get over. Replace the contents of your ‘app.js’ file with the code below; the only thing you’ll need to change is the serial port of your Arduino, which is the 8th line of code. You can find it by going to Tools->Serial Port in the Arduino application. 

```
// Include the http module
var http = require('http');

var port = 5000;

// Include the serial port module for comm with Arduino
var serialport = require("serialport");

// Grab a reference to SerialPort
var SerialPort = serialport.SerialPort;

// Set the Arduino port (make sure this is right!)
var arduino_port = "/dev/tty.usbmodemfd121";

// Open up comm on the serial port. Put a newline at the end
var serialPort = new SerialPort(arduino_port, { 
  parser: serialport.parsers.readline("\n") 
});

// When the serial port is opened, let us know
serialPort.on("open", function (){
 console.log("Successfully opened arduino port.")
});

// After initialized, when we get a tag from the RF Reader
serialPort.on("data", function (data) {

  // Print out the tag data
  console.log("ID Data received: : "+ data);

  // The prefix we set before the uid on the arduino end of things
  var prefix = "  UID Value: "; // The prefix before the data we care about comes through

  // If we have a uid value
  if (data.indexOf(prefix) == 0) {

    // Grab the uid
    pID = data.substring(prefix.length).trim();

    console.log("Server received tap from: " + pID);

  }
});

// Start the http server on port 5000
var server = http.createServer(function(request, response) {
  response.writeHead(200);
  response.end("Sweet, it seems to be working.");
});

//
server.listen(port, function(){

  console.log("Listening to port " + port);

});

Now restart your server and tap your RFID tag. It should print it out the UUID in 
terminal!
	
Creating an Entrance ID
Our RFID tags have a unique ID that allows us to keep track of which person is tagging in, but in order to keep track of which Entrance device is contacting it, we need to generate another unique ID. UUIDs are just long numbers that are very likely to be unique (there are 3.4 x 10^38 different combinations).

In code we’ll create a config.json file (no need to make it by hand) in which we store the UUID of our streaming device. Then, when we start the server, we can check if the UUID has been created, and if not, generate one and store it in the file. Replace the contents of your ‘app.js’ file with the following code:

// Include the http module
var http = require('http');

// Include the fs module to access the UUID
// inside the config.json file
var fs = require('fs');

// Include the uuid module so we can generate one
// for our Entrance device
var uuidGenerator = require('node-uuid');

// Port to listen to requests on
var port = 5000;

// Include the serial port module for comm with Arduino
var serialport = require("serialport");

// Grab a reference to SerialPort
var SerialPort = serialport.SerialPort;

// Set the Arduino port (make sure this is right!)
var arduino_port = "/dev/tty.usbmodemfd121";

// Open up comm on the serial port. Put a newline at the end
var serialPort = new SerialPort(arduino_port, { 
  parser: serialport.parsers.readline("\n") 
});

// When the serial port is opened, let us know
serialPort.on("open", function (){
 console.log("Successfully opened arduino port.")
});

// After initialized, when we get a tag from the RF Reader
serialPort.on("data", function (data) {

  // Print out the tag data
  console.log("ID Data received: : "+ data);

  // The prefix we set before the uid on the arduino end of things
  var prefix = "  UID Value: "; // The prefix before the data we care about comes through

  // If we have a uid value
  if (data.indexOf(prefix) == 0) {

    // Grab the uid
    pID = data.substring(prefix.length).trim();

    console.log("Server received tap from: " + pID);

  }
});

// Start the http server on port 5000
var server = http.createServer(function(request, response) {
  response.writeHead(200);
  response.end("Sweet, it seems to be working.");
});

// Start listening on a port for requests
server.listen(port, function(){

  console.log("Listening to port " + port);

  // Grab the UUID of this entrance
  retrieveUUID(function (err, UUID) {
    // If there was an error, report it and stop
    if (err) return console.log(err);
});

});

/*
 * Wrapper function to extract the uuid if the
 * config.json file exists or writes a new one
 * to a new file if it doesn't
 */
function retrieveUUID(callback) {
  // Check if the config.json file exists
  fs.exists('config.json', function(exists) {
    // If it does
    if (exists) {
      // Return the UUID
      getDeviceUUID(function (err, UUID) {
        callback(err, UUID);
      });
    } else {
      // if not, write the UUID and return it
      setDeviceUUID(function(err, UUID) {
        callback(err, UUID);
      });
    }
  });
}

/*
 * Generates a new UUID and writes it to the
 * config.json file (will make it if it doesn't exist)
 */
function setDeviceUUID(callback) {
  // Generate the new UUID
  var newUUID = uuidGenerator.v1();

  // Write the UUID (in JSON) to the config.json file
  fs.writeFile('config.json', '{"deviceUUID":"' +  newUUID + '"}', function (err) {

    console.log("Wrote new UUID to config file: " + newUUID);

    // Pass it back
    callback(err, newUUID);
  });
}

/*
 * Reads the UUID from the config.json file. Will
 * throw an error if it doesn't exist.
 */
function getDeviceUUID(callback) {

  // Read the config.json file
  fs.readFile(__dirname + '/config.json', 'utf8', function(err, text){

    // If there was something wrong, pass the err back
    if (err || !text) {
      return callback(err, null);
    }
    else {

     console.log("Read Existing UUID: " + JSON.parse(text).deviceUUID);

     // If we got the device UUID back, return it
     return callback(null, text.deviceUUID);
    }
 });
}
```

If you run this new server file, it should say that it printed a new UUID. If you then stop it and run it again, it should let you know that it read an existing UUID from the file. Great!

Syncing With the Server
-----------------------

The last thing we need before receiving music from the server is to sync our RFID tag with our Facebook ID. The team at [Lifegraph Labs](http://lifegraphlabs.com) has created a website and an API called [Lifegraph Connect](http://connect.lifegraphlabs.com/) to let you easily sync a physical identity (your RFID tag) with a virtual identity (your Facebook ID) that we’ll take advantage of for this tutorial. If you would like to know more about how to make a backend API yourself, let us know and we’ll update the tutorial!

We need to add some code to our node server that will let Lifegraph Connect know that we received a tap from our RFID tag. Our server will then tell us if the RFID tag is synced to a Facebook account. We are going to use the REM node module to send information because it wraps a lot of tedious code into a simple API and makes it easy to parse the response. Replace the contents of ‘app.js’ with the following code:

```
// Include the http module
var http = require('http');

// Include rem for super easy communication with the server
var rem = require('rem');

// Include the fs module to access the UUID
// inside the config.json file
var fs = require('fs');

// Include child processes so we can
// automatically open a browser window to stream music
var spawn = require('child_process').spawn;

// Include the uuid module so we can generate one
// for our Entrance device
var uuidGenerator = require('node-uuid');

// Port to listen to requests on
var port = 5000;

// Include the serial port module for comm with Arduino
var serialport = require("serialport");

// Grab a reference to SerialPort
var SerialPort = serialport.SerialPort;

// We'll need to make a serial port object once we have a deviceUUID
var serialPort;

// Set the Arduino port (make sure this is right!)
var arduino_port = "/dev/tty.usbmodemfd121";



// Start the http server on port 5000
var server = http.createServer(function(request, response) {
  response.writeHead(200);
  response.end("Sweet, it seems to be working.");
});

// Start listening on a port for requests
server.listen(port, function(){

  console.log("Listening to port " + port);

  // Grab the UUID of this entrance
  retrieveUUID(function (err, deviceUUID) {
    // If there was an error, report it and stop
    if (err) return console.log(err);

    else {

      // Open up comm on the serial port. Put a newline at the end
      serialPort = new SerialPort(arduino_port, { 
        parser: serialport.parsers.readline("\n") 
      });

      // When the serial port is opened, let us know
      serialPort.on("open", function (){
       console.log("Successfully opened arduino port.")
      });

      // After initialized, when we get a tag from the RF Reader
      serialPort.on("data", function (data) {

        // Print out the tag data
        console.log("ID Data received: : "+ data);

        // The prefix we set before the uid on the arduino end of things
        var prefix = "  UID Value: "; // The prefix before the data we care about comes through

        // If we have a uid value
        if (data.indexOf(prefix) == 0) {

          // Grab the uid
          pID = data.substring(prefix.length).trim();

          console.log("Server received tap from: " + pID);

          // Post the tap to the server
          postTap(deviceUUID, pID, function (err, res) {
            if (err) return console.log("Error posting tap: " + err);

	else console.log(JSON.stringify(res, 2, undefined));
          });
        }
      });
    }
  });
});

function postTap(deviceUUID, pID, callback) {
  rem.json('http://entrance-tutorial.herokuapp.com/tap').post({
    deviceUUID: deviceUUID,
    pID: pID
  }, function (err, json) {
    return callback(err, json);
  });
}

/*
 * Wrapper function to extract the uuid if the
 * config.json file exists or writes a new one
 * to a new file if it doesn't
 */
function retrieveUUID(callback) {
  // Check if the config.json file exists
  fs.exists('config.json', function(exists) {
    // If it does
    if (exists) {
      // Return the UUID
      getDeviceUUID(function (err, UUID) {
        return callback(err, UUID);
      });
    } else {
      // if not, write the UUID and return it
      setDeviceUUID(function(err, UUID) {
        return callback(err, UUID);
      });
    }
  });
}

/*
 * Generates a new UUID and writes it to the
 * config.json file (will make it if it doesn't exist)
 */
function setDeviceUUID(callback) {
  // Generate the new UUID
  var newUUID = uuidGenerator.v1();

  // Write the UUID (in JSON) to the config.json file
  fs.writeFile('config.json', '{"deviceUUID":"' +  newUUID + '"}', function (err) {

    console.log("Wrote new UUID to config file: " + newUUID);

    // Pass it back
    return callback(err, newUUID);
  });
}

/*
 * Reads the UUID from the config.json file. Will
 * throw an error if it doesn't exist.
 */
function getDeviceUUID(callback) {

  // Read the config.json file
  fs.readFile(__dirname + '/config.json', 'utf8', function(err, text){

    // If there was something wrong, pass the err back
    if (err || !text) {
      return callback(err, null);
    }
    else {

     console.log("Read Existing UUID: " + JSON.parse(text).deviceUUID);

     // If we got the device UUID back, return it
     return callback(null, JSON.parse(text).deviceUUID);
    }
 });
}
```

If you run that code and tap your RFID tag, you should get an error because your personal device (RFID tag) isn’t synced to a Facebook account. In your web browser, go to the [Lifegraph Connect](http://connect.lifegraphlabs.com/) website. Click the ‘connect’ button and sign in with your Facebook account. After you've signed in to your Facebook account, tap your RFID device and click the button that pops up to sync your personal device.

Great, now we’re ready to start streaming music. The entrance tutorial server, which we passed the tag information to, will keep track of which songs would be most suitable for the users currently listening to it. After we tag in, it will generate JSON with the music information and if we open our Internet browser to http://entrance-tutorial.herokuapp.com/deviceID/party, it will start playing the music.

We can now use a really cool API called [Tomahawk](http://blog.tomahawk-player.org/post/41518909327/toma-hk-api-making-music-hacks-easier-since-2013), which will automatically check many different sources such as SoundCloud, YouTube, Spotify, etc. for a song. When you hit the “party” URL mentioned above, the Tomahawk API will search for each song in the JSON array we provide it and play it when found. The remote entrance back end will take care of all of this for us! Now we just need the code that will automatically open the browser. Paste the following code into your ‘app.js’ file, restart your server, tap your device, and enjoy your music. ☺

```
// Include the http module
var http = require('http');

// Include rem for super easy communication with the server
var rem = require('rem');

// Include the fs module to access the UUID
// inside the config.json file
var fs = require('fs');

// Include child processes so we can
// automatically open a browser window to stream music
var spawn = require('child_process').spawn;

// Include the uuid module so we can generate one
// for our Entrance device
var uuidGenerator = require('node-uuid');

// Port to listen to requests on
var port = 5000;

// Include the serial port module for comm with Arduino
var serialport = require("serialport");

// Grab a reference to SerialPort
var SerialPort = serialport.SerialPort;

// We'll need to make a serial port object once we have a deviceUUID
var serialPort;

// Set the Arduino port (make sure this is right!)
var arduino_port = "/dev/tty.usbmodemfd121";



// Start the http server on port 5000
var server = http.createServer(function(request, response) {
  response.writeHead(200);
  response.end("Sweet, it seems to be working.");
});

// Start listening on a port for requests
server.listen(port, function(){

  console.log("Listening to port " + port);

  // Grab the UUID of this entrance
  retrieveUUID(function (err, deviceUUID) {
    // If there was an error, report it and stop
    if (err) return console.log(err);

    else {

      // Open up comm on the serial port. Put a newline at the end
      serialPort = new SerialPort(arduino_port, { 
        parser: serialport.parsers.readline("\n") 
      });

      // When the serial port is opened, let us know
      serialPort.on("open", function (){
       console.log("Successfully opened arduino port.")
      });

      // After initialized, when we get a tag from the RF Reader
      serialPort.on("data", function (data) {

        // Print out the tag data
        console.log("ID Data received: : "+ data);

        // The prefix we set before the uid on the arduino end of things
        var prefix = "  UID Value: "; // The prefix before the data we care about comes through

        // If we have a uid value
        if (data.indexOf(prefix) == 0) {

          // Grab the uid
          pID = data.substring(prefix.length).trim();

          console.log("Server received tap from: " + pID);

          // Post the tap to the server
          postTap(deviceUUID, pID, function (err, res) {
            if (err) return console.log("Error posting tap: " + err);

            else if (res.error) return console.log("Server returned err: " + res.error);

            else {

              console.log(res.action + "\n" + res.message);

              if (res.cmd) {
                // Grab the correct command for opening a browser (OS dependent)
                browserCommand = getCorrectBrowserCommand();

                // Open it
                spawn(browserCommand, ['http://entrance-tutorial.herokuapp.com/' + deviceUUID + "/party/"]);
                console.log("Opening the browser to play music.");
              } 
            }
          });
        }
      });
    }
  });
});

function postTap(deviceUUID, pID, callback) {
  rem.json('http://entrance-tutorial.herokuapp.com/tap').post({
    deviceUUID: deviceUUID,
    pID: pID
  }, function (err, json) {
    return callback(err, json);
  });
}

/*
 * Wrapper function to extract the uuid if the
 * config.json file exists or writes a new one
 * to a new file if it doesn't
 */
function retrieveUUID(callback) {
  // Check if the config.json file exists
  fs.exists('config.json', function(exists) {
    // If it does
    if (exists) {
      // Return the UUID
      getDeviceUUID(function (err, UUID) {
        return callback(err, UUID);
      });
    } else {
      // if not, write the UUID and return it
      setDeviceUUID(function(err, UUID) {
        return callback(err, UUID);
      });
    }
  });
}

/*
 * Generates a new UUID and writes it to the
 * config.json file (will make it if it doesn't exist)
 */
function setDeviceUUID(callback) {
  // Generate the new UUID
  var newUUID = uuidGenerator.v1();

  // Write the UUID (in JSON) to the config.json file
  fs.writeFile('config.json', '{"deviceUUID":"' +  newUUID + '"}', function (err) {

    console.log("Wrote new UUID to config file: " + newUUID);

    // Pass it back
    return callback(err, newUUID);
  });
}

/*
 * Reads the UUID from the config.json file. Will
 * throw an error if it doesn't exist.
 */
function getDeviceUUID(callback) {

  // Read the config.json file
  fs.readFile(__dirname + '/config.json', 'utf8', function(err, text){

    // If there was something wrong, pass the err back
    if (err || !text) {
      return callback(err, null);
    }
    else {

     console.log("Read Existing UUID: " + JSON.parse(text).deviceUUID);

     // If we got the device UUID back, return it
     return callback(null, JSON.parse(text).deviceUUID);
    }
 });
}

// helper function to get the correct commandline for opening a browser
function getCorrectBrowserCommand() {
  var isWin = !!process.platform.match(/^win/i);
  var isMac = !!process.platform.match(/^darwin/i);
  if (isWin) {
    return 'start';
  } else if (isMac) {
    return 'open';
  } else {
    return 'xdg-open';
  }
}
```



