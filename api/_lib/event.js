// Shared by the two share endpoints (one Node, one Edge). The underscore keeps Vercel from turning
// this file into a route of its own.

export const APP_URL = 'https://app.atitlanvibes.com'

/**
 * One approved event and its town's name, read with the public anon key — the
 * same thing any visitor's browser can read. A pending or unknown event gives
 * null, so a share link can never preview something that isn't published.
 */
export async function loadEvent(id) {
    const n = Number(id)
    if (!Number.isInteger(n) || n <= 0) return null

    const base = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY
    if (!base || !key) return null
    const headers = { apikey: key, Authorization: `Bearer ${key}` }

    const get = async (path) => {
        // AbortController, not AbortSignal.timeout(): this runs on Node and on Edge.
        const ctl = new AbortController()
        const timer = setTimeout(() => ctl.abort(), 5000)
        try {
            const res = await fetch(`${base}/rest/v1/${path}`, { headers, signal: ctl.signal })
            return res.ok ? await res.json() : []
        } finally {
            clearTimeout(timer)
        }
    }

    const [event] = await get(
        `events?id=eq.${n}&is_approved=eq.true&limit=1` +
        '&select=id,name,description,cover_image,venue,event_date_label,start_time,town_id,is_feature'
    )
    if (!event) return null

    const [town] = await get(`towns?id=eq.${event.town_id}&select=name&limit=1`)
    return { ...event, town: town?.name ?? null }
}
