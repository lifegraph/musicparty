var serialport = require("serialport");
var trackRecord = require("./trackrecord/trackrecord");
var SerialPort = serialport.SerialPort;
// var arduino_port = "/dev/tty.usbmodem1411";
var arduino_port = "/dev/cu.usbmodemfa131";
// var serialPort = new SerialPort(arduino_port, { 
//   parser: serialport.parsers.readline("\n") 
// });


var trying_to_connect_uid = null; // the fob id that we are trying to connect to
var last_uid_to_connect = null; // the last id that actually connected successfully
var clear_uid_delay = 2000; // amount of time until will allow tag in from same id
var clear_timeout; // clear timeout object itself to allow reset of last tagged in

// var my_fbid = "jon.mckay";
// var my_fbid = "timcameronryan";
var fakeUID = "0x010x010x010x01"

console.log("Hi! listening to " + arduino_port);


// After initialized, when we get a tag from the RF Reader
// serialPort.on("data", function (data) {
//   // Print out the tag data
//   console.log("ID Data received: : "+ data);

//   // The prefix we set before the uid on the arduino end of things
//   var prefix = "  UID Value: "; // The prefix before the data we care about comes through

//   // If we have a uid calue
//   if (data.indexOf(prefix) == 0) {

//     // Grab the uid
//     trying_to_connect_uid = data.substring(prefix.length).trim();

//     // If the last uid is still stored (it's stored for 1 seconds) 
//     // and the same uid is tagged, don't register it. This is just to
//     // prevent repeated taggings. 
//     if (trying_to_connect_uid == last_uid_to_connect) {
//       console.log("This is a re-tag. No changes will occur.");
//       set_last_uid_to_connect(trying_to_connect_uid);
//       return;
//     }

//     gateKeeper.authenticate(trying_to_connect_uid, function(error, facebookID) {

//       if (facebookID) {
//         console.log("VALID TAG: IT'S GO TIME FOR USERNAME: " + facebookID);
//         trackRecord.playFavorites(facebookID);
//         console.log("Streaming: " + trackRecord.isStreaming);
//         set_last_uid_to_connect(trying_to_connect_uid);
//       }
//       else if(error) {
//         console.log("Error with auth: " + error.message);
//         return;
//       } 
//     });
//   }
// });

function set_last_uid_to_connect(uid) {
  if (last_uid_to_connect != uid) {
    if (clear_timeout) {
      clearTimeout(clear_timeout);
    }
    clear_timeout = setTimeout(clear_last_uid, clear_uid_delay);
  }
  console.log("UID Set: " + uid)
  last_uid_to_connect = uid;
}

function clear_last_uid() {
    last_uid_to_connect = null;
}
trackRecord.connectSpotify(function(spotifySession) { console.log("Succesfully connected to spotify."); trackRecord.playFavorites(fakeUID)});
// trackRecord.playFavorites(fakeUID);