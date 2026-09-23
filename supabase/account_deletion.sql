-- =========================================================================
-- Account deletion (Settings > Account > Delete account)
-- =========================================================================
-- For a project created before this existed: paste this whole file into the
-- Supabase SQL editor and run it once. It is safe to re-run. schema.sql
-- already includes all of it for fresh installs.
--
-- What it changes:
--   1. The append-only guard on events and audit_chain still rejects every
--      update and delete, except a delete that purge_workspace() is making
--      for the one workspace it is erasing.
--   2. purge_workspace(ws): permanently deletes a workspace and everything
--      in it (events included). Callable by the backend's service role only.
--   3. "Created by" style references to a user are set to null when that
--      user is deleted, instead of blocking the deletion.

create or replace function reject_mutation() returns trigger as $$
begin
  -- The only exception: purge_workspace() erasing this row's workspace.
  -- The setting is transaction-local and only that function sets it.
  if tg_op = 'DELETE'
     and current_setting('tracyn.purging_workspace', true) = old.workspace_id::text then
    return old;
  end if;
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op;
end;
$$ language plpgsql;

create or replace function purge_workspace(ws uuid) returns void as $$
begin
  perform set_config('tracyn.purging_workspace', ws::text, true);
  delete from workspaces where id = ws;
  perform set_config('tracyn.purging_workspace', '', true);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function purge_workspace(uuid) from public;
revoke all on function purge_workspace(uuid) from anon, authenticated;
grant execute on function purge_workspace(uuid) to service_role;

alter table agents drop constraint if exists agents_created_by_fkey;
alter table agents add constraint agents_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table api_keys drop constraint if exists api_keys_created_by_fkey;
alter table api_keys add constraint api_keys_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table questionnaires drop constraint if exists questionnaires_uploaded_by_fkey;
alter table questionnaires add constraint questionnaires_uploaded_by_fkey
  foreign key (uploaded_by) references auth.users(id) on delete set null;

alter table answers drop constraint if exists answers_reviewed_by_fkey;
alter table answers add constraint answers_reviewed_by_fkey
  foreign key (reviewed_by) references auth.users(id) on delete set null;
