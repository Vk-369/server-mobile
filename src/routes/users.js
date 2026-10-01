var express = require("express");
var app = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const { sql } = require("../db");
const Joi = require("joi");
// const ytdl = require("ytdl-core");
const ytdl = require('@distube/ytdl-core');
const fs = require("fs");
const path = require("path");
const cors = require("cors");
app.use(cors());
const { encrypt, decrypt } = require("../library/encryption");
const resolveSongFile = require("../library/resolve-song-file");
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
      await storeDataInDb(metaData, name, req);

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
    const [record] = await sql`
      SELECT id AS "_id", s_path, s_pic_path, i_tag, duration,
             video_id AS "videoId", display_name AS "s_displayName",
             image_url, artist, language
      FROM songs WHERE id = ${req.query.s_id}
      LIMIT 1
    `;
    if (!record?.s_path) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (req.query.user_ID) {
      const [user] = await sql`
        SELECT recently_played_list FROM users WHERE user_id = ${req.query.user_ID}
      `;
      const recentlyPlayed = Array.isArray(user?.recently_played_list)
        ? user.recently_played_list
        : [];
      if (!recentlyPlayed.includes(req.query.s_id)) {
        recentlyPlayed.push(req.query.s_id);
        if (recentlyPlayed.length > 10) recentlyPlayed.shift();
      }
      await sql`
        UPDATE users SET recently_played_list = ${sql.json(recentlyPlayed)}, updated_at = NOW()
        WHERE user_id = ${req.query.user_ID}
      `;
    }

    const { audioPath, size: fileSize } = await resolveSongFile(currenDir, record.s_path);
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
      "Content-Type": audioPath.toLowerCase().endsWith(".m4a")
        ? "audio/mp4"
        : "audio/mpeg",
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
      const limit = Math.min(Math.max(Number(req.body.limit) || 100, 1), 500);
      const skip = Math.max(Number(req.body.skip) || 0, 0);
      if (
        !req.body.searchKey ||
        (req.body.searchKey && !req.body.searchKey.length)
      ) {
        songData = await sql`
          SELECT id AS "_id", s_path, s_pic_path, i_tag, duration,
                 video_id AS "videoId", display_name AS "s_displayName",
                 image_url, artist, language
          FROM songs ORDER BY id LIMIT ${limit} OFFSET ${skip}
        `;
      }
      if (req.body.searchKey && req.body.searchKey.length) {
        const searchKey = `%${req.body.searchKey}%`;
        songData = await sql`
          SELECT id AS "_id", s_path, s_pic_path, i_tag, duration,
                 video_id AS "videoId", display_name AS "s_displayName",
                 image_url, artist, language
          FROM songs
          WHERE display_name ILIKE ${searchKey} OR artist ILIKE ${searchKey}
          ORDER BY id LIMIT ${limit} OFFSET ${skip}
        `;
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
  let userData = {};
  try {
    const response = await sql`
      SELECT user_id, username, status, p_pic_path, phone_no, mail_id, gender,
             recently_played_list AS "recentlyPlayedList"
      FROM users WHERE user_id = ${req.body.userID}
    `;
    userData.data = response;
    if (response[0]?.p_pic_path && fs.existsSync(response[0].p_pic_path)) {
      const profileImage = fs.readFileSync(response[0].p_pic_path);
      userData.profilePic = Buffer.from(profileImage).toString("base64");
    }

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
      await sql`
        UPDATE users SET
          username = COALESCE(${req.body?.username ?? null}, username),
          gender = COALESCE(${req.body?.gender ?? null}, gender),
          mail_id = COALESCE(${req.body?.email ?? null}, mail_id),
          phone_no = COALESCE(${req.body?.contact ?? null}, phone_no),
          p_pic_path = COALESCE(${savePath ?? null}, p_pic_path),
          updated_at = NOW()
        WHERE user_id = ${req.body.userID}
      `;

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

    const playlistId = crypto.randomBytes(12).toString("hex");
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO playlists (id, p_name)
        VALUES (${playlistId}, ${req.body.playListName})
      `;
      await transaction`
        INSERT INTO user_playlists (user_id, playlist_id, playlist_name, position)
        SELECT ${req.body.user_id}, ${playlistId}, ${req.body.playListName},
               COALESCE(MAX(position) + 1, 0)
        FROM user_playlists WHERE user_id = ${req.body.user_id}
      `;
    });
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
    result.data = await sql`
      SELECT up.playlist_id AS p_id,
             up.playlist_name AS "playListName",
             (
               SELECT s.s_pic_path
               FROM playlist_songs ps
               JOIN songs s ON s.id = ps.song_id
               WHERE ps.playlist_id = up.playlist_id
               ORDER BY ps.position LIMIT 1
             ) AS s_pic_path
      FROM user_playlists up
      WHERE up.user_id = ${req.body.user_id}
      ORDER BY up.position
    `;
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
    const songsOfPlayList = await sql`
      SELECT s.id AS "_id", s.s_path, s.s_pic_path, s.i_tag, s.duration,
             s.video_id AS "videoId", s.display_name AS "s_displayName",
             s.image_url, s.artist, s.language
      FROM playlist_songs ps
      JOIN songs s ON s.id = ps.song_id
      WHERE ps.playlist_id = ${req.body.playListId}
      ORDER BY ps.position
    `;

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
    const [existingSong] = await sql`
      SELECT song_id FROM playlist_songs
      WHERE playlist_id = ${req.body.playListId} AND song_id = ${req.body.songId}
    `;
    if (existingSong) {
      return res.send(encrypt({ message: "song already existed in this playlist" }));
    }
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO playlist_songs (playlist_id, song_id, position)
        SELECT ${req.body.playListId}, ${req.body.songId},
               COALESCE(MAX(position) + 1, 0)
        FROM playlist_songs WHERE playlist_id = ${req.body.playListId}
      `;
    });
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
    await sql`
      INSERT INTO songs (
        id, s_path, s_pic_path, i_tag, duration, video_id,
        display_name, image_url, artist, language
      ) VALUES (
        ${crypto.randomBytes(12).toString("hex")}, ${filePath}.mp3,
        ${metaData.thumbnail}, ${metaData.iframeUrl}, ${Number(metaData.length)},
        ${metaData.videoId}, ${req.body.displayName}, ${req.body?.imageUrl ?? null},
        ${req.body?.artist ?? null}, ${req.body.lang}
      )
    `;
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
