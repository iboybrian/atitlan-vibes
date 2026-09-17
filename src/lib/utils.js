
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

// An event with no start_time sits at the end of its own day rather than the
// start of it. '99:99' beats any real HH:MM under string comparison.
const TIME_LAST = '99:99';

/**
 * Today as YYYY-MM-DD in Guatemala, which is what events.calendar_date means.
 *
 * Two wrong answers this avoids. toISOString().slice(0, 10) is UTC, and at UTC-6
 * that flips to tomorrow at 6pm local — today's events would vanish from the app
 * every single evening, exactly when people look for tonight's plan. The device
 * timezone is nearly right but not the same thing: a traveller whose phone is
 * still on European time would get someone else's "today" for events that happen
 * here. Guatemala has no daylight saving, so this offset never moves.
 *
 * en-CA is the locale that formats as YYYY-MM-DD, which is the shape the column
 * is already in.
 */
const EVENT_TIMEZONE = 'America/Guatemala';
const eventDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIMEZONE });

export function todayInGuatemala(now = new Date()) {
    return eventDateFormat.format(now);
}

/**
 * Weekday of a YYYY-MM-DD string, 0 = Sunday, matching events.recurring_days.
 *
 * Built and read in UTC on purpose. new Date('2026-08-30') parses as midnight
 * UTC, and getDay() then answers in the runner's timezone — west of Greenwich
 * that is the previous day, so the whole recurrence lands one day early.
 */
function weekdayOf(ymd) {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** YYYY-MM-DD n days later. Pure UTC, so toISOString() is safe here. */
function addDays(ymd, days) {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * When an event actually happens next, as YYYY-MM-DD.
 *
 * For a one-off that is just its calendar_date. For a series, calendar_date is
 * when the series STARTED and is usually in the past, so the real answer has to
 * be worked out from the weekdays it repeats on.
 *
 * Deliberately not stored: a nightly job rolling calendar_date forward would
 * take every recurring event down with it the first night it failed to run, and
 * silently.
 */
export function nextOccurrence(event, today = todayInGuatemala()) {
    const days = event.recurring_days;
    if (!days || days.length === 0) return event.calendar_date ?? null;

    // A series that has not started yet begins on its start date, not today.
    const from = event.calendar_date && event.calendar_date > today
        ? event.calendar_date
        : today;

    // Starts at 0: if today is one of the days, the answer is today. An event on
    // tonight has to read as today, not as next week.
    const weekday = weekdayOf(from);
    for (let i = 0; i < 7; i++) {
        if (days.includes((weekday + i) % 7)) return addDays(from, i);
    }

    return null;
}

/**
 * Weekday names indexed the same way as events.recurring_days, 0 = Sunday.
 *
 * Generated rather than added to locales.js: fourteen translation keys for
 * something every platform already knows is fourteen chances to typo. Anchored
 * to 2026-08-30, a Sunday, so index 0 lands on Sunday.
 */
export function weekdayNames(lang = 'en', weekday = 'short') {
    const format = new Intl.DateTimeFormat(lang === 'es' ? 'es-GT' : 'en-GB', {
        weekday,
        timeZone: 'UTC'
    });
    return Array.from({ length: 7 }, (_, i) =>
        format.format(new Date(Date.UTC(2026, 7, 30 + i))));
}

/**
 * The next occurrence as something to put on a card: "Sun 6 Sep".
 *
 * Returns null when there is no date to show, so the caller can fall back to
 * event_date_label. timeZone: 'UTC' because the Date is built in UTC above —
 * without it the formatter would shift it back a day west of Greenwich.
 */
export function formatOccurrence(event, lang = 'en', today = todayInGuatemala()) {
    const date = nextOccurrence(event, today);
    if (!date) return null;

    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-GT' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, day)));
}

// Sort buckets, lowest first. A town page shows every approved event, past ones
// included, so plain date-ascending would open on last March.
//
// UNDATED beats PAST on purpose. A null calendar_date is not missing data here —
// it is how the evergreen listings are entered ("Various / Ongoing": the butterfly
// farm, the market, a bar's permanent happy hour). Those are visitable today. An
// event that already happened is not, and never will be again, so it goes last.
const WHEN_TODAY = 0;
const WHEN_UPCOMING = 1;
const WHEN_UNDATED = 2;
const WHEN_PAST = 3;

/**
 * Sort order for a town's event list: today, then upcoming soonest-first, then
 * the undated evergreens, then past newest-first.
 *
 * Both columns are text in a sortable shape (date YYYY-MM-DD, time HH:MM:SS), so
 * string comparison is the right tool.
 *
 * Sorts on nextOccurrence(), not calendar_date, or a weekly event would sort by
 * the day its series started and sink to the bottom forever.
 */
export function compareEventsByWhen(a, b, today = todayInGuatemala()) {
    const dateA = nextOccurrence(a, today);
    const dateB = nextOccurrence(b, today);

    const rank = (date) =>
        !date ? WHEN_UNDATED
            : date === today ? WHEN_TODAY
                : date > today ? WHEN_UPCOMING : WHEN_PAST;

    const rankA = rank(dateA);
    const rankB = rank(dateB);
    if (rankA !== rankB) return rankA - rankB;

    // Undated events have nothing to sort by; leave them as they came.
    if (rankA === WHEN_UNDATED) return 0;

    const soonest = dateA === dateB
        ? (a.start_time || TIME_LAST).localeCompare(b.start_time || TIME_LAST)
        : dateA.localeCompare(dateB);

    // Past events read best newest-first: "last Friday" before "back in March".
    return rankA === WHEN_PAST ? -soonest : soonest;
}
