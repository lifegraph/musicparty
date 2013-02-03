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
var fakeUID = "0x010x010x010x02"

serialPort.on("open", function (){
	console.log("Successfully opened arduino port.")
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

    HTTP_GET('entranceapp', '/' + fakeUID + '/' + encodeURIComponent(trying_to_connect_uid) + "/tracks", 00, function(error, jsonResponse) {
    	if (error) {
    		console.log("Error fetching tracks from Entrance backend: " + error.message);
    		return;
    	}

    	switch(jsonResponse.action) {
    		case 'continue':
    			// This needs to 
          // Jon, you really need to 
    			trackRecord.playTracks(jsonResponse.tracks);
          break;
        case 'play':
          trackRecord.playTracks(jsonResponse.tracks);
          break;
    		case 'stop':
    			trackRecord.stopTracks();
          break;
    	}

    	// }
    	trackRecord.playTracks(jsonResponse);
    	
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
	    host: hostname,
	    path: path
	  };

  	if (port) options.port = port;


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


// test data
// I didn't have an arduino to play with.
// var trackurls = [
//   "spotify:track:3kyxRga5wDGbKdmxXssbps",
//   "spotify:track:4Sfa7hdVkqlM8UW5LsSY3F",
//   "spotify:track:5JLv62qFIS1DR3zGEcApRt",
//   "spotify:track:3FtYbEfBqAlGO46NUDQSAt",
//   "spotify:track:3kZC0ZmFWrEHdUCmUqlvgZ",
//   "spotify:track:0DiWol3AO6WpXZgp0goxAV",
//   "spotify:track:02GjIfCpwttPAikjm5Hwcb",
//   "spotify:track:6GskIhdM6TN6EkPgeSjVfW",
//   "spotify:track:6cFGBqZhdunaq1QSeFcNxb",
//   "spotify:track:6c9t15M38cWxyt3uLnLfD8",
//   "spotify:track:7hExqd5aeA6cdDFx6sBfd3",
//   "spotify:track:4WcCW10tnJCljX8Fhs0FdE",
//   "spotify:track:1595LW73XBxkRk2ciQOHfr",
//   "spotify:track:2GAIycsMaDVtMtdvxzR2xI",
//   "spotify:track:6m5D7zGVbzAxceDXQTsRSX",
//   "spotify:track:5OmcnFH77xm4IETrbEvhlq",
//   "spotify:track:34dAuFhftSbjLWksf8c73i",
//   "spotify:track:66AdsR6hDPlQxkASDqtRvK",
//   "spotify:track:2uljPrNySotVP1d42B30X2",
//   "spotify:track:2ZI6tCcxzTLwgbvUSHx1jQ",
//   "spotify:track:1rihwqlxLr1kL7zg5193FF",
//   "spotify:track:4x63WB2sLNrtBmuC1KpXL1",
//   "spotify:track:5YuJhe1jfUYb8b3jf2IZM0",
//   "spotify:track:14K3uhvuNqH8JUKcOmeea6",
//   "spotify:track:5udnrY00yVUOAzupil2H56",
//   "spotify:track:1Vf7Fq4CQovc7fcEau2pGk",
//   "spotify:track:63vL5oxWrlvaJ0ayNaQnbX",
//   "spotify:track:2UODQhPzz51lssoMPOlfy5",
//   "spotify:track:3IA8ZvkUTdXC2IQVbZjWW7",
//   "spotify:track:53OAjBw9irOKWuo8yhoQIE",
//   "spotify:track:7raciFPVU5VuHmqVbw2c1h",
//   "spotify:track:4M7z4iHTPyg8rbKdHQspkb",
//   "spotify:track:0xdFtX8aovrebhSfUOYLJF",
//   "spotify:track:4RIyjMUeIN98EmmL8pFXRZ",
//   "spotify:track:28mDNsS5UqugybN5xRp3FB",
//   "spotify:track:1zdGCM41JB7vPS5mfo9mez",
//   "spotify:track:3GzKSyxXnVgjpg9tOZUcLa",
//   "spotify:track:12jIOpe6I270V8hs0XDUOk",
//   "spotify:track:41NjE1A4oAwGsBLqn6CiZx"
// ];


// trackRecord.connectSpotify(function(spotifySession) {
//   console.log("Succesfully connected to spotify.");
//   trackRecord.playTracks(trackurls);
// });
