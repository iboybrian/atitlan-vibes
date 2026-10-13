/**
 * end_date cutoff: node scripts/check-end-date.mjs
 *
 * An event leaves every list the day after end_date, in Guatemala. Null
 * end_date is the old rows and must keep listing. The PostgREST clause and
 * the predicate have to agree, or a query and a client filter would diverge.
 *
 * Run under another TZ too. todayInGuatemala is pinned; a device-local today
 * would pass here only by luck.
 */
import assert from 'node:assert/strict'
import { isEventOngoing, ongoingEventsOr, todayInGuatemala } from '../src/lib/utils.js'

const TODAY = '2026-10-13'

assert.equal(ongoingEventsOr(TODAY), 'end_date.is.null,end_date.gte.2026-10-13')

// The clause is the predicate. Each case is a row the lists must keep or drop.
const cases = [
    [{}, true, 'missing end_date lists'],
    [{ end_date: null }, true, 'null end_date lists'],
    [{ end_date: TODAY }, true, 'last day still lists'],
    [{ end_date: '2026-10-14' }, true, 'future end lists'],
    [{ end_date: '2026-10-12' }, false, 'yesterday is over'],
    [{ end_date: '2026-10-12', recurring_days: [1], calendar_date: '2020-01-06' }, false, 'ended series drops'],
    [{ end_date: null, recurring_days: [1], calendar_date: '2020-01-06' }, true, 'open series stays']
]

for (const [event, expected, label] of cases) {
    assert.equal(isEventOngoing(event, TODAY), expected, label)
}

// String compare, not Date parse. A Date would land on the previous day west
// of Greenwich and flip both of these.

assert.equal(isEventOngoing({ end_date: '2026-12-31' }, '2027-01-01'), false, 'year boundary, already over')
assert.equal(isEventOngoing({ end_date: '2027-01-01' }, '2026-12-31'), true, 'year boundary, not yet')

// 8pm in Guatemala is still the 30th, though UTC has rolled to the 31st.
// toISOString().slice(0, 10) would hide today's events every evening.
const evening = new Date('2026-08-31T02:00:00Z')
assert.equal(
    ongoingEventsOr(todayInGuatemala(evening)),
    'end_date.is.null,end_date.gte.2026-08-30'
)
assert.equal(isEventOngoing({ end_date: '2026-08-30' }, todayInGuatemala(evening)), true)
assert.equal(isEventOngoing({ end_date: '2026-08-29' }, todayInGuatemala(evening)), false)

// Just before midnight Guatemala (06:00 UTC) is still the previous day.
const beforeMidnight = new Date('2026-08-30T05:59:00Z')
assert.equal(todayInGuatemala(beforeMidnight), '2026-08-29')
assert.equal(isEventOngoing({ end_date: '2026-08-29' }, todayInGuatemala(beforeMidnight)), true)

console.log('end-date ok')
