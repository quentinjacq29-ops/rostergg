-- Cache des dernières parties (Match-V5) — lazy cache.
-- Le détail d'une partie est permanent : on ne re-télécharge jamais une partie
-- connue, on stocke ici les nouvelles. Lu par /u/:riotId (desktop + mobile).

alter table public.riot_accounts add column if not exists last_match_sync timestamptz;

create table if not exists public.match_history (
  riot_account_id uuid not null references public.riot_accounts(id) on delete cascade,
  match_id        text not null,
  champion_id     int,
  champion_key    text,
  kills           int,
  deaths          int,
  assists         int,
  cs              int,
  win             boolean,
  duration        int,            -- secondes
  game_end        timestamptz,
  created_at      timestamptz default now(),
  primary key (riot_account_id, match_id)
);

create index if not exists match_history_recent_idx
  on public.match_history (riot_account_id, game_end desc);

alter table public.match_history enable row level security;

-- Lecture publique (profil joueur public / SEO). Écritures = service_role uniquement.
drop policy if exists match_history_select_public on public.match_history;
create policy match_history_select_public on public.match_history for select using (true);

grant select on public.match_history to anon, authenticated;

-- Le sync (déclenché côté serveur quand on consulte un profil) écrit via service_role.
-- Dans ce projet le service_role est lecture seule par défaut → on lui ouvre l'écriture
-- sur cette table + la colonne de throttle uniquement.
grant select, insert, update on public.match_history to service_role;
grant update (last_match_sync) on public.riot_accounts to service_role;
