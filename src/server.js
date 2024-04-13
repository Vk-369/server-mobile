const express = require('express')()
const bodyParser = require("body-parser");
const http = require("http");
const cors = require("cors");

require("dotenv").config();

const index = require("./index");
const db = require('./db')

const PORT = process.env.SERVER_PORT;

const server = http.createServer(express);

express.use(bodyParser.json());
express.use(index);
// express.use(cors());
db()
server.listen(PORT, (req, res) => {
    console.log("server started");
  });
  
module.exports = server;