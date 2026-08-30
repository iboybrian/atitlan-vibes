# notify-town — despliegue

Manda un push a todos los usuarios que están en una town, cada vez que un evento
de esa town pasa a `is_approved = true`. También se puede disparar a mano para
promocionar un evento (ver §7).

**A quién le llega.** Cualquiera de las dos señales basta: una detección de menos
de 72h, o un pick del TownPicker de menos de 7 días. Un pick vencido se descarta
solo si hay una detección fresca que lo contradiga — quien tiene la ubicación
apagada no tiene otra señal y silenciarlo sería peor. La regla exacta está en
[targeting.js](targeting.js), con su check en `npm run check`.

## 1. Columnas en la base

Corre estas migraciones en Supabase → SQL Editor:

- [`current_town_id`](../../migrations/20260802000000_add_current_town_id.sql) — la town elegida a mano (el respaldo).
- [`lang`](../../migrations/20260811000000_add_lang.sql) — en qué idioma va el título.
- [`detected_town_id`](../../migrations/20260830000000_add_detected_town.sql) — la town detectada, más `detected_at` y `location_enabled`. Incluye las coordenadas de las towns.
- [`current_town_set_at`](../../migrations/20260830020000_add_current_town_set_at.sql) — cuándo se hizo el pick, para poder caducarlo.

## 2. Llave de servicio de Firebase

Firebase Console → ⚙ Project settings → **Service accounts** → **Generate new
private key**. Baja un `.json`.

**Ese archivo es una credencial de servidor: nunca lo metas al repo ni al APK.**
Con él, cualquiera puede mandar notificaciones a nombre de tu app. Va solo en los
secretos de Supabase.

## 3. Secretos

```bash
npx supabase login
npx supabase link --project-ref tcdjxxnjfqnfbnseuhsa

npx supabase secrets set FCM_SERVICE_ACCOUNT="$(cat ruta/al/service-account.json)"
npx supabase secrets set NOTIFY_TOWN_SECRET="<una cadena larga al azar que inventes>"
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta la plataforma sola.

## 4. Desplegar

```bash
npx supabase functions deploy notify-town --no-verify-jwt
```

**El `--no-verify-jwt` no es opcional.** Por defecto el gateway de Supabase exige
un `Authorization: Bearer <jwt>` y rechaza la llamada con
`{"code":"UNAUTHORIZED_NO_AUTH_HEADER"}` antes de que nuestro código corra — el
trigger de Postgres solo manda `x-notify-secret`, así que sin la bandera nunca
llega nada. La autenticación real es `NOTIFY_TOWN_SECRET`, que sigue igual de
estricta: sin ese header la función responde `401`.

## 5. Trigger que la dispara

Un trigger normal de Postgres sobre `public.events`, versionado en
[20260830010000_notify_town_trigger.sql](../../migrations/20260830010000_notify_town_trigger.sql).

Reemplaza el "Database Webhook" del dashboard, que en este proyecto no se puede
crear (la UI falla con `schema "supabase_functions" does not exist` incluso con
`pg_net` instalada). Un webhook de Supabase es exactamente eso por dentro, así
que no se pierde nada.

El secreto vive en Supabase Vault, no en git. Córrelo una vez a mano:

```sql
select vault.create_secret('<el mismo valor de NOTIFY_TOWN_SECRET>', 'notify_town_secret');
```

Para depurar, `pg_net` guarda cada respuesta:

```sql
select id, status_code, content, created from net._http_response order by id desc limit 5;
```

`401` = el secreto del Vault no coincide con el de `supabase secrets`.
`UNAUTHORIZED_NO_AUTH_HEADER` = falta redesplegar con `--no-verify-jwt`.

## 6. Probar

En la app elige una town y activa notificaciones. Luego, en Supabase, aprueba un
evento de esa town (`is_approved` de `false` a `true`). Con la app en segundo
plano debe llegar la notificación.

Logs: Supabase Dashboard → Edge Functions → `notify-town` → Logs. La respuesta
trae `{ sent, stale, town }`.

## 7. Promoción pagada (disparo manual)

Cuando alguien paga por promocionar un evento que ya existe en la app:

```bash
curl -X POST https://tcdjxxnjfqnfbnseuhsa.supabase.co/functions/v1/notify-town \
  -H "x-notify-secret: $NOTIFY_TOWN_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"eventId": 123}'
```

Responde `{ sent, stale, town, event, manual: true }`. El título dice
"Happening in …" / "Sucede en …" en vez de "New event in …", porque casi siempre
es un evento que ya llevaba días publicado.

**Solo acepta `eventId`, nunca un título o cuerpo propios.** Es a propósito: así
no existe ninguna forma de mandar texto escrito por el anunciante, y toda
notificación apunta a un evento real dentro de la app. La política de Play
restringe la publicidad en notificaciones del sistema — esto es lo que mantiene
al producto del lado correcto. No agregues ese parámetro.

Se salta el candado de "avisar una sola vez" (ese candado existe para que editar
un evento no vuelva a notificar a todos; una promoción no es una edición), pero
el evento tiene que existir: si no, responde `404`.

Al tocar la notificación se abre `/event/<id>`: la función manda `data.eventId` y
el cliente lo escucha con `startPushTapListener()` (registrado en
[main.jsx](../../../src/main.jsx), antes de React) más `onPushTap()` en
[Layout.jsx](../../../src/components/layout/Layout.jsx).

## Qué no hace

- **Un token por usuario.** `users.push_token` es una sola columna: si alguien
  entra desde un segundo teléfono, el primero deja de recibir.
- **Sin reintentos.** Un fallo de FCM que no sea `404` solo queda en los logs.
