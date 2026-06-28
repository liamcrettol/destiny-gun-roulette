-- supabase/migrations/019_lobby_roll_settings.sql
-- Persist the captain's active roll settings on the lobby so non-captains can
-- view them read-only (see issue #106). Shape (jsonb):
--   { "mode": "normal"|"chaos"|"meta",
--     "rerollLimit": number|null,
--     "noDup": boolean,
--     "banned": string[],
--     "slots": { "kinetic": "normal"|"lock"|"wildcard", "energy": ..., "power": ... } }
alter table lobbies
  add column if not exists roll_settings jsonb;
