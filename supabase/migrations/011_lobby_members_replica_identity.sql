-- Enable REPLICA IDENTITY FULL on lobby_members so Supabase Realtime can
-- filter DELETE events by lobby_id (without FULL, only the PK is available in
-- the old row, making lobby_id-filtered DELETE subscriptions silent).
ALTER TABLE lobby_members REPLICA IDENTITY FULL;
