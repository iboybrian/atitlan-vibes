/**
 * Google Play in-app updates — native only, Android only.
 *
 * Play's own auto-update only runs on Wi-Fi, charging, idle, and only if the
 * user left "auto-update apps" on, so plenty of phones sit on old versions for
 * weeks. This asks Play on launch and resume whether a newer version is out and
 * lets Layout offer it in-app:
 *
 *  - 'available'  → banner; "Update" starts a FLEXIBLE update: Play downloads
 *                   it in the background while the app stays usable.
 *  - 'downloaded' → banner; "Restart" installs it (completeFlexibleUpdate).
 *  - Priority 4–5 → IMMEDIATE: Play's full-screen updater, no banner. Priority
 *                   can only be set through the Play Developer API (not the
 *                   Console UI) — it's the switch for a must-update release.
 *
 * Only works on a build installed from Play (internal testing counts); a
 * sideloaded/debug APK always reports "no update".
 */
import {
    AppUpdate,
    AppUpdateAvailability,
    AppUpdateResultCode,
    FlexibleUpdateInstallStatus
} from '@capawesome/capacitor-app-update'
import { isNative } from './pushNotifications'

const FORCE_PRIORITY = 4

/** Resolves to 'available' | 'downloaded' | null. Never throws. */
export async function checkForUpdate() {
    if (!isNative()) return null
    try {
        const info = await AppUpdate.getAppUpdateInfo()

        // Downloaded on an earlier run but never installed.
        if (info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) return 'downloaded'
        if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return null

        if ((info.updatePriority ?? 0) >= FORCE_PRIORITY && info.immediateUpdateAllowed) {
            await AppUpdate.performImmediateUpdate()
            return null
        }
        return 'available'
    } catch (err) {
        // Not installed from Play, Play Services missing, offline… nothing to offer.
        console.warn('Update check failed:', err?.message ?? err)
        return null
    }
}

/**
 * The user tapped "Update". Starts the background download and calls
 * onDownloaded once it's ready to install. Falls back to the Play listing when
 * Play won't run an in-app flow for this install.
 *
 * Resolves false if the user backed out of Play's confirmation dialog, so the
 * banner can go back to offering the update instead of "downloading" forever.
 */
export async function startUpdate(onDownloaded) {
    try {
        const info = await AppUpdate.getAppUpdateInfo()
        if (info.flexibleUpdateAllowed) {
            const handle = await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
                const s = state.installStatus
                if (s === FlexibleUpdateInstallStatus.DOWNLOADED) onDownloaded()
                if (s === FlexibleUpdateInstallStatus.DOWNLOADED || s === FlexibleUpdateInstallStatus.CANCELED || s === FlexibleUpdateInstallStatus.FAILED) {
                    handle.remove()
                }
            })
            const { code } = await AppUpdate.startFlexibleUpdate()
            if (code === AppUpdateResultCode.OK) return true
            handle.remove()
            return false
        }
        if (info.immediateUpdateAllowed) {
            const { code } = await AppUpdate.performImmediateUpdate()
            return code === AppUpdateResultCode.OK
        }
    } catch (err) {
        console.warn('In-app update failed, opening Play:', err?.message ?? err)
    }
    await AppUpdate.openAppStore().catch(() => {})
    return false
}

/** Installs a downloaded update. The app restarts. */
export const installUpdate = () => AppUpdate.completeFlexibleUpdate().catch(() => {})
