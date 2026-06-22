create table if not exists oauth_states (
  state text primary key,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists oauth_states_expires_idx on oauth_states(expires_at);
