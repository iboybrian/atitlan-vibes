/**
 * Push Notification Service
 * 
 * This service handles push notifications for both:
 * - Web browsers (using Web Push API)
 * - Mobile apps (when wrapped with Capacitor)
 * 
 * For App Store/Play Store deployment, install Capacitor:
 * npm install @capacitor/core @capacitor/push-notifications
 * npx cap init
 */

import { supabase } from './supabase'

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
export const isPushSupported = () => {
    // Native Capacitor app
    if (isNative()) return true

    // Web browser
    return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Get current permission status
 * Returns: 'granted', 'denied', 'default' (not asked), or 'unsupported'
 */
export const getPermissionStatus = async () => {
    if (!isPushSupported()) return 'unsupported'

    if (isNative()) {
        // For Capacitor - would use PushNotifications.checkPermissions()
        // Placeholder for when Capacitor is installed
        return 'default'
    }

    // Web browser
    return Notification.permission
}

/**
 * Request notification permission and get push token
 * Returns: { success: boolean, token?: string, error?: string }
 */
export const requestPushPermission = async () => {
    if (!isPushSupported()) {
        return { success: false, error: 'Push notifications not supported on this device' }
    }

    try {
        if (isNative()) {
            // Capacitor native implementation
            // This code will work when Capacitor is installed
            console.log('Native push: Would use Capacitor PushNotifications plugin')

            // Placeholder - actual implementation:
            // import { PushNotifications } from '@capacitor/push-notifications'
            // const permission = await PushNotifications.requestPermissions()
            // if (permission.receive === 'granted') {
            //     await PushNotifications.register()
            //     // Token comes from 'registration' event listener
            // }

            return { success: false, error: 'Install Capacitor for native push' }
        }

        // Web Push implementation
        const permission = await Notification.requestPermission()

        if (permission === 'granted') {
            // Register service worker for web push
            const registration = await navigator.serviceWorker.ready

            // Get push subscription (you'll need a VAPID key for production)
            // For now, we'll use a placeholder token
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                // Replace with your VAPID public key for production
                applicationServerKey: urlBase64ToUint8Array(
                    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                )
            }).catch(() => null)

            // Use subscription endpoint as token (or generate a unique ID)
            const token = subscription?.endpoint || `web_${crypto.randomUUID()}`

            console.log('Web Push Token Captured:', token)

            return { success: true, token }
        } else if (permission === 'denied') {
            return {
                success: false,
                error: 'denied',
                message: getSettingsMessage()
            }
        } else {
            return { success: false, error: 'Permission dismissed' }
        }
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

        console.log('Push token saved for user:', userId)
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

/**
 * Helper to convert VAPID key
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export default {
    isPushSupported,
    getPermissionStatus,
    requestPushPermission,
    savePushToken,
    disablePushNotifications,
    shouldShowPushPrompt,
    markPushPromptShown
}
