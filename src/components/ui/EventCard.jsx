
import { Link } from 'react-router-dom'
import { Star, Clock } from 'lucide-react'
import { getDirectImageUrl, formatOccurrence, happeningToday } from '../../lib/utils'
import TodayPill from './TodayPill'
import { useHeroLink } from '../../lib/transition'
import { useT, getLang } from '../../lib/i18n'

/**
 * Grid event card — the square-image variant used by TownDetail and Favorites.
 * The badge keys off is_feature rather than a prop: the featured grid is exactly
 * the is_feature rows, so a flag would only be able to disagree with the data.
 * Home has its own overlay card; it's a different design, not a copy of this.
 */
export default function EventCard({ event, index = 0 }) {
    const t = useT()
    const heroLink = useHeroLink()

    // For a series, event_date_label says "Every Sunday" but not WHICH Sunday —
    // the badge is the one place with room for the answer. One-off events already
    // have a label that says it better than a bare date would.
    const badge = event.recurring_days?.length
        ? formatOccurrence(event, getLang())
        : event.event_date_label

    return (
        // index drives the stagger in .card-in; the press scale is the tap feedback.
        // state: the detail page paints from this row at once instead of a loading
        // screen, which is also what gives the photo morph something to land on.
        <Link to={`/event/${event.id}`} state={{ event }} onClick={heroLink(`/event/${event.id}`, { event })} className="block group card-in" style={{ '--i': index }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-[transform,box-shadow] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer h-full">
                <div className="aspect-square w-full relative bg-gray-100 dark:bg-slate-700">
                    {event.cover_image && (
                        <img
                            src={getDirectImageUrl(event.cover_image)}
                            alt={event.name}
                            // A town grid can be 30+ covers; only fetch the ones scrolled to.
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    )}
                    {event.is_feature && (
                        <div className="absolute top-2 left-2 bg-sunflower text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Star size={10} fill="currentColor" />
                            {t('common.featured')}
                        </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/95 dark:bg-slate-800/95 text-gray-900 dark:text-gray-200 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                        {happeningToday(event) ? <TodayPill event={event} /> : badge}
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
    )
}
