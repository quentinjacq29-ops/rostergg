-- ─────────────────────────────────────────────────────────────────────────────
-- PURGE des données de test « duo » pour repartir de zéro sur Vercel.
-- À lancer dans Supabase → SQL Editor. Atomique (begin/commit).
-- Ne touche PAS aux profils, comptes Riot, prefs, disponibilités : uniquement
-- les demandes de duo + les conversations de duo (messages/membres en cascade)
-- + les notifications.
-- ─────────────────────────────────────────────────────────────────────────────
begin;

-- 1) Conversations de duo → cascade automatiquement sur messages + conversation_members
delete from public.conversations where type = 'duo';

-- 2) Toutes les demandes de duo (pending / accepted / declined)
delete from public.duo_requests;

-- 3) Notifications (comptes de test → on repart propre ; enlève cette ligne
--    si tu veux garder d'éventuelles notifs non liées au duo)
delete from public.notifications;

commit;

-- Vérif (doit renvoyer 0 partout)
select 'duo_requests' as tbl, count(*) from public.duo_requests
union all select 'conversations_duo', count(*) from public.conversations where type = 'duo'
union all select 'notifications', count(*) from public.notifications;
