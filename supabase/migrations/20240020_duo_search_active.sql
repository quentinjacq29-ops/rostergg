-- MES RECHERCHES · toggle « Recherche duo » (actif/pause) sur /me.
-- 1) Colonne duo_search_active (par défaut actif).
-- 2) duo_feed exclut les profils en pause → invisibles dans le feed duo.

alter table public.matching_prefs
  add column if not exists duo_search_active boolean not null default true;

-- Re-création de duo_feed à l'identique + 1 filtre : `duo_search_active = true`
create or replace function public.duo_feed(
  p_user_id      uuid,
  p_role_filters text[]  default null,
  p_rank_floor   text    default null,
  p_rank_ceiling text    default null,
  p_voice        boolean default null,
  p_region       text    default null,
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
  role_note      text,
  elo_note       text,
  schedule_note  text,
  language_note  text,
  candidate_role text,
  match_on       text,
  is_degraded    boolean
)
language plpgsql stable security definer parallel safe
as $$
declare
  v_prefs  public.matching_prefs%rowtype;
  v_elo    int;
begin
  select * into v_prefs
  from public.matching_prefs
  where profile_id = p_user_id;
  if not found then return; end if;

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
  va as materialized (
    select weekday, slot, intensity
    from public.availability
    where profile_id = p_user_id
  ),

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
      and coalesce(mp.duo_search_active, true) = true   -- ⬅️ exclut les profils en pause
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = p_user_id and b.blocked = mp.profile_id)
           or (b.blocker = mp.profile_id and b.blocked = p_user_id)
      )
      and (p_rank_floor is null
           or public._elo_to_lp(r.tier, r.division, 0)
              >= public._elo_to_lp(p_rank_floor, 'iv', 0))
      and (p_rank_ceiling is null
           or public._elo_to_lp(r.tier, r.division, 0)
              <= public._elo_to_lp(p_rank_ceiling, 'i', 99))
      and (p_voice is null or mp.voice_required = p_voice)
      and (p_region is null or p_region = any(mp.regions))
  ),

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

  scored as (
    select
      c.cid,
      c.languages,
      c.playstyles,
      c.goals,
      c.c_tier, c.c_div, c.c_lp,
      s.overlap,
      s.peak_win,
      case
        when p_role_filters is null         then false
        when p_role_filters && c.main_roles then false
        else                                     true
      end                                    as is_deg,
      case
        when p_role_filters is null         then null
        when p_role_filters && c.main_roles then
          case when c.main_roles[1] = any(p_role_filters) then 'main' else 'secondary' end
        else                                     null
      end                                    as m_on,
      case
        when p_role_filters is null         then null
        when p_role_filters && c.main_roles then
          (select r from unnest(c.main_roles) r where r = any(p_role_filters) limit 1)
        else                                     null
      end                                    as c_role,
      greatest(0,
        100 - abs(coalesce(c.c_elo, 900) - v_elo) / 17
      )::smallint                            as sc_elo,
      case
        when (select sum(intensity) from va) = 0 then 50
        else least(100,
          round(
            s.overlap /
            nullif((select sum(intensity)::float from va), 0)
            * 100
          )
        )
      end::smallint                          as sc_sched,
      case
        when v_prefs.languages is null or array_length(v_prefs.languages, 1) = 0 then 50
        when c.languages && v_prefs.languages then
          case when c.languages[1] = v_prefs.languages[1] then 100 else 90 end
        else 0
      end::smallint                          as sc_lang,
      case
        when v_prefs.playstyles is null or array_length(v_prefs.playstyles, 1) = 0 then 50
        when c.playstyles && v_prefs.playstyles then
          least(100,
            50 + (
              select count(*)::int
              from unnest(c.playstyles) cs
              where cs = any(v_prefs.playstyles)
            ) * 10
          )
        else 20
      end::smallint                          as sc_style
    from cands c
    join sched s on s.cid = c.cid
  )

  select
    sc.cid,
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
    case
      when p_role_filters is null then 'tous rôles'
      when not sc.is_deg          then sc.c_role || ' ↔ ' || coalesce(v_prefs.main_roles[1], '?')
      else                             'hors rôle'
    end,
    initcap(coalesce(sc.c_tier, 'Unranked'))
      || case when sc.c_div is not null then ' ' || upper(sc.c_div) else '' end
      || case when sc.c_lp  is not null then ' (' || sc.c_lp::text || ' LP)' else '' end,
    coalesce(sc.peak_win, '–'),
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

grant execute on function public.duo_feed(uuid, text[], text, text, boolean, text, int, int)
  to anon, authenticated;
