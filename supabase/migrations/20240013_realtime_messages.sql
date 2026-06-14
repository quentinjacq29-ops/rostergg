-- Active Realtime change-events for the messages table so that
-- postgres_changes subscriptions on the client deliver INSERT events.
alter publication supabase_realtime add table public.messages;
