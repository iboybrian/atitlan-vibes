
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getDirectImageUrl } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
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
                        <Link to={`/event/${event.id}`} key={event.id} className="block group">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                                <div className="aspect-square w-full relative bg-gray-100 dark:bg-slate-700">
                                    {event.cover_image && (
                                        <img
                                            src={getDirectImageUrl(event.cover_image)}
                                            alt={event.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    <div className="absolute top-2 right-2 bg-white/95 dark:bg-slate-800/95 text-gray-900 dark:text-gray-200 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                        {event.event_date_label}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-sm mb-1 leading-snug text-gray-900 dark:text-white">{event.name}</h3>
                                    {event.start_time && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
                                            <Clock size={12} /> {event.start_time}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
