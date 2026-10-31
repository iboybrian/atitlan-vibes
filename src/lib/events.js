import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { todayInGuatemala, ongoingEventsOr, compareEventsByWhen } from './utils'

/**
 * Every approved upcoming event, all towns, sorted soonest-first. Now, Map, the
 * town sheet's "N tonight", Alerts and the tour all read the same list, so it is
 * fetched once and shared — same cached-promise shape as towns.js.
 *
 * Refetched after MAX_AGE: Layout never remounts on Android, so a cache that
 * lived for the whole session would keep yesterday's "tonight" until a cold start.
 */
const MAX_AGE = 5 * 60 * 1000
let cached = null
let cachedAt = 0

export function fetchEvents() {
    if (!cached || Date.now() - cachedAt > MAX_AGE) {
        cachedAt = Date.now()
        const today = todayInGuatemala()
        // A recurring event's calendar_date is when the series STARTED, so gte()
        // alone would hide exactly the events that are on every week. The second
        // or() ANDs with the first: a set end_date drops the event after that day.
        // ponytail: no limit — dozens of rows today. Page it past ~500.
        cached = supabase
            .from('events')
            .select('*')
            .eq('is_approved', true)
            .or(`calendar_date.gte.${today},recurring_days.not.is.null`)
            .or(ongoingEventsOr(today))
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading events', error)
                    cached = null // let the next caller retry rather than cache the failure
                    return []
                }
                // Sorted here, not in the query: a recurring event's real date is
                // computed, so no column can order it.
                return (data || []).sort(compareEventsByWhen)
            })
    }
    return cached
}

/** Same list, as component state. null until the fetch lands. */
export function useEvents() {
    const [events, setEvents] = useState(null)

    useEffect(() => {
        let alive = true
        fetchEvents().then(data => { if (alive) setEvents(data) })
        return () => { alive = false }
    }, [])

    return events
}
