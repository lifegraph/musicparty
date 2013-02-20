function playSong (artist, title, next) {
  var state = {
    playable: false
  };

  // http://toma.hk/api.html
  var track = tomahkAPI.Track(title, artist, {
    width: 300,
    height: 300,
    disabledResolvers: ['SpotifyMetadata'],
    handlers: {
      onloaded: function() {
        console.log(track.connection+":\n  api loaded");
      },
      onended: function() {
        next();
        console.log(track.connection+":\n  Song ended: "+track.artist+" - "+track.title);
      },
      onplayable: function() {
        state.playable = true;
        track.play();
        console.log(track.connection+":\n  playable");
      },
      onresolved: function(resolver, result) {
        console.log(track.connection+":\n  Track found: "+resolver+" - "+ result.track + " by "+result.artist);
      },
      ontimeupdate: function(timeupdate) {
        var currentTime = timeupdate.currentTime;
        var duration = timeupdate.duration;
        currentTime = parseInt(currentTime);
        duration = parseInt(duration);

        console.log(track.connection+":\n  Time update: "+currentTime + " "+duration);
      }
    }
  });

  $('#musictarget').html('').append(track.render());

  setTimeout(function () {
    if (!state.playable) {
      console.log('Track timed out, skipping.');
      next();
    }
  }, 5000);

  return state;
}

$(function () {
  $.get('json', function (tracks) {

    var state = null;

    function nextTrack () {
      if (state) {
        state.playable = true;
      }

      if (!tracks.length) {
        return;
      }

      var track = tracks.shift();
      state = playSong(track.artist, track.track, nextTrack);
    }

    nextTrack();

    $('#next').on('click', nextTrack);
  })
})