var http = require('http');
var spawn = require('child_process').spawn;

var deviceId = '30f911883803c643';

function listen() {
  try{
  var play = spawn('play', ['-r', 44100, '-b', 16, '-L', '-c', 2, '-e', 'signed-integer', '-t', 'raw', '-']);
  console.log('listening.');
  http.get('http://entranceapp.herokuapp.com/' + deviceId + '/stream', function(res) {
    res.on('data', function(chunk) {
      console.log(chunk);
    });
    res.on('end', function() {
      play.kill();
      return listen();
    });
    res.on('error', function(err) {
      console.log("ERROR");
      console.log(err);
      play.kill();
      return listen();
    })
    res.pipe(play.stdin);
  });
  } catch (e) {
    console.log("serious error.");
    console.log(e);
    listen();
  }
}

listen();