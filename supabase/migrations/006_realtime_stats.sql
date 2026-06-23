-- ============================================================
-- 006 — Add stats tables to the realtime publication
-- ============================================================
-- Without this, the lobby's realtime subscription to game_sessions
-- never fires, so non-polling clients don't see new stats / the MVP
-- popup until they reload the page.

alter publication supabase_realtime add table game_sessions;
alter publication supabase_realtime add table player_game_stats;
