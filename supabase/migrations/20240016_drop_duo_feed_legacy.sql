-- Migration: supprime l'ANCIENNE fonction duo_feed (p_role_filter text)
--
-- 20240012 a fait `create or replace` avec un nouveau nom de paramètre
-- (p_role_filter text → p_role_filters text[]). Comme la signature diffère,
-- Postgres a créé une 2e surcharge au lieu de remplacer → les deux coexistent.
-- Résultat : appeler duo_feed sans filtre de rôle déclenche PGRST203
-- (« Could not choose the best candidate function ») → feed cassé.
--
-- On supprime l'ancienne surcharge (celle qui prend p_role_filter en `text`).
-- La nouvelle (p_role_filters text[]) est conservée.

drop function if exists public.duo_feed(
  uuid,     -- p_user_id
  text,     -- p_role_filter   (ANCIEN — celui qu'on supprime)
  text,     -- p_rank_floor
  text,     -- p_rank_ceiling
  boolean,  -- p_voice
  text,     -- p_region
  integer,  -- p_limit
  integer   -- p_offset
);
