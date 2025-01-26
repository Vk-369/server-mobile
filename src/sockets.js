
const fs = require("fs");
const path = require("path");
const songsDetails = require("./models/songs");

console.log(__dirname,'this is the directory in the server js file')

// const currenDir = path.join(__dirname, "../src/musicFiles/Miami - Video Song.mp3");  
// console.log(currenDir,'songs')
const currenDir = path.join(__dirname, "../src/musicFiles/");


module.exports = (server) => {
    const io=require('socket.io')(server,{
    cors:{
      origin:'*'
    }
  })

  io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('msg', (data) => {
      console.log("Received message:", data,'lllllllllllll',data.roomId);
      io.to((data.roomId).toString()).emit('message', data);
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
  

    // {roomId:this.roomId,songId:songId}

    socket.on('play', async (event) => {
      console.log('Play event received',event);
    const record = await songsDetails.findOne({ _id:event.songId});
    console.log(record,'this is the record needed')
    const audioPath = currenDir + `${record.s_path}`; // Change the file name and path accordingly
    console.log(audioPath,"this is the audio path")
    io.to(event.roomId.toString()).emit('metaData',record)
      const readStream = fs.createReadStream(audioPath);
      // const readStream = fs.createReadStream(currenDir);
      readStream.on('data', (chunks) => {
        console.log(chunks,"chunk **************",audioPath)
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
    socket.on('play next',(data)=>
    {
      console.log('this is into the pause play event ',data)
      io.to(data.roomId.toString()).emit('next play this',data);

    })
    socket.on('play previous one',(data)=>
    {
      console.log('this is into the pause play event ',data)
      io.to(data.roomId.toString()).emit('next play this',data);

    })
    socket.on('seek',(data)=>
    {
      console.log('this is into song seeking event ',data)
      io.to(data.roomId.toString()).emit('song seeking',data);

    })
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

}