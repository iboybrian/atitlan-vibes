-- Eventos que se repiten ciertos días de la semana.
--
-- Ya pasaba en la práctica: el formulario sugiere "Every Sunday" como ejemplo de
-- event_date_label, así que la gente publica series poniendo ese texto y UN
-- domingo en calendar_date. Pasa ese domingo y el evento se hunde, aunque el
-- cartel siga diciendo que es cada domingo. Esto le da a esa intención una
-- columna real.
--
-- La próxima ocurrencia NO se guarda: la calcula nextOccurrence() en
-- src/lib/utils.js cada vez que se lee. Un job nocturno que moviera calendar_date
-- fallaría en silencio y se llevaría todos los recurrentes de una vez.

alter table public.events
    add column if not exists recurring_days smallint[];

-- 0 = domingo, igual que Date.getUTCDay() en JS, para que no haya traducción
-- entre la base y el cliente.
-- El array vacío queda prohibido a propósito: sería ambiguo entre "no recurre" y
-- "recurre nunca". Para no recurrente, null.
alter table public.events
    drop constraint if exists events_recurring_days_valid;

alter table public.events
    add constraint events_recurring_days_valid check (
        recurring_days is null
        or (array_length(recurring_days, 1) between 1 and 7
            and recurring_days <@ array[0,1,2,3,4,5,6]::smallint[])
    );

comment on column public.events.recurring_days is
    'Días de la semana en que se repite (0=domingo). NULL = evento único. Con esto, calendar_date es el inicio de la serie.';
