
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
