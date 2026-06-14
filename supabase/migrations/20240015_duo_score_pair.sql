-- duo_score : calcule le score de compatibilité entre deux joueurs précis
-- Même formule que duo_feed (elo×0.30 + sched×0.30 + lang×0.20 + style×0.20)
-- Utilisé par la page profil pour afficher le score réel sans dépendre du ranking feed

create or replace function public.duo_score(
  p_user_id      uuid,
  p_candidate_id uuid
)
returns table (
  score          smallint,
  elo_score      smallint,
  schedule_score smallint,
  language_score smallint,
  style_score    smallint,
  elo_note       text,
  schedule_note  text,
  language_note  text,
  is_degraded    boolean
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_prefs  public.matching_prefs%rowtype;
  v_elo    int;
begin
  -- Prefs du viewer
  select * into v_prefs
  from public.matching_prefs
  where profile_id = p_user_id;
  if not found then return; end if;

  -- ELO du viewer
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
  va as (
    select weekday, slot, intensity
    from public.availability
    where profile_id = p_user_id
  ),

  cand as (
    select
      mp.languages,
      mp.playstyles,
      mp.main_roles,
      public._elo_to_lp(r.tier, r.division, r.league_points) as c_elo,
      r.tier as c_tier, r.division as c_div, r.league_points as c_lp
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
    where mp.profile_id = p_candidate_id
    limit 1
  ),

  sched as (
    select
      coalesce((
        select sum(least(va.intensity, ca.intensity))::float
        from va
        join public.availability ca
          on  ca.profile_id = p_candidate_id
          and ca.weekday    = va.weekday
          and ca.slot       = va.slot
      ), 0) as overlap,
      (
        select
          to_char((ca2.slot * 4),     'FM00') || 'h–' ||
          to_char((ca2.slot * 4 + 4), 'FM00') || 'h'
        from va va2
        join public.availability ca2
          on  ca2.profile_id = p_candidate_id
          and ca2.weekday    = va2.weekday
          and ca2.slot       = va2.slot
        group by ca2.slot
        order by sum(va2.intensity + ca2.intensity) desc
        limit 1
      ) as peak_win
  )

  select
    round(
      greatest(0, 100 - abs(coalesce(c.c_elo, 900) - v_elo) / 17)        * 0.30
    + case
        when (select sum(intensity) from va) = 0 then 50
        else least(100, round(s.overlap / nullif((select sum(intensity)::float from va), 0) * 100))
      end                                                                  * 0.30
    + case
        when v_prefs.languages is null or array_length(v_prefs.languages, 1) = 0 then 50
        when c.languages && v_prefs.languages then
          case when c.languages[1] = v_prefs.languages[1] then 100 else 90 end
        else 0
      end                                                                  * 0.20
    + case
        when v_prefs.playstyles is null or array_length(v_prefs.playstyles, 1) = 0 then 50
        when c.playstyles && v_prefs.playstyles then
          least(100, 50 + (select count(*)::int from unnest(c.playstyles) cs where cs = any(v_prefs.playstyles)) * 10)
        else 20
      end                                                                  * 0.20
    )::smallint,
    -- elo_score
    greatest(0, 100 - abs(coalesce(c.c_elo, 900) - v_elo) / 17)::smallint,
    -- schedule_score
    case
      when (select sum(intensity) from va) = 0 then 50
      else least(100, round(s.overlap / nullif((select sum(intensity)::float from va), 0) * 100))
    end::smallint,
    -- language_score
    case
      when v_prefs.languages is null or array_length(v_prefs.languages, 1) = 0 then 50
      when c.languages && v_prefs.languages then
        case when c.languages[1] = v_prefs.languages[1] then 100 else 90 end
      else 0
    end::smallint,
    -- style_score
    case
      when v_prefs.playstyles is null or array_length(v_prefs.playstyles, 1) = 0 then 50
      when c.playstyles && v_prefs.playstyles then
        least(100, 50 + (select count(*)::int from unnest(c.playstyles) cs where cs = any(v_prefs.playstyles)) * 10)
      else 20
    end::smallint,
    -- elo_note
    initcap(coalesce(c.c_tier, 'Unranked'))
      || case when c.c_div is not null then ' ' || upper(c.c_div) else '' end
      || case when c.c_lp  is not null then ' (' || c.c_lp::text || ' LP)' else '' end,
    -- schedule_note
    coalesce(s.peak_win, '–'),
    -- language_note
    (select string_agg(upper(lang), ' · ')
     from (select lang from unnest(v_prefs.languages) as lang where lang = any(c.languages) limit 3) sub),
    -- is_degraded : pas de filtre rôle ici → toujours false
    false
  from cand c, sched s;
end;
$$;

grant execute on function public.duo_score(uuid, uuid) to authenticated;
