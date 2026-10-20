-- Logged-out guests can browse Home, a town and an event page (today/tomorrow
-- only — that limit is applied in the app, see isTodayOrTomorrow() in utils.js).
-- Their requests use the anon role, so it needs to read approved events and
-- the town list.
--
-- Additive and safe to re-run: if anon could already read these, nothing
-- changes. Pending (unapproved) events stay invisible to guests.

drop policy if exists "guests read approved events" on public.events;
create policy "guests read approved events" on public.events
    for select to anon using (is_approved = true);

drop policy if exists "guests read towns" on public.towns;
create policy "guests read towns" on public.towns
    for select to anon using (true);
