var mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost:27017/entranceDB');

var StreamingSessionSchema = mongoose.Schema({
  localEntranceId: String,
  streamingUsers: Array
}, { collection: 'streaming_users_db' });

var StreamingSession = mongoose.model('StreamingSession', StreamingSessionSchema);

module.exports = StreamingSession;