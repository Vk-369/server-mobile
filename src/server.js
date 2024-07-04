const express = require("express")();
const bodyParser = require("body-parser");
const http = require("http");
y
//const cors = require("cors");
// const HOST = "10.10.1.202";
const HOST = '0.0.0.0'
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const index = require("./index");
const db = require("./db");
const socketEvents = require("./sockets.js");

const PORT = process.env.SERVER_PORT;

const server = http.createServer(express);

express.use(bodyParser.json());
express.use(index);
//express.use(cors());
db();
const io = socketEvents(server);

server.listen(PORT, HOST, (req, res) => {
  console.log("server started at", `${PORT}`);
});

module.exports = server;
