-- =============================================================
-- SEED — 10 comptes test JNG qui cherchent TOP
-- Nettoyage : DELETE FROM auth.users WHERE id::text LIKE 'a1111111%';
-- =============================================================

DO $seed$
DECLARE
  -- user UUIDs (préfixe a1111111 → facile à supprimer)
  u1  uuid := 'a1111111-0000-4000-8000-000000000001';
  u2  uuid := 'a1111111-0000-4000-8000-000000000002';
  u3  uuid := 'a1111111-0000-4000-8000-000000000003';
  u4  uuid := 'a1111111-0000-4000-8000-000000000004';
  u5  uuid := 'a1111111-0000-4000-8000-000000000005';
  u6  uuid := 'a1111111-0000-4000-8000-000000000006';
  u7  uuid := 'a1111111-0000-4000-8000-000000000007';
  u8  uuid := 'a1111111-0000-4000-8000-000000000008';
  u9  uuid := 'a1111111-0000-4000-8000-000000000009';
  u10 uuid := 'a1111111-0000-4000-8000-000000000010';

  -- riot account UUIDs
  ra1  uuid := 'a2222222-0000-4000-8000-000000000001';
  ra2  uuid := 'a2222222-0000-4000-8000-000000000002';
  ra3  uuid := 'a2222222-0000-4000-8000-000000000003';
  ra4  uuid := 'a2222222-0000-4000-8000-000000000004';
  ra5  uuid := 'a2222222-0000-4000-8000-000000000005';
  ra6  uuid := 'a2222222-0000-4000-8000-000000000006';
  ra7  uuid := 'a2222222-0000-4000-8000-000000000007';
  ra8  uuid := 'a2222222-0000-4000-8000-000000000008';
  ra9  uuid := 'a2222222-0000-4000-8000-000000000009';
  ra10 uuid := 'a2222222-0000-4000-8000-000000000010';

BEGIN
  -- ── Cleanup (idempotent) ────────────────────────────────────────
  DELETE FROM auth.users
  WHERE id IN (u1,u2,u3,u4,u5,u6,u7,u8,u9,u10);

  -- ── Auth users (le trigger crée les profiles automatiquement) ───
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
  ( u1,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'kaynz@test.rostergg', '', now(), '{"full_name":"KAYNZ"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u2,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'nocturno@test.rostergg', '', now(), '{"full_name":"NOCTURNO"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u3,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'vexoria@test.rostergg', '', now(), '{"full_name":"VEXORIA"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u4,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'hecarimx@test.rostergg', '', now(), '{"full_name":"HECARIMX"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u5,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'jarvinjg@test.rostergg', '', now(), '{"full_name":"JARVINJG"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u6,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'elisegee@test.rostergg', '', now(), '{"full_name":"ELISEGEE"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u7,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'leeflow@test.rostergg', '', now(), '{"full_name":"LEEFLOW"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u8,  '00000000-0000-4000-8000-000000000000', 'authenticated', 'authenticated',
    'khazim@test.rostergg', '', now(), '{"full_name":"KHAZIM"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u9,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'graspr@test.rostergg', '', now(), '{"full_name":"GRASPR"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' ),
  ( u10, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'shyvix@test.rostergg', '', now(), '{"full_name":"SHYVIX"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb, now(), now(), false, false, '', '', '', '' );

  -- ── Riot accounts ───────────────────────────────────────────────
  INSERT INTO public.riot_accounts (
    id, profile_id, game_name, tag_line, platform, region,
    summoner_level, verified, last_synced_at
  ) VALUES
  ( ra1,  u1,  'KAYNZ',    'EUW', 'euw1', 'europe', 245, true, now() ),
  ( ra2,  u2,  'NOCTURNO', 'EUW', 'euw1', 'europe', 312, true, now() ),
  ( ra3,  u3,  'VEXORIA',  'EUW', 'euw1', 'europe', 188, true, now() ),
  ( ra4,  u4,  'HECARIMX', 'EUW', 'euw1', 'europe', 401, true, now() ),
  ( ra5,  u5,  'JARVINJG', 'EUW', 'euw1', 'europe', 156, true, now() ),
  ( ra6,  u6,  'ELISEGEE', 'EUW', 'euw1', 'europe', 278, true, now() ),
  ( ra7,  u7,  'LEEFLOW',  'EUW', 'euw1', 'europe', 333, true, now() ),
  ( ra8,  u8,  'KHAZIM',   'EUW', 'euw1', 'europe', 198, true, now() ),
  ( ra9,  u9,  'GRASPR',   'EUW', 'euw1', 'europe', 520, true, now() ),
  ( ra10, u10, 'SHYVIX',   'EUW', 'euw1', 'europe', 224, true, now() );

  -- ── Ranks (RANKED_SOLO_5x5) ─────────────────────────────────────
  -- DIAMOND II · PLATINUM I · DIAMOND IV · EMERALD I · GOLD I
  -- DIAMOND III · EMERALD II · PLATINUM II · DIAMOND I · EMERALD III
  INSERT INTO public.ranks (
    id, riot_account_id, queue, tier, division, league_points, wins, losses, synced_at
  ) VALUES
  ( gen_random_uuid(), ra1,  'RANKED_SOLO_5x5', 'DIAMOND',  'II',  78, 150, 100, now() ),
  ( gen_random_uuid(), ra2,  'RANKED_SOLO_5x5', 'PLATINUM', 'I',   42, 210, 174, now() ),
  ( gen_random_uuid(), ra3,  'RANKED_SOLO_5x5', 'DIAMOND',  'IV',  12, 130, 112, now() ),
  ( gen_random_uuid(), ra4,  'RANKED_SOLO_5x5', 'EMERALD',  'I',   55, 185, 148, now() ),
  ( gen_random_uuid(), ra5,  'RANKED_SOLO_5x5', 'GOLD',     'I',   88, 95,  82,  now() ),
  ( gen_random_uuid(), ra6,  'RANKED_SOLO_5x5', 'DIAMOND',  'III', 30, 162, 128, now() ),
  ( gen_random_uuid(), ra7,  'RANKED_SOLO_5x5', 'EMERALD',  'II',  67, 140, 118, now() ),
  ( gen_random_uuid(), ra8,  'RANKED_SOLO_5x5', 'PLATINUM', 'II',  15, 178, 162, now() ),
  ( gen_random_uuid(), ra9,  'RANKED_SOLO_5x5', 'DIAMOND',  'I',   95, 201, 145, now() ),
  ( gen_random_uuid(), ra10, 'RANKED_SOLO_5x5', 'EMERALD',  'III', 44, 112, 101, now() );

  -- ── Matching prefs ──────────────────────────────────────────────
  -- Tous cherchent TOP — variété de langs/styles pour tester le scoring
  INSERT INTO public.matching_prefs (
    profile_id, main_roles, looking_for_roles,
    languages, playstyles, goals, regions, voice_required
  ) VALUES
  -- KAYNZ: JNG/MID, cherche TOP, FR+EN, tryhard+roaming+vocal
  ( u1,  ARRAY['JNG','MID'], ARRAY['TOP'],
    ARRAY['fr','en'], ARRAY['tryhard','roaming','vocal'],
    ARRAY['climb','clash'], ARRAY['euw1'], true ),
  -- NOCTURNO: JNG pur, cherche TOP, FR seul, aggro+vocal
  ( u2,  ARRAY['JNG'], ARRAY['TOP'],
    ARRAY['fr'], ARRAY['aggro','vocal'],
    ARRAY['climb'], ARRAY['euw1'], true ),
  -- VEXORIA: JNG pur, cherche TOP, EN, scaling+macro
  ( u3,  ARRAY['JNG'], ARRAY['TOP'],
    ARRAY['en'], ARRAY['scaling','macro'],
    ARRAY['climb','flex'], ARRAY['euw1'], false ),
  -- HECARIMX: JNG/SUP, cherche TOP, FR+EN, teamfight+vocal
  ( u4,  ARRAY['JNG','SUP'], ARRAY['TOP'],
    ARRAY['fr','en'], ARRAY['teamfight','vocal'],
    ARRAY['clash','flex'], ARRAY['euw1'], true ),
  -- JARVINJG: JNG pur, cherche TOP, FR, chill+scaling
  ( u5,  ARRAY['JNG'], ARRAY['TOP'],
    ARRAY['fr'], ARRAY['chill','scaling'],
    ARRAY['flex'], ARRAY['euw1'], false ),
  -- ELISEGEE: JNG pur, cherche TOP, FR+EN, tryhard+macro
  ( u6,  ARRAY['JNG'], ARRAY['TOP'],
    ARRAY['fr','en'], ARRAY['tryhard','macro'],
    ARRAY['climb','clash'], ARRAY['euw1'], false ),
  -- LEEFLOW: JNG/ADC, cherche TOP, EN, roaming+vocal
  ( u7,  ARRAY['JNG','ADC'], ARRAY['TOP'],
    ARRAY['en'], ARRAY['roaming','vocal'],
    ARRAY['climb'], ARRAY['euw1'], true ),
  -- KHAZIM: JNG pur, cherche TOP, FR, aggro+tryhard
  ( u8,  ARRAY['JNG'], ARRAY['TOP'],
    ARRAY['fr'], ARRAY['aggro','tryhard'],
    ARRAY['climb','clash'], ARRAY['euw1'], false ),
  -- GRASPR: JNG pur, cherche TOP, EN, macro+teamfight
  ( u9,  ARRAY['JNG'], ARRAY['TOP'],
    ARRAY['en'], ARRAY['macro','teamfight'],
    ARRAY['clash','flex'], ARRAY['euw1'], false ),
  -- SHYVIX: JNG/MID, cherche TOP, FR+EN, chill+scaling
  ( u10, ARRAY['JNG','MID'], ARRAY['TOP'],
    ARRAY['fr','en'], ARRAY['chill','scaling'],
    ARRAY['flex','climb'], ARRAY['euw1'], false );

  -- ── Champion mastery (top 3 par joueur) ─────────────────────────
  INSERT INTO public.champion_mastery (
    id, riot_account_id, champion_id, champion_key, mastery_level, mastery_points, synced_at
  ) VALUES
  -- KAYNZ: Kayn, Kindred, Graves
  ( gen_random_uuid(), ra1, 141, 'Kayn',    7, 524000, now() ),
  ( gen_random_uuid(), ra1, 203, 'Kindred', 6, 280000, now() ),
  ( gen_random_uuid(), ra1, 104, 'Graves',  5, 142000, now() ),
  -- NOCTURNO: Nocturne, Hecarim, Amumu
  ( gen_random_uuid(), ra2,  56, 'Nocturne', 7, 611000, now() ),
  ( gen_random_uuid(), ra2, 120, 'Hecarim',  6, 318000, now() ),
  ( gen_random_uuid(), ra2,  32, 'Amumu',    5, 97000,  now() ),
  -- VEXORIA: Vi, Jarvan IV, Volibear
  ( gen_random_uuid(), ra3, 254, 'Vi',       7, 489000, now() ),
  ( gen_random_uuid(), ra3,  59, 'JarvanIV', 6, 254000, now() ),
  ( gen_random_uuid(), ra3, 106, 'Volibear', 5, 118000, now() ),
  -- HECARIMX: Hecarim, Rammus, Amumu
  ( gen_random_uuid(), ra4, 120, 'Hecarim',  7, 732000, now() ),
  ( gen_random_uuid(), ra4,  33, 'Rammus',   6, 346000, now() ),
  ( gen_random_uuid(), ra4,  32, 'Amumu',    6, 299000, now() ),
  -- JARVINJG: Jarvan IV, Vi, Sejuani
  ( gen_random_uuid(), ra5,  59, 'JarvanIV', 7, 401000, now() ),
  ( gen_random_uuid(), ra5, 254, 'Vi',       5, 156000, now() ),
  ( gen_random_uuid(), ra5, 113, 'Sejuani',  5, 88000,  now() ),
  -- ELISEGEE: Elise, Graves, Kindred
  ( gen_random_uuid(), ra6,  60, 'Elise',   7, 555000, now() ),
  ( gen_random_uuid(), ra6, 104, 'Graves',  6, 312000, now() ),
  ( gen_random_uuid(), ra6, 203, 'Kindred', 5, 178000, now() ),
  -- LEEFLOW: Lee Sin, Viego, Rengar
  ( gen_random_uuid(), ra7,  64, 'LeeSin',  7, 892000, now() ),
  ( gen_random_uuid(), ra7, 234, 'Viego',   6, 367000, now() ),
  ( gen_random_uuid(), ra7, 107, 'Rengar',  5, 203000, now() ),
  -- KHAZIM: Kha'Zix, Shaco, Nocturne
  ( gen_random_uuid(), ra8, 121, 'Khazix',   7, 678000, now() ),
  ( gen_random_uuid(), ra8,  35, 'Shaco',    6, 389000, now() ),
  ( gen_random_uuid(), ra8,  56, 'Nocturne', 5, 145000, now() ),
  -- GRASPR: Udyr, Trundle, Sejuani
  ( gen_random_uuid(), ra9,  77, 'Udyr',    7, 1102000, now() ),
  ( gen_random_uuid(), ra9,  48, 'Trundle', 6, 488000,  now() ),
  ( gen_random_uuid(), ra9, 113, 'Sejuani', 6, 341000,  now() ),
  -- SHYVIX: Shyvana, Nidalee, Lillia
  ( gen_random_uuid(), ra10, 102, 'Shyvana', 7, 467000, now() ),
  ( gen_random_uuid(), ra10,  76, 'Nidalee', 6, 289000, now() ),
  ( gen_random_uuid(), ra10, 876, 'Lillia',  5, 134000, now() );

  -- ── Availability (soirées + week-end) ───────────────────────────
  -- slot 4 = 16h-20h · slot 5 = 20h-24h · slot 3 = 12h-16h
  -- intensity : 1=léger 2=moyen 3=fort
  INSERT INTO public.availability (id, profile_id, weekday, slot, intensity) VALUES
  -- KAYNZ : actif lun-ven 20h-24h, week-end après-midi/soirée
  ( gen_random_uuid(), u1, 0, 5, 3 ), ( gen_random_uuid(), u1, 1, 5, 3 ),
  ( gen_random_uuid(), u1, 2, 5, 2 ), ( gen_random_uuid(), u1, 3, 5, 3 ),
  ( gen_random_uuid(), u1, 4, 5, 3 ), ( gen_random_uuid(), u1, 5, 4, 3 ),
  ( gen_random_uuid(), u1, 5, 5, 3 ), ( gen_random_uuid(), u1, 6, 4, 3 ),
  ( gen_random_uuid(), u1, 6, 5, 3 ),
  -- NOCTURNO : mer+jeu+week-end soirée
  ( gen_random_uuid(), u2, 2, 4, 2 ), ( gen_random_uuid(), u2, 2, 5, 3 ),
  ( gen_random_uuid(), u2, 3, 5, 3 ), ( gen_random_uuid(), u2, 5, 4, 2 ),
  ( gen_random_uuid(), u2, 5, 5, 3 ), ( gen_random_uuid(), u2, 6, 5, 3 ),
  -- VEXORIA : tous les soirs 20h-24h
  ( gen_random_uuid(), u3, 0, 5, 2 ), ( gen_random_uuid(), u3, 1, 5, 2 ),
  ( gen_random_uuid(), u3, 2, 5, 3 ), ( gen_random_uuid(), u3, 3, 5, 3 ),
  ( gen_random_uuid(), u3, 4, 5, 2 ), ( gen_random_uuid(), u3, 5, 5, 3 ),
  ( gen_random_uuid(), u3, 6, 5, 3 ),
  -- HECARIMX : week-end toute la journée + vendredi soir
  ( gen_random_uuid(), u4, 4, 4, 2 ), ( gen_random_uuid(), u4, 4, 5, 3 ),
  ( gen_random_uuid(), u4, 5, 3, 2 ), ( gen_random_uuid(), u4, 5, 4, 3 ),
  ( gen_random_uuid(), u4, 5, 5, 3 ), ( gen_random_uuid(), u4, 6, 3, 2 ),
  ( gen_random_uuid(), u4, 6, 4, 3 ), ( gen_random_uuid(), u4, 6, 5, 3 ),
  -- JARVINJG : week-end seulement
  ( gen_random_uuid(), u5, 5, 4, 3 ), ( gen_random_uuid(), u5, 5, 5, 3 ),
  ( gen_random_uuid(), u5, 6, 4, 3 ), ( gen_random_uuid(), u5, 6, 5, 3 ),
  ( gen_random_uuid(), u5, 6, 3, 1 ),
  -- ELISEGEE : lun+mar+jeu soir, week-end
  ( gen_random_uuid(), u6, 0, 5, 3 ), ( gen_random_uuid(), u6, 1, 5, 3 ),
  ( gen_random_uuid(), u6, 3, 5, 3 ), ( gen_random_uuid(), u6, 5, 4, 2 ),
  ( gen_random_uuid(), u6, 5, 5, 3 ), ( gen_random_uuid(), u6, 6, 5, 3 ),
  -- LEEFLOW : tous les soirs 16h-24h
  ( gen_random_uuid(), u7, 0, 4, 2 ), ( gen_random_uuid(), u7, 0, 5, 3 ),
  ( gen_random_uuid(), u7, 1, 4, 2 ), ( gen_random_uuid(), u7, 1, 5, 3 ),
  ( gen_random_uuid(), u7, 2, 4, 3 ), ( gen_random_uuid(), u7, 2, 5, 3 ),
  ( gen_random_uuid(), u7, 3, 4, 2 ), ( gen_random_uuid(), u7, 4, 4, 2 ),
  ( gen_random_uuid(), u7, 5, 4, 3 ), ( gen_random_uuid(), u7, 5, 5, 3 ),
  ( gen_random_uuid(), u7, 6, 4, 3 ), ( gen_random_uuid(), u7, 6, 5, 3 ),
  -- KHAZIM : jeu+ven+sam soir
  ( gen_random_uuid(), u8, 3, 5, 3 ), ( gen_random_uuid(), u8, 4, 5, 3 ),
  ( gen_random_uuid(), u8, 5, 4, 3 ), ( gen_random_uuid(), u8, 5, 5, 3 ),
  -- GRASPR : lun-mer soir, week-end tout
  ( gen_random_uuid(), u9, 0, 4, 2 ), ( gen_random_uuid(), u9, 0, 5, 3 ),
  ( gen_random_uuid(), u9, 1, 5, 3 ), ( gen_random_uuid(), u9, 2, 4, 1 ),
  ( gen_random_uuid(), u9, 2, 5, 2 ), ( gen_random_uuid(), u9, 5, 3, 2 ),
  ( gen_random_uuid(), u9, 5, 4, 3 ), ( gen_random_uuid(), u9, 5, 5, 3 ),
  ( gen_random_uuid(), u9, 6, 3, 2 ), ( gen_random_uuid(), u9, 6, 4, 3 ),
  ( gen_random_uuid(), u9, 6, 5, 3 ),
  -- SHYVIX : mer+jeu+week-end soirée
  ( gen_random_uuid(), u10, 2, 5, 2 ), ( gen_random_uuid(), u10, 3, 5, 3 ),
  ( gen_random_uuid(), u10, 5, 4, 2 ), ( gen_random_uuid(), u10, 5, 5, 3 ),
  ( gen_random_uuid(), u10, 6, 4, 3 ), ( gen_random_uuid(), u10, 6, 5, 3 );

  RAISE NOTICE 'Seed OK — 10 comptes JNG insérés';
END;
$seed$;
