var express = require("express");
var app = express.Router();
const cors = require("cors");
const UserDetails = require('../models/userDetails')
const songsDetails = require('../models/songs')
const Joi = require("joi");
app.use(cors());
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
/* GET users listing. */
//for User details adding or updating

app.post("/addOrUpdate/user/details", async function (req, res, next) {
  console.log("API is -/addOrUpdate/user/details", req.body);
  try {
    const userDetailsSchema = Joi.object({
      user_id: Joi.number().required(),
      name: Joi.string().required(),
      gender: Joi.string().valid("male", "female").required(),
      mail_id: Joi.string().required(),
      phone_no: Joi.number().required(),
      // p_pic_path: Joi.string().required(),
    });

    const { error } = userDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const insertedUser = await UserDetails.create(body);
    if (!insertedUser) {
      // Handle database insertion failure
      return res
        .status(500)
        .json({ error: "Failed to insert user details into the database" });
    } else {
      console.log("Data inserted successfully");
      return res
        .status(201)
        .json({ message: "Successfully created a new user" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//for uploading song
//need to make joi validation for this api
app.post('/insert/newSong/byUrl', async (req, res) => {
  try {
    const uploadSchema = Joi.object({
      url: Joi.string().required(),
    });
    const { error } = uploadSchema.validate(req.body);
    if (error) {
      console.log("joi validation",error)
      return res.send({ error: 'JOI validation error while uploading music' });
    }
    const youtubeUrl = req.body.url
  // Validate YouTube URL
  if (!ytdl.validateURL(youtubeUrl)) {
    return res.status(400).send('Invalid YouTube URL');
  }
    const info = await ytdl.getInfo(youtubeUrl);
    const metaData = {
      videoId: info.videoDetails.videoId,
      title: info.videoDetails.title,
      length: info.videoDetails.lengthSeconds,
      iframeUrl: `https://www.youtube.com/embed/${info.videoDetails.videoId}`,
      thumbnail: info.videoDetails.thumbnails[0].url,
    };
    const name=metaData.title.split('|')[0]
    const savePath = path.join(__dirname, '../musicfiles',`${name}.mp3`);
    console.log(savePath,'this is the save path')
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'lowestaudio' });
    const fileStream = fs.createWriteStream(savePath);
    ytdl(youtubeUrl, { format: audioFormat }).pipe(fileStream);
    fileStream.on('finish', () => {
      console.log('Audio saved successfully');
      const store=storeDataInDb(metaData,savePath)
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

//this is the function to store the data in the db(music files and its metadata)
async function storeDataInDb(metaData,savePath)
{
  console.log("this is to store the data in the data base")
  const insertedSongData = await songsDetails.create(
  {
    s_path:savePath,
    s_dis_name:metaData.title,
    i_tag:metaData.iframeUrl,
    s_pic_path:metaData.thumbnail,
    duration:metaData.length,
    videoId:metaData.videoId
  })
  if (!insertedSongData) {
    // Handle database insertion failure
    console.log("error while inserting song data")
    } else {
    console.log("Data inserted successfully");
  
  }

}

//fetch the music file and send to the ui
app.post("/get/music/file", async function (req, res, next) {
  console.log("API is -/addOrUpdate/user/details", req.body);
  try {
    const fetchSongSchema = Joi.object({
      s_path: Joi.string().required(),//this would contains the song name so that we can find the path of the song
    });

    const { error } = fetchSongSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


module.exports = app






































//for playlist
app.get("/addOrUpdate/user/playlist", function (req, res, next) {
  res.render("index", { title: "this is add or update playlist" });
});


module.exports = app;
