-- ============================================================
-- 004 — Post-match stats tracking
-- ============================================================

create table if not exists game_sessions (
  id uuid primary key default uuid_generate_v4(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  played_at timestamptz not null default now(),
  player_count integer not null default 0,
  roulette_hashes bigint[] not null default '{}'
);

create table if not exists player_game_stats (
  id uuid primary key default uuid_generate_v4(),
  game_session_id uuid not null references game_sessions(id) on delete cascade,
  user_id text not null references users(id),
  display_name text not null,
  kills integer not null default 0,
  deaths integer not null default 0,
  assists integer not null default 0,
  kd numeric(6,2) not null default 0,
  roulette_weapon_kills integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists player_game_stats_user_idx on player_game_stats(user_id);
create index if not exists game_sessions_lobby_idx on game_sessions(lobby_id);

alter table game_sessions enable row level security;
alter table player_game_stats enable row level security;

create policy "anon read game_sessions" on game_sessions for select using (true);
create policy "anon read player_game_stats" on player_game_stats for select using (true);
