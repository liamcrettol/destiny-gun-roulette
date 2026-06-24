-- Prevent duplicate game sessions for the same round. Every fireteam member
-- polls /api/stats/detect concurrently; without this, two clients can both pass
-- the no-session check and insert the same game twice (double-counting stats).
-- Partial index: legacy/cron rows may have a null round_id and are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_round_id_unique
  ON game_sessions (round_id)
  WHERE round_id IS NOT NULL;
