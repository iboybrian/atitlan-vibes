/**
 * notify-town — pushes "new event" to everyone who picked that town.
 *
 * Fired by a Supabase Database Webhook on public.events (INSERT + UPDATE).
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
    const event = payload.record

    // Announce once, when the event actually becomes visible: a new row that is
    // already approved, or an existing row whose approval just flipped on.
    // Editing an approved event must not re-notify everyone.
    if (!event?.is_approved) return Response.json({ skipped: 'not approved' })
    if (payload.type === 'UPDATE' && payload.old_record?.is_approved) {
        return Response.json({ skipped: 'already announced' })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: recipients, error } = await supabase
        .from('users')
        .select('id, push_token')
        .eq('current_town_id', event.town_id)
        .eq('push_enabled', true)
        .not('push_token', 'is', null)

    if (error) {
        console.error('Recipient lookup failed:', error)
        return Response.json({ error: error.message }, { status: 500 })
    }
    if (!recipients?.length) return Response.json({ sent: 0, reason: 'nobody in this town' })

    const { data: town } = await supabase
        .from('towns')
        .select('name')
        .eq('id', event.town_id)
        .single()

    const sa: ServiceAccount = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!)
    const accessToken = await getAccessToken(sa)
    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    const stale: string[] = []
    let sent = 0

    await Promise.all(recipients.map(async (r) => {
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
                        title: `New event in ${town?.name ?? 'your town'}`,
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

    return Response.json({ sent, stale: stale.length, town: town?.name })
})
