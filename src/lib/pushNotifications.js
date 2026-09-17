/**
 * Push Notification Service — native (Capacitor/Android) only.
 *
 * FCM delivers the message, Supabase stores the device token on users.push_token.
 * Web push is deliberately off: isPushSupported() is false in a browser, so the
 * soft prompt never shows and no tokens get written. Doing it properly needs a
 * service worker plus real VAPID keys and a sender — none of which exist here.
 */

import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'
import { t } from './i18n'

// Play Services can hang; don't leave the modal spinning forever
const REGISTER_TIMEOUT_MS = 10000

// Check if we're running in a Capacitor native app
export const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform()
}

/**
 * Check if push notifications are supported
 */
export const isPushSupported = () => isNative()

/**
 * Get current permission status
 * Returns: 'granted', 'denied', 'default' (not asked), or 'unsupported'
 */
export const getPermissionStatus = async () => {
    if (!isPushSupported()) return 'unsupported'

    try {
        const { receive } = await PushNotifications.checkPermissions()
        return receive === 'granted' || receive === 'denied' ? receive : 'default'
    } catch (err) {
        console.error('Push permission check error:', err)
        return 'unsupported'
    }
}

/**
 * Register with FCM and wait for the token.
 * register() resolves before the token exists — it arrives on the 'registration'
 * event — so listeners are attached first and the promise settles from there.
 */
const registerForToken = async () => {
    let finish
    const token = new Promise((resolve) => { finish = resolve })

    const handles = await Promise.all([
        PushNotifications.addListener('registration', (t) =>
            finish({ success: true, token: t.value })),
        PushNotifications.addListener('registrationError', (e) =>
            finish({ success: false, error: e.error || t('push.registerFailed') }))
    ])

    const timer = setTimeout(() =>
        finish({ success: false, error: t('push.timeout') }),
        REGISTER_TIMEOUT_MS)

    try {
        await PushNotifications.register()
        return await token
    } finally {
        clearTimeout(timer)
        await Promise.all(handles.map((h) => h.remove()))
    }
}

/**
 * Request notification permission and get push token
 * Returns: { success: boolean, token?: string, error?: string }
 */
export const requestPushPermission = async () => {
    if (!isPushSupported()) {
        return { success: false, error: t('push.nativeOnly') }
    }

    try {
        const { receive } = await PushNotifications.requestPermissions()

        if (receive === 'denied') {
            // Android only — isPushSupported() is isNative(), and this build ships
            // no iOS target, so there is no other platform to branch on.
            return { success: false, error: 'denied', message: t('push.settingsAndroid') }
        }
        if (receive !== 'granted') {
            return { success: false, error: t('push.dismissed') }
        }

        return await registerForToken()
    } catch (err) {
        console.error('Push permission error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Save push token to Supabase users table
 */
export const savePushToken = async (userId, token) => {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                push_token: token,
                push_enabled: true
            })
            .eq('id', userId)

        if (error) {
            console.error('Error saving push token:', error)
            return false
        }

        return true
    } catch (err) {
        console.error('Save token error:', err)
        return false
    }
}

/**
 * Disable push notifications for user
 */
export const disablePushNotifications = async (userId) => {
    try {
        const { error } = await supabase
            .from('users')
            .update({
                push_enabled: false
            })
            .eq('id', userId)

        if (error) {
            console.error('Error disabling push:', error)
            return false
        }

        return true
    } catch (err) {
        console.error('Disable push error:', err)
        return false
    }
}

/**
 * Flip the user's push preference end to end.
 * ON asks for permission and stores a fresh token, OFF just clears the flag.
 * Returns the same shape as requestPushPermission so callers can show the reason.
 */
export const setPushPreference = async (userId, enabled) => {
    if (!enabled) {
        const ok = await disablePushNotifications(userId)
        return ok ? { success: true } : { success: false, error: t('push.savePrefs') }
    }

    const result = await requestPushPermission()
    if (!result.success) return result

    const saved = await savePushToken(userId, result.token)
    return saved ? { success: true } : { success: false, error: t('push.savePrefs') }
}

/**
 * FCM rotates tokens, so a token captured once goes stale and delivery silently
 * stops. Call on launch: re-registers and refreshes the stored token without
 * showing any dialog. No-op unless the user already granted and opted in.
 */
export const refreshPushToken = async (userId) => {
    if (!userId || !isPushSupported()) return

    if (await getPermissionStatus() !== 'granted') {
        // Android lets the user revoke notifications in Settings long after they
        // opted in here. The FCM token stays valid when that happens, so FCM keeps
        // answering 200 and notify-town keeps counting the send — the user is
        // unreachable and nothing anywhere says so. Clearing the flag is what makes
        // the DB stop lying: same two-gate rule geolocation already follows with
        // location_enabled, which push had the column for but never enforced.
        //
        // The .eq('push_enabled', true) makes it a no-op for the many users who
        // never opted in at all, so this costs nothing on a normal launch.
        await supabase
            .from('users')
            .update({ push_enabled: false })
            .eq('id', userId)
            .eq('push_enabled', true)
        return
    }

    const { data } = await supabase
        .from('users')
        .select('push_enabled')
        .eq('id', userId)
        .single()

    if (!data?.push_enabled) return

    const result = await registerForToken()
    if (!result.success) return

    // push_token only — savePushToken would flip push_enabled back on
    const { error } = await supabase
        .from('users')
        .update({ push_token: result.token })
        .eq('id', userId)

    // Silent failure here means pushes stop arriving with no symptom. Say something.
    if (error) console.error('Push token refresh failed to save:', error)
}

/**
 * One-shot flag for the soft prompt.
 *
 * Bumped to _v2 when the prompt started asking for location too: every existing
 * user has the v1 key set, would never see the modal again, and location
 * adoption would start at zero. Re-showing is cheap — requestPushPermission()
 * on an already-granted permission returns without a dialog, so those users
 * effectively get a location-only prompt.
 */
const PROMPT_KEY = 'push_prompt_shown_v2'

export const shouldShowPushPrompt = () => !localStorage.getItem(PROMPT_KEY)

export const markPushPromptShown = () => {
    localStorage.setItem(PROMPT_KEY, 'true')
}

/**
 * Tapping a push opens the event it is about.
 *
 * Split in two because of a race: a tap can cold-start the app, and the plugin
 * fires the event while Android is still building the activity — before React
 * has mounted, so a listener registered in a useEffect misses it. Same reason
 * the OAuth deep link is registered at module scope in main.jsx.
 *
 * So startPushTapListener() runs at module scope and buffers, and whatever can
 * actually navigate claims the tap later with onPushTap().
 */
let pendingEventId = null
let tapHandler = null

export const startPushTapListener = () => {
    if (!isPushSupported()) return

    PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        // notify-town sends data.eventId on every push, manual blast included.
        const id = notification?.data?.eventId
        if (!id) return

        if (tapHandler) tapHandler(id)
        else pendingEventId = id
    })
}

/**
 * Claim push taps. Fires immediately if one arrived before React was ready.
 * Returns an unsubscribe for the effect cleanup.
 */
export const onPushTap = (handler) => {
    tapHandler = handler

    if (pendingEventId) {
        const id = pendingEventId
        pendingEventId = null
        handler(id)
    }

    return () => { tapHandler = null }
}


/**
 * A push that lands while the app is open on screen.
 *
 * Android does not draw a tray notification for the foreground app when the
 * payload carries a `notification` block — and notify-town always sends one. So
 * without this the message is delivered and silently discarded: FCM answers 200,
 * the function counts it in `sent`, and the user sees nothing. That is the whole
 * bug this exists to close.
 *
 * No module-scope buffering here, unlike startPushTapListener(): a foreground
 * push means React is already mounted by definition, so there is no cold-start
 * race to lose the event to.
 *
 * Returns an unsubscribe for the effect cleanup.
 */
export const onPushReceived = (handler) => {
    if (!isPushSupported()) return () => { }

    const handle = PushNotifications.addListener(
        'pushNotificationReceived',
        ({ title, body, data }) => handler({ title, body, eventId: data?.eventId })
    )

    return () => { handle.then((h) => h.remove()) }
}
