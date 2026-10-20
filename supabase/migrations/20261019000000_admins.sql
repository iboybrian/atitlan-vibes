-- Who can review submitted events from the in-app /admin panel and gets the
-- "new submission" email + push: every user with users.is_admin = true.
--
-- Set it by hand in the SQL editor or the Table Editor:
--   update public.users set is_admin = true where id = '<uuid>';
--
-- Safe to re-run. Also replaces an earlier draft that kept admins in their own
-- public.admins table: anyone listed there is carried over, then it is dropped.

alter table public.users add column if not exists is_admin boolean not null default false;

-- Users can update their own row (push token, town, lang...), so without this
-- anyone could flip is_admin on for themselves from the browser console. Only
-- requests from the app run as anon/authenticated; the SQL editor, the Table
-- Editor and the service role don't, so those can still change it.
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
as $$
begin
    if current_user in ('anon', 'authenticated')
       and new.is_admin is distinct from (case when tg_op = 'UPDATE' then old.is_admin else false end) then
        raise exception 'is_admin can only be changed from the Supabase dashboard';
    end if;
    return new;
end;
$$;

drop trigger if exists protect_is_admin on public.users;
create trigger protect_is_admin
    before insert or update on public.users
    for each row execute function public.protect_is_admin();

-- security definer: the policies below run it as part of every events/users
-- read, and it must see the caller's row regardless of their own policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((select is_admin from public.users where id = auth.uid()), false)
$$;

-- Additive: Postgres ORs permissive policies, so these widen access for admins
-- and leave everyone else's rules on events/users exactly as they were.
drop policy if exists "admins read all events" on public.events;
create policy "admins read all events" on public.events
    for select using (public.is_admin());

drop policy if exists "admins update events" on public.events;
create policy "admins update events" on public.events
    for update using (public.is_admin()) with check (public.is_admin());

-- Rejecting an event deletes it; archive_on_delete keeps a copy.
drop policy if exists "admins delete events" on public.events;
create policy "admins delete events" on public.events
    for delete using (public.is_admin());

-- To show who submitted an event (name, phone).
drop policy if exists "admins read users" on public.users;
create policy "admins read users" on public.users
    for select using (public.is_admin());

-- Carry over the earlier admins-table draft, if it was ever run.
do $$
begin
    if to_regclass('public.admins') is not null then
        update public.users set is_admin = true
        where id in (select user_id from public.admins);
        drop table public.admins;
    end if;
end;
$$;

-- The first admin.
update public.users set is_admin = true where id = '4a45504a-fcc9-4381-8423-a2e2b040ea9a';
