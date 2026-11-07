import { readFile } from 'node:fs/promises'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { loadEvent } from './_lib/event.js'
import { card, coverOf, dimensions } from './_lib/card.js'

/**
 * The picture that travels with a shared event: its photo inside a phone frame,
 * drawn like the swipe card on the Now tab.
 *
 *   /api/og?id=635                 1200x630, the link preview WhatsApp / Facebook show
 *   /api/og?id=635&format=story    1080x1920, the picture the /share page hands to the phone
 *
 * Satori draws the layout to SVG and resvg turns it into a PNG. (Not @vercel/og:
 * the same engines, but its Edge build failed to deploy, and this runs as a plain
 * Node function.) Only approved events are drawn (see loadEvent). Everything on
 * the card is text drawn into pixels, so a name full of markup is just a
 * funny-looking name.
 */

// Literal URLs so Vercel's file tracing ships these files with the function.
const files = Promise.all([
    readFile(new URL('./_lib/fonts/inter-800.woff', import.meta.url)),
    readFile(new URL('./_lib/fonts/inter-600.woff', import.meta.url)),
    readFile(new URL('../public/logo.png', import.meta.url))
])
const fonts = files.then(([bold, semi]) => [
    { name: 'Inter', data: bold, weight: 800, style: 'normal' },
    { name: 'Inter', data: semi, weight: 600, style: 'normal' }
])
const logo = files.then(([, , png]) => `data:image/png;base64,${png.toString('base64')}`)

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif']

/**
 * The event photo as a data URI, or null. Satori draws only what it is handed,
 * so the photo is fetched here: https only (see coverOf), a few seconds at most,
 * and capped in size. A photo that is slow, huge, or a type Satori can't read
 * (WebP) just means the card is drawn on the brand colour.
 */
async function photo(event) {
    const url = coverOf(event)
    if (!url) return null
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 6000)
    try {
        const res = await fetch(url, { signal: ctl.signal })
        const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
        if (!res.ok || !PHOTO_TYPES.includes(type)) return null
        const bytes = Buffer.from(await res.arrayBuffer())
        if (bytes.length > MAX_PHOTO_BYTES) return null
        return `data:${type};base64,${bytes.toString('base64')}`
    } catch {
        return null
    } finally {
        clearTimeout(timer)
    }
}

export default async function handler(req, res) {
    const params = new URL(req.url, 'https://app.atitlanvibes.com').searchParams
    const isStory = params.get('format') === 'story'

    let event = null
    try {
        event = await loadEvent(params.get('id'))
    } catch (err) {
        console.error('og: lookup failed', err)
    }
    if (!event) return res.status(404).send('Not found')

    try {
        const dims = dimensions(isStory)
        const svg = await satori(card(event, await photo(event), isStory, await logo), { ...dims, fonts: await fonts })
        const png = new Resvg(svg, { fitTo: { mode: 'width', value: dims.width } }).render().asPng()

        res.setHeader('Content-Type', 'image/png')
        // Crawlers keep their own copy anyway; this keeps repeat hits off the renderer.
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
        // The /share page fetches this as a File (also from preview domains).
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.status(200).send(png)
    } catch (err) {
        console.error('og: render failed', err)
        res.status(500).send('Could not draw the image')
    }
}
