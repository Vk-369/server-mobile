require("dotenv").config();
const mongoose = require("mongoose");

const URL = process.env.DB;

const db = async () => {
    console.log('test', URL)
  try {
    
    await mongoose.connect('mongodb://127.0.0.1:27017', {directConnection: true, });
    console.log("connection established");
  } catch (err) {
    console.log(err, "error while connecting to the db");
  }
};
module.exports.db = db;

