import { getDirectImageUrl } from '../../src/lib/utils.js'

// The share picture as a tree of plain objects (what Satori draws), no
// rendering here. Satori fetches nothing, so the photo and the logo arrive as
// data URIs (api/og.js reads them).

const TEAL = '#00CED1'
const DEEP = '#0AA7C2'
const SUN = '#FFB800'
const DARK = '#111827'

// Satori wants every container to say display:flex, so the helper says it once.
// border-box too: Satori sizes boxes like content-box, so a 1920-tall root with
// padding would draw 2140 tall and push its last child off the canvas.
const h = (type, style, children) => ({
    type,
    props: { style: { display: 'flex', boxSizing: 'border-box', ...style }, children: [].concat(children ?? []).filter(Boolean) }
})
const text = (style, value) => h('div', style, String(value))

const star = (size) => ({
    type: 'svg',
    props: {
        width: size, height: size, viewBox: '0 0 24 24',
        children: [{ type: 'path', props: { fill: DARK, d: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z' } }]
    }
})

/** The photo URL to fetch: https only, Drive / Dropbox links rewritten, or null. */
const coverOf = (event) => {
    if (!event.cover_image) return null
    const url = getDirectImageUrl(event.cover_image)
    return /^https:\/\//i.test(url) ? url : null
}

/** The phone: dark frame, rounded screen, and on it the swipe card. */
function phone(w, hgt, event, cover) {
    const s = w / 330
    const pad = Math.round(10 * s)
    const inner = { w: w - 2 * pad, h: hgt - 2 * pad }
    const when = [event.event_date_label, event.start_time?.slice(0, 5)].filter(Boolean).join(' · ')
    const place = [event.venue, event.town].filter(Boolean).join(' · ')
    const name = event.name.length > 80 ? `${event.name.slice(0, 79)}…` : event.name

    return h('div', { width: w, height: hgt, background: DARK, borderRadius: Math.round(46 * s), padding: pad }, [
        h('div', {
            position: 'relative', width: inner.w, height: inner.h, overflow: 'hidden', borderRadius: Math.round(38 * s),
            // The photo is the screen's background, not an <img>: Satori's object-fit
            // left bands of dark at the top and bottom of a portrait poster.
            ...(cover
                ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { backgroundImage: `linear-gradient(135deg, ${TEAL}, ${DEEP})` })
        }, [
            h('div', {
                position: 'absolute', left: 0, bottom: 0, width: inner.w, height: Math.round(inner.h * 0.62),
                backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0))'
            }),
            h('div', { position: 'absolute', top: Math.round(16 * s), left: Math.round(16 * s), right: Math.round(16 * s), justifyContent: 'space-between' }, [
                event.town && text({
                    padding: `${Math.round(5 * s)}px ${Math.round(11 * s)}px`, borderRadius: 999, background: 'rgba(0,0,0,0.5)',
                    color: '#ffffff', fontSize: Math.round(11 * s), fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase'
                }, event.town),
                event.is_feature && h('div', {
                    alignItems: 'center', padding: `${Math.round(5 * s)}px ${Math.round(11 * s)}px`, borderRadius: 999, background: SUN
                }, [star(Math.round(12 * s)), text({ marginLeft: 5, color: DARK, fontSize: Math.round(11 * s), fontWeight: 800 }, 'FEATURED')])
            ]),
            h('div', {
                position: 'absolute', left: Math.round(20 * s), right: Math.round(20 * s), bottom: Math.round(22 * s), flexDirection: 'column'
            }, [
                text({ color: '#ffffff', fontSize: Math.round(27 * s), lineHeight: 1.12, fontWeight: 800, lineClamp: 3 }, name),
                when && text({ marginTop: Math.round(9 * s), color: SUN, fontSize: Math.round(14 * s), fontWeight: 600 }, when),
                place && text({ marginTop: Math.round(4 * s), color: '#D1D5DB', fontSize: Math.round(13 * s), fontWeight: 600, lineClamp: 1 }, place)
            ])
        ])
    ])
}

const brand = (size, logo) => h('div', { alignItems: 'center' }, [
    { type: 'img', props: { src: logo, width: size, height: size, style: { borderRadius: size * 0.25, background: '#ffffff' } } },
    text({ marginLeft: size * 0.3, color: '#ffffff', fontSize: size * 0.5, fontWeight: 800 }, 'Atitlán Vibes')
])

const pill = (size, label) => text({
    padding: `${size * 0.4}px ${size * 0.9}px`, borderRadius: 999, background: '#ffffff', color: DEEP, fontSize: size, fontWeight: 800
}, label)

function link(event, cover, logo) {
    const when = [event.event_date_label, event.event_date_label && event.town].filter(Boolean).join(' · ')
    return h('div', {
        width: 1200, height: 630, backgroundImage: `linear-gradient(135deg, ${TEAL}, ${DEEP})`, alignItems: 'center'
    }, [
        h('div', { flex: 1, height: 630, flexDirection: 'column', justifyContent: 'center', padding: '0 24px 0 72px' }, [
            brand(56, logo),
            text({ marginTop: 40, color: '#ffffff', fontSize: 62, lineHeight: 1.08, fontWeight: 800, lineClamp: 4 }, event.name.length > 80 ? `${event.name.slice(0, 79)}…` : event.name),
            when && text({ marginTop: 22, color: '#ffffff', fontSize: 28, fontWeight: 600, opacity: 0.9 }, when),
            h('div', { marginTop: 34 }, pill(24, 'app.atitlanvibes.com'))
        ]),
        h('div', { width: 420, height: 630, alignItems: 'center', justifyContent: 'center' }, phone(310, 560, event, cover))
    ])
}

function story(event, cover, logo) {
    return h('div', {
        width: 1080, height: 1920, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 110, paddingBottom: 110, backgroundImage: `linear-gradient(160deg, ${TEAL}, ${DEEP})`
    }, [
        brand(84, logo),
        phone(760, 1150, event, cover),
        h('div', { flexDirection: 'column', alignItems: 'center' }, [
            text({ color: '#ffffff', fontSize: 46, fontWeight: 800, marginBottom: 26 }, 'Find it on Atitlán Vibes'),
            pill(38, 'app.atitlanvibes.com')
        ])
    ])
}

/** The picture for an event: the 1200x630 link preview, or the 1080x1920 story. */
export const card = (event, cover, isStory, logo) => (isStory ? story(event, cover, logo) : link(event, cover, logo))
export const dimensions = (isStory) => (isStory ? { width: 1080, height: 1920 } : { width: 1200, height: 630 })
export { coverOf }
