require("dotenv").config();

const mongoose = require("mongoose");
const database = require("../src/db");

const sourceUri = process.env.MONGO_URL;
const collections = ["userdetails", "songs", "playlists", "otp"];

const toId = (value) => (value == null ? null : String(value));
const toNullableText = (value) => (value == null ? null : String(value));

const migrate = async () => {
  if (!sourceUri) {
    throw new Error("Set MONGO_URL in .env to the MongoDB database that contains the source data.");
  }

  await database.initialize();
  await mongoose.connect(sourceUri, { serverSelectionTimeoutMS: 10000 });

  const source = mongoose.connection.db;
  const documents = {};
  for (const collection of collections) {
    documents[collection] = await source.collection(collection).find({}).toArray();
  }

  const songIds = new Set(documents.songs.map((song) => toId(song._id)));
  const playlistIds = new Set(documents.playlists.map((playlist) => toId(playlist._id)));
  const counts = {
    users: 0,
    songs: 0,
    playlists: 0,
    userPlaylists: 0,
    playlistSongs: 0,
    otps: 0,
    skippedUserPlaylistLinks: 0,
    skippedPlaylistSongs: 0,
  };

  await database.sql.begin(async (transaction) => {
    for (const user of documents.userdetails) {
      const userId = toId(user.user_id);
      if (!userId) continue;
      const inserted = await transaction`
        INSERT INTO users (
          user_id, username, gender, mail_id, phone_no, p_pic_path,
          password_hash, status, recently_played_list
        ) VALUES (
          ${userId}, ${toNullableText(user.username)}, ${toNullableText(user.gender)},
          ${toNullableText(user.mail_id)}, ${toNullableText(user.phone_no)},
          ${toNullableText(user.p_pic_path)}, ${toNullableText(user.password)},
          ${user.status == null ? null : Number(user.status)},
          ${transaction.json(Array.isArray(user.recentlyPlayedList) ? user.recentlyPlayedList.map(toId) : [])}
        ) ON CONFLICT DO NOTHING RETURNING user_id
      `;
      counts.users += inserted.length;
    }

    for (const song of documents.songs) {
      const id = toId(song._id);
      if (!id || !song.s_path) continue;
      const inserted = await transaction`
        INSERT INTO songs (
          id, s_path, s_pic_path, i_tag, duration, video_id,
          display_name, image_url, artist, language
        ) VALUES (
          ${id}, ${String(song.s_path)}, ${toNullableText(song.s_pic_path)},
          ${toNullableText(song.i_tag)}, ${Math.max(0, Math.trunc(Number(song.duration) || 0))},
          ${toNullableText(song.videoId)}, ${toNullableText(song.s_displayName)},
          ${toNullableText(song.image_url)}, ${toNullableText(song.artist)},
          ${toNullableText(song.language)}
        ) ON CONFLICT DO NOTHING RETURNING id
      `;
      counts.songs += inserted.length;
    }

    for (const playlist of documents.playlists) {
      const id = toId(playlist._id);
      if (!id || playlist.p_name == null) continue;
      const inserted = await transaction`
        INSERT INTO playlists (id, p_name)
        VALUES (${id}, ${String(playlist.p_name)})
        ON CONFLICT DO NOTHING RETURNING id
      `;
      counts.playlists += inserted.length;
    }

    for (const user of documents.userdetails) {
      const userId = toId(user.user_id);
      if (!userId) continue;
      const links = Array.isArray(user.playlist) ? user.playlist : [];
      for (const [position, link] of links.entries()) {
        const playlistId = toId(link?.p_id);
        if (!playlistIds.has(playlistId)) {
          counts.skippedUserPlaylistLinks += 1;
          continue;
        }
        const inserted = await transaction`
          INSERT INTO user_playlists (user_id, playlist_id, playlist_name, position)
          SELECT ${userId}, ${playlistId}, ${String(link.playListName || "")}, ${position}
          WHERE EXISTS (SELECT 1 FROM users WHERE user_id = ${userId})
          ON CONFLICT DO NOTHING RETURNING playlist_id
        `;
        counts.userPlaylists += inserted.length;
        if (!inserted.length) counts.skippedUserPlaylistLinks += 1;
      }
    }

    for (const playlist of documents.playlists) {
      const playlistId = toId(playlist._id);
      const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
      for (const [position, songValue] of songs.entries()) {
        const songId = toId(songValue?._id ?? songValue);
        if (!songIds.has(songId)) {
          counts.skippedPlaylistSongs += 1;
          continue;
        }
        const inserted = await transaction`
          INSERT INTO playlist_songs (playlist_id, song_id, position)
          SELECT ${playlistId}, ${songId}, ${position}
          WHERE EXISTS (SELECT 1 FROM playlists WHERE id = ${playlistId})
            AND EXISTS (SELECT 1 FROM songs WHERE id = ${songId})
          ON CONFLICT DO NOTHING RETURNING song_id
        `;
        counts.playlistSongs += inserted.length;
        if (!inserted.length) counts.skippedPlaylistSongs += 1;
      }
    }

    for (const otp of documents.otp) {
      const id = toId(otp._id);
      if (!id || otp.mail_id == null || otp.otp == null || otp.expiry == null) continue;
      const inserted = await transaction`
        INSERT INTO otps (id, mail_id, otp, expiry, status, created_at, updated_at)
        VALUES (
          ${id}, ${String(otp.mail_id)}, ${String(otp.otp)}, ${String(otp.expiry)},
          ${Number(otp.status) || 0}, ${String(otp.created_at)}, ${String(otp.updated_at)}
        ) ON CONFLICT DO NOTHING RETURNING id
      `;
      counts.otps += inserted.length;
    }
  });

  const targetCounts = await database.sql`
    SELECT
      (SELECT COUNT(*)::INTEGER FROM users) AS users,
      (SELECT COUNT(*)::INTEGER FROM songs) AS songs,
      (SELECT COUNT(*)::INTEGER FROM playlists) AS playlists,
      (SELECT COUNT(*)::INTEGER FROM user_playlists) AS user_playlists,
      (SELECT COUNT(*)::INTEGER FROM playlist_songs) AS playlist_songs,
      (SELECT COUNT(*)::INTEGER FROM otps) AS otps
  `;
  const sourceCounts = {
    users: documents.userdetails.length,
    songs: documents.songs.length,
    playlists: documents.playlists.length,
    otps: documents.otp.length,
  };
  console.log("Mongo source rows:", JSON.stringify(sourceCounts));
  console.log("PostgreSQL target rows:", JSON.stringify(targetCounts[0]));
  console.log("Rows inserted this run:", JSON.stringify(counts));
  if (counts.skippedUserPlaylistLinks || counts.skippedPlaylistSongs) {
    console.warn("Some playlist links reference missing Mongo records and were skipped.");
  }
};

migrate()
  .catch((error) => {
    console.error("Mongo to PostgreSQL migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    await database.sql.end().catch(() => {});
  });
