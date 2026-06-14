-- ── Notifications ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid        not null default gen_random_uuid() primary key,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null check (type in ('duo_request','duo_accepted','team_invite','system')),
  actor_id   uuid        references public.profiles(id) on delete set null,
  payload    jsonb       not null default '{}'::jsonb,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notif_user_time  on public.notifications(user_id, created_at desc);
create index if not exists notif_user_unread on public.notifications(user_id) where read = false;

alter table public.notifications enable row level security;

create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- triggers & service role insert via security definer functions
create policy "notif_insert_any" on public.notifications
  for insert with check (true);

grant select, insert, update on public.notifications to authenticated;

-- expose to Realtime (badge live)
alter publication supabase_realtime add table public.notifications;

-- ── Bookmarks ──────────────────────────────────────────────────────────────────
create table if not exists public.bookmarks (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  target_id  uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id)
);

alter table public.bookmarks enable row level security;

create policy "bk_all_own" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant all on public.bookmarks to authenticated;

-- ── Settings columns on profiles ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists profile_discoverable    boolean not null default true,
  add column if not exists show_online_status      boolean not null default true,
  add column if not exists allow_requests_from_all boolean not null default false,
  add column if not exists notification_prefs      jsonb   not null default '{
    "duo_request": {"inapp": true, "email": true},
    "duo_accepted": {"inapp": true, "email": true},
    "team_invite":  {"inapp": true, "email": false},
    "system":       {"inapp": true, "email": false}
  }'::jsonb;
