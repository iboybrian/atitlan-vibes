-- Saved events. Testers asked for a way to come back to an event they spotted
-- earlier, so this is a plain join table between a user and an event.
--
-- Note: `events` itself is not versioned in this repo (the base schema lives only
-- in the dashboard), so event_id is declared bigint to match towns.id. If the FK
-- fails to create, events.id is uuid — change the column type and re-run.
create table if not exists public.event_favorites (
    user_id    uuid   not null references auth.users(id) on delete cascade,
    event_id   bigint not null references public.events(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, event_id)
);

-- The only query is "my favorites, newest first".
create index if not exists event_favorites_user_idx
    on public.event_favorites (user_id, created_at desc);

alter table public.event_favorites enable row level security;

-- A favorite is private: you can only ever see or touch your own rows.
create policy "favorites select own" on public.event_favorites
    for select using (auth.uid() = user_id);
create policy "favorites insert own" on public.event_favorites
    for insert with check (auth.uid() = user_id);
create policy "favorites delete own" on public.event_favorites
    for delete using (auth.uid() = user_id);
