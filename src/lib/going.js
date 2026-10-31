import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Who's going, for a batch of events: { [eventId]: { count, faces } }.
 *
 * Goes through the event_going() RPC, never a select on event_attendance +
 * users: other people's users rows hold phone numbers, so RLS keeps them
 * private, and the function hands back only first name and avatar. Guests get
 * the count with no faces. See 20261031000000_event_attendance.sql.
 */
export function useGoing(ids, refresh = 0) {
    // Keyed on the joined ids: callers build a fresh array every render.
    const key = ids.join(',')
    const [going, setGoing] = useState({})

    useEffect(() => {
        if (!key) return
        let alive = true
        supabase.rpc('event_going', { ids: key.split(',').map(Number) }).then(({ data, error }) => {
            if (error) return console.error('Could not load who is going:', error)
            if (alive) setGoing(Object.fromEntries((data || []).map(row => [row.event_id, row])))
        })
        return () => { alive = false }
    }, [key, refresh])

    return going
}
