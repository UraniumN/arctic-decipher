CREATE TABLE IF NOT EXISTS events (
  seq        BIGINT PRIMARY KEY,
  event_id   UUID UNIQUE NOT NULL,
  ts         BIGINT NOT NULL,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT NOT NULL,
  data_id    TEXT,
  status     INT NOT NULL DEFAULT 200,
  prev_hash  TEXT NOT NULL,
  hash       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chain_head (
  id   INT PRIMARY KEY,
  seq  BIGINT NOT NULL,
  hash TEXT NOT NULL
);

-- sha256('genesis')
INSERT INTO chain_head (id, seq, hash)
VALUES (1, 0, 'aeebad4a796fcc2e15dc4c6061b45ed9b373f26adfc798ca7d2d8cc58182718e')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS canaries (
  token   TEXT PRIMARY KEY,
  service TEXT NOT NULL
);
