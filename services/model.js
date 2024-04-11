const { number } = require("joi");
const mongoose = require("mongoose");

const userDetailsSchema = mongoose.Schema({
  user_id: { require: true, type: Number },
  name: { require: true, type: String },
  gender: { require: true, type: String },
  mail_id: { require: true, type: String },
  phone_no: { require: true, type: Number },
  p_pic_path: { require: true, type: String }
});

const songsSchema = mongoose.Schema({
  s_path: { require: true, type: String },
  s_pic_path: { require: true, type: String },
  i_tag: { require: true, type: String },
  duration:{require:true,type:Number},
  videoId:{require:true,type:String}

});




const playListSchema = mongoose.Schema({
  p_id: { require: true, type: Number },
  user_id: { require: true, type: String },
  songs: { require: true, type: Array },
  p_name: { require: true, type: String }
});

const UserDetails = mongoose.model('userDetails', userDetailsSchema);
const songsDetails = mongoose.model('song', songsSchema);
const playListDetails = mongoose.model('playList', playListSchema);

// Exporting the models
module.exports = {
  UserDetails,
  songsDetails,
  playListDetails
};
