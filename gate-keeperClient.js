var http = require('http');
var gateKeeperHostname = 'fb-gate-keeper.herokuapp.com';

/*
 * Authenticates with out backend. Retrieves the facebookid
 * of the user with that rfid uid. 
 * Callback: function that accepts an error and a facebookID
 */
 function authenticateWithGateKeeper(deviceID, callback) {

  // Configure out get request
  var options = {
    host: gateKeeperHostname,
    path: '/entrance/user/' + encodeURIComponent(deviceID) 
  };

   http.get(options, function(res) {
    var output = '';
    var jsonResult;
    res.on('error', function(e) {
      callback(e, null);
    });

    res.on('data', function(chunk) {
      output+= chunk;
    });

    res.on('end', function() {
      console.log("Server Response: " + output);
      console.log("Status Code: " + res.statusCode);
      JSONResponse = JSON.parse(output);
      JSONResultParse(JSONResponse, callback);
    });
    

    // if we were able to tap in (fob ID recognized already)
    // if (res.statusCode == 200) {
    //   console.log("Okay, the response means already recognized and made OG post");
    //   set_last_uid_to_connect(uid);
    // } else if (res.statusCode == 205) {
    //   // if the fob ID is unrecognized in the DB
    //   // we must have a new fob that needs linked.

    //   // If we already have a connection to the browser
    //   if (connected_to_browser && browser_socket) {

    //     // Send over the uid!
    //     browser_socket.emit('newuid', { uid: uid });

    //     set_last_uid_to_connect(uid);

    //     sys.puts("Sending over UID:" + uid + " okay?");
    //   }

    //   else if (!connected_to_browser) {
    //     sys.puts("Received a new UID but not connected to browser");
    //     browserCommand = getCorrectBrowserCommand();
    //     childProcess.exec(browserCommand + ' http://thepaulbooth.com:3727/login', function (error, stdout, stderr) {

    //       console.log('Browser done launching.');

    //       trying_to_connect_uid = uid;
    //       set_last_uid_to_connect(uid);
          
    //     });
    //   }
    //   else if (!browser_socket) {
    //      sys.puts("Received a new UID but socket is nil");
    //   }
    // }
  }); // end of http.get

 }

/*
 * Helper function to parse results appropriately. Will be more useful
 * if we add more possible responses. 
 */
 function JSONResultParse(JSONResponse, callback) {

    // If there was an error
    if (JSONResponse.error) {
      // The device hasn't been synced
      var err = new Error("Device not synced to user. Please Authenticate online.");
      callback(err, null);
    }
    // If we got an id back
    else if (JSONResponse.username) {
      // return it. 
      callback(null, JSONResponse.username);
    }
 }

 exports.authenticate = authenticateWithGateKeeper;