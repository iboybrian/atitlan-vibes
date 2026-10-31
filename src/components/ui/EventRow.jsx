import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { getDirectImageUrl, dayGroup, todayInGuatemala, formatOccurrence, placeLine } from '../../lib/utils'
import { useHeroLink } from '../../lib/transition'
import { useT, getLang, costLabel } from '../../lib/i18n'
import When from './When'

/**
 * List row: thumbnail, when, title, "venue · town", price. Used by Now's list
 * view, My Plans and Alerts. `isNew` puts the unseen dot on an Alerts row.
 */
export default function EventRow({ event, townName, isNew = false, index = 0 }) {
    const t = useT()
    const heroLink = useHeroLink()

    return (
        <Link
            to={`/event/${event.id}`}
            state={{ event }}
            onClick={heroLink(`/event/${event.id}`, { event })}
            className="flex gap-3 p-2 pr-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm card-in transition-transform duration-150 ease-out motion-safe:active:scale-[0.98]"
            style={{ '--i': index }}
        >
            <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                <img src={getDirectImageUrl(event.cover_image)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                {event.is_feature && (
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-sunflower text-black flex items-center justify-center" title={t('common.featured')}>
                        <Star size={11} fill="currentColor" />
                    </span>
                )}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
                <div className="text-xs font-bold text-turquoise">
                    <When event={event} />
                </div>
                <h3 className="font-bold text-sm leading-snug text-gray-900 dark:text-white line-clamp-2">{event.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{placeLine(event.venue, townName)}</p>
                {event.cost && (
                    <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-sunflower/20 text-[11px] font-bold text-gray-800 dark:text-sunflower">
                        {costLabel(event.cost)}
                    </span>
                )}
            </div>
            {isNew && <span className="shrink-0 mt-2 w-2.5 h-2.5 rounded-full bg-sunflower" aria-label={t('alerts.new')} />}
        </Link>
    )
}

/**
 * Rows under day headers (Today, Tomorrow, Tue 3 Nov…). Expects events already
 * sorted by compareEventsByWhen, which keeps each day's rows together.
 */
export function EventList({ events, townName }) {
    const t = useT()
    const today = todayInGuatemala()

    const groups = []
    for (const event of events) {
        const key = dayGroup(event, today)
        if (groups.at(-1)?.key !== key) groups.push({ key, items: [] })
        groups.at(-1).items.push(event)
    }

    const label = (key) =>
        ['today', 'tomorrow', 'ongoing', 'past'].includes(key)
            ? t(`when.${key}`)
            : formatOccurrence({ calendar_date: key }, getLang(), today)

    let i = 0
    return (
        <div className="space-y-5">
            {groups.map(({ key, items }) => (
                <section key={key}>
                    <h3 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">{label(key)}</h3>
                    <div className="space-y-2">
                        {items.map(event => (
                            <EventRow key={event.id} event={event} townName={townName(event.town_id)} index={i++} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}
