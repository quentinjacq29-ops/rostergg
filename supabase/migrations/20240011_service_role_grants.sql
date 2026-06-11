-- Grant SELECT to service_role on tables needed for UAT/admin operations
GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT ON public.riot_accounts TO service_role;
GRANT SELECT ON public.matching_prefs TO service_role;
GRANT SELECT ON public.ranks TO service_role;
