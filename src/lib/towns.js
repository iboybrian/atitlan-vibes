import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { getCurrentTown, setCurrentTown } from './utils'

/**
 * The picked town as a subscribable value. The pill lives in Header and the
 * pages that filter by it (Now, Map, Alerts) are siblings, so a plain
 * localStorage read would not re-render them. Same store shape as i18n.js.
 * The snapshot is a module variable, not a fresh JSON.parse, so it stays stable.
 */
let currentTown = getCurrentTown()
const townSubs = new Set()

export function pickTown(town) {
    setCurrentTown(town)
    currentTown = getCurrentTown()
    townSubs.forEach(fn => fn())
}

export function useCurrentTown() {
    return useSyncExternalStore(
        fn => { townSubs.add(fn); return () => townSubs.delete(fn) },
        () => currentTown
    )
}

/**
 * Towns are a fixed handful of rows that never change while the app is open, but
 * six components each need the list — the footer, the picker, the sidebar, the
 * tour, the add-event form. Cache the promise, not the rows: callers that mount
 * together share one request instead of racing six identical ones.
 */
let cached = null

export function fetchTowns() {
    if (!cached) {
        cached = supabase
            .from('towns')
            // lat/lng are only read by nearestTown() in the geolocation path;
            // the other five callers ignore them.
            .select('id, name, lat, lng')
            .order('name')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error fetching towns:', error)
                    cached = null // let the next caller retry rather than cache the failure
                    return []
                }
                return data || []
            })
    }
    return cached
}

/** Same list, as component state. Returns [] until the fetch lands. */
export function useTowns() {
    const [towns, setTowns] = useState([])

    useEffect(() => {
        let alive = true
        fetchTowns().then(data => { if (alive) setTowns(data) })
        return () => { alive = false }
    }, [])

    return towns
}
