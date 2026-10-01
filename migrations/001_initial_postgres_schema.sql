CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  gender TEXT,
  mail_id TEXT UNIQUE,
  phone_no TEXT,
  p_pic_path TEXT,
  password_hash TEXT,
  status SMALLINT CHECK (status IN (0, 1) OR status IS NULL),
  recently_played_list JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(recently_played_list) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  s_path TEXT NOT NULL,
  s_pic_path TEXT,
  i_tag TEXT,
  duration INTEGER NOT NULL CHECK (duration >= 0),
  video_id TEXT,
  display_name TEXT,
  image_url TEXT,
  artist TEXT,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  p_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_playlists (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  playlist_name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (user_id, playlist_id),
  UNIQUE (user_id, position)
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (playlist_id, song_id),
  UNIQUE (playlist_id, position)
);

CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY,
  mail_id TEXT NOT NULL,
  otp TEXT NOT NULL,
  expiry TEXT NOT NULL,
  status SMALLINT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS otps_mail_status_idx ON otps(mail_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS users_mail_id_lower_idx ON users(LOWER(mail_id)) WHERE mail_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS songs_display_name_lower_idx ON songs(LOWER(display_name));
CREATE INDEX IF NOT EXISTS songs_artist_lower_idx ON songs(LOWER(artist));
