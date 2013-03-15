// Include the http module
var http = require('http');

// Port to listen to requests on
var port = 6000;

// Include the serial port module for comm with Arduino
var serialport = require("serialport");

// Grab a reference to SerialPort
var SerialPort = serialport.SerialPort;

// We'll need to make a serial port object 
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

  // Open up comm on the serial port. Put a newline at the end
  serialPort = new SerialPort(arduino_port, { 
    parser: serialport.parsers.readline("\n") ,
    baudrate: 9600
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
    var prefix = "UID Value: "; // The prefix before the data we care about comes through

    // If we have a uid value
    if (data.indexOf(prefix) >= 0) {

      // Grab the uid
      pID = data.substring(prefix.length).trim();

      console.log("Server received tap from: " + pID);
    }
  });
});




