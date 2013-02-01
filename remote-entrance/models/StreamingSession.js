var mongoose = require('mongoose');

var StreamingSessionSchema = mongoose.Schema({
  localEntranceId: String,
  streamingUsers: Array
}, { collection: 'streaming_users_db' });

var StreamingSession = mongoose.model('StreamingSession', StreamingSessionSchema);

module.exports = StreamingSession;