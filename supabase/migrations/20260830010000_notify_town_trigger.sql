-- Dispara notify-town cuando un evento se aprueba.
--
-- Reemplaza el "Database Webhook" del dashboard, que en este proyecto no se
-- puede crear: la UI falla con `schema "supabase_functions" does not exist`
-- incluso con pg_net instalada. Un webhook de Supabase es exactamente esto por
-- dentro (un trigger que llama net.http_post), así que hacerlo a mano no pierde
-- nada — y encima queda versionado aquí en vez de ser configuración que solo
-- vive en el dashboard y que nadie ve al clonar el repo.
--
-- El body imita el payload del webhook al pie de la letra porque index.ts lee
-- payload.record / payload.type / payload.old_record.
--
-- REQUISITO, córrelo UNA VEZ a mano (no va aquí: el secreto no debe entrar a git):
--   select vault.create_secret('<el mismo valor de NOTIFY_TOWN_SECRET>', 'notify_town_secret');
--
-- REQUISITO 2: la función tiene que estar desplegada con --no-verify-jwt. Aquí
-- solo mandamos x-notify-secret; con la verificación de JWT puesta el gateway
-- responde UNAUTHORIZED_NO_AUTH_HEADER y nuestro código nunca corre.

create extension if not exists pg_net;

create or replace function public.notify_town_on_event()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
as $$
declare
    secret text;
begin
    select decrypted_secret into secret
    from vault.decrypted_secrets
    where name = 'notify_town_secret';

    -- Sin secreto la función responde 401. Avisar y seguir: que falle el push
    -- nunca debe tumbar el insert/update del evento.
    if secret is null then
        raise warning 'notify_town_secret no está en vault; no se manda push';
        return new;
    end if;

    perform net.http_post(
        url := 'https://tcdjxxnjfqnfbnseuhsa.supabase.co/functions/v1/notify-town',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-notify-secret', secret
        ),
        body := jsonb_build_object(
            'type', tg_op,
            'record', to_jsonb(new),
            'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
        )
    );

    return new;
end;
$$;

-- La función decide a quién notificar y cuándo (solo en la transición a
-- aprobado). El trigger solo entrega, no filtra.
drop trigger if exists notify_town_on_event on public.events;
create trigger notify_town_on_event
    after insert or update on public.events
    for each row
    execute function public.notify_town_on_event();
