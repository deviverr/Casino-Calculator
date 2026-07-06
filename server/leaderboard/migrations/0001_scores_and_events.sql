CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) = 3),
  score INTEGER NOT NULL CHECK(score > 0),
  ante INTEGER NOT NULL CHECK(ante >= 1),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_rank
  ON scores (score DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  sid TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON events (created_at DESC);
