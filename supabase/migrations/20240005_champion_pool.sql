-- Migration 20240005 : ajouter champion_pool sur matching_prefs
-- Format : { "MID": ["Ahri","Zed"], "JNG": ["Kayn","Briar"] }

ALTER TABLE public.matching_prefs
  ADD COLUMN IF NOT EXISTS champion_pool jsonb NOT NULL DEFAULT '{}'::jsonb;
