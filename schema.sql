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

-- Site Settings (e.g., Active Hero Video)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('hero_video_position', '50% 50%');

-- Campaign Statistics Tables for O(1) Lookups
CREATE TABLE IF NOT EXISTS stats_kv (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO stats_kv (key, value) VALUES ('total_signatures', 0);

CREATE TABLE IF NOT EXISTS stats_countries (
    country TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stats_roles (
    role TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);

-- Trigger to incrementally update statistics on new signatures
CREATE TRIGGER IF NOT EXISTS increment_signature_stats
AFTER INSERT ON signatures
BEGIN
    UPDATE stats_kv SET value = value + 1 WHERE key = 'total_signatures';
    INSERT INTO stats_countries (country, count) VALUES (NEW.country, 1) 
        ON CONFLICT(country) DO UPDATE SET count = count + 1;
    INSERT INTO stats_roles (role, count) VALUES (NEW.role, 1) 
        ON CONFLICT(role) DO UPDATE SET count = count + 1;
END;

-- Populate total signatures
UPDATE stats_kv 
SET value = (SELECT COUNT(*) FROM signatures) 
WHERE key = 'total_signatures';

-- Populate country counts
INSERT OR REPLACE INTO stats_countries (country, count) 
SELECT country, COUNT(*) FROM signatures GROUP BY country;

-- Populate role counts
INSERT OR REPLACE INTO stats_roles (role, count) 
SELECT role, COUNT(*) FROM signatures GROUP BY role;