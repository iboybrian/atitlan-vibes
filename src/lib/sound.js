/**
 * The mascot's coo (public/coo.mp3). Plays on a handful of moments — posting,
 * saving, picking a town, the login nudge, a push landing in the foreground —
 * never on every tap, or people mute the app.
 *
 * Only ever called from a user gesture or a push event, so Android's autoplay
 * block doesn't apply. Preference is per device, in localStorage.
 */
const KEY = 'sound_enabled'
let audio = null

export const isSoundOn = () => {
    try { return localStorage.getItem(KEY) !== 'false' } catch { return true }
}

export const setSoundOn = (on) => {
    try { localStorage.setItem(KEY, String(on)) } catch { /* private mode: stays on */ }
}

export function coo() {
    if (!isSoundOn()) return
    // One element, reused: a new Audio per call re-fetches on some WebViews and
    // stacks overlapping coos on a double tap.
    audio ??= new Audio('/coo.mp3')
    audio.currentTime = 0
    audio.play().catch(() => { }) // blocked or missing file: stay silent, never throw
}
