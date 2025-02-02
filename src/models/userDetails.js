const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;
const userDetailsSchema = new Schema({
  user_id: { require: true, type: String },
  username: { require: true, type: String },
  gender: { require: true, type: String },
  mail_id: { require: true, type: String },
  phone_no: { require: true, type: String },
  p_pic_path: { require: false, type: String },
  password: { required: true, type: String },
  status: { required: true, type: Number },
  playlist: { required: false, type: Object },
  recentlyPlayedList:{required:false,type:Array},
  // created_at: { required: true, type: Date },
  // updated_at: { required: true, type: Date },
});

userDetailsSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(this.password, salt);
  this.password = hash;
  next();
});

userDetailsSchema.pre("updateOne", async function (next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(update.$set.password, salt);
    update.$set.password = hash;
  }
  next();
});

userDetailsSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const UserDetails = mongoose.model("userDetails", userDetailsSchema);

module.exports = UserDetails;
