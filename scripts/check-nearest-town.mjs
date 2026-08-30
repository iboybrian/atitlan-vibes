/**
 * The only real logic in the geolocation feature is nearestTown(), so this is
 * the one check that guards it: node scripts/check-nearest-town.mjs
 *
 * There is no test runner in this repo and this doesn't add one. It works
 * because src/lib/utils.js imports nothing — keep it that way, or move this.
 */
import assert from 'node:assert/strict'
import { nearestTown } from '../src/lib/utils.js'

// Same coordinates the migration seeds, same ids.
const towns = [
    { id: 1, name: 'Panajachel', lat: 14.7420, lng: -91.1580 },
    { id: 2, name: 'San Marcos La Laguna', lat: 14.7255, lng: -91.2578 },
    { id: 3, name: 'San Pedro La Laguna', lat: 14.6919, lng: -91.2718 },
    { id: 4, name: 'Antigua Guatemala', lat: 14.5557324, lng: -90.7358906 },
    { id: 5, name: 'Guatemala City', lat: 14.600781, lng: -90.518451 }
]

// Every town resolves to itself.
for (const town of towns) {
    assert.equal(nearestTown(town.lat, town.lng, towns).id, town.id, town.name)
}

// The tightest pair, ~4 km apart. Breaks if the cos(lat) term or a sign flips.
assert.equal(nearestTown(14.6919, -91.2718, towns).name, 'San Pedro La Laguna')
assert.equal(nearestTown(14.7255, -91.2578, towns).name, 'San Marcos La Laguna')

// Antigua and Guatemala City are only ~25 km apart — the midpoint must not
// wander to the wrong one.
assert.equal(nearestTown(14.60, -90.70, towns).name, 'Antigua Guatemala')
assert.equal(nearestTown(14.62, -90.55, towns).name, 'Guatemala City')

// A boat in the middle of the lake still belongs to someone.
assert.ok(nearestTown(14.70, -91.20, towns), 'mid-lake should resolve')

// Out of range -> null, so the user falls back to their picked town.
assert.equal(nearestTown(19.4326, -99.1332, towns), null, 'Mexico City is not a town we cover')
assert.equal(nearestTown(14.8347, -91.5181, towns), null, 'Xela is not a town we cover')

// Degenerate inputs must not throw or guess.
assert.equal(nearestTown(14.7420, -91.1580, []), null, 'towns not loaded yet')
assert.equal(
    nearestTown(14.7420, -91.1580, [{ id: 9, name: 'Unseeded', lat: null, lng: null }]),
    null,
    'rows without coordinates are skipped'
)

console.log('nearest-town ok')
