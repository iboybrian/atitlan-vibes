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
    if (await getPermissionStatus() !== 'granted') return

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

