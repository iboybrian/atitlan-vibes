/**
 * notify-town — pushes an event to everyone in that town.
 *
 * Two ways in:
 *   1. A Supabase Database Webhook on public.events (INSERT + UPDATE), which
 *      announces an event once, when it becomes approved.
 *   2. A manual POST of { "eventId": 123 } with the same secret — the paid
 *      promotion path. Deliberate, so it skips the announce-once gate.
 *
 * "In that town" means: the town we detected them in, if that detection is less
 * than 24h old, otherwise the town they picked in TownPicker. See
 * src/lib/geolocation.js — the client stores only a town id, never coordinates.
 *
 * Sends through FCM HTTP v1, which needs an OAuth2 access token minted from a
 * service account key. @capacitor/push-notifications has no topic API, so
 * targeting has to happen here, token by token.
 *
 * Secrets (supabase secrets set):
 *   FCM_SERVICE_ACCOUNT  the whole service-account JSON, one line
 *   NOTIFY_TOWN_SECRET   shared with the webhook's x-notify-secret header
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ServiceAccount {
    client_email: string
    private_key: string
    project_id: string
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

// Push copy. users.lang is written by the client (src/lib/i18n.js) precisely so
// this function can pick — nothing else here knows what the user is looking at.
// The event name itself stays as the organizer typed it.
const TITLE = {
    en: (town: string) => `New event in ${town}`,
    es: (town: string) => `Nuevo evento en ${town}`
}
// A manual blast is usually an existing event being promoted, not a new one —
// "New event in San Pedro" would be a lie for a tour posted three weeks ago.
const AGAIN = {
    en: (town: string) => `Happening in ${town}`,
    es: (town: string) => `Sucede en ${town}`
}
const FALLBACK_TOWN = { en: 'your town', es: 'tu pueblo' }

// How long a detected town counts as "where they are" before we fall back to
// the town they picked by hand. Matches the copy in the privacy policy.
const FRESH_MS = 24 * 60 * 60 * 1000

function pemToBinary(pem: string): ArrayBuffer {
    const body = pem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s/g, '')
    const raw = atob(body)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    return bytes.buffer
}

function base64url(input: string | Uint8Array): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Signed JWT -> Google token endpoint -> bearer token good for an hour. */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const claims = base64url(JSON.stringify({
        iss: sa.client_email,
        scope: FCM_SCOPE,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    }))

    const key = await crypto.subtle.importKey(
        'pkcs8',
        pemToBinary(sa.private_key),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const signature = new Uint8Array(await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(`${header}.${claims}`)
    ))

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${header}.${claims}.${base64url(signature)}`
        })
    })

    if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`)
    return (await res.json()).access_token
}

Deno.serve(async (req) => {
    const secret = Deno.env.get('NOTIFY_TOWN_SECRET')
    if (!secret || req.headers.get('x-notify-secret') !== secret) {
        return new Response('Unauthorized', { status: 401 })
    }

    const payload = await req.json()

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // A webhook payload always carries `record`; a manual blast posts { eventId }.
    let event: { id: number; name: string; town_id: number }
    let manual = false

    if (payload.record) {
        // Announce once, when the event actually becomes visible: a new row that
        // is already approved, or an existing row whose approval just flipped on.
        // Editing an approved event must not re-notify everyone.
        if (!payload.record.is_approved) return Response.json({ skipped: 'not approved' })
        if (payload.type === 'UPDATE' && payload.old_record?.is_approved) {
            return Response.json({ skipped: 'already announced' })
        }

        event = payload.record
    } else {
        // Paid promotion, fired by hand with the shared secret. It skips the
        // announce-once gate on purpose — that gate exists to stop an EDIT from
        // re-notifying everyone, and this is not an edit.
        //
        // Only an eventId is accepted, never a title or body. That is deliberate:
        // it means no code path can send advertiser-written copy, so every push
        // is app content that opens a real event. Keep it that way.
        manual = true
        const id = Number(payload.eventId)
        if (!Number.isInteger(id)) {
            return Response.json({ error: 'eventId required' }, { status: 400 })
        }
        const { data } = await supabase
            .from('events')
            .select('id, name, town_id')
            .eq('id', id)
            .single()
        if (!data) return Response.json({ error: 'no such event' }, { status: 404 })
        event = data
    }

    // In manual mode this originates from the caller, so it is a trust boundary
    const townId = Number(event.town_id)
    if (!Number.isInteger(townId)) {
        return Response.json({ error: 'bad town_id' }, { status: 400 })
    }

    // Fresh detected location wins; otherwise the town they picked. Writing that
    // as a single PostgREST filter needs nested and()/or() strings nobody can
    // read at 3am, and one typo silently changes who got paid-for reach — so
    // fetch anyone matching EITHER column and decide here. Bounded: at most two
    // towns' worth of opted-in users.
    const { data: rows, error } = await supabase
        .from('users')
        .select('id, push_token, lang, current_town_id, detected_town_id, detected_at')
        .eq('push_enabled', true)
        .not('push_token', 'is', null)
        .or(`current_town_id.eq.${townId},detected_town_id.eq.${townId}`)

    if (error) {
        console.error('Recipient lookup failed:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }

    const cutoff = Date.now() - FRESH_MS
    const recipients = (rows ?? []).filter((r) =>
        r.detected_at && Date.parse(r.detected_at) > cutoff
            ? r.detected_town_id === townId   // seen here recently — location wins
            : r.current_town_id === townId    // no fresh fix — fall back to the pick
    )

    if (!recipients.length) return Response.json({ sent: 0, reason: 'nobody in this town' })

    const { data: town } = await supabase
        .from('towns')
        .select('name')
        .eq('id', townId)
        .single()

    const sa: ServiceAccount = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!)
    const accessToken = await getAccessToken(sa)
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    const stale: string[] = []
    let sent = 0

    // ponytail: unbounded fan-out — one fetch per recipient, all at once. Fine at
    // today's scale; chunk to ~50 if a big blast starts timing out.
    await Promise.all(recipients.map(async (r) => {
        const lang = r.lang === 'es' ? 'es' : 'en'
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    token: r.push_token,
                    notification: {
                        title: (manual ? AGAIN : TITLE)[lang](town?.name ?? FALLBACK_TOWN[lang]),
                        body: event.name
                    },
                    data: { eventId: String(event.id) },
                    android: { priority: 'HIGH' }
                }
            })
        })

        if (res.ok) {
            sent++
            return
        }
        // 404 UNREGISTERED = app uninstalled or token rotated. Anything else is
        // ours to fix, so don't throw away a token over it.
        if (res.status === 404) stale.push(r.id)
        else console.error(`FCM ${res.status} for user ${r.id}:`, await res.text())
    }))

    if (stale.length) {
        await supabase.from('users').update({ push_token: null }).in('id', stale)
    }

    // event/manual echoed back so whoever fired a blast by hand can see what went
    // out and to how many people
    return Response.json({ sent, stale: stale.length, town: town?.name, event: event.name, manual })
})
