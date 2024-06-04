var express = require("express");
var app = express.Router();
const UserDetails = require("../models/userDetails");
const songsDetails = require("../models/songs");
const Joi = require("joi");
const ytdl = require("ytdl-core");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
app.use(cors());
const currenDir = path.join(__dirname, "../musicFiles/");
const { encrypt, decrypt } = require("../library/encryption");

//for uploading song
//need to make joi validation for this api
app.post("/insert/newSong/byUrl", async (req, res) => {
  try {
    const uploadSchema = Joi.object({
      url: Joi.string().required(),
      displayName: Joi.string().required(),
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

//this is the function to store the data in the db(music files and its metadata)
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
    });
    console.log("data inserted successfully");
  } catch (err) {
    console.log("failed to insert song data in to the db");
    throw err;
  }
}

//selected music file should be sent to the front end
app.post("/get/selected/music/file", async function (req, res, next) {
  // const body = decrypt(req.body);
  req.body = decrypt(req);

  console.log("API is -/get/selected/music/file", req.body);
  try {
    const fetchSongSchema = Joi.object({
      s_id: Joi.string().required(), //this would contains the song name so that we can find the path of the song
    });

    const { error } = fetchSongSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const record = await songsDetails.findOne({ _id: req.body.s_id });

    if (record) {
      console.log(record.s_path, "this is the songPath");
      const filePath = currenDir + `${record.s_path}.mp3`;
      await fs.readFile(filePath, (err, data) => {
        if (err) {
          throw err;
        }
        const base64Data = data.toString("base64");
        console.log("succesfully song fetched");
        res.send(encrypt({
          song: base64Data,
          success: true,
          message: "sucessfully song fetched",
        }));
      });
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
// app.get(
//   "/get/recommendations/previouslyPlayed/song",
//   async function (req, res, next) {
//     console.log("API is -/get/recommendations/previouslyPlayed/song", req.body);
//     const result = {};
//     try {
//       const songData = await songsDetails.find({}).limit(10);
//       console.log(songData, "this is the song data for recommendations");
//       result.success = true;
//       result.error = false;
//       result.message = "Successfully fetched";
//       result.data = songData;
//       return res.send(encrypt(result));
//       // res.send(result)
//     } catch (error) {
//       console.error(error);
//       // return res.status(500).json({ error: "Internal server error" });
//       result.error = true;
//       result.success = false;
//       result.message =
//         "unable to fetch the recommendations/previously played list";
//       return res.status(500).send(encrypt(result));
//     }
//   }
// );

module.exports = app;

//for playlist
app.get("/addOrUpdate/user/playlist", function (req, res, next) {
  res.render("index", { title: "this is add or update playlist" });
});

module.exports = app;
