/**
 * notify-town — pushes an event to everyone in that town.
 *
 * Two ways in:
 *   1. A Supabase Database Webhook on public.events (INSERT + UPDATE), which
 *      announces an event once, when it becomes approved. A new row that is NOT
 *      approved is a user submission: that goes to the admins (users.is_admin)
 *      instead, by email and push, so someone reviews it in /admin.
 *   2. A manual POST of { "eventId": 123 } with the same secret — the paid
 *      promotion path. Deliberate, so it skips the announce-once gate.
 *
 * "In that town" means either signal points here: a detection under 72h old, or
 * a TownPicker choice under 7 days old. See targeting.js for the exact rule and
 * the one asymmetry in it. src/lib/geolocation.js does the detecting — the
 * client stores only a town id, never coordinates.
 *
 * Sends through FCM HTTP v1, which needs an OAuth2 access token minted from a
 * service account key. @capacitor/push-notifications has no topic API, so
 * targeting has to happen here, token by token.
 *
 * Secrets (supabase secrets set):
 *   FCM_SERVICE_ACCOUNT  the whole service-account JSON, one line
 *   NOTIFY_TOWN_SECRET   shared with the webhook's x-notify-secret header
 *   RESEND_API_KEY       for the admin "new submission" email; without it only the push goes
 *   RESEND_FROM          optional sender on a verified domain, e.g. "Atitlán Vibes <hola@atitlanvibes.com>"
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
 */

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { isInTown } from './targeting.js'

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
const REVIEW = { en: 'New event to review', es: 'Nuevo evento por revisar' }
const APP_URL = 'https://app.atitlanvibes.com'

type Lang = 'en' | 'es'
interface Recipient {
    id: string
    push_token: string
    lang: string | null
}

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

/** One FCM send per recipient. Nulls the tokens FCM says are gone. */
async function sendAll(
    supabase: SupabaseClient,
    recipients: Recipient[],
    copy: (lang: Lang) => { title: string; body: string },
    data: Record<string, string>
) {
    const sa: ServiceAccount = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!)
    const accessToken = await getAccessToken(sa)
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    const stale: string[] = []
    let sent = 0

    // ponytail: unbounded fan-out — one fetch per recipient, all at once. Fine at
    // today's scale; chunk to ~50 if a big blast starts timing out.
    await Promise.all(recipients.map(async (r) => {
        const lang: Lang = r.lang === 'es' ? 'es' : 'en'
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    token: r.push_token,
                    notification: copy(lang),
                    data,
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

    return { sent, stale: stale.length }
}

// Everything in the email is user-typed, and it lands in an admin's inbox as HTML.
const esc = (v: unknown) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * Email every admin the whole submission via Resend. Returns how many it went
 * to. Never throws: a broken email setup must not also stop the push.
 */
async function emailAdmins(emails: string[], subject: string, rows: [string, unknown][]) {
    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) {
        console.error('RESEND_API_KEY not set; admin email skipped')
        return 0
    }
    if (!emails.length) return 0

    const html = `
        <h2>${esc(subject)}</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
            ${rows.filter(([, v]) => v != null && v !== '').map(([k, v]) =>
                `<tr><td style="color:#888;vertical-align:top">${esc(k)}</td><td style="white-space:pre-line">${esc(v)}</td></tr>`
            ).join('')}
        </table>
        <p><a href="${APP_URL}/admin">Open the review panel</a></p>`

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // onboarding@resend.dev only delivers to the Resend account's own
                // address. To email other admins, verify a domain and set RESEND_FROM.
                from: Deno.env.get('RESEND_FROM') ?? 'Atitlán Vibes <onboarding@resend.dev>',
                to: emails,
                subject,
                html
            })
        })
        if (!res.ok) {
            console.error(`Resend ${res.status}:`, await res.text())
            return 0
        }
        return emails.length
    } catch (err) {
        console.error('Resend request failed:', err)
        return 0
    }
}

/**
 * A user just submitted an event and it is waiting for approval. Email every
 * admin (users.is_admin) the full submission, and push them a short version
 * whose tap opens /admin. The push ignores push_enabled on purpose — an admin
 * wants this regardless of whether they opted into town announcements.
 */
async function notifyAdmins(supabase: SupabaseClient, record: Record<string, unknown>) {
    const { data: admins } = await supabase
        .from('users')
        .select('id, push_token, lang')
        .eq('is_admin', true)
    if (!admins?.length) return Response.json({ sent: 0, reason: 'no admins' })

    const creatorId = typeof record.creator_id === 'string' ? record.creator_id : null
    // Emails live in auth.users, which only the admin API can read. A failed
    // lookup is just a missing email line, never a reason to skip the push.
    const emailOf = (id: string) =>
        supabase.auth.admin.getUserById(id).then((r) => r.data.user?.email ?? null, () => null)

    const [{ data: town }, { data: submitter }, submitterEmail, adminEmails] = await Promise.all([
        supabase.from('towns').select('name').eq('id', record.town_id).maybeSingle(),
        creatorId
            ? supabase.from('users').select('name, phone').eq('id', creatorId).maybeSingle()
            : Promise.resolve({ data: null }),
        creatorId ? emailOf(creatorId) : Promise.resolve(null),
        Promise.all(admins.map((a) => emailOf(a.id)))
    ])

    const emailed = await emailAdmins(
        adminEmails.filter((e): e is string => !!e),
        `New event to review: ${record.name}`,
        [
            ['Event', record.name],
            ['Town', town?.name],
            ['Category', record.category],
            ['When', record.event_date_label],
            ['Date', record.calendar_date],
            ['Repeats (0 = Sun)', (record.recurring_days as number[] | null)?.join(', ')],
            ['Time', record.start_time],
            ['Venue', record.venue],
            ['Cost', record.cost],
            ['Contact number', record.contact_number],
            ['Contact link', record.contact_link],
            ['Description', record.description],
            ['Cover image', record.cover_image],
            ['Submitted by', submitter?.name],
            ['Submitter phone', submitter?.phone],
            ['Submitter email', submitterEmail]
        ]
    )

    const pushable = admins.filter((a) => a.push_token)
    const body = [record.name, town?.name, record.event_date_label, record.venue]
        .filter(Boolean)
        .join(' · ')
    const push = pushable.length
        ? await sendAll(supabase, pushable, (lang) => ({ title: REVIEW[lang], body }), { route: '/admin' })
        : { sent: 0, stale: 0 }

    return Response.json({ ...push, emailed, admin: true, event: record.name })
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
        if (!payload.record.is_approved) {
            // Only the INSERT is news — later edits to a pending row aren't.
            if (payload.type === 'INSERT') return notifyAdmins(supabase, payload.record)
            return Response.json({ skipped: 'not approved' })
        }
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

    // Either signal can put someone in this town, so fetch anyone matching
    // EITHER column and apply the freshness rules in isInTown(). Writing those
    // as one PostgREST filter needs nested and()/or() strings nobody can read at
    // 3am, and one typo silently changes who got paid-for reach. Bounded: at
    // most two towns' worth of opted-in users.
    const { data: rows, error } = await supabase
        .from('users')
        .select('id, push_token, lang, current_town_id, detected_town_id, detected_at, current_town_set_at')
        .eq('push_enabled', true)
        .not('push_token', 'is', null)
        .or(`current_town_id.eq.${townId},detected_town_id.eq.${townId}`)

    if (error) {
        console.error('Recipient lookup failed:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }

    const recipients = (rows ?? []).filter((r) => isInTown(r, townId))

    if (!recipients.length) return Response.json({ sent: 0, reason: 'nobody in this town' })

    const { data: town } = await supabase
        .from('towns')
        .select('name')
        .eq('id', townId)
        .single()

    const { sent, stale } = await sendAll(
        supabase,
        recipients,
        (lang) => ({
            title: (manual ? AGAIN : TITLE)[lang](town?.name ?? FALLBACK_TOWN[lang]),
            body: event.name
        }),
        { eventId: String(event.id) }
    )

    // event/manual echoed back so whoever fired a blast by hand can see what went
    // out and to how many people
    return Response.json({ sent, stale, town: town?.name, event: event.name, manual })
})
