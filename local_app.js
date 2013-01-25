var serialport = require("serialport");
var trackRecord = require("./trackrecord");
var SerialPort = serialport.SerialPort;
// var arduino_port = "/dev/tty.usbmodem1411";
var arduino_port = "/dev/cu.usbmodemfa131";
var serialPort = new SerialPort(arduino_port, { 
  parser: serialport.parsers.readline("\n") 
});

// hard-coded for now, but should go up to a server to grab corresponding fbid

var my_uid = '0x2E 0x38 0x53 0xA5'; 

console.log("Hi! listening to " + arduino_port);
serialPort.on("data", function (data) {
  console.log("here: "+data);

  // The prefix we set before the uid on the arduino end of things
  var prefix = "  UID Value: "; // The prefix before the data we care about comes through

  // If we have a uid calue
  if (data.indexOf(prefix) == 0) {

    // Grab the uid
    uid = data.substring(prefix.length).trim();
    console.log("WHOA!");
    console.log(uid);
    if (uid == my_uid) {
      console.log("GO TIME")

    }
  }
});