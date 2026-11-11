-- 1.5 Billion Voices: signature database (Cloudflare D1)
CREATE TABLE IF NOT EXISTS signatures (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name  TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,      -- private, never returned by the API
  country     TEXT    NOT NULL,
  role        TEXT    NOT NULL DEFAULT 'Citizen',
  message     TEXT,
  is_public   INTEGER NOT NULL DEFAULT 1,
  updates     INTEGER NOT NULL DEFAULT 0,   -- opted in to campaign updates
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sig_country ON signatures(country);
CREATE INDEX IF NOT EXISTS idx_sig_created ON signatures(created_at);
