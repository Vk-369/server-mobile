
const fs = require("fs");
const path = require("path");
console.log(__dirname,'this is the directory in the server js file')

const currenDir = path.join(__dirname, "../src/musicFiles/Miami - Video Song.mp3");
console.log(currenDir,'songs')

module.exports = (server) => {
    const io=require('socket.io')(server,{
    cors:{
      origin:'*'
    }
  })

  io.on('connection', (socket) => {
    console.log('A user connected');
  
    socket.on('msg', (msg) => {
      console.log("Received message:", msg);
      io.to((msg.roomId).toString()).emit('message', msg);
    });
  
    socket.on('create room', (roomId) => {
      socket.join(roomId);
      console.log(roomId, 'Room created');  
    });
  
    socket.on('join room', (joinId) => {
      socket.join(joinId);
      console.log(joinId, 'Room joined');
      //this code is just check the socket ids present inside the room that is
      const roomSockets = io.sockets.adapter.rooms.get(joinId);
      if (roomSockets) console.log(Array.from(roomSockets));
    });
  
    socket.on('play', (event) => {
      console.log('Play event received');
      const readStream = fs.createReadStream(currenDir);
      readStream.on('data', (chunks) => {
        console.log(chunks)
        io.to(event.roomId.toString()).emit('stream', chunks);
      });
  
    });

    socket.on('resume play',(data)=>
    {
      console.log('resume play socket event')
      io.to(data.roomId.toString()).emit('resume play');

    })
    socket.on('pause play',(data)=>
    {
      console.log('this is into the pause play event ')
      io.to(data.roomId.toString()).emit('pause play');

    })
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

}