/**
 * Recurring events: node scripts/check-recurrence.mjs
 *
 * Weekday arithmetic across a timezone boundary is the classic off-by-one, and
 * it does not show up running once in Guatemala — run this under TZ=Asia/Tokyo
 * and TZ=Europe/Madrid too. Works under bare node because src/lib/utils.js
 * imports nothing.
 */
import assert from 'node:assert/strict'
import { nextOccurrence, compareEventsByWhen } from '../src/lib/utils.js'

// 2026-08-30 is a Sunday. Every case below is anchored to that.
const SUNDAY = '2026-08-30'
const MONDAY = '2026-08-31'
const TUESDAY = '2026-09-01'

const SUN = 0, MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6

const next = (recurring_days, today, calendar_date = '2026-01-04') =>
    nextOccurrence({ recurring_days, calendar_date }, today)

// A one-off is just its own date, whatever "today" is.
assert.equal(nextOccurrence({ calendar_date: '2026-03-01' }, SUNDAY), '2026-03-01')
assert.equal(nextOccurrence({ calendar_date: '2026-03-01', recurring_days: null }, SUNDAY), '2026-03-01')
assert.equal(nextOccurrence({ calendar_date: null }, SUNDAY), null, 'undated stays undated')

// Today IS the day: answer is today, not next week. An event on tonight has to
// show as today or the whole feature reads as broken.
assert.equal(next([SUN], SUNDAY), SUNDAY, 'sunday event, asked on a sunday')

// The full wrap: a Sunday event asked on Monday is 6 days out, not -1 or 7.
assert.equal(next([SUN], MONDAY), '2026-09-06')

// Nearest of several, not the first in the array. Mon/Wed/Fri asked on Tuesday
// must be Wednesday — this breaks if the loop returns on days[0].
assert.equal(next([MON, WED, FRI], TUESDAY), '2026-09-02', 'wednesday')
assert.equal(next([FRI, WED, MON], TUESDAY), '2026-09-02', 'array order must not matter')

// Every weekday from every starting point resolves to itself or later, never
// earlier. Catches a sign flip in the modulo.
for (const day of [SUN, MON, TUE, WED, THU, FRI, SAT]) {
    const result = next([day], SUNDAY)
    assert.ok(result >= SUNDAY, `${day} resolved to ${result}, before today`)
}

// Daily event is always today.
assert.equal(next([SUN, MON, TUE, WED, THU, FRI, SAT], TUESDAY), TUESDAY)

// A series whose start date is still in the future begins there, not today.
assert.equal(
    nextOccurrence({ recurring_days: [MON], calendar_date: '2026-12-01' }, SUNDAY),
    '2026-12-07',
    'first monday on or after the start date'
)
// ...and one that started long ago ignores the start date entirely. This is the
// case that is broken today.
assert.equal(
    nextOccurrence({ recurring_days: [SUN], calendar_date: '2025-01-05' }, MONDAY),
    '2026-09-06'
)

// Degenerate input must not throw or invent a date.
assert.equal(nextOccurrence({ recurring_days: [], calendar_date: '2026-03-01' }, SUNDAY), '2026-03-01')
assert.equal(nextOccurrence({ recurring_days: [], calendar_date: null }, SUNDAY), null)

// Month and year rollover.
assert.equal(next([TUE], '2026-12-31'), '2027-01-05', 'crosses into the next year')
assert.equal(next([WED], '2026-02-26'), '2026-03-04', 'crosses a short month')

// Sorting: a weekly event whose series started last year must outrank a one-off
// next month. Before this, it sorted on its 2025 start date and sank to the end.
const weekly = { id: 'weekly', recurring_days: [MON], calendar_date: '2025-01-06' }
const oneOff = { id: 'one-off', calendar_date: '2026-09-20' }
const stale = { id: 'stale', calendar_date: '2026-08-01' }
assert.deepEqual(
    [stale, oneOff, weekly].sort((a, b) => compareEventsByWhen(a, b, SUNDAY)).map(e => e.id),
    ['weekly', 'one-off', 'stale'],
    'recurring is upcoming, not past'
)

console.log('recurrence ok')
