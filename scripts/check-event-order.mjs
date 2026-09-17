/**
 * Event ordering for a town page: node scripts/check-event-order.mjs
 *
 * Date bucketing is the kind of thing that looks right in August and breaks on
 * the 1st of the month, so it gets a check. Same trick as the other two — it
 * runs under bare node only because src/lib/utils.js imports nothing.
 */
import assert from 'node:assert/strict'
import { compareEventsByWhen, todayInGuatemala } from '../src/lib/utils.js'

const TODAY = '2026-08-30'

const ev = (id, calendar_date, start_time = null) => ({ id, calendar_date, start_time })
const order = (list) => list.slice().sort((a, b) => compareEventsByWhen(a, b, TODAY)).map(e => e.id)

// Today, then upcoming soonest-first, then undated, then past newest-first.
assert.deepEqual(order([
    ev('past-old', '2026-03-01'),
    ev('future-far', '2026-12-25'),
    ev('undated', null),
    ev('today', TODAY),
    ev('past-recent', '2026-08-28'),
    ev('future-near', '2026-08-31')
]), ['today', 'future-near', 'future-far', 'undated', 'past-recent', 'past-old'])

// The reason undated outranks past: a null calendar_date is how the evergreen
// listings are entered ("Various / Ongoing"), and those are visitable today.
// An event that finished yesterday is not.
assert.deepEqual(order([ev('yesterday', '2026-08-29'), ev('ongoing', null)]),
    ['ongoing', 'yesterday'])

// Within today, earliest start_time wins. This is the actual ask.
assert.deepEqual(order([
    ev('night', TODAY, '21:00:00'),
    ev('morning', TODAY, '08:30:00'),
    ev('noon', TODAY, '12:00:00')
]), ['morning', 'noon', 'night'])

// A today event with no time goes last among today's, not first.
assert.deepEqual(order([
    ev('untimed', TODAY, null),
    ev('late', TODAY, '23:00:00')
]), ['late', 'untimed'])

// Same day in the future still sorts by time.
assert.deepEqual(order([
    ev('b', '2026-09-05', '18:00:00'),
    ev('a', '2026-09-05', '09:00:00')
]), ['a', 'b'])

// Yesterday is past, not upcoming — the boundary that breaks if > becomes >=.
assert.deepEqual(order([ev('yesterday', '2026-08-29'), ev('tomorrow', '2026-08-31')]),
    ['tomorrow', 'yesterday'])

// The date must be Guatemala's. Instants are given in UTC so this asserts the
// same thing wherever it runs — a device-timezone implementation passes these
// only by luck, and toISOString() fails the first one outright.
assert.equal(todayInGuatemala(new Date('2026-08-31T02:00:00Z')), '2026-08-30',
    '8pm in Guatemala is still today, though UTC has rolled over')
assert.equal(todayInGuatemala(new Date('2026-08-30T05:59:00Z')), '2026-08-29',
    'just before midnight in Guatemala is still yesterday')
assert.equal(todayInGuatemala(new Date('2026-08-30T06:00:00Z')), '2026-08-30',
    'midnight in Guatemala starts the new day')
assert.equal(todayInGuatemala(new Date('2026-01-05T18:00:00Z')), '2026-01-05',
    'month and day stay zero-padded')

console.log('event-order ok')
