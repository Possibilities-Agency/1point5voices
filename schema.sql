-- 1.5 Billion Voices: signature database (Cloudflare D1)
CREATE TABLE IF NOT EXISTS signatures (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name   TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE,      -- private, never returned by the API
  country      TEXT    NOT NULL,
  role         TEXT    NOT NULL DEFAULT 'Citizen',
  message      TEXT,
  is_public    INTEGER NOT NULL DEFAULT 1,
  updates      INTEGER NOT NULL DEFAULT 0,   -- opted in to campaign updates
  upload_token TEXT,                         -- one-time key for adding a voice/video pledge
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sig_country ON signatures(country);
CREATE INDEX IF NOT EXISTS idx_sig_created ON signatures(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_token ON signatures(upload_token);

-- Voice and video pledges. Nothing is shown publicly until status = 'approved'.
CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  signature_id  INTEGER NOT NULL UNIQUE REFERENCES signatures(id),
  kind          TEXT    NOT NULL,            -- 'audio' or 'video'
  r2_key        TEXT    NOT NULL,
  mime          TEXT    NOT NULL,
  size_bytes    INTEGER NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status, id);
