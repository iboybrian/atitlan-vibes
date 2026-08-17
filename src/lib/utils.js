
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
