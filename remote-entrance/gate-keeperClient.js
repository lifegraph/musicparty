var http = require('http');
var gateKeeperHostname = 'fb-gate-keeper.herokuapp.com';

/*
 * Authenticates with out backend. Retrieves the facebookid
 * of the user with that rfid uid. 
 * Callback: function that accepts an error and a facebookID
 */
 function requestUser(deviceID, callback) {

  // Configure our get request
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
    else if (JSONResponse) {
      // return it. 
      callback(null, JSONResponse);
    }
 }

 exports.requestUser = requestUser;