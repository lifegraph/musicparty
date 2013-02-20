var mongoose = require('mongoose');

var StreamingSessionSchema = mongoose.Schema({
  deviceId: String,
  streamingUsers: Array,
  tracks: Array
}, {
  collection: 'streaming_users_db'
});

var StreamingSession = mongoose.model('StreamingSession', StreamingSessionSchema);

module.exports = StreamingSession;