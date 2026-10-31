import { startsIn, happeningToday, formatOccurrence } from '../../lib/utils'
import { useT, getLang } from '../../lib/i18n'
import TodayPill from './TodayPill'

/**
 * When an event is, as one short line: "Live now", "In 6 h", "Tonight", or its
 * date. Live and countdown come from startsIn() (Guatemala time); an event on
 * today with no start time falls back to the Today/Tonight pill. Color is the
 * caller's, except the live dot, which is always red.
 */
export default function When({ event, dot }) {
    const t = useT()
    const s = startsIn(event)

    if (s === 'live') {
        return (
            <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {t('when.live')}
            </span>
        )
    }
    if (s != null) return <span>{s >= 60 ? t('when.inHours', { n: Math.round(s / 60) }) : t('when.inMinutes', { n: s })}</span>
    if (happeningToday(event)) return <TodayPill event={event} dot={dot} />
    // A series' label says "Every Sunday" but not which one; the date says it better.
    return <span>{(event.recurring_days?.length && formatOccurrence(event, getLang())) || event.event_date_label}</span>
}
