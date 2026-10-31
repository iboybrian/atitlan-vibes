-- Going / Check in. A user marks an event Going, and on the day can check in
-- ("I'm here"). The event page shows how many are going and a few faces.
--
-- One row per user per event; checked_in implies going, so it is a status, not
-- a second table. Same FK shape as event_favorites (events.id is bigint).
--
-- Safe to re-run.
create table if not exists public.event_attendance (
    user_id    uuid   not null references auth.users(id) on delete cascade,
    event_id   bigint not null references public.events(id) on delete cascade,
    status     text   not null default 'going' check (status in ('going', 'checked_in')),
    created_at timestamptz not null default now(),
    primary key (user_id, event_id)
);

-- event_going() counts by event; My Plans reads by user (the primary key).
create index if not exists event_attendance_event_idx
    on public.event_attendance (event_id, created_at desc);

alter table public.event_attendance enable row level security;

-- Your own rows only. Nobody can read someone else's row directly: other
-- people's attendance is only ever seen through event_going() below.
drop policy if exists "attendance select own" on public.event_attendance;
create policy "attendance select own" on public.event_attendance
    for select using (auth.uid() = user_id);

-- Only approved events: a pending submission isn't public yet.
drop policy if exists "attendance insert own" on public.event_attendance;
create policy "attendance insert own" on public.event_attendance
    for insert with check (
        auth.uid() = user_id
        and exists (select 1 from public.events e where e.id = event_id and e.is_approved)
    );

drop policy if exists "attendance update own" on public.event_attendance;
create policy "attendance update own" on public.event_attendance
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "attendance delete own" on public.event_attendance;
create policy "attendance delete own" on public.event_attendance
    for delete using (auth.uid() = user_id);

-- Who's going, for a batch of events: the count, and up to five faces (newest
-- first). security definer because the faces come from public.users, whose rows
-- are private to their owner — they hold phone numbers. This hands back first
-- name and avatar only, never phone or email, and no faces at all to a guest.
create or replace function public.event_going(ids bigint[])
returns table (event_id bigint, count bigint, faces jsonb)
language sql
stable
security definer
set search_path = ''
as $$
    select g.event_id,
           g.n,
           case when auth.uid() is null then '[]'::jsonb else f.faces end
    from (
        select a.event_id, count(*) as n
        from public.event_attendance a
        where a.event_id = any(ids)
        group by a.event_id
    ) g
    cross join lateral (
        select coalesce(jsonb_agg(jsonb_build_object('name', u.name, 'avatar_url', u.avatar_url)), '[]'::jsonb) as faces
        from (
            select x.user_id
            from public.event_attendance x
            where x.event_id = g.event_id
            order by x.created_at desc
            limit 5
        ) r
        join public.users u on u.id = r.user_id
    ) f;
$$;

revoke all on function public.event_going(bigint[]) from public;
grant execute on function public.event_going(bigint[]) to anon, authenticated;
