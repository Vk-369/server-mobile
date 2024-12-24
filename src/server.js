const express = require("express")();
const bodyParser = require("body-parser");
const http = require("http");
// const ngrok=require('ngrok')

// var app = express.Router();

//const cors = require("cors");
// const HOST = "192.168.1.24";
const HOST = '0.0.0.0'
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const index = require("./index");
const  connections = require("./db");
const socketEvents = require("./sockets.js");
// const UserRoutes = require('./src/routes/users')
// const SignupRoutes = require('./src/routes/Authentication/signup')
// const LoginRoutes = require('./src/routes/Authentication/login')

// const routes = [UserRoutes, SignupRoutes, LoginRoutes]

// module.exports = routes

connections.db();
const PORT = process.env.PORT || 3000;

const server = http.createServer(express);

express.use(bodyParser.json());
express.use(index);
//express.use(cors());
const io = socketEvents(server);

// app.get("/", async function (req, res, next) {
//   console.log("got ht");
//   res.send("hello baiebee");
// });
server.listen(PORT, HOST, (req, res) => {
  console.log("server started at", `${PORT}`);

//   ngrok.connect(PORT).then(ngrokurl=>
//   {
// console.log(ngrokurl)
//   }
//   )
});

module.exports = server;
