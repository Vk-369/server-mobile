var express = require("express");
var app = express.Router();
const UserDetails = require("../models/userDetails");
const playList = require("../models/playList");
const songsDetails = require("../models/songs");
const Joi = require("joi");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
app.use(cors());
const currenDir = path.join(__dirname, "../musicFiles/");
const { encrypt, decrypt } = require("../library/encryption");
const multer = require("multer");
const { jwtAuth } =require("../library/Auth");




//! for uploading song
app.post("/insert/newSong/byUrl", async (req, res) => {
  try {
    const uploadSchema = Joi.object({
      url: Joi.string().required(),
      displayName: Joi.string().required(),
      imageUrl: Joi.string().optional(),
      artist: Joi.string().optional(),
    });
    const { error } = uploadSchema.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send({ error: "JOI validation error while uploading music" });
    }
    const youtubeUrl = req.body.url;
    // Validate YouTube URL
    if (!ytdl.validateURL(youtubeUrl)) {
      return res.status(400).send("Invalid YouTube URL");
    }
    const info = await ytdl.getInfo(youtubeUrl);
    const metaData = {
      videoId: info.videoDetails.videoId,
      title: info.videoDetails.title,
      length: info.videoDetails.lengthSeconds,
      iframeUrl: `https://www.youtube.com/embed/${info.videoDetails.videoId}`,
      thumbnail: info.videoDetails.thumbnails[0].url,
    };
    const name = metaData.title.split("|")[0].trim();
    const savePath = currenDir + `${name}.mp3`;
    console.log(savePath, "this is the path in which the file gonna store");
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: "lowestaudio",
    });
    const fileStream = fs.createWriteStream(savePath);
    ytdl(youtubeUrl, { format: audioFormat }).pipe(fileStream);
    fileStream.on("finish", () => {
      console.log("Audio saved successfully");
      const store = storeDataInDb(metaData, `${name}`, req);
      res.send({ message: "audio file saved successfully", success: true });
    });
  } catch (error) {
    console.error("Error:", error);
    res.send(error);
  }
});

//!selected music file should be sent to the front end
app.get("/get/selected/music/file", async function (req, res, next) {
  // const body = decrypt(req.body);
  // req.body = decrypt(req);

  console.log("API is -/get/selected/music/file ");
  try {
    // const fetchSongSchema = Joi.object({
    //   s_id: Joi.string().required(), //this would contains the song name so that we can find the path of the song
    // });

    // const { error } = fetchSongSchema.validate(req.body);
    // if (error) {
    //   return res.status(400).json({ error: error.details[0].message });
    // }
    const record = await songsDetails.findOne({ _id: req.query.s_id });
    // readStream=fs.createReadStream(currenDir + `${record.s_path}.mp3`)
    if (record) {
      console.log("Streaming audio request received.");
      const audioPath = currenDir + `${record.s_path}.mp3`; // Change the file name and path accordingly
      const stat = fs.statSync(audioPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        // const chunksize = (end - start) + 1;
        const chunksize = 10 ** 5;
        const file = fs.createReadStream(audioPath, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "audio/mpeg", // Change the content type according to your audio file format
        };

        console.log(`Streaming audio chunk from byte ${start} to ${end}.`);
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": "audio/mpeg", // Change the content type according to your audio file format
        };
        console.log("Streaming full audio.");
        res.writeHead(200, head);
        fs.createReadStream(audioPath).pipe(res);
      }
    } else {
      console.log("Error while fetching");
      throw new Error("error while fetching the song");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//! fetch previously played song/recommended songs
app.post(
  "/get/recommendations/previouslyPlayed/song",
  jwtAuth,
  async function (req, res, next) {
    req.body = decrypt(req);
    console.log("API is -/get/recommendations/previouslyPlayed/song", req.body);
    const result = {};
    const uploadSchema = Joi.object({
      shuffle: Joi.boolean().required(),
    });
    const { error } = uploadSchema.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send({ error: "JOI validation error while uploading music" });
    }
    try {
      let songData = await songsDetails.find({});
      // .limit(10);
      if (req.body.shuffle) {
        // Example usage:
        const array = songData;
        songData = shuffleArray(array);
      }
      console.log(songData, "this is the song data for recommendations");
      result.success = true;
      result.error = false;
      result.message = "Successfully fetched";
      result.data = songData;
      return res.send(encrypt(result));
      // res.send(result)
    } catch (error) {
      console.error(error);
      // return res.status(500).json({ error: "Internal server error" });
      result.error = true;
      result.success = false;
      result.message =
        "unable to fetch the recommendations/previously played list";
      return res.status(500).send(encrypt(result));
    }
  }
);

//!fetch user details for user profile view
app.post("/get/user/profile/details", jwtAuth, async function (req, res, next) {
  req.body = decrypt(req);
  console.log("API is -/get/user/profile/details", req.body);
  const result = {};
  const userDetails = Joi.object({
    userID: Joi.string().required(),
  });
  const { error } = userDetails.validate(req.body);
  if (error) {
    console.log("joi validation", error);
    return res.send({
      error: "JOI validation error while fetching user profile details",
    });
  }
  try {
    let userData = await UserDetails.find(
      { user_id: req.body.userID },
      "username status p_pic_path phone_no mail_id gender"
    );
    console.log(userData, "this is the user data");

    result.success = true;
    result.error = false;
    result.message = "Successfully fetched";
    result.data = userData;
    return res.send(encrypt(result));
    // res.send(result)
  } catch (error) {
    console.error(error);
    // return res.status(500).json({ error: "Internal server error" });
    result.error = true;
    result.success = false;
    result.message = "unable to fetch the user details";
    return res.status(500).send(encrypt(result));
  }
});
//!update user profile
app.post("/update/user/profile",jwtAuth, async (req, res, next) => {
  try {
    req.body = decrypt(req);
    console.log("API is -update/user/profile", req.body);
    const result = {};
    const updateProfile = Joi.object({
      userupdatedData: Joi.object().required(),
      userID: Joi.string().required(),
    });
    const { error } = updateProfile.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send(
        encrypt({
          error: "JOI validation error while updating user profile details",
        })
      );
    }
    await UserDetails.updateOne(
      { user_id: req.body.userID }, // Filter
      {
        $set: {
          username: req.body.userupdatedData.username,
          gender: req.body.userupdatedData.gender,
          mail_id: req.body.userupdatedData.email,
          phone_no: req.body.userupdatedData.contact,
        },
      } // Update data
    );
    result.success = true;
    result.error = false;
    result.message = "Successfully fetched";
    return res.send(encrypt(result));
    // res.send(result)
  } catch (error) {
    console.error(error);
    // return res.status(500).json({ error: "Internal server error" });
    result.error = true;
    result.success = false;
    result.message = "unable to fetch the user details";
    return res.status(500).send(encrypt(result));
  }
});

//!create playlist
app.post("/create/playlist",jwtAuth, async (req, res, next) => {
  const result = {};

  try {
    req.body = decrypt(req);
    console.log("API is /create/playlist", req.body);
    const newPlaylist = Joi.object({
      user_id: Joi.string().required(),
      playListName: Joi.string().required(),
    });
    const { error } = newPlaylist.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send(
        encrypt({ error: "JOI validation error while creating a new playlist" })
      );
    }

    //todo try to write a transaction here
    const insertedPlayListDetails = await playList.create({
      p_name: req.body.playListName,
      songs: [],
    });
    console.log(
      insertedPlayListDetails._id,
      "this is the acknowledgement from song insertion"
    );
    if (insertedPlayListDetails._id) {
      await UserDetails.updateOne(
        { user_id: req.body.user_id }, // Filter
        {
          $push: {
            playlist: {
              p_id: insertedPlayListDetails._id,
              playListName: req.body.playListName,
            },
          },
        } // Update data
      );
    }
    //map this playlist id to the respective user
    result.success = true;
    result.error = false;
    result.message = "Successfully fetched";
    return res.send(encrypt(result));
    // res.send(result)
  } catch (error) {
    console.error(error);
    // return res.status(500).json({ error: "Internal server error" });
    result.error = true;
    result.success = false;
    result.message = "unable to create playlist";
    return res.status(500).send(encrypt(result));
  }
});

//! fetch playlists linked to an user
app.post("/fetch/playlist",jwtAuth, async (req, res, next) => {
  const result = {};

  try {
    req.body = decrypt(req);
    console.log("API is /fetch/playlist", req.body);
    const playLists = Joi.object({
      user_id: Joi.string().required(),
    });
    const { error } = playLists.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send(
        encrypt({ error: "JOI validation error while fetching playlists" })
      );
    }

    //todo try to write a transaction here
    const userRecord = await UserDetails.findOne({ user_id: req.body.user_id });
    console.log(userRecord.playlist, "this is the user record");
    const promises = [];
    const promiseTwo = [];
    for (let record of userRecord.playlist) {
      promises.push(playList.findOne({ _id: record.p_id }));
    }
    const promiseResponse = await Promise.all(promises);
    console.log(promiseResponse, "this is the first promise response");
    for (let item of promiseResponse) {
      promiseTwo.push(songsDetails.findOne({ _id: item.songs[0] }));
    }
    const finalPromiseResponse = await Promise.all(promiseTwo);
    console.log(finalPromiseResponse, "{{{{{{{{{}}}}}}}}}");

    userRecord.playlist.forEach((playlist,index) => {
      if(finalPromiseResponse[index] && finalPromiseResponse[index].length)
      playlist['s_pic_path'] = finalPromiseResponse[index].s_pic_path; // Assuming initial value of 0 for number of songs
    });
    
    //map this playlist id to the respective user
    result.data = userRecord.playlist;
    result.success = true;
    result.error = false;
    result.message = "Successfully fetched";
    return res.send(encrypt(result));
    // res.send(result)
  } catch (error) {
    console.error(error);
    // return res.status(500).json({ error: "Internal server error" });
    result.error = true;
    result.success = false;
    result.message = "unable to create playlist";
    return res.status(500).send(encrypt(result));
  }
});
//!fetch songs of a playlist
app.post("/fetch/playlist/linked/songs",jwtAuth, async (req, res, next) => {
  const result = {};
  try {
    req.body = decrypt(req);
    console.log("API is /fetch/playlist/related/songs", req.body);
    const playListsLinkedSongs = Joi.object({
      playListId: Joi.string().required(),
    });
    const { error } = playListsLinkedSongs.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send(
        encrypt({
          error: "JOI validation error while fetching playlists Linked songs",
        })
      );
    }

    //todo try to write a transaction here
    const playListLinedSongsList = await playList.findOne({
      _id: req.body.playListId,
    });
    console.log(
      playListLinedSongsList,
      "this is the playList linked songs record"
    );

    let songsOfPlayList = [];
    const promises = [];
    for (let index in playListLinedSongsList.songs) {
      promises.push(
        songsDetails.findOne({ _id: playListLinedSongsList.songs[index] })
      );
    }
    const songResponses = await Promise.all(promises);
    for (const songResponse of songResponses) {
      console.log(
        songResponse,
        "***********************************************"
      );
      songsOfPlayList.push(songResponse);
    }

    //map this playlist id to the respective user
    result.data = songsOfPlayList;
    result.success = true;
    result.error = false;
    result.message = "Successfully fetched";
    return res.send(encrypt(result));
    // res.send(result)
  } catch (error) {
    console.error(error);
    // return res.status(500).json({ error: "Internal server error" });
    result.error = true;
    result.success = false;
    result.message = "unable to create playlist";
    return res.status(500).send(encrypt(result));
  }
});
//! insert song into the playlist
app.post("/insert/song/playlist",jwtAuth, async (req, res, next) => {
  const result = {};
  try {
    req.body = decrypt(req);
    console.log("API is /insert/song/playlist", req.body);
    const songInsertionIntoPlaylist = Joi.object({
      playListId: Joi.string().required(),
      songId: Joi.string().required(),
    });
    const { error } = songInsertionIntoPlaylist.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send(
        encrypt({
          error: "JOI validation error while fetching playlists Linked songs",
        })
      );
    }

    //todo try to write a transaction here
    const playListRecords = await playList.findOne({
      _id: req.body.playListId,
    });
    console.log(playListRecords, "playListRecords playListRecords");
    for (let item of playListRecords.songs) {
      if (item === req.body.songId) {
        console.log("yes existed");
        return res.send(
          encrypt({ message: "song already existed in this playlist" })
        );
      }
    }

    const playListLinedSongsList = await playList.updateOne(
      { _id: req.body.playListId },
      {
        $push: { songs: req.body.songId },
      }
    );
    result.success = true;
    result.error = false;
    result.message = "Successfully fetched";
    return res.send(encrypt(result));
    // res.send(result)
  } catch (error) {
    console.error(error);
    // return res.status(500).json({ error: "Internal server error" });
    result.error = true;
    result.success = false;
    result.message = "unable to create playlist";
    return res.status(500).send(encrypt(result));
  }
});

//!this is the function to store the data in the db(music files and its metadata)
async function storeDataInDb(metaData, filePath, req) {
  console.log("this is to store the data in the data base");
  try {
    const insertedSongData = await songsDetails.create({
      s_path: filePath, //the file path would be the file name in the dat while retriving that we need to add current directory as prefix
      s_dis_name: metaData.title,
      i_tag: metaData.iframeUrl,
      s_pic_path: metaData.thumbnail,
      duration: metaData.length,
      videoId: metaData.videoId,
      s_displayName: req.body.displayName,
      image_url: req.body?.imageUrl,
      artist: req.body?.artist,
    });
    console.log("data inserted successfully");
  } catch (err) {
    console.log("failed to insert song data in to the db");
    throw err;
  }
}
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

module.exports = app;
