/**
 * Meta (Facebook) App Events — native only, fire-and-forget.
 *
 * Every export is a no-op in a browser and never throws or rejects, so a call site
 * can be a bare one-liner with no await/try. The native side is
 * MetaEventsPlugin.java, which re-checks the allowlists below before anything is sent.
 *
 * PRIVACY — the privacy policy and Play Data Safety answers depend on these rules:
 *  - Params are opaque ids or short enum words only. Never an email, phone, name,
 *    message text, user id, or coordinates. clean() drops any value that is not
 *    1-64 chars of [A-Za-z0-9_-], which also rejects anything with '@', '.' or spaces.
 *  - Adding an event or a param key means editing the allowlist in MetaEventsPlugin.java
 *    too, and the "Ad campaign measurement" privacy copy if the data category changes.
 *
 * Imports only @capacitor/core (not pushNotifications.js) so any module can import
 * this one without creating a cycle.
 */
import { registerPlugin } from '@capacitor/core'

const MetaEvents = registerPlugin('MetaEvents')

const native = () =>
    typeof window !== 'undefined' &&
    window.Capacitor !== undefined &&
    window.Capacitor.isNativePlatform()

const TOKEN = /^[A-Za-z0-9_-]{1,64}$/

const clean = (params) => {
    const out = {}
    for (const [k, v] of Object.entries(params || {})) {
        if (v == null) continue
        const s = String(v)
        if (TOKEN.test(s)) out[k] = s
    }
    return out
}

// Meta standard event names where one fits, otherwise a snake_case custom name.
const log = (name, params) => {
    if (!native()) return
    try {
        MetaEvents.logEvent({ name, params: clean(params) }).catch(() => {})
    } catch {
        // tracking must never break the app
    }
}

export const logSignUp = (method) =>
    log('fb_mobile_complete_registration', { fb_registration_method: method })

export const logLogin = (method) => log('login', { method })

export const logViewTown = (townId) =>
    log('fb_mobile_content_view', { fb_content_type: 'town', fb_content_id: townId })

export const logViewEvent = (eventId) =>
    log('fb_mobile_content_view', { fb_content_type: 'event', fb_content_id: eventId })

export const logFavoriteEvent = (eventId) =>
    log('fb_mobile_add_to_wishlist', { fb_content_type: 'event', fb_content_id: eventId })

export const logOpenTownChat = (townId) => log('open_town_chat', { town_id: townId })

export const logSendChatMessage = (townId) => log('send_chat_message', { town_id: townId })

export const logSetCurrentTown = (townId) => log('set_current_town', { town_id: townId })

export const logEnablePush = () => log('enable_push')
