-- Party Availability Scheduler Schema

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_token text not null unique,
  mission_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locked_date_id uuid references candidate_dates(id),
  location text
);

-- Migration for existing DBs:
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS mission_token uuid DEFAULT gen_random_uuid();
-- UPDATE events SET mission_token = gen_random_uuid() WHERE mission_token IS NULL;
-- ALTER TABLE events ALTER COLUMN mission_token SET NOT NULL;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS location text;

create table if not exists candidate_dates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  date date not null,
  unique(event_id, date)
);

create table if not exists friends (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists availabilities (
  id uuid primary key default gen_random_uuid(),
  friend_id uuid not null references friends(id) on delete cascade,
  candidate_date_id uuid not null references candidate_dates(id) on delete cascade,
  unique(friend_id, candidate_date_id)
);

-- Indexes for common lookups
create index if not exists idx_candidate_dates_event_id on candidate_dates(event_id);
create index if not exists idx_friends_event_id on friends(event_id);
create index if not exists idx_friends_token on friends(token);
create index if not exists idx_availabilities_friend_id on availabilities(friend_id);
create index if not exists idx_availabilities_date_id on availabilities(candidate_date_id);
create index if not exists idx_events_host_token on events(host_token);
