const fs = require("fs");
const path = require("path");
const songsDetails = require("./models/songs");

const musicDirectory = path.join(__dirname, "musicFiles");

module.exports = (server) => {
  const io = require("socket.io")(server, {
    cors: {
      origin: "*",
    },
  });
  const roomPlayback = new Map();

  const getRoomId = (value) => {
    if (value === undefined || value === null) return null;
    const roomId = String(value).trim();
    return roomId.length > 0 ? roomId : null;
  };

  const getPosition = (state) => {
    if (state.paused) return state.position;
    return state.position + (Date.now() - state.startedAt) / 1000;
  };

  const emitPlaybackState = (target, roomId, state) => {
    target.emit("playback:sync", {
      roomId,
      songId: state.songId,
      position: getPosition(state),
      playing: !state.paused,
      serverTime: Date.now(),
    });
  };

  const joinRoom = (socket, roomId) => {
    socket.join(roomId);
    const state = roomPlayback.get(roomId);
    if (!state) return;
    socket.emit("metaData", state.record);
    emitPlaybackState(socket, roomId, state);
  };

  io.on("connection", (socket) => {
    socket.on("msg", (data) => {
      const roomId = getRoomId(data?.roomId);
      if (roomId) io.to(roomId).emit("message", data);
    });

    socket.on("create room", (value) => {
      const roomId = getRoomId(value);
      if (roomId) joinRoom(socket, roomId);
    });

    socket.on("join room", (value) => {
      const roomId = getRoomId(value);
      if (roomId) joinRoom(socket, roomId);
    });

    socket.on("leave room", (value) => {
      const roomId = getRoomId(value);
      if (roomId) socket.leave(roomId);
    });

    socket.on("play", async (event) => {
      const roomId = getRoomId(event?.roomId);
      if (!roomId || !event?.songId) {
        socket.emit("playback:error", { message: "A room and song are required." });
        return;
      }

      try {
        const record = await songsDetails.findOne({ _id: event.songId });
        if (!record?.s_path) throw new Error("Song file is unavailable.");

        const audioPath = path.resolve(musicDirectory, record.s_path);
        const relativePath = path.relative(musicDirectory, audioPath);
        if (
          relativePath === ".." ||
          relativePath.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativePath)
        ) {
          throw new Error("Invalid song file path.");
        }
        await fs.promises.stat(audioPath);

        const state = {
          record: typeof record.toObject === "function" ? record.toObject() : record,
          songId: String(record._id),
          position: 0,
          startedAt: Date.now(),
          paused: false,
        };
        roomPlayback.set(roomId, state);
        io.to(roomId).emit("metaData", state.record);
        emitPlaybackState(io.to(roomId), roomId, state);
      } catch (error) {
        io.to(roomId).emit("playback:error", { message: "Unable to play this song." });
      }
    });

    socket.on("resume play", (data) => {
      const roomId = getRoomId(data?.roomId);
      if (!roomId) return;
      const state = roomPlayback.get(roomId);
      if (state?.paused) {
        state.paused = false;
        state.startedAt = Date.now();
      }
      io.to(roomId).emit("resume play");
      if (state) emitPlaybackState(io.to(roomId), roomId, state);
    });

    socket.on("pause play", (data) => {
      const roomId = getRoomId(data?.roomId);
      if (!roomId) return;
      const state = roomPlayback.get(roomId);
      if (state && !state.paused) {
        state.position = getPosition(state);
        state.paused = true;
      }
      io.to(roomId).emit("pause play");
      if (state) emitPlaybackState(io.to(roomId), roomId, state);
    });

    socket.on("play next", (data) => {
      const roomId = getRoomId(data?.roomId);
      if (roomId) io.to(roomId).emit("next play this", data);
    });

    socket.on("play previous one", (data) => {
      const roomId = getRoomId(data?.roomId);
      if (roomId) io.to(roomId).emit("previous play this", data);
    });

    socket.on("seek", (data) => {
      const roomId = getRoomId(data?.roomId);
      if (!roomId) return;
      const state = roomPlayback.get(roomId);
      const position = Number(data?.timeJump);
      if (state && Number.isFinite(position) && position >= 0) {
        state.position = Number.isFinite(Number(state.record.duration))
          ? Math.min(position, Number(state.record.duration))
          : position;
        state.startedAt = Date.now();
      }
      io.to(roomId).emit("song seeking", { ...data, timeJump: position });
      if (state) emitPlaybackState(io.to(roomId), roomId, state);
    });
  });

  return io;
};