/**
 * Event category filter: node scripts/check-categories.mjs
 *
 * Two things can rot quietly here. The slug list lives twice — EVENT_CATEGORIES
 * in utils.js and the check constraint in SQL — and a mismatch only shows up as
 * a failed insert from the post form. And a stale chip pick carried over from
 * another town would hide every event with no chip left to clear it.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EVENT_CATEGORIES, categoriesIn, activeCategory } from '../src/lib/utils.js'

// The constraint and the JS list hold the same slugs.
const sql = readFileSync(new URL('../supabase/migrations/20261010000000_add_event_category.sql', import.meta.url), 'utf8')
const inSql = sql.match(/category in \(([^)]*)\)/)[1].match(/'(\w+)'/g).map(s => s.slice(1, -1))
assert.deepEqual([...inSql].sort(), [...EVENT_CATEGORIES].sort(), 'EVENT_CATEGORIES must match events_category_valid')

const ev = (category) => ({ category })

// Only categories with events get a chip, in EVENT_CATEGORIES order; null is ignored.
assert.deepEqual(categoriesIn([ev('nightlife'), ev(null), ev('music'), ev('music')]), ['music', 'nightlife'])
assert.deepEqual(categoriesIn([]), [])

// A pick with a chip filters.
assert.equal(activeCategory(['music', 'wellness'], 'wellness'), 'wellness')
assert.equal(activeCategory(['music', 'wellness'], null), null)

// Moving to a town without that category: no chip, so no filter.
assert.equal(activeCategory(['music', 'wellness'], 'nightlife'), null)

// One category only: the row is hidden, so its pick must not keep filtering —
// it would hide that town's uncategorised events with nothing to tap to undo it.
assert.equal(activeCategory(['wellness'], 'wellness'), null)

console.log('categories ok')
