import { ImageResponse } from '@vercel/og'
import { loadEvent } from './_lib/event.js'
import { card, coverOf, dimensions } from './_lib/card.js'

/**
 * The picture that travels with a shared event: its photo inside a phone frame,
 * drawn like the swipe card on the Now tab.
 *
 *   /api/og?id=635                 1200x630, the link preview WhatsApp / Facebook show
 *   /api/og?id=635&format=story    1080x1920, to post as an Instagram or Facebook story
 *
 * Meta won't create a story from a link, so the organizer's email offers the
 * story format as a picture to save and post by hand. Only approved events are
 * drawn (see loadEvent). Everything on the card is text drawn into pixels, so a
 * name full of markup is just a funny-looking name.
 */

// Edge runtime: no fs, so the fonts are fetched by URL. Vercel's edge bundler
// ships a file referenced as new URL(..., import.meta.url) alongside the function.
export const config = { runtime: 'edge' }

const fonts = Promise.all([
    fetch(new URL('./_lib/fonts/inter-800.woff', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('./_lib/fonts/inter-600.woff', import.meta.url)).then((r) => r.arrayBuffer())
]).then(([bold, semi]) => [
    { name: 'Inter', data: bold, weight: 800, style: 'normal' },
    { name: 'Inter', data: semi, weight: 600, style: 'normal' }
])

export default async function handler(request) {
    const params = new URL(request.url).searchParams
    const isStory = params.get('format') === 'story'

    let event = null
    try {
        event = await loadEvent(params.get('id'))
    } catch (err) {
        console.error('og: lookup failed', err)
    }
    if (!event) return new Response('Not found', { status: 404 })

    const draw = async (cover) => {
        const image = new ImageResponse(card(event, cover, isStory), { ...dimensions(isStory), fonts: await fonts })
        return image.arrayBuffer()
    }

    let png
    try {
        png = await draw(coverOf(event))
    } catch (err) {
        // A photo that can't be fetched or decoded (a dead link, a WebP) must not
        // cost the share its picture: draw the card on the brand colour instead.
        console.error('og: photo failed, drawing without it', err)
        try {
            png = await draw(null)
        } catch (err2) {
            console.error('og: render failed', err2)
            return new Response('Could not draw the image', { status: 500 })
        }
    }

    return new Response(png, {
        headers: {
            'Content-Type': 'image/png',
            // Crawlers keep their own copy anyway; this keeps repeat hits off the renderer.
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
        }
    })
}
