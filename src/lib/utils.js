
/**
 * Converts various image URL formats (Google Drive, Dropbox) to direct displayable links.
 * @param {string} url - The raw image URL from the database
 * @returns {string} - THe direct link usable in <img src>
 */
export function getDirectImageUrl(url) {
    if (!url) return 'https://via.placeholder.com/800x600?text=No+Image';

    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
        // Extract ID
        const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
        const id = match ? (match[1] || match[2]) : null;
        if (id) {
            // Use the /uc?export=view format which is more reliable for direct embedding
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }
    }

    // Handle Dropbox links
    if (url.includes('dropbox.com')) {
        return url.replace('?dl=0', '?raw=1');
    }

    return url;
}

// Coarse location is good to ~1.5 km and the whole lake is ~18 km across, so a
// 25 km radius covers the basin from any of the three lake towns and still keeps
// Antigua and Guatemala City (25 km apart) resolving to the nearer one. Past it
// the user is not in any town we cover — Xela, home, a plane.
const MAX_TOWN_KM = 25;
const KM_PER_DEG = 111.32;

/**
 * Nearest town to a coordinate, or null if nothing is within maxKm.
 *
 * Equirectangular, not haversine: at 14.7°N over a ~30 km span the flat-earth
 * approximation is off by well under a metre and the towns are kilometres apart.
 * No poles, no antimeridian. Squared distances so there is one sqrt, and only
 * for the range guard.
 *
 * Pure and import-free on purpose — scripts/check-nearest-town.mjs runs this
 * file directly under bare node. Don't add an import to utils.js without moving
 * that script.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array<{id: number, name: string, lat: number|null, lng: number|null}>} towns
 * @returns {object | null}
 */
export function nearestTown(lat, lng, towns, maxKm = MAX_TOWN_KM) {
    const cos = Math.cos(lat * Math.PI / 180);
    let best = null;
    let bestD2 = Infinity;

    for (const town of towns) {
        if (town.lat == null || town.lng == null) continue; // coordinates not seeded
        const dx = (town.lng - lng) * cos;
        const dy = town.lat - lat;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = town; }
    }

    // An empty list falls out here for free: sqrt(Infinity) > maxKm
    return Math.sqrt(bestD2) * KM_PER_DEG <= maxKm ? best : null;
}

const CURRENT_TOWN_KEY = 'current_town';

/**
 * The town the user picked in TownPicker — their "where I am" without asking for GPS.
 * Device-local mirror of users.current_town_id so it also works logged out.
 * @returns {{id: number, name: string} | null}
 */
export function getCurrentTown() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_TOWN_KEY));
    } catch {
        return null; // a corrupt value shouldn't take the page down
    }
}

export function setCurrentTown(town) {
    if (!town?.id) return;
    localStorage.setItem(CURRENT_TOWN_KEY, JSON.stringify({ id: town.id, name: town.name }));
}

const TOUR_KEY = 'tour_done';

/**
 * First-run guided tour flag, same one-shot shape as push_prompt_shown in
 * pushNotifications.js. Device-scoped, not per-user.
 */
export function shouldShowTour() {
    return !localStorage.getItem(TOUR_KEY);
}

export function markTourDone() {
    localStorage.setItem(TOUR_KEY, 'true');
}
