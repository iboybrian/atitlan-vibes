/**
 * Who counts as "in this town" for a push.
 *
 * Plain .js on purpose: index.ts (Deno) imports it, and
 * scripts/check-targeting.mjs runs it under bare node. One source of truth for
 * a rule that decides who got paid-for reach — worth the extra file.
 *
 * Two independent signals, either one is enough:
 *
 *   detected_town_id  where geolocation last put them. Counts for 72h. Every
 *                     app open refreshes it, so it only ages out once they
 *                     actually leave.
 *   current_town_id   what they picked in TownPicker. Counts for 7 days — a
 *                     stated preference goes stale, just slower than a GPS fix.
 *
 * The one asymmetry, and it is deliberate: an EXPIRED pick still counts when
 * there is no fresh detection. A user with location off has nothing else, and a
 * rule that silences them completely is worse than one that occasionally
 * notifies someone who moved. The 7-day window exists to break ties against a
 * live location, not to mute people.
 */

export const DETECTED_FRESH_MS = 72 * 60 * 60 * 1000
export const PICK_FRESH_MS = 7 * 24 * 60 * 60 * 1000

/**
 * @param {{current_town_id?: number|null, detected_town_id?: number|null,
 *          detected_at?: string|null, current_town_set_at?: string|null}} user
 * @param {number} townId
 * @param {number} [now] epoch ms, injectable so the check can age rows
 */
export function isInTown(user, townId, now = Date.now()) {
    const detectedFresh =
        user.detected_town_id === townId &&
        user.detected_at != null &&
        Date.parse(user.detected_at) > now - DETECTED_FRESH_MS

    if (detectedFresh) return true

    if (user.current_town_id !== townId) return false

    // No timestamp means a pick that predates this column, or one we failed to
    // stamp. Counting it is the safe direction.
    if (user.current_town_set_at == null) return true
    if (Date.parse(user.current_town_set_at) > now - PICK_FRESH_MS) return true

    // Pick is stale. It still counts unless a live fix says they are elsewhere.
    return !(
        user.detected_at != null &&
        Date.parse(user.detected_at) > now - DETECTED_FRESH_MS
    )
}
