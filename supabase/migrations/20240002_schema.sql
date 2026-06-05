-- =============================================================
-- PHASE 2 — SCHÉMA COMPLET
-- Ordre : tables indépendantes → tables avec FK → policies
-- =============================================================

-- CHAMPIONS (référentiel Data Dragon)
create table public.champions (
  id          int primary key,
  key         text not null,
  name        jsonb not null default '{}',   -- { "fr": "...", "en": "..." }
  roles       text[] not null default '{}',
  image_url   text,
  patch       text not null default '',
  updated_at  timestamptz not null default now()
);
alter table public.champions enable row level security;
create policy "champions_select_public" on public.champions for select using (true);

-- RIOT ACCOUNTS
create table public.riot_accounts (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null unique references public.profiles on delete cascade,
  puuid             text unique,
  summoner_id       text,
  game_name         text not null,
  tag_line          text not null,
  platform          text not null,
  region            text not null,
  profile_icon_id   int,
  summoner_level    int,
  verified          boolean not null default false,
  last_synced_at    timestamptz
);
alter table public.riot_accounts enable row level security;
create policy "riot_accounts_select_public"  on public.riot_accounts for select using (true);
create policy "riot_accounts_insert_own"     on public.riot_accounts for insert with check (profile_id = auth.uid());
create policy "riot_accounts_update_own"     on public.riot_accounts for update using (profile_id = auth.uid());
create policy "riot_accounts_delete_own"     on public.riot_accounts for delete using (profile_id = auth.uid());

-- RANKS
create table public.ranks (
  id                uuid primary key default gen_random_uuid(),
  riot_account_id   uuid not null references public.riot_accounts on delete cascade,
  queue             text not null,
  tier              text,
  division          text,
  league_points     int not null default 0,
  wins              int not null default 0,
  losses            int not null default 0,
  synced_at         timestamptz not null default now(),
  unique(riot_account_id, queue)
);
alter table public.ranks enable row level security;
create policy "ranks_select_public"  on public.ranks for select using (true);
create policy "ranks_insert_any"     on public.ranks for insert with check (auth.uid() is not null);
create policy "ranks_update_any"     on public.ranks for update using (auth.uid() is not null);

-- CHAMPION MASTERY
create table public.champion_mastery (
  id                uuid primary key default gen_random_uuid(),
  riot_account_id   uuid not null references public.riot_accounts on delete cascade,
  champion_id       int not null,
  champion_key      text,
  mastery_level     int not null default 0,
  mastery_points    bigint not null default 0,
  synced_at         timestamptz not null default now(),
  unique(riot_account_id, champion_id)
);
alter table public.champion_mastery enable row level security;
create policy "mastery_select_public" on public.champion_mastery for select using (true);
create policy "mastery_insert_any"    on public.champion_mastery for insert with check (auth.uid() is not null);
create policy "mastery_update_any"    on public.champion_mastery for update using (auth.uid() is not null);

-- MATCHING PREFS
create table public.matching_prefs (
  profile_id          uuid primary key references public.profiles on delete cascade,
  main_roles          text[] not null default '{}',
  looking_for_roles   text[] not null default '{}',
  rank_floor          text,
  rank_ceiling        text,
  languages           text[] not null default '{}',
  playstyles          text[] not null default '{}',
  goals               text[] not null default '{}',
  voice_required      boolean not null default false,
  regions             text[] not null default '{}'
);
alter table public.matching_prefs enable row level security;
create policy "matching_prefs_select_public" on public.matching_prefs for select using (true);
create policy "matching_prefs_write_own"     on public.matching_prefs for all using (profile_id = auth.uid());

-- AVAILABILITY
create table public.availability (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles on delete cascade,
  weekday     int not null check (weekday between 0 and 6),
  slot        int not null,
  intensity   int not null default 0 check (intensity between 0 and 3),
  unique(profile_id, weekday, slot)
);
alter table public.availability enable row level security;
create policy "availability_select_public" on public.availability for select using (true);
create policy "availability_write_own"     on public.availability for all using (profile_id = auth.uid());

-- DUO REQUESTS
create table public.duo_requests (
  id            uuid primary key default gen_random_uuid(),
  from_profile  uuid not null references public.profiles on delete cascade,
  to_profile    uuid not null references public.profiles on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'expired')),
  match_score   int,
  message       text,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (from_profile <> to_profile)
);
alter table public.duo_requests enable row level security;
create policy "duo_requests_select_parties" on public.duo_requests for select
  using (from_profile = auth.uid() or to_profile = auth.uid());
create policy "duo_requests_insert_own"     on public.duo_requests for insert with check (from_profile = auth.uid());
create policy "duo_requests_update_recipient" on public.duo_requests for update using (to_profile = auth.uid());

-- TEAMS
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tag         text not null unique,
  crest       jsonb,
  goal        text,
  schedule    text,
  languages   text[] not null default '{}',
  playstyles  text[] not null default '{}',
  region      text,
  captain_id  uuid not null references public.profiles on delete restrict,
  created_at  timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "teams_select_public"   on public.teams for select using (true);
create policy "teams_insert_own"      on public.teams for insert with check (captain_id = auth.uid());
create policy "teams_update_captain"  on public.teams for update using (captain_id = auth.uid());
create policy "teams_delete_captain"  on public.teams for delete using (captain_id = auth.uid());

-- TEAM MEMBERS
create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams on delete cascade,
  profile_id  uuid not null references public.profiles on delete cascade,
  role        text,
  member_role text not null default 'member' check (member_role in ('captain', 'member')),
  joined_at   timestamptz not null default now(),
  unique(team_id, profile_id)
);
alter table public.team_members enable row level security;
create policy "team_members_select_public"   on public.team_members for select using (true);
create policy "team_members_write_captain"   on public.team_members for all
  using (exists (select 1 from public.teams where id = team_id and captain_id = auth.uid()));

-- TEAM APPLICATIONS
create table public.team_applications (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams on delete cascade,
  profile_id    uuid not null references public.profiles on delete cascade,
  desired_role  text,
  message       text,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);
alter table public.team_applications enable row level security;
create policy "team_applications_select_parties" on public.team_applications for select
  using (
    profile_id = auth.uid() or
    exists (select 1 from public.teams where id = team_id and captain_id = auth.uid())
  );
create policy "team_applications_insert_own"      on public.team_applications for insert with check (profile_id = auth.uid());
create policy "team_applications_update_captain"  on public.team_applications for update
  using (exists (select 1 from public.teams where id = team_id and captain_id = auth.uid()));

-- CONVERSATIONS
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('duo', 'team')),
  team_id         uuid references public.teams on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

-- CONVERSATION MEMBERS (created before conversation policies that reference it)
create table public.conversation_members (
  conversation_id uuid not null references public.conversations on delete cascade,
  profile_id      uuid not null references public.profiles on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

-- Policies on conversations (now conversation_members exists)
alter table public.conversations enable row level security;
create policy "conversations_select_member" on public.conversations for select
  using (exists (
    select 1 from public.conversation_members
    where conversation_id = id and profile_id = auth.uid()
  ));
create policy "conversations_insert_auth" on public.conversations for insert
  with check (auth.uid() is not null);

alter table public.conversation_members enable row level security;
create policy "conv_members_select_own"  on public.conversation_members for select using (profile_id = auth.uid());
create policy "conv_members_insert_own"  on public.conversation_members for insert with check (profile_id = auth.uid());

-- MESSAGES
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id       uuid not null references public.profiles on delete cascade,
  body            text not null,
  kind            text not null default 'text' check (kind in ('text', 'system', 'lobby_invite')),
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "messages_select_member" on public.messages for select
  using (exists (
    select 1 from public.conversation_members
    where conversation_id = messages.conversation_id and profile_id = auth.uid()
  ));
create policy "messages_insert_member" on public.messages for insert
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id and profile_id = auth.uid()
    )
  );

-- COACH PROFILES
create table public.coach_profiles (
  profile_id      uuid primary key references public.profiles on delete cascade,
  specialties     text[] not null default '{}',
  hourly_rate     int,
  currency        text default 'EUR',
  languages       text[] not null default '{}',
  rating          numeric(3,2),
  sessions_count  int not null default 0,
  bio             jsonb
);
alter table public.coach_profiles enable row level security;
create policy "coach_profiles_select_public" on public.coach_profiles for select using (true);
create policy "coach_profiles_write_own"     on public.coach_profiles for all using (profile_id = auth.uid());

-- TRAINING SESSIONS
create table public.training_sessions (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.profiles on delete cascade,
  student_id    uuid not null references public.profiles on delete cascade,
  scheduled_at  timestamptz,
  duration_min  int,
  status        text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  price         int,
  created_at    timestamptz not null default now()
);
alter table public.training_sessions enable row level security;
create policy "training_sessions_select_parties" on public.training_sessions for select
  using (coach_id = auth.uid() or student_id = auth.uid());
create policy "training_sessions_insert_own" on public.training_sessions for insert
  with check (student_id = auth.uid());

-- BLOCKS
create table public.blocks (
  blocker     uuid not null references public.profiles on delete cascade,
  blocked     uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "blocks_write_own"  on public.blocks for all using (blocker = auth.uid());
create policy "blocks_select_own" on public.blocks for select using (blocker = auth.uid());

-- REPORTS
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter    uuid not null references public.profiles on delete cascade,
  target      uuid not null references public.profiles on delete cascade,
  reason      text not null,
  context     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports_insert_own" on public.reports for insert with check (reporter = auth.uid());
create policy "reports_select_own" on public.reports for select using (reporter = auth.uid());

-- SUBSCRIPTIONS
create table public.subscriptions (
  profile_id              uuid primary key references public.profiles on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text,
  current_period_end      timestamptz
);
alter table public.subscriptions enable row level security;
create policy "subscriptions_select_own"    on public.subscriptions for select using (profile_id = auth.uid());
create policy "subscriptions_write_service" on public.subscriptions for all using (true);

-- =============================================================
-- INDEXES
-- =============================================================
create index idx_ranks_account       on public.ranks (riot_account_id);
create index idx_ranks_tier          on public.ranks (tier, division);
create index idx_mastery_account     on public.champion_mastery (riot_account_id, mastery_points desc);
create index idx_matching_roles      on public.matching_prefs using gin (main_roles);
create index idx_duo_requests_to     on public.duo_requests (to_profile, status);
create index idx_messages_conv       on public.messages (conversation_id, created_at);
create index idx_riot_accounts_puuid on public.riot_accounts (puuid);
