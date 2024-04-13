const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const playListSchema = new Schema({
    p_id: { require: true, type: Number },
    user_id: { require: true, type: String },
    songs: { require: true, type: Array },
    p_name: { require: true, type: String }
  });

const playListDetails = mongoose.model('playList', playListSchema);

module.exports = playListDetails