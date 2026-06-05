-- =============================================================
-- PROFILES
-- =============================================================
create table public.profiles (
  id                  uuid primary key references auth.users on delete cascade,
  username            citext unique,
  display_name        text,
  avatar_url          text,
  bio                 text,
  locale              text default 'fr',
  country             text,
  timezone            text,
  subscription_status text not null default 'free'
                        check (subscription_status in ('free', 'premium')),
  is_coach            boolean not null default false,
  created_at          timestamptz not null default now(),
  last_seen_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =============================================================
-- TRIGGER : auto-create profile on signup
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, locale)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'locale', 'fr')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
