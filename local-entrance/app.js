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

          Post the tap to the server
          postTap(deviceUUID, pID, function (err, res) {

            console.log("res")
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