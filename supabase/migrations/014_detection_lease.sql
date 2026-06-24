-- Detection lease: every fireteam member polls /api/stats/detect concurrently,
-- and each independently scans the Bungie PGCR API. The unique index on
-- game_sessions(round_id) makes the WRITE safe, but does nothing to stop N
-- redundant Bungie scans per cycle. This lease lets exactly one worker hold the
-- expensive scan for a short window; the rest skip and pick up the result via
-- realtime once it's recorded.

ALTER TABLE lobby_rounds ADD COLUMN IF NOT EXISTS detect_claimed_at timestamptz;

-- Atomically claim the detection slot for a round. Returns true only if the
-- caller acquired it (no live claim within the TTL). TTL-based so a crashed
-- worker never holds it permanently.
CREATE OR REPLACE FUNCTION claim_detection(p_round_id uuid, p_ttl_seconds integer)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE lobby_rounds
  SET detect_claimed_at = now()
  WHERE id = p_round_id
    AND (detect_claimed_at IS NULL
         OR detect_claimed_at < now() - make_interval(secs => p_ttl_seconds))
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;
