var express = require("express");
var app = express.Router();
const multer = require("multer");
const UserDetails = require("../models/userDetails");
const playList = require("../models/playList");
const songsDetails = require("../models/songs");
const Joi = require("joi");
// const ytdl = require("ytdl-core");
const ytdl = require('@distube/ytdl-core');
const fs = require("fs");
const path = require("path");
const cors = require("cors");
app.use(cors());
const { encrypt, decrypt } = require("../library/encryption");
const currenDir = path.join(__dirname, "../musicFiles/");
const reqDirForProfilePics = path.join(__dirname, "../profilePics/");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reqDirForProfilePics); //set the directory
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

//! for uploading song
// JavaScript

// const express = require('express');
// const router = express.Router();
// const ytdl = require('ytdl-core');


// app.post("/insert/newSong/byUrl", async (req, res) => {
//   try {
//     console.log("Entered the upload API");

//     // Validate request body using Joi
//     const uploadSchema = Joi.object({
//       url: Joi.string().required(),
//       displayName: Joi.string().required(),
//       imageUrl: Joi.string().optional(),
//       artist: Joi.string().optional(),
//     });

//     const { error } = uploadSchema.validate(req.body);
//     if (error) {
//       console.log("Joi validation error:", error);
//       return res.status(400).send({ error: "JOI validation error while uploading music" });
//     }

//     const youtubeUrl = req.body.url;

//     // Validate YouTube URL
//     if (!ytdl.validateURL(youtubeUrl)) {
//       return res.status(400).send("Invalid YouTube URL");
//     }

//     const info = await ytdl.getInfo(youtubeUrl);
//     const metaData = {
//       videoId: info.videoDetails.videoId,
//       title: info.videoDetails.title,
//       length: info.videoDetails.lengthSeconds,
//       iframeUrl: `https://www.youtube.com/embed/${info.videoDetails.videoId}`,
//       thumbnail: info.videoDetails.thumbnails[0].url,
//     };

//     console.log("this is the meta data to be stored",metaData)

//     const name = metaData.title.split("|")[0].trim();
//     const savePath = path.join(currenDir, `${name.replace(/ /g, '_')}.mp3`);
//     console.log(savePath, "This is the path where the file will be stored");

//     const audioFormat = ytdl.chooseFormat(info.formats, { quality: "lowestaudio" });

//     // Ensure the directory exists
//     fs.mkdirSync(currenDir, { recursive: true });

//     console.log("Stream creation started");

//     const fileStream = fs.createWriteStream(savePath);
//     // console.log(fileStream,'this is the file stream created')

//     fileStream.on("error", (err) => {
//       console.log("Stream reading error:", err);
//       res.status(500).send({ error: "Error saving the audio file" });
//     });

//     fileStream.on("finish", () => {
//       console.log("Audio saved successfully");

//       // Store metadata in database (Assuming `storeDataInDb` is implemented)
//       storeDataInDb(metaData, name, req);

//       res.send({ message: "Audio file saved successfully", success: true });
//     });

//     // Pipe the ytdl stream to the fileStream
//     ytdl(youtubeUrl, { format: audioFormat })
//       .pipe(fileStream)
//       .on("error", (err) => {
//         console.error("Error during streaming:", err);
//         res.status(500).send({ error: "Error during audio streaming" });
//       });

//     console.log("Stream creation done");
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).send({ error: "An unexpected error occurred" });
//   }
// });





app.post("/insert/newSong/byUrl", async (req, res) => {
  try {
    console.log("Entered the upload API");

    // Validate request body using Joi
    const uploadSchema = Joi.object({
      url: Joi.string().required(),
      displayName: Joi.string().required(),
      imageUrl: Joi.string().optional(),
      artist: Joi.string().optional(),
      path:Joi.string().required(),
      lang:Joi.string().required()
    });

    const { error } = uploadSchema.validate(req.body);
    if (error) {
      console.log("Joi validation error:", error);
      return res.status(400).send({ error: "JOI validation error while uploading music" });
    }

    const youtubeUrl = req.body.url;

    // Validate YouTube URL
    if (!ytdl.validateURL(youtubeUrl)) {
      return res.status(400).send("Invalid YouTube URL");
    }

    const info = await ytdl.getInfo(youtubeUrl);
    console.log(info)
    const metaData = {
      videoId: info.videoDetails.videoId,
      title: info.videoDetails.title,
      length: info.videoDetails.lengthSeconds,
      iframeUrl: `https://www.youtube.com/embed/${info.videoDetails.videoId}`,
      thumbnail: info.videoDetails.thumbnails[0].url,
    };

    console.log("this is the meta data to be stored", metaData);

    const name=req.body.path
    const savePath = path.join(currenDir, `${name.replace(/ /g, '_')}.mp3`);
    console.log(savePath, "This is the path where the file will be stored");
      storeDataInDb(metaData, name, req); 

      res.send({ message: "Audio file saved successfully", success: true ,name:savePath});

    console.log("Stream creation done");

  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "An unexpected error occurred" });
  }
});


app.get("/", async function (req, res, next) {
  console.log("got ht");
  res.send("hello baiebee");
});
//!selected music file should be sent to the front end
app.get("/get/selected/music/file", async function (req, res, next) {
  try {
    const record = await songsDetails.findOne({ _id: req.query.s_id });
    if (!record?.s_path) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (req.query.user_ID) {
      const user = await UserDetails.findOne({ user_id: req.query.user_ID });
      const recentlyPlayed = Array.isArray(user?.recentlyPlayedList)
        ? user.recentlyPlayedList
        : [];
      if (!recentlyPlayed.includes(req.query.s_id)) {
        recentlyPlayed.push(req.query.s_id);
        if (recentlyPlayed.length > 10) recentlyPlayed.shift();
      }
      await UserDetails.updateOne(
        { user_id: req.query.user_ID },
        { $set: { recentlyPlayedList: recentlyPlayed } },
        { upsert: true }
      );
    }

    const audioPath = path.resolve(currenDir, record.s_path);
    const relativePath = path.relative(currenDir, audioPath);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      return res.status(400).json({ error: "Invalid song path" });
    }

    const { size: fileSize } = await fs.promises.stat(audioPath);
    let start = 0;
    let end = fileSize - 1;
    let statusCode = 200;
    const range = req.headers.range;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) {
        return res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
      }

      if (!match[1]) {
        const suffixLength = Number(match[2]);
        if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
          return res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
        }
        start = Math.max(fileSize - suffixLength, 0);
      } else {
        start = Number(match[1]);
        if (match[2]) end = Number(match[2]);
      }

      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start >= fileSize ||
        end < start
      ) {
        return res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
      }
      end = Math.min(end, fileSize - 1);
      statusCode = 206;
    }

    const headers = {
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "audio/mpeg",
    };
    if (statusCode === 206) {
      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
    }

    const file = fs.createReadStream(audioPath, { start, end });
    file.on("error", (error) => {
      console.error("Audio stream failed:", error);
      if (res.headersSent) res.destroy(error);
      else res.status(404).json({ error: "Song file not found" });
    });
    res.status(statusCode).set(headers);
    file.pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) return res.status(500).json({ error: "Internal server error" });
    res.destroy(error);
  }
});

//! fetch previously played song/recommended songs
app.post(
  "/get/recommendations/previouslyPlayed/song",
  async function (req, res, next) {
    console.log("API is -/get/recommendations/previouslyPlayed/song", req.body);
    req.body = decrypt(req,'fetch music');
    const result = {};
    const uploadSchema = Joi.object({
      shuffle: Joi.boolean().allow(null),
      searchKey: Joi.string().allow(null),
      limit: Joi.number().allow(null),
      skip: Joi.number().allow(null),
      // user_ID:Joi.string().required()
    });
    console.log(req.body, "this is the body in the search");
    const { error } = uploadSchema.validate(req.body);
    if (error) {
      console.log("joi validation", error);
      return res.send({ error: "JOI validation error while uploading music" });
    }
    let results;
    try {
      let songData;
      if (
        !req.body.searchKey ||
        (req.body.searchKey && !req.body.searchKey.length)
      ) {
        songData = await songsDetails.find({})
        .skip(req.body.skip).limit(req.body.limit);
        
      }
      if (req.body.searchKey && req.body.searchKey.length) {
        songData = await songsDetails.find({
          $or: [
            { s_displayName: { $regex: new RegExp(req.body.searchKey, "i") } },
            { artist: { $regex: new RegExp(req.body.searchKey, "i") } },
          ],
        });
        console.log(results, "this is the result required");
      }
      if (req.body.shuffle) {
        // Example usage:
        const array = songData;
        songData = shuffleArray(array);
      }
      // console.log(songData, "this is the song data for recommendations");
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
app.post("/get/user/profile/details", async function (req, res, next) {
  console.log("API is -/get/recommendations/previouslyPlayed/song", req.body);
  req.body = decrypt(req,'user details');
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
  let blobData;
  let userData = {};
  let fileData
  try {
    await UserDetails.find(
      { user_id: req.body.userID },
      "username status p_pic_path phone_no mail_id gender p_pic_path recentlyPlayedList"
    ).then((response) => {
      console.log(response, "this is the user data");
      userData["data"] = response;
      if (response[0]?.p_pic_path) {

        if (fs.existsSync(response[0]?.p_pic_path)) {
        let fileData = fs.readFileSync(response[0].p_pic_path);
        // const data = fs.readFileSync(filePath, 'utf8');
          blobData = Buffer.from(fileData).toString("base64");

          userData["profilePic"] = blobData;
        } else {
          console.log('File not found at the specified path!');
        }


        // const fileData = fs.readFileSync(response[0].p_pic_path);
 
        //  blobData=new Blob([data])
        // blobData = Buffer.from(fileData).toString("base64");

        // userData["profilePic"] = blobData;
      }
    });

    // console.log(userData, "this is the user data");

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
app.post(
  "/update/user/profile",
  upload.single("file"),
  async (req, res, next) => {
    try {
      // req = decrypt(req.body);
      // console.log(req,'this is the request after decrypting')
      // console.log("API is -update/user/profile", req.body);
      const result = {};
      const updateProfile = Joi.object().required();
      const { error } = updateProfile.validate(req.body);
      if (error) {
        console.log("joi validation", error);
        return res.send(
          encrypt({
            error: "JOI validation error while updating user profile details",
          })
        );
      }
      let savePath;
      if (req.file) {
        savePath = reqDirForProfilePics + `${req.file.filename}`.trim();
      }
      console.log(__dirname, "this is the current directory");
      await UserDetails.updateOne(
        { user_id: req.body.userID }, // Filter
        {
          $set: {
            username: req.body?.username,
            gender: req.body?.gender,
            mail_id: req.body?.email,
            phone_no: req.body?.contact,
            p_pic_path: savePath,
          },
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
      result.message = "unable to fetch the user details";
      return res.status(500).send(encrypt(result));
    }
  }
);

//!create playlist
app.post("/create/playlist", async (req, res, next) => {
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
app.post("/fetch/playlist", async (req, res, next) => {
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
    if (userRecord?.playlist?.length) {
      for (let record of userRecord.playlist) {
        promises.push(playList.findOne({ _id: record.p_id }));
      }
      const promiseResponse = await Promise.all(promises);
      console.log(promiseResponse, "this is the first promise response");
      for (let item of promiseResponse) {
        promiseTwo.push(songsDetails.findOne({ _id: item.songs[0] }));
      }
      const finalPromiseResponse = await Promise.all(promiseTwo);
      console.log(finalPromiseResponse, "this is the final promise response");

      userRecord.playlist.forEach((playlist, index) => {
        console.log(playlist, index);
        if (finalPromiseResponse[index]) {
          console.log("into the if conditoin");

          playlist["s_pic_path"] = finalPromiseResponse[index].s_pic_path; // Assuming initial value of 0 for number of songs
        }
      });
    }

    console.log(
      userRecord.playlist,
      "this is the user record respective playlist"
    );
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
app.post("/fetch/playlist/linked/songs", async (req, res, next) => {
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
app.post("/insert/song/playlist", async (req, res, next) => {
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
      s_path: `${filePath}.mp3`, //the file path would be the file name in the dat while retriving that we need to add current directory as prefix
      s_dis_name: metaData.title,
      i_tag: metaData.iframeUrl,
      s_pic_path: metaData.thumbnail,
      duration: metaData.length,
      videoId: metaData.videoId,
      s_displayName: req.body.displayName,
      image_url: req.body?.imageUrl,
      artist: req.body?.artist,
      language:req.body.lang
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



// ******************************************************************************************


module.exports = app;
