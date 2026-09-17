-- Borra eventos únicos que ya pasaron, con 7 días de gracia.
--
-- Es la única pieza de todo esto que se agenda, y es porque un DELETE no puede
-- vivir en el cliente: cualquiera podría dispararlo y RLS lo bloquearía de todos
-- modos. Todo lo demás (la próxima fecha de una serie) se calcula al leer.
--
-- OJO, esto es pérdida de datos irreversible. event_favorites.event_id es
-- ON DELETE CASCADE, así que el evento también desaparece de los guardados de
-- quien lo tenía. Favorites.jsx ya filtra los nulos del join, así que no rompe la
-- UI — pero no hay vuelta atrás. Los 7 días son la única red.

create extension if not exists pg_cron;

create or replace function public.purge_past_events()
    returns integer
    language plpgsql
    security definer
    set search_path = public
as $$
declare
    borrados integer;
begin
    -- Las tres condiciones son guardas, no filtros:
    --   recurring_days is null   nunca toca una serie, que no tiene "pasado"
    --   calendar_date is not null nunca toca un evento sin fecha
    --   - 7                       la ventana de gracia
    delete from public.events
    where recurring_days is null
      and calendar_date is not null
      and calendar_date < (now() at time zone 'America/Guatemala')::date - 7;

    get diagnostics borrados = row_count;

    -- Queda en los logs de Postgres: si un día borra de más, esto es lo único
    -- que dice cuántos y cuándo.
    raise notice 'purge_past_events: % eventos borrados', borrados;
    return borrados;
end;
$$;

-- 06:30 UTC = 00:30 en Guatemala, que no tiene horario de verano.
select cron.unschedule('purge-past-events')
where exists (select 1 from cron.job where jobname = 'purge-past-events');

select cron.schedule(
    'purge-past-events',
    '30 6 * * *',
    $$select public.purge_past_events()$$
);
