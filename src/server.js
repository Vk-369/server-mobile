const express = require("express")();
const bodyParser = require("body-parser");
const http = require("http");
//const cors = require("cors");
const HOST = '192.168.1.22'
// const HOST = '0.0.0.0'
require("dotenv").config();

const index = require("./index");
const db = require("./db");

const PORT = process.env.SERVER_PORT;

const server = http.createServer(express);

express.use(bodyParser.json());
express.use(index);
//express.use(cors());
db();

const io=require('socket.io')(server,{
  cors:{
    origin:'*'
  }
})

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('msg',(msg)=>
    {
      console.log("this s teosidjfsdofjdofjh",msg)
      io.to("12345").emit('message', msg);
      // socket.broadcast.to(msg.userId.toString()).emit('message', msg);

    })
  socket.on('create room', (roomId) => {
    socket.join(roomId);
    console.log(roomId,'this is the room id generated')
})

socket.on('join room',(joinId)=>{
  socket.join(joinId);
  console.log(joinId,'this is the join id')

  socket.on('play', (data) => {
    // Logic to handle play request (e.g., read audio file)
    const audioData = // Read audio data from file or stream
    socket.emit('audio-stream', audioData);
});



  const roomSockets = io.sockets.adapter.rooms.get(joinId);
  if(roomSockets)
    console.log(Array.from(roomSockets))
});


  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

});

server.listen(PORT,HOST, (req, res) => {
  console.log("server started at",`${PORT}`);
});

module.exports = server;
