
import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import EventCard from '../components/ui/EventCard'
import { useT } from '../lib/i18n'

export default function Favorites() {
    const t = useT()
    const { user } = useAuth()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        async function fetchFavorites() {
            const { data, error } = await supabase
                .from('event_favorites')
                .select('created_at, events(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) console.error('Error fetching favorites:', error)
            // The join returns null for an event that was deleted out from under us.
            setEvents((data || []).map(row => row.events).filter(Boolean))
            setLoading(false)
        }
        fetchFavorites()
    }, [user])

    return (
        <div className="px-4 py-6">
            <div className="flex items-center gap-2 mb-6">
                <Heart size={22} className="text-red-500" fill="currentColor" />
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('favorites.title')}</h1>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 dark:text-gray-500 py-10">{t('event.loading')}</div>
            ) : events.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center">
                    <Heart size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">{t('favorites.empty')}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('favorites.emptyHint')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {events.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    )
}
