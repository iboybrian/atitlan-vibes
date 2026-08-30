/**
 * Who gets a push. This decides who got paid-for reach, so it gets the check:
 * node scripts/check-targeting.mjs
 *
 * Works because targeting.js is plain .js with no imports — Deno loads it from
 * index.ts, node loads it from here. Keep it that way.
 */
import assert from 'node:assert/strict'
import { isInTown, DETECTED_FRESH_MS, PICK_FRESH_MS } from '../supabase/functions/notify-town/targeting.js'

const NOW = Date.parse('2026-08-30T12:00:00Z')
const ago = (ms) => new Date(NOW - ms).toISOString()

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const PANA = 1
const GUATE = 5

// Fresh detection puts you in that town, whatever you picked.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(DAY), detected_town_id: GUATE, detected_at: ago(HOUR) },
    GUATE, NOW
), true, 'fresh detection counts')

// ...and a recent pick still counts too. Both fire — that is the union.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(DAY), detected_town_id: GUATE, detected_at: ago(HOUR) },
    PANA, NOW
), true, 'recent pick counts alongside a fresh detection elsewhere')

// The whole point of the 7-day window: a stale pick loses to a live location.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(8 * DAY), detected_town_id: GUATE, detected_at: ago(HOUR) },
    PANA, NOW
), false, 'stale pick is dropped when a fresh detection contradicts it')

// The asymmetry, and the reason it exists: location off means the pick is all
// we have. Expiring it would silence the user completely.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(365 * DAY), detected_town_id: null, detected_at: null },
    PANA, NOW
), true, 'ancient pick still counts with no location signal')

// Same, but the detection exists and has aged out. Still not a contradiction.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(30 * DAY), detected_town_id: GUATE, detected_at: ago(10 * DAY) },
    PANA, NOW
), true, 'aged-out detection does not expire the pick')

// Detection ages out on its own.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(DAY), detected_town_id: GUATE, detected_at: ago(4 * DAY) },
    GUATE, NOW
), false, 'detection older than 72h stops counting')

// Boundaries, both windows. Breaks if a > flips to >= or a constant changes.
assert.equal(isInTown(
    { detected_town_id: GUATE, detected_at: ago(DETECTED_FRESH_MS - 1000) }, GUATE, NOW
), true, 'just inside 72h')
assert.equal(isInTown(
    { detected_town_id: GUATE, detected_at: ago(DETECTED_FRESH_MS + 1000) }, GUATE, NOW
), false, 'just outside 72h')
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(PICK_FRESH_MS - 1000), detected_town_id: GUATE, detected_at: ago(HOUR) },
    PANA, NOW
), true, 'just inside 7 days')
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(PICK_FRESH_MS + 1000), detected_town_id: GUATE, detected_at: ago(HOUR) },
    PANA, NOW
), false, 'just outside 7 days')

// A pick that predates the current_town_set_at column must not go dark.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: null, detected_town_id: GUATE, detected_at: ago(HOUR) },
    PANA, NOW
), true, 'null timestamp counts as a valid pick')

// Someone with no connection to this town at all.
assert.equal(isInTown(
    { current_town_id: PANA, current_town_set_at: ago(HOUR), detected_town_id: PANA, detected_at: ago(HOUR) },
    GUATE, NOW
), false, 'unrelated town never matches')
assert.equal(isInTown({}, GUATE, NOW), false, 'empty row matches nothing')

console.log('targeting ok')
