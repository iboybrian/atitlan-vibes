-- UI language the user is on. Mirrored from localStorage (i18n.js owns the choice);
-- this column exists so the notify-town Edge Function can write the push title in
-- the right language — the client isn't around when the notification is sent.
alter table public.users
    add column if not exists lang text not null default 'en'
        check (lang in ('en', 'es'));
