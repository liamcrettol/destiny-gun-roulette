-- One-time auth codes for the custom Bungie OAuth → NextAuth credentials bridge
create table if not exists auth_codes (
  code text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Auto-clean expired codes
create index if not exists auth_codes_expires_idx on auth_codes(expires_at);
