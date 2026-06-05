SELECT p.display_name, ra.game_name, r.tier, r.division, r.league_points,
       mp.main_roles, mp.looking_for_roles
FROM profiles p
JOIN riot_accounts ra ON ra.profile_id = p.id
JOIN ranks r ON r.riot_account_id = ra.id
JOIN matching_prefs mp ON mp.profile_id = p.id
WHERE p.id::text LIKE 'a1111111%'
ORDER BY r.tier, r.league_points DESC;
