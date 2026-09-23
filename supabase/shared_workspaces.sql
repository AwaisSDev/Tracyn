-- =========================================================================
-- Shared workspaces (Settings > Members, and /join/<code>)
-- =========================================================================
-- For a project created before this existed: paste this whole file into the
-- Supabase SQL editor and run it once. It is safe to re-run. schema.sql
-- already includes all of it for fresh installs.
--
-- workspace_invites holds how people can join a workspace:
--   join_code     the public part of both links (/join/<code>)
--   link_token    the secret in the one-click invite link (?key=...);
--                 null when that link is turned off
--   password_hash the workspace password people type on the plain link;
--                 null when joining by password is turned off
-- It has row level security on and no policies, so only the backend's
-- service role can read it: members never see the token or the hash.
--
-- workspace_join_attempts logs failed joins so the backend can slow down
-- password guessing (at most 10 misses per person per 15 minutes).

create table if not exists workspace_invites (
  workspace_id  uuid primary key references workspaces(id) on delete cascade,
  join_code     text not null unique,
  link_token    text unique,
  password_hash text,
  updated_at    timestamptz not null default now()
);

create table if not exists workspace_join_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  join_code  text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_workspace_join_attempts_user
  on workspace_join_attempts(user_id, created_at desc);

alter table workspace_invites enable row level security;
alter table workspace_join_attempts enable row level security;
