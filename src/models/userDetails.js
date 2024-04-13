const mongoose = require("mongoose");

const userDetailsSchema = mongoose.Schema({
    user_id: { require: true, type: Number },
    name: { require: true, type: String },
    gender: { require: true, type: String },
    mail_id: { require: true, type: String },
    phone_no: { require: true, type: Number },
    p_pic_path: { require: true, type: String }
  });

const UserDetails = mongoose.model('userDetails', userDetailsSchema);

module.exports = UserDetails