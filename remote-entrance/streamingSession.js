
mongoose = require('mongoose')

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost:27017/entranceDB');

var streamingSessionSchema = mongoose.Schema({
localEntranceId: String,
streamingUsers: Array
}, {"collection": "streaming_users_db"});

console.log("creating streaming Session");
var StreamingSession = mongoose.model('StreamingSession', streamingSessionSchema);


// why does this use module.exports instead of exports? 
// http://stackoverflow.com/questions/7137397/module-exports-vs-exports-in-nodejs
module.exports = StreamingSession;