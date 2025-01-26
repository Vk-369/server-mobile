// const serverless=require('serverless-http')
const express = require("express");
const app=express()
const bodyParser = require("body-parser");
const http = require("http");
var router = express.Router();
const HOST = '0.0.0.0'
require("dotenv").config();
const index = require("./index");
const  connections = require("./db");
const socketEvents = require("./sockets.js");
// connections.db();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
app.use(bodyParser.json());
app.use(index);

// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   next();
// });

const io = socketEvents(server);


//!testing api
app.get("/test", async function (req, res, next) {
  console.log("got ht",currenDir);
  res.send("hello baiebee");
});
app.post("/post/posting", async function (req, res, next) {
  console.log("got ht",currenDir);
  // req.body = decrypt(req);

  res.send(req.body);
});
server.listen(PORT, HOST, (req, res) => {
  console.log("server started at", `${PORT}`);
})

//!NOTE ALL THE API CALLS ARE SHIFTING TO THIS FILE FOR THE TIME BEING
//! API CALLS STARTS




module.exports = server;


//!API CALLS ENDS
//  app.use('/.netlify/functions/server', router);
// app.use('/.netlify/functions/routes/Authentication/login', router);
// functions/routes/Authentication/login
// module.exports.handler = serverless(app);


