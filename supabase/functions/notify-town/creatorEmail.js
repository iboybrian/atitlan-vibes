/**
 * The email an organizer gets when their event is approved and/or featured.
 *
 * Plain .js with no imports so Deno (the Edge Function) and bare node
 * (scripts/check-creator-email.mjs) run the same file, like targeting.js.
 *
 * Everything in `event` is typed by a stranger and lands in someone's inbox as
 * HTML, so every value goes through esc() and every URL through safeUrl().
 * Layout is nested tables with inline styles: email clients ignore <style>
 * blocks, flexbox and scripts. The "phone" is a dark rounded table around a card
 * that imitates the swipe card on the Now tab.
 */

const TEAL = '#00CED1'
const SUN = '#FFB800'

const COPY = {
    en: {
        subject: {
            approved: (n) => `Your event is live on Atitlán Vibes: ${n}`,
            featured: (n) => `Your event is now featured: ${n}`,
            approved_featured: (n) => `Your event is live and featured: ${n}`
        },
        headline: {
            approved: 'Your event is live!',
            featured: 'Your event is featured!',
            approved_featured: 'Your event is live and featured!'
        },
        lead: {
            approved: 'We reviewed it and approved it. Travelers around the lake can find it now.',
            featured: 'We picked it to be featured. Featured events show first on the Now tab, so more people see it.',
            approved_featured: 'We reviewed it, approved it, and picked it to be featured. Featured events show first on the Now tab.'
        },
        hi: (n) => (n ? `Hi ${n},` : 'Hi,'),
        preview: 'This is how it looks in the app.',
        featured_badge: 'Featured',
        open: 'Open it in Atitlán Vibes',
        share_title: 'Spread the word',
        share_on: 'Share on:',
        whatsapp_text: (n) => `Come with me! ${n} on Atitlán Vibes`,
        story_hint: 'On your phone, Instagram opens your share menu with the picture ready for your story.',
        link_label: 'Your event link',
        footer: 'Atitlán Vibes · Lake Atitlán, Guatemala'
    },
    es: {
        subject: {
            approved: (n) => `Tu evento ya está en Atitlán Vibes: ${n}`,
            featured: (n) => `Tu evento ahora es destacado: ${n}`,
            approved_featured: (n) => `Tu evento ya está publicado y destacado: ${n}`
        },
        headline: {
            approved: '¡Tu evento ya está publicado!',
            featured: '¡Tu evento es destacado!',
            approved_featured: '¡Tu evento ya está publicado y destacado!'
        },
        lead: {
            approved: 'Lo revisamos y lo aprobamos. Los viajeros del lago ya lo pueden encontrar.',
            featured: 'Lo elegimos como destacado. Los destacados salen primero en la pestaña Ahora, así que lo ve más gente.',
            approved_featured: 'Lo revisamos, lo aprobamos y lo elegimos como destacado. Los destacados salen primero en la pestaña Ahora.'
        },
        hi: (n) => (n ? `Hola ${n},` : 'Hola,'),
        preview: 'Así se ve en la app.',
        featured_badge: 'Destacado',
        open: 'Ábrelo en Atitlán Vibes',
        share_title: 'Corre la voz',
        share_on: 'Comparte en:',
        whatsapp_text: (n) => `¡Vamos! ${n} en Atitlán Vibes`,
        story_hint: 'En tu celular, Instagram abre tu menú de compartir con la imagen lista para tu historia.',
        link_label: 'El enlace de tu evento',
        footer: 'Atitlán Vibes · Lago de Atitlán, Guatemala'
    }
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** http(s) only: an href or src of javascript: / data: never reaches the page. */
const safeUrl = (u) => (/^https?:\/\//i.test(String(u ?? '').trim()) ? String(u).trim() : null)

/**
 * Same rewrite as getDirectImageUrl() in src/lib/utils.js, which Deno can't
 * import from here. Uploads go to Supabase Storage and pass through untouched;
 * this only matters for the older Drive / Dropbox links.
 */
function directImage(url) {
    const u = safeUrl(url)
    if (!u) return null
    if (u.includes('drive.google.com')) {
        const m = u.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/)
        const id = m && (m[1] || m[2])
        if (id) return `https://drive.google.com/uc?export=view&id=${id}`
    }
    if (u.includes('dropbox.com')) return u.replace('?dl=0', '?raw=1')
    return u
}

const oneLine = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/**
 * @param {object} o
 * @param {'approved'|'featured'|'approved_featured'} o.kind
 * @param {'en'|'es'} o.lang
 * @param {{id:number,name:string,cover_image?:string,venue?:string,event_date_label?:string,start_time?:string}} o.event
 * @param {string} [o.townName]
 * @param {string} [o.firstName]
 * @param {string} o.appUrl  no trailing slash
 * @param {{cover?: string, logo?: string}} [o.cid]  content ids of images attached
 *        to the message. Where given, the card uses cid:<id> instead of a remote
 *        URL: many mail clients block remote images until the reader allows
 *        them, and an inline attachment shows without that.
 * @returns {{subject: string, html: string}}
 */
export function creatorEmail({ kind, lang, event, townName, firstName, appUrl, cid = {} }) {
    const c = COPY[lang === 'es' ? 'es' : 'en']
    const link = `${appUrl}/event/${event.id}`
    const image = cid.cover ? `cid:${cid.cover}` : directImage(event.cover_image)
    const featured = kind !== 'approved'
    const when = [event.event_date_label, event.start_time?.slice(0, 5)].filter(Boolean).join(' · ')
    const place = [event.venue, townName].filter(Boolean).join(' · ')
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    // WhatsApp can't attach a picture from a link, but it builds a preview card from
    // the page's Open Graph tags: the framed event image and title (api/event-page.js).
    const wa = `https://wa.me/?text=${encodeURIComponent(`${c.whatsapp_text(oneLine(event.name))}
${link}`)}`
    // A page on the phone, because only that can hand the PICTURE to the share menu.
    const shareImage = `${appUrl}/share/${encodeURIComponent(event.id)}`

    // A round brand icon over its name: the name stays readable and tappable when
    // the reader hasn't allowed remote images (public/email/*.png).
    const icon = (href, file, label) =>
        `<td align="center" style="padding:0 16px"><a href="${esc(href)}" style="text-decoration:none;color:#374151"><img src="${esc(appUrl)}/email/${file}.png" width="56" height="56" alt="" style="display:block;border:0;margin:0 auto"><span style="display:block;margin-top:8px;font-size:12px;font-weight:700">${esc(label)}</span></a></td>`

    const button = (href, label, bg, fg) =>
        `<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${bg};color:${fg};font-weight:700;font-size:14px;text-decoration:none">${esc(label)}</a>`

    const html = `<!doctype html>
<html lang="${lang === 'es' ? 'es' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.headline[kind])}</title></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden">

<tr><td align="center" style="background:${TEAL};background-image:linear-gradient(135deg,${TEAL},#0AA7C2);padding:28px 24px 22px">
  <img src="${cid.logo ? `cid:${cid.logo}` : `${esc(appUrl)}/logo.png`}" width="64" height="64" alt="Atitlán Vibes" style="display:block;border:0;border-radius:16px;background:#ffffff;margin:0 auto 12px">
  <div style="font-size:26px;line-height:1.2;font-weight:800;color:#ffffff">${esc(c.headline[kind])}${featured ? ' ⭐' : ''}</div>
</td></tr>

<tr><td style="padding:24px 28px 8px;font-size:15px;line-height:1.55;color:#374151">
  <p style="margin:0 0 8px;font-weight:700;color:#111827">${esc(c.hi(firstName))}</p>
  <p style="margin:0">${esc(c.lead[kind])}</p>
</td></tr>

<tr><td align="center" style="padding:16px 28px 8px">
  <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9CA3AF;margin-bottom:12px">${esc(c.preview)}</div>
  <!-- the phone -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:272px;background:#111827;border-radius:38px;padding:10px">
    <tr><td align="center" style="padding:2px 0 8px"><div style="width:64px;height:6px;border-radius:999px;background:#374151;margin:0 auto"></div></td></tr>
    <tr><td style="background:#F5F5F0;border-radius:28px;overflow:hidden;padding:0">
      <!-- the card, like the swipe card on Now -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111827">
        <tr><td style="padding:0;line-height:0;background:#1f2937">
          ${image
        ? `<img src="${esc(image)}" width="252" alt="${esc(event.name)}" style="display:block;width:100%;height:320px;object-fit:cover;border:0">`
        : `<div style="height:320px;background:${TEAL}"></div>`}
        </td></tr>
        <tr><td style="padding:14px 16px 16px;background:#111827">
          ${townName ? `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#374151;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase">📍 ${esc(townName)}</span>` : ''}
          ${featured ? `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${SUN};color:#111827;font-size:10px;font-weight:800;margin-left:4px">★ ${esc(c.featured_badge)}</span>` : ''}
          <div style="margin-top:10px;font-size:19px;line-height:1.2;font-weight:800;color:#ffffff">${esc(event.name)}</div>
          ${when ? `<div style="margin-top:6px;font-size:12px;font-weight:700;color:${SUN}">${esc(when)}</div>` : ''}
          ${place ? `<div style="margin-top:3px;font-size:12px;color:#D1D5DB">${esc(place)}</div>` : ''}
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:10px 0 4px"><div style="width:84px;height:5px;border-radius:999px;background:#374151;margin:0 auto"></div></td></tr>
  </table>
</td></tr>

<tr><td align="center" style="padding:20px 28px 8px">${button(link, c.open, TEAL, '#ffffff')}</td></tr>

<tr><td style="padding:24px 28px 0"><div style="border-top:1px solid #E5E7EB"></div></td></tr>

<tr><td align="center" style="padding:24px 28px 6px">
  <div style="font-size:22px;font-weight:800;color:#111827">${esc(c.share_title)}</div>
  <div style="margin-top:6px;font-size:15px;color:#6B7280">${esc(c.share_on)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0"><tr>
    ${icon(wa, 'whatsapp', 'WhatsApp')}${icon(fb, 'facebook', 'Facebook')}${icon(shareImage, 'instagram', 'Instagram')}
  </tr></table>
  <div style="margin-top:18px;font-size:12px;line-height:1.5;color:#9CA3AF">${esc(c.story_hint)}</div>
</td></tr>

<tr><td style="padding:16px 28px 28px">
  <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9CA3AF;margin-bottom:6px">${esc(c.link_label)}</div>
  <div style="padding:12px 14px;border-radius:12px;background:#F3F4F6;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;word-break:break-all"><a href="${esc(link)}" style="color:#0F766E;text-decoration:none">${esc(link)}</a></div>
</td></tr>

<tr><td align="center" style="background:#F9FAFB;padding:16px;font-size:12px;color:#9CA3AF">${esc(c.footer)}</td></tr>
</table>
</td></tr></table>
</body></html>`

    return { subject: oneLine(c.subject[kind](oneLine(event.name))), html }
}
