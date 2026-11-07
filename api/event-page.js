import { APP_URL, loadEvent } from './_lib/event.js'

/**
 * What a link-preview crawler sees at /event/:id.
 *
 * The app is a client-rendered SPA, so a crawler that doesn't run JavaScript
 * (WhatsApp, Facebook, Telegram, Slack...) would get an empty shell and show a
 * bare link. vercel.json sends only those crawlers here, by user agent; people
 * and the app itself still get the SPA. The preview image is /api/og.
 */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export default async function handler(req, res) {
    const id = new URL(req.url, APP_URL).searchParams.get('id')
    let event = null
    try {
        event = await loadEvent(id)
    } catch (err) {
        console.error('event-page: lookup failed', err)
    }

    const url = event ? `${APP_URL}/event/${event.id}` : APP_URL
    const title = event ? event.name.replace(/\s+/g, ' ').trim() : 'Atitlán Vibes'
    const description = event
        ? clip([
            [event.event_date_label, event.start_time?.slice(0, 5)].filter(Boolean).join(' · '),
            [event.venue, event.town].filter(Boolean).join(', '),
            event.description?.replace(/\s+/g, ' ').trim()
        ].filter(Boolean).join(' — '), 200)
        : 'Find what is on tonight around Lake Atitlán, save it, and see who else is going.'
    const image = event ? `${APP_URL}/api/og?id=${event.id}` : `${APP_URL}/logo.png`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Crawlers re-read rarely, and an event's name or photo changes even more rarely.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(event ? `${title} · Atitlán Vibes` : title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="Atitlán Vibes">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
</head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`)
}
