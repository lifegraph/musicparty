var serialport = require("serialport");
var trackRecord = require("./trackrecord/trackrecord");
var SerialPort = serialport.SerialPort;
var http = require('http');
// var arduino_port = "/dev/tty.usbmodem1411";
var arduino_port = "/dev/cu.usbmodemfa131";
var serialPort = new SerialPort(arduino_port, { 
  parser: serialport.parsers.readline("\n") 
});


var trying_to_connect_uid = null; // the fob id that we are trying to connect to
var last_uid_to_connect = null; // the last id that actually connected successfully
var clear_uid_delay = 2000; // amount of time until will allow tag in from same id
var clear_timeout; // clear timeout object itself to allow reset of last tagged in

// var my_fbid = "jon.mckay";
// var my_fbid = "timcameronryan";
var fakeUID = "0x010x010x010x01"

serialPort.on("open", function (){
	console.log("Successfully opened arduino port.")
	trackRecord.connectSpotify(function(spotifySession) { console.log("Succesfully connected to spotify.");});
});

// After initialized, when we get a tag from the RF Reader
serialPort.on("data", function (data) {

  // Print out the tag data
  console.log("ID Data received: : "+ data);

  // The prefix we set before the uid on the arduino end of things
  var prefix = "  UID Value: "; // The prefix before the data we care about comes through

  // If we have a uid calue
  if (data.indexOf(prefix) == 0) {

    // Grab the uid
    trying_to_connect_uid = data.substring(prefix.length).trim();

    // If the last uid is still stored (it's stored for 1 seconds) 
    // and the same uid is tagged, don't register it. This is just to
    // prevent repeated taggings. 
    if (trying_to_connect_uid == last_uid_to_connect) {
      console.log("This is a re-tag. No changes will occur.");
      set_last_uid_to_connect(trying_to_connect_uid);
      return;
    }

    HTTP_GET('localhost', '/' + fakeUID + '/' + encodeURIComponent(trying_to_connect_uid) + "/tracks", 3000, function(error, jsonResponse) {
    	if (error) {
    		console.log("Error fetching tracks from Entrance backend: " + error.message);
    		return;
    	}

    	// trackRecord.playTracks(jsonResponse);
    	console.log("Response from entrance backend: " + jsonResponse);
    	set_last_uid_to_connect(trying_to_connect_uid);

    });
  }
});

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

/*
 * Wrapper method for HTTP GETs
 */
function HTTP_GET(hostname, path, port, callback) {
  console.log("Making GET to " + hostname + path);
  // Configure our get request
  var options = {
  	port: (port ? port : 80),
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
      console.log("Server Response: " + output);
      console.log("Status Code: " + res.statusCode);
      callback (null, JSON.parse(output));
    });
  }); // end of http.get
}
