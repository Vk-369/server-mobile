
require("dotenv").config();
const mongoose = require("mongoose");

// const DB_PORT = process.env.DB_PORT
// const DB_HOST = process.env.DB_HOST
// const DB_NAME = process.env.DB_NAME
const URL = process.env.DB;

const db = async () => {
    // console.log('test', URL)
  try {
    
    // await mongoose.connect('mongodb://127.0.0.1:27017/test', {directConnection: true, });
    await mongoose.connect('mongodb+srv://adminone:admin@cluster0.bx1it.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
    // mongodb+srv://<db_username>:<db_password>@cluster0.bx1it.mongodb.net/
    
    console.log("connection established");
  } catch (err) {
    console.log(err, "error while connecting to the db");
  }
};
module.exports.db = db;
