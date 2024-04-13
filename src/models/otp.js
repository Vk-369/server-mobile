const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const OtpSchema = new Schema({
  mail_id: {require: true, type: String},
  otp: {require: true, type: String},
  expiry: {require: true, type: String},
  status: {require: true, type: Number},
  created_at: {require: true, type: String},
  updated_at: {require: true, type: String},
});

const Otp = mongoose.model("otp", OtpSchema, "otp");

Otp.createCollection();

module.exports = Otp;
