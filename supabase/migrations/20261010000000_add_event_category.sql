-- Tipo de evento, para filtrar en Home y en cada pueblo.
--
-- Cinco buckets sacados de leer los 120 eventos que había al momento de crear
-- esto. Más de cinco no caben como chips en una pantalla de teléfono, y con menos
-- "música" se tragaba la mitad de la lista.
--
-- Nullable a propósito: un evento sin categoría sigue apareciendo en "All", solo
-- no aparece bajo ningún chip. NOT NULL rompería cualquier insert que no venga
-- del formulario de la app (el dashboard, un script) sin ganar nada a cambio.

alter table public.events
    add column if not exists category text;

alter table public.events
    drop constraint if exists events_category_valid;

-- Los slugs tienen que coincidir con EVENT_CATEGORIES en src/lib/utils.js
-- (npm run check lo verifica).
alter table public.events
    add constraint events_category_valid check (
        category is null
        or category in ('music', 'culture', 'wellness', 'workshops', 'nightlife')
    );

comment on column public.events.category is
    'Tipo de evento: music | culture | wellness | workshops | nightlife. NULL = sin clasificar (solo sale en "All").';

-- Clasificación inicial, evento por evento. Los ids que ya no existan no hacen nada.

-- Música en vivo, conciertos, salsa y bachata.
update public.events set category = 'music' where id in (
    38, 179, 200, 201, 203, 204, 205, 248, 417, 418, 421, 422, 423, 426, 441,
    476, 480, 484, 485, 486, 489, 492, 494, 500, 503, 526, 532, 533, 538, 540,
    546, 547, 549, 552, 554
);

-- Teatro, comedia, cine, leyendas, tradiciones, naturaleza y paseos.
update public.events set category = 'culture' where id in (
    191, 192, 193, 249, 253, 419, 424, 425, 427, 428, 429, 430, 431, 432, 433,
    434, 435, 436, 437, 438, 439, 478, 488, 520, 529, 537, 541, 543, 544, 548,
    550
);

-- Yoga, meditación, retiros, terapias y deporte.
update public.events set category = 'wellness' where id in (
    99, 117, 139, 141, 146, 150, 160, 197, 199, 207, 247, 257, 261, 264, 287,
    297, 303, 304, 479, 482, 495, 496, 504, 507, 511, 512, 513, 519, 523
);

-- Talleres prácticos: cocina, cerámica, café, música, niños, idiomas.
update public.events set category = 'workshops' where id in (
    142, 172, 242, 244, 475, 477, 481, 483, 487, 493, 542, 545, 551
);

-- Bares, happy hours, juegos de bar, festivales de cerveza, open mics.
update public.events set category = 'nightlife' where id in (
    42, 50, 173, 174, 243, 440, 490, 491, 522, 525, 527, 539
);
