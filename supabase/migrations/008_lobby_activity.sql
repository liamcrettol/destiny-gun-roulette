-- ============================================================
-- 008 - Lobby activity: richer statuses + last-active timestamp
-- ============================================================
-- The status was only ever 'waiting' or 'done'. Add an 'in_game' state and
-- start actually setting rolling/applying/in_game across the lifecycle, plus a
-- last_active_at so we can tell which lobbies are live right now.

alter table lobbies drop constraint if exists lobbies_status_check;
alter table lobbies add constraint lobbies_status_check
  check (status in ('waiting', 'rolling', 'applying', 'in_game', 'done'));

alter table lobbies add column if not exists last_active_at timestamptz not null default now();
