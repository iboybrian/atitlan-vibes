-- The town a user picked in TownPicker. Mirrored in localStorage so the UI works
-- logged out; this column is what the notify-town Edge Function reads to decide
-- who gets pushed when an event is approved.
alter table public.users
    add column if not exists current_town_id bigint references public.towns (id) on delete set null;

-- notify-town filters on this on every approval
create index if not exists users_current_town_id_idx
    on public.users (current_town_id)
    where current_town_id is not null;
