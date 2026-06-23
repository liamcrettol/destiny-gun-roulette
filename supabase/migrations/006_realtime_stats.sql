-- ============================================================
-- 006 — Add stats tables to the realtime publication
-- ============================================================
-- Without this, the lobby's realtime subscription to game_sessions
-- never fires, so non-polling clients don't see new stats / the MVP
-- popup until they reload the page.
--
-- Idempotent: ALTER PUBLICATION has no IF NOT EXISTS, so we guard each
-- add against pg_publication_tables (re-running is safe).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'game_sessions'
  ) then
    alter publication supabase_realtime add table game_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'player_game_stats'
  ) then
    alter publication supabase_realtime add table player_game_stats;
  end if;
end $$;
