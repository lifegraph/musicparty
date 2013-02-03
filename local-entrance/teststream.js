var http = require('http');
var spawn = require('child_process').spawn;

var play = spawn('play', ['-r', 44100, '-b', 16, '-L', '-c', 2, '-e', 'signed-integer', '-t', 'raw', '-']);

function listen() {
  console.log('listening.');
  http.get('http://entranceapp.herokuapp.com/30f911883803c643/stream', function(res) {
    res.on('data', function(chunk) {
      console.log(chunk);
    });
    res.on('error', function(err) {
      console.log(err);
    });
    res.on('end', function() {
      return listen();
    });
    res.pipe(play.stdin);
  });
}

listen();