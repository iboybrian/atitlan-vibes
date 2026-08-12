# notify-town — despliegue

Manda un push a todos los usuarios que eligieron una town, cada vez que un evento
de esa town pasa a `is_approved = true`.

## 1. Columnas en la base

Corre estas dos migraciones en Supabase → SQL Editor:

- [`current_town_id`](../../migrations/20260802000000_add_current_town_id.sql) — a quién se le manda.
- [`lang`](../../migrations/20260811000000_add_lang.sql) — en qué idioma va el título.

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
npx supabase functions deploy notify-town
```

## 5. Webhook que la dispara

Supabase Dashboard → Database → **Webhooks** → Create a new hook:

- Table: `events`
- Events: `Insert` y `Update`
- Type: **HTTP Request**, método `POST`
- URL: `https://tcdjxxnjfqnfbnseuhsa.supabase.co/functions/v1/notify-town`
- HTTP Headers:
  - `x-notify-secret` = el mismo valor de `NOTIFY_TOWN_SECRET`
  - `Content-Type` = `application/json`

Sin el header correcto la función responde `401` y no manda nada.

## 6. Probar

En la app elige una town y activa notificaciones. Luego, en Supabase, aprueba un
evento de esa town (`is_approved` de `false` a `true`). Con la app en segundo
plano debe llegar la notificación.

Logs: Supabase Dashboard → Edge Functions → `notify-town` → Logs. La respuesta
trae `{ sent, stale, town }`.

## Qué no hace

- **No abre el evento al tocar la notificación.** Manda `data.eventId`, pero
  nadie escucha `pushNotificationActionPerformed` en el cliente todavía.
- **Un token por usuario.** `users.push_token` es una sola columna: si alguien
  entra desde un segundo teléfono, el primero deja de recibir.
- **Sin reintentos.** Un fallo de FCM que no sea `404` solo queda en los logs.
