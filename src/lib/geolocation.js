/**
 * Coarse location — native (Capacitor/Android) only, foreground only.
 *
 * Reads approximate location while the app is open, works out the nearest town
 * ON THE DEVICE, and stores only that town id on users.detected_town_id. The
 * coordinates never leave the phone — that is deliberate, and it is what the
 * privacy copy and the Play Data Safety answers both rest on.
 *
 * Nothing here runs in the background: no ACCESS_BACKGROUND_LOCATION, no
 * foreground service, so no Location Permissions declaration form.
 *
 * detected_town_id is what notify-town targets while it is fresh (24h). The town
 * the user picked in TownPicker still drives everything they SEE, and takes over
 * targeting again once a detection goes stale.
 *
 * Shape mirrors pushNotifications.js on purpose — same permission states, same
 * { success, error, message } returns, same silent refresh-on-mount contract.
 */

import { Geolocation } from '@capacitor/geolocation'
import { supabase } from './supabase'
import { isNative } from './pushNotifications'
import { fetchTowns } from './towns'
import { nearestTown } from './utils'
import { t } from './i18n'

const POSITION_TIMEOUT_MS = 10000

// The app can sit open for days and resume fires constantly. One fix per half
// hour is plenty to keep a 24h freshness window honest.
const REFRESH_INTERVAL_MS = 30 * 60 * 1000
let lastRun = 0

export const isLocationSupported = () => isNative()

/**
 * Current permission state without ever showing a dialog.
 * Returns: 'granted', 'denied', 'default' (not asked), or 'unsupported'
 */
export const getLocationPermissionStatus = async () => {
    if (!isLocationSupported()) return 'unsupported'

    try {
        const perms = await Geolocation.checkPermissions()
        // We only ever request coarse, but the plugin reports both and older
        // Android levels fill in `location` instead.
        const state = perms.coarseLocation ?? perms.location
        return state === 'granted' || state === 'denied' ? state : 'default'
    } catch (err) {
        console.error('Location permission check error:', err)
        return 'unsupported'
    }
}

/**
 * Fix -> nearest town -> one column. The only writer of these columns.
 * Throws if no fix is available; callers decide whether that matters.
 */
const detectAndSave = async (userId) => {
    const [position, towns] = await Promise.all([
        Geolocation.getCurrentPosition({
            enableHighAccuracy: false,      // coarse is all the manifest declares
            timeout: POSITION_TIMEOUT_MS,
            maximumAge: REFRESH_INTERVAL_MS // a recent cached fix is fine, don't wake the radio
        }),
        fetchTowns()
    ])

    const town = nearestTown(position.coords.latitude, position.coords.longitude, towns)

    // Out of range writes nulls rather than skipping the update. A fresh
    // detected_at with no town would drop the user out of BOTH branches of the
    // notify-town query; nulls send them back to their picked town instead.
    const { error } = await supabase
        .from('users')
        .update({
            detected_town_id: town?.id ?? null,
            detected_at: town ? new Date().toISOString() : null
        })
        .eq('id', userId)

    if (error) console.error('Could not save detected town:', error)
}

/**
 * Flip the user's location preference end to end — the single entry point
 * Settings uses. Same return shape as setPushPreference.
 */
export const setLocationPreference = async (userId, enabled) => {
    if (!enabled) {
        // Clear the detection too, or a stale one keeps overriding the picked
        // town for up to 24h after the user opted out.
        const { error } = await supabase
            .from('users')
            .update({ location_enabled: false, detected_town_id: null, detected_at: null })
            .eq('id', userId)

        if (error) {
            console.error('Error disabling location:', error)
            return { success: false, error: t('loc.savePrefs') }
        }
        return { success: true }
    }

    if (!isLocationSupported()) return { success: false, error: t('loc.nativeOnly') }

    try {
        const perms = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] })
        const state = perms.coarseLocation ?? perms.location

        if (state !== 'granted') {
            // Android only — isLocationSupported() is isNative() and this build
            // ships no iOS target, so there is no other platform to branch on.
            return { success: false, error: 'denied', message: t('loc.settingsAndroid') }
        }

        const { error } = await supabase
            .from('users')
            .update({ location_enabled: true })
            .eq('id', userId)

        if (error) {
            console.error('Error saving location preference:', error)
            return { success: false, error: t('loc.savePrefs') }
        }

        // Don't make them wait up to half an hour for the first detection
        await detectAndSave(userId)
        return { success: true }
    } catch (err) {
        console.error('Location permission error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Called on Layout mount and whenever the app comes back to the foreground.
 * Silent by construction: no-ops unless the OS already granted AND the user
 * opted in, so it can never raise a dialog. Same contract as refreshPushToken().
 *
 * Both gates matter. Android keeps reporting 'granted' after the user turns the
 * feature off in Settings, so without location_enabled the toggle would silently
 * undo itself at the next app open.
 */
export const refreshDetectedTown = async (userId) => {
    if (!userId || !isLocationSupported()) return
    if (Date.now() - lastRun < REFRESH_INTERVAL_MS) return
    if (await getLocationPermissionStatus() !== 'granted') return

    const { data } = await supabase
        .from('users')
        .select('location_enabled')
        .eq('id', userId)
        .single()

    if (!data?.location_enabled) return

    lastRun = Date.now()

    try {
        await detectAndSave(userId)
    } catch (err) {
        // No fix is normal around the lake — cell and wifi coverage is patchy in
        // several villages. The last detection stands until it ages out and the
        // picked town takes over, so this is not worth surfacing.
        console.warn('Location refresh skipped:', err.message)
    }
}
