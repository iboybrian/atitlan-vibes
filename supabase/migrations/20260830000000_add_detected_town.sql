-- Coarse location targeting for push (src/lib/geolocation.js).
--
-- The client reads approximate location while the app is open, works out the
-- nearest town ON THE DEVICE, and stores only the resulting town id here. Raw
-- coordinates are never transmitted and never stored — that is what keeps this
-- out of Google's background-location declaration and makes the privacy copy
-- ("your coordinates never leave your phone") literally true.
--
-- detected_town_id is deliberately NOT current_town_id: TownPicker still owns
-- what the user sees. This only changes who notify-town targets.

alter table public.towns
    add column if not exists lat double precision,
    add column if not exists lng double precision;

-- Town centres, seeded by id because the ids are known and stable — matching on
-- name would leave a typo'd row null, and a town with no coordinates silently
-- stops being detectable forever.
-- Closest pair is San Pedro <-> San Marcos at ~4 km, comfortably wider than the
-- ~1.5 km ACCESS_COARSE_LOCATION gives us, so coarse is accurate enough here.
update public.towns set lat = 14.7420, lng = -91.1580 where id = 1; -- Panajachel
update public.towns set lat = 14.7255, lng = -91.2578 where id = 2; -- San Marcos La Laguna
update public.towns set lat = 14.6919, lng = -91.2718 where id = 3; -- San Pedro La Laguna
update public.towns set lat = 14.5557324, lng = -90.7358906 where id = 4; -- Antigua Guatemala
update public.towns set lat = 14.600781,  lng = -90.518451  where id = 5; -- Guatemala City (Rotonda Plaza España)

alter table public.users
    add column if not exists detected_town_id bigint references public.towns (id) on delete set null,
    add column if not exists detected_at timestamptz,
    -- Separate from the OS permission on purpose. Android keeps reporting
    -- "granted" after the user turns the feature off in Settings, so without
    -- this flag the next app open would silently start collecting again.
    add column if not exists location_enabled boolean not null default false;

-- notify-town filters on this for every approval, same shape as current_town_id
create index if not exists users_detected_town_id_idx
    on public.users (detected_town_id)
    where detected_town_id is not null;

-- handle_new_user() is deliberately NOT re-created here. It inserts
-- (id, email, name, phone, country); the two nullable columns and the defaulted
-- flag above leave that insert valid.
