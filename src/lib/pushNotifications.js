/**
 * Push Notification Service — native (Capacitor/Android) only.
 *
 * FCM delivers the message, Supabase stores the device token on users.push_token.
 * Web push is deliberately off: isPushSupported() is false in a browser, so the
 * soft prompt never shows and no tokens get written. public/sw.js is left in
 * place for whenever web push is worth doing properly (real VAPID keys + a sender).
 */

import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'

// Play Services can hang; don't leave the modal spinning forever
const REGISTER_TIMEOUT_MS = 10000

// Check if we're running in a Capacitor native app
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform()
}

// Check if running on iOS
const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Check if running on Android
const isAndroid = () => {
    return /Android/.test(navigator.userAgent)
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
            finish({ success: false, error: e.error || 'Could not register for notifications' }))
    ])

    const timer = setTimeout(() =>
        finish({ success: false, error: 'Timed out getting a notification token. Check your connection.' }),
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
        return { success: false, error: 'Push notifications are only available in the mobile app' }
    }

    try {
        const { receive } = await PushNotifications.requestPermissions()

        if (receive === 'denied') {
            return { success: false, error: 'denied', message: getSettingsMessage() }
        }
        if (receive !== 'granted') {
            return { success: false, error: 'Permission dismissed' }
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
        return ok ? { success: true } : { success: false, error: 'Could not save your preferences' }
    }

    const result = await requestPushPermission()
    if (!result.success) return result

    const saved = await savePushToken(userId, result.token)
    return saved ? { success: true } : { success: false, error: 'Could not save your preferences' }
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
 * Check if we should show the soft prompt
 */
export const shouldShowPushPrompt = () => {
    // Check localStorage to see if prompt was already shown
    const prompted = localStorage.getItem('push_prompt_shown')
    return !prompted
}

/**
 * Mark that we've shown the soft prompt
 */
export const markPushPromptShown = () => {
    localStorage.setItem('push_prompt_shown', 'true')
}

/**
 * Get platform-specific settings message
 */
const getSettingsMessage = () => {
    if (isIOS()) {
        return 'To enable notifications, go to Settings → Atitlán Vibes → Notifications → Allow Notifications'
    } else if (isAndroid()) {
        return 'To enable notifications, go to Settings → Apps → Atitlán Vibes → Notifications → Enable'
    } else {
        return 'To enable notifications, click the lock icon in your browser address bar and allow notifications for this site.'
    }
}

export default {
    isPushSupported,
    getPermissionStatus,
    requestPushPermission,
    savePushToken,
    disablePushNotifications,
    setPushPreference,
    refreshPushToken,
    shouldShowPushPrompt,
    markPushPromptShown
}
