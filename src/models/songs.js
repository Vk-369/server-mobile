const mongoose = require("mongoose");

const songsSchema = mongoose.Schema({
    s_path: { require: true, type: String },
    s_pic_path: { require: true, type: String },
    i_tag: { require: true, type: String },
    duration:{require:true,type:Number},
    videoId:{require:true,type:String}
  
  });

const songsDetails = mongoose.model('song', songsSchema);

module.exports = songsDetails
