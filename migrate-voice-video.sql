-- Run this ONLY if you already created the database with the earlier schema.sql.
ALTER TABLE signatures ADD COLUMN upload_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_token ON signatures(upload_token);
CREATE TABLE IF NOT EXISTS media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  signature_id  INTEGER NOT NULL UNIQUE REFERENCES signatures(id),
  kind          TEXT    NOT NULL,
  r2_key        TEXT    NOT NULL,
  mime          TEXT    NOT NULL,
  size_bytes    INTEGER NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status, id);
