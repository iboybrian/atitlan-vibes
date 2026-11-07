/**
 * Organizer email: node scripts/check-creator-email.mjs
 *
 * The event name, venue and image URL are typed by strangers and end up as HTML
 * in someone's inbox, so the thing worth pinning is that nothing they type can
 * become markup, and that the share links carry the event link intact.
 */
import assert from 'node:assert/strict'
import { creatorEmail } from '../supabase/functions/notify-town/creatorEmail.js'

const APP = 'https://app.atitlanvibes.com'
const base = {
    lang: 'en',
    appUrl: APP,
    townName: 'San Marcos',
    firstName: 'Ana',
    event: {
        id: 42,
        name: 'Yoga at the lake',
        cover_image: 'https://x.supabase.co/storage/v1/object/public/events/a.jpg',
        venue: 'Las Pirámides',
        event_date_label: 'Every Saturday',
        start_time: '10:00:00'
    }
}
const make = (over = {}, kind = 'approved') => creatorEmail({ ...base, ...over, kind, event: { ...base.event, ...over.event } })

// Subjects, per kind and language.
assert.equal(make().subject, 'Your event is live on Atitlán Vibes: Yoga at the lake')
assert.equal(make({}, 'featured').subject, 'Your event is now featured: Yoga at the lake')
assert.equal(make({}, 'approved_featured').subject, 'Your event is live and featured: Yoga at the lake')
assert.equal(make({ lang: 'es' }).subject, 'Tu evento ya está en Atitlán Vibes: Yoga at the lake')

// The featured badge only shows when it is featured.
assert.ok(!make().html.includes('★'))
assert.ok(make({}, 'featured').html.includes('★ Featured'))
assert.ok(make({ lang: 'es' }, 'approved_featured').html.includes('★ Destacado'))

// The card has the uploaded image, and the link and share buttons point at the event.
const { html } = make()
assert.ok(html.includes('src="https://x.supabase.co/storage/v1/object/public/events/a.jpg"'))
assert.ok(html.includes(`href="${APP}/event/42"`))
assert.ok(html.includes(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${APP}/event/42`)}`))
// WhatsApp carries the message and the link; the story picture is the 1080x1920 render.
assert.ok(html.includes(`https://wa.me/?text=${encodeURIComponent(`Come with me! Yoga at the lake on Atitlán Vibes
${APP}/event/42`)}`))
assert.ok(make({ lang: 'es' }).html.includes(encodeURIComponent('¡Vamos! Yoga at the lake en Atitlán Vibes')))
assert.ok(html.includes(`${APP}/api/og?id=42&amp;format=story`.replace('&amp;', '&#38;')))
assert.ok(html.includes('Hi Ana,'))
assert.ok(make({ firstName: '' }).html.includes('Hi,'))

// Nothing typed by the organizer becomes markup.
const evil = make({ event: { name: '<script>alert(1)</script>"><img src=x onerror=alert(2)>', venue: '<b>x</b>' }, firstName: '<i>Ana</i>' })
assert.ok(!evil.html.includes('<script>'))
assert.ok(!/<img src=x/.test(evil.html))
assert.ok(!evil.html.includes('<b>x</b>'))
assert.ok(!evil.html.includes('<i>Ana</i>'))
assert.ok(evil.html.includes('&#60;script&#62;'))

// A javascript: or data: image never reaches an attribute; the card falls back to the brand colour.
for (const cover_image of ['javascript:alert(1)', 'data:text/html,hi', 'not a url', null]) {
    const e = make({ event: { cover_image } })
    assert.ok(!e.html.includes('javascript:') && !e.html.includes('data:text'), String(cover_image))
    assert.ok(!e.html.includes('object-fit:cover'), 'no <img> for a bad image')
}

// Older Drive / Dropbox links get the same rewrite as the app.
assert.ok(make({ event: { cover_image: 'https://drive.google.com/file/d/ABC123/view' } }).html.includes('uc?export=view&#38;id=ABC123'))
assert.ok(make({ event: { cover_image: 'https://www.dropbox.com/s/x/a.jpg?dl=0' } }).html.includes('a.jpg?raw=1'))

// A subject is one line even if the name has a newline in it.
assert.equal(make({ event: { name: 'Two\nlines' } }).subject, 'Your event is live on Atitlán Vibes: Two lines')

// A name with URL-breaking characters stays inside the WhatsApp text parameter.
const tricky = make({ event: { name: 'Rock & Roll #1?' } }).html
assert.ok(tricky.includes(encodeURIComponent('Come with me! Rock & Roll #1? on Atitlán Vibes')))

// Missing optional fields don't print "undefined" or empty chips.
const bare = creatorEmail({ kind: 'approved', lang: 'en', appUrl: APP, event: { id: 1, name: 'Bare' } })
assert.ok(!bare.html.includes('undefined') && !bare.html.includes('null'))
assert.ok(!bare.html.includes('📍'))

console.log('creator email ok')
