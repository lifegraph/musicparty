var request = require('request');


var HOST = 'connect.lifegraphlabs.com';

/*
 * Authenticates with out backend. Retrieves the facebookid
 * of the user with that rfid uid. 
 * Callback: function that accepts an error and a facebookID
 */

function requestUser (pid, callback) {
  console.err("Requesting auth tokens for " + pid + " from Lifegraph Connect...");

  request('http://' + HOST + '/api/tokens/' + pid, {
    qs: {
      namespace: 'entrance',
      key: "108354826000744",
      secret: "a74794d4d5292a7f7463db3b0a004085"
    },
    json: true
  }, function (err, res, json) {
    console.log("Response received from Lifegraph Connect.");
    console.log("Status Code: " + res.statusCode);
    callback(err, json && json.tokens);
  })
}

exports.requestUser = requestUser;