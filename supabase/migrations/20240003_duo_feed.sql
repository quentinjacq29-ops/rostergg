-- =============================================================
-- Phase 3 — RPC duo_feed
-- Poids : Elo 30% / Schedule 30% / Languages 20% / Style+Goals 20%
-- Role fit = filtre hard (binaire), pas un axe pondéré
-- =============================================================

-- ── Helper : tier + division + LP → valeur numérique 0..3400+ ────────
-- Interne : pas de grant public direct (appelé via security definer)
create or replace function public._elo_to_lp(
  p_tier text,
  p_div  text,
  p_lp   int default 0
) returns int
language sql immutable parallel safe as $$
  select
    case lower(coalesce(p_tier, ''))
      when 'iron'        then    0
      when 'bronze'      then  400
      when 'silver'      then  800
      when 'gold'        then 1200
      when 'platinum'    then 1600
      when 'emerald'     then 2000
      when 'diamond'     then 2400
      when 'master'      then 2800
      when 'grandmaster' then 3100
      when 'challenger'  then 3400
      else                      900   -- fallback : Silver II ≈ rang médian
    end
    +
    case lower(coalesce(p_div, ''))
      when 'iv'  then   0
      when 'iii' then 100
      when 'ii'  then 200
      when 'i'   then 300
      else             0
    end
    +
    coalesce(p_lp, 0);
$$;

-- ── RPC principal ─────────────────────────────────────────────────────
create or replace function public.duo_feed(
  p_user_id      uuid,
  p_role_filter  text    default null,   -- 'MID','JNG'… OU null = tous rôles
  p_rank_floor   text    default null,   -- 'iron','bronze',…
  p_rank_ceiling text    default null,
  p_voice        boolean default null,   -- true = voice required seulement
  p_region       text    default null,   -- 'euw1','na1'…
  p_limit        int     default 20,
  p_offset       int     default 0
)
returns table (
  candidate_id   uuid,
  score          smallint,
  elo_score      smallint,
  schedule_score smallint,
  language_score smallint,
  style_score    smallint,
  role_note      text,     -- ex. "JNG ↔ ton MID" | "tous rôles" | "hors rôle"
  elo_note       text,     -- ex. "Diamond II (75 LP)"
  schedule_note  text,     -- ex. "20h–24h"
  language_note  text,     -- ex. "FR · EN"
  candidate_role text,     -- rôle du candidat qui matche ('MID','JNG'…)
  match_on       text,     -- 'main' | 'secondary' | null (tous rôles)
  is_degraded    boolean   -- true = hors-critères de rôle (sous séparateur)
)
language plpgsql stable security definer parallel safe
as $$
declare
  v_prefs  public.matching_prefs%rowtype;
  v_elo    int;
begin
  -- Viewer prefs (absent = onboarding non terminé → résultat vide)
  select * into v_prefs
  from public.matching_prefs
  where profile_id = p_user_id;
  if not found then return; end if;

  -- ELO viewer (RANKED_SOLO_5x5, fallback Silver II = 900)
  select public._elo_to_lp(r.tier, r.division, r.league_points)
    into v_elo
  from public.ranks r
  join public.riot_accounts ra on ra.id = r.riot_account_id
  where ra.profile_id = p_user_id
    and r.queue = 'RANKED_SOLO_5x5'
  order by r.synced_at desc
  limit 1;

  v_elo := coalesce(v_elo, 900);

  return query
  with
  -- ── Disponibilités du viewer ─────────────────────────────────────
  va as materialized (
    select weekday, slot, intensity
    from public.availability
    where profile_id = p_user_id
  ),

  -- ── Candidats (prefs obligatoires, pas soi-même, pas bloqué) ─────
  cands as (
    select
      mp.profile_id                                              as cid,
      mp.main_roles,
      mp.looking_for_roles,
      mp.languages,
      mp.playstyles,
      mp.goals,
      mp.voice_required,
      mp.regions,
      public._elo_to_lp(r.tier, r.division, r.league_points)    as c_elo,
      r.tier                                                     as c_tier,
      r.division                                                 as c_div,
      r.league_points                                            as c_lp
    from public.matching_prefs mp
    left join public.riot_accounts ra on ra.profile_id = mp.profile_id
    left join lateral (
      select tier, division, league_points
      from public.ranks
      where riot_account_id = ra.id
        and queue = 'RANKED_SOLO_5x5'
      order by synced_at desc
      limit 1
    ) r on true
    where mp.profile_id <> p_user_id
      -- blocs mutuels
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = p_user_id and b.blocked = mp.profile_id)
           or (b.blocker = mp.profile_id and b.blocked = p_user_id)
      )
      -- filtre elo floor
      and (p_rank_floor is null
           or public._elo_to_lp(r.tier, r.division, 0)
              >= public._elo_to_lp(p_rank_floor, 'iv', 0))
      -- filtre elo ceiling
      and (p_rank_ceiling is null
           or public._elo_to_lp(r.tier, r.division, 0)
              <= public._elo_to_lp(p_rank_ceiling, 'i', 99))
      -- filtre voice
      and (p_voice is null or mp.voice_required = p_voice)
      -- filtre région
      and (p_region is null or p_region = any(mp.regions))
  ),

  -- ── Schedule overlap par candidat ────────────────────────────────
  -- max théorique = 7j × 6 slots × intensity 3 = 126
  sched as (
    select
      c.cid,
      coalesce((
        select sum(least(va.intensity, ca.intensity))::float
        from va
        join public.availability ca
          on  ca.profile_id = c.cid
          and ca.weekday    = va.weekday
          and ca.slot       = va.slot
      ), 0) as overlap,
      -- créneau le plus intense commun (pour la note d'affichage)
      (
        select
          to_char((ca2.slot * 4),     'FM00') || 'h–' ||
          to_char((ca2.slot * 4 + 4), 'FM00') || 'h'
        from va va2
        join public.availability ca2
          on  ca2.profile_id = c.cid
          and ca2.weekday    = va2.weekday
          and ca2.slot       = va2.slot
        group by ca2.slot
        order by sum(va2.intensity + ca2.intensity) desc
        limit 1
      ) as peak_win
    from cands c
  ),

  -- ── Scoring ──────────────────────────────────────────────────────
  scored as (
    select
      c.cid,
      c.languages,
      c.playstyles,
      c.goals,
      c.c_tier, c.c_div, c.c_lp,
      s.overlap,
      s.peak_win,

      -- Role fit (binaire → is_degraded, pas dans le score pondéré)
      case
        when p_role_filter is null             then false
        when p_role_filter = any(c.main_roles) then false
        else                                        true
      end                                       as is_deg,
      case
        when p_role_filter is null             then null
        when p_role_filter = any(c.main_roles) then
          case when c.main_roles[1] = p_role_filter then 'main' else 'secondary' end
        else                                        null
      end                                       as m_on,
      case
        when p_role_filter is null             then null
        when p_role_filter = any(c.main_roles) then p_role_filter
        else                                        null
      end                                       as c_role,

      -- ELO (0–100) : score = max(0, 100 – |diff| / 17)
      -- → à 1700 LP d'écart ≈ 0 ; diff de 17 LP = 1 pt de score
      greatest(0,
        100 - abs(coalesce(c.c_elo, 900) - v_elo) / 17
      )::smallint                               as sc_elo,

      -- SCHEDULE (0–100) : Σ min(a,b) / 126 × 100
      least(100,
        round(s.overlap / 126.0 * 100)
      )::smallint                               as sc_sched,

      -- LANGUAGES (0 | 90 | 100)
      -- 0 = aucune langue commune
      -- 90 = ≥1 langue commune mais pas la principale du viewer
      -- 100 = langue principale du viewer partagée
      case
        when not (v_prefs.languages && c.languages) then 0
        when v_prefs.languages[1] = any(c.languages) then 100
        else 90
      end::smallint                             as sc_lang,

      -- STYLE = playstyle_jaccard × 0.6 + goal_jaccard × 0.4 (×100)
      -- Jaccard : |A∩B| / |A∪B| ; fallback 0.5 si l'un des deux est vide
      round((
        -- playstyle jaccard
        case
          when coalesce(cardinality(v_prefs.playstyles), 0) = 0
            or coalesce(cardinality(c.playstyles), 0) = 0
          then 0.5
          else
            (select count(*)::float
             from unnest(v_prefs.playstyles) as vp
             where vp = any(c.playstyles))
            / nullif(
                (select count(*) from (
                  select unnest(v_prefs.playstyles) as x
                  union
                  select unnest(c.playstyles)
                ) u),
                0)
        end * 0.6
        +
        -- goal jaccard
        case
          when coalesce(cardinality(v_prefs.goals), 0) = 0
            or coalesce(cardinality(c.goals), 0) = 0
          then 0.5
          else
            (select count(*)::float
             from unnest(v_prefs.goals) as vg
             where vg = any(c.goals))
            / nullif(
                (select count(*) from (
                  select unnest(v_prefs.goals) as x
                  union
                  select unnest(c.goals)
                ) u),
                0)
        end * 0.4
      ) * 100)::smallint                        as sc_style

    from cands c
    join sched s on s.cid = c.cid
  )

  -- ── Résultat final ────────────────────────────────────────────────
  -- Tri : non-dégradés en premier (score desc), puis dégradés (score desc)
  -- → le client affiche le séparateur « Moins de monde… » entre les deux groupes
  select
    sc.cid,
    -- score global pondéré
    round(
      sc.sc_elo   * 0.30
    + sc.sc_sched * 0.30
    + sc.sc_lang  * 0.20
    + sc.sc_style * 0.20
    )::smallint,
    sc.sc_elo,
    sc.sc_sched,
    sc.sc_lang,
    sc.sc_style,
    -- role_note
    case
      when p_role_filter is null then 'tous rôles'
      when not sc.is_deg         then sc.c_role || ' ↔ ' || coalesce(v_prefs.main_roles[1], '?')
      else                            'hors rôle'
    end,
    -- elo_note  ex. "Diamond II (75 LP)"
    initcap(coalesce(sc.c_tier, 'Unranked'))
      || case when sc.c_div is not null then ' ' || upper(sc.c_div) else '' end
      || case when sc.c_lp  is not null then ' (' || sc.c_lp::text || ' LP)' else '' end,
    -- schedule_note  ex. "20h–24h"
    coalesce(sc.peak_win, '–'),
    -- language_note  ex. "FR · EN"
    (select string_agg(upper(lang), ' · ')
     from (
       select lang
       from unnest(v_prefs.languages) as lang
       where lang = any(sc.languages)
       limit 3
     ) sub),
    sc.c_role,
    sc.m_on,
    sc.is_deg
  from scored sc
  order by
    sc.is_deg asc,
    round(sc.sc_elo * 0.30 + sc.sc_sched * 0.30 + sc.sc_lang * 0.20 + sc.sc_style * 0.20) desc
  limit  p_limit
  offset p_offset;

end;
$$;

-- Accessible depuis le client (anon pour le mode invité, authenticated pour les connectés)
grant execute on function public._elo_to_lp(text, text, int) to service_role;
grant execute on function public.duo_feed(uuid, text, text, text, boolean, text, int, int)
  to authenticated, anon;
