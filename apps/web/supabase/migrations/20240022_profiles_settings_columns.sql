-- Colonnes de réglages manquantes sur profiles (jamais créées → tous les toggles
-- /settings étaient morts, et 20240021 a cassé le feed en référençant
-- profile_discoverable qui n'existait pas). On les crée avec des défauts sûrs :
--   profile_discoverable = true  → tout le monde visible par défaut (feed rétabli)
--   show_online_status   = true
--   allow_requests_from_all = false
--   request_policy = 'all'       (défaut produit : tout le monde ; opt-in 'elo_range')
--   notification_prefs = {}      (matrice type × canal)

alter table public.profiles
  add column if not exists profile_discoverable    boolean not null default true,
  add column if not exists show_online_status      boolean not null default true,
  add column if not exists allow_requests_from_all boolean not null default false,
  add column if not exists request_policy          text    not null default 'all',
  add column if not exists notification_prefs      jsonb   not null default '{}'::jsonb;
