/**
 * Now page helpers: node scripts/check-now-filters.mjs
 *
 * The "Live now / In 6 h" line and the time chips are date maths in Guatemala
 * time. Run it under a couple of TZ= values: a phone's own clock must never leak in.
 */
import assert from 'node:assert/strict'
import { startsIn, timeFilter, dayGroup, matchesSearch, placeLine } from '../src/lib/utils.js'

// 2026-10-31 is a Saturday. 20:00 UTC = 14:00 in Guatemala (UTC-6, no DST).
const SAT = '2026-10-31'
const WED = '2026-10-28'
const now = new Date('2026-10-31T20:00:00Z')
const at = (start_time, calendar_date = SAT) => ({ calendar_date, start_time })

// startsIn: minutes ahead, live for 3h after the start, then nothing.
assert.equal(startsIn(at('20:00:00'), now), 360)
assert.equal(startsIn(at('14:01:00'), now), 1)
assert.equal(startsIn(at('14:00:00'), now), 'live')
assert.equal(startsIn(at('11:30:00'), now), 'live')
assert.equal(startsIn(at('10:00:00'), now), null)
assert.equal(startsIn(at(null), now), null)
assert.equal(startsIn(at('20:00:00', '2026-11-01'), now), null)
// A weekly Saturday class whose series started in May is on today.
assert.equal(startsIn({ calendar_date: '2026-05-02', recurring_days: [6], start_time: '18:00' }, now), 240)

// Time chips.
const oneOff = (calendar_date) => ({ calendar_date })
assert.equal(timeFilter(oneOff(SAT), 'today', SAT), true)
assert.equal(timeFilter(oneOff('2026-11-01'), 'today', SAT), false)
assert.equal(timeFilter(oneOff('2026-11-06'), 'week', SAT), true)
assert.equal(timeFilter(oneOff('2026-11-07'), 'week', SAT), false)
// Saturday: the weekend is today and tomorrow.
assert.equal(timeFilter(oneOff('2026-11-01'), 'weekend', SAT), true)
assert.equal(timeFilter(oneOff('2026-11-06'), 'weekend', SAT), false)
// Wednesday: the weekend is the coming Fri-Sun, not today.
assert.equal(timeFilter(oneOff(WED), 'weekend', WED), false)
assert.equal(timeFilter(oneOff('2026-10-30'), 'weekend', WED), true)
assert.equal(timeFilter(oneOff('2026-11-01'), 'weekend', WED), true)
assert.equal(timeFilter(oneOff('2026-11-02'), 'weekend', WED), false)
// A Mon+Sat series is on this weekend even though its next date (from Wed) is Saturday.
assert.equal(timeFilter({ calendar_date: '2026-05-04', recurring_days: [1, 6] }, 'weekend', WED), true)
// A Monday-only series is not.
assert.equal(timeFilter({ calendar_date: '2026-05-04', recurring_days: [1] }, 'weekend', WED), false)
// Undated evergreens match no date chip.
assert.equal(timeFilter({ calendar_date: null }, 'week', SAT), false)
// Free.
assert.equal(timeFilter({ cost: null }, 'free'), true)
assert.equal(timeFilter({ cost: 'Free' }, 'free'), true)
assert.equal(timeFilter({ cost: 'GTQ 0' }, 'free'), true)
assert.equal(timeFilter({ cost: 'GTQ 50' }, 'free'), false)
assert.equal(timeFilter({ cost: 'Contact Venue' }, 'free'), false)

// Day groups.
assert.equal(dayGroup(oneOff(SAT), SAT), 'today')
assert.equal(dayGroup(oneOff('2026-11-01'), SAT), 'tomorrow')
assert.equal(dayGroup(oneOff('2026-11-03'), SAT), '2026-11-03')
assert.equal(dayGroup(oneOff('2026-10-20'), SAT), 'past')
assert.equal(dayGroup(oneOff(null), SAT), 'ongoing')

// Search.
const ev = { name: 'Halloween Party', venue: 'Socialtel', description: null }
assert.equal(matchesSearch(ev, '  hallo '), true)
assert.equal(matchesSearch(ev, 'socialtel'), true)
assert.equal(matchesSearch(ev, 'yoga'), false)
assert.equal(matchesSearch(ev, ''), true)

// Venue line: the town only once.
assert.equal(placeLine('Amaranto Hostel, Panajachel', 'Panajachel'), 'Amaranto Hostel, Panajachel')
assert.equal(placeLine('Socialtel', 'Panajachel'), 'Socialtel · Panajachel')
assert.equal(placeLine(null, 'Panajachel'), 'Panajachel')
assert.equal(placeLine('Socialtel', ''), 'Socialtel')

console.log('now filters ok')
