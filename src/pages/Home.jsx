
import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Plus, Star } from 'lucide-react'
import AddEventModal from '../components/ui/AddEventModal'
import FlipCard from '../components/ui/FlipCard'
import TownPicker from '../components/ui/TownPicker'
import CategoryChips from '../components/ui/CategoryChips'
import LoginNudge from '../components/ui/LoginNudge'
import TodayPill from '../components/ui/TodayPill'
import Pigeon, { PigeonLoading } from '../components/ui/Pigeon'
import LakeMap from '../components/ui/LakeMap'
import { useHeroLink } from '../lib/transition'
import { supabase } from '../lib/supabase'
import { getDirectImageUrl, todayInGuatemala, compareEventsByWhen, categoriesIn, activeCategory, isTodayOrTomorrow, ongoingEventsOr, happeningToday } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useT } from '../lib/i18n'

// Reusable Event Card Component
function EventCard({ event, index = 0 }) {
    const t = useT()
    const heroLink = useHeroLink()
    return (
        <Link to={`/event/${event.id}`} state={{ event }} onClick={heroLink(`/event/${event.id}`, { event })} className="block group card-in" style={{ '--i': index }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-[transform,box-shadow] duration-150 ease-out motion-safe:active:scale-[0.97] relative aspect-[4/5]">
                <img
                    src={getDirectImageUrl(event.cover_image)}
                    alt={event.name}
                    // The grid sits below the logo and town picker; fetch covers as they scroll in.
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                {/* Featured badge */}
                {event.is_feature && (
                    <div className="absolute top-2 left-2 bg-sunflower text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star size={12} fill="currentColor" />
                        {t('common.featured')}
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <div className="text-xs font-bold text-sunflower mb-1">
                        {happeningToday(event) ? <TodayPill event={event} dot="bg-sunflower" /> : event.event_date_label}
                    </div>
                    <h3 className="font-bold leading-tight text-sm line-clamp-2">{event.name}</h3>
                </div>
            </div>
        </Link>
    )
}

export default function Home() {
    const [events, setEvents] = useState([])
    const [category, setCategory] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)
    const { user } = useAuth()
    const { askLogin } = useOutletContext()
    const t = useT()

    const handleAddEvent = () => user ? setIsAddEventOpen(true) : askLogin()

    useEffect(() => {
        async function fetchUpcoming() {
            try {
                // calendar_date is a date column (YYYY-MM-DD); start_time is time-only
                // and has no date to compare against a timestamp. The date has to be
                // Guatemala's, not UTC — see todayInGuatemala().
                const today = todayInGuatemala()
                // Null end_date stays listed. A set end_date drops the event the
                // day after it, in Guatemala. ANDed with the date filter below.
                const stillOn = ongoingEventsOr(today)

                // A recurring event's calendar_date is when the series STARTED, so
                // it is usually in the past and gte() alone would hide exactly the
                // events that are on every week. Pull those in regardless of date;
                // nextOccurrence() sorts out when they actually happen.
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('is_approved', true)
                    .or(`calendar_date.gte.${today},recurring_days.not.is.null`)
                    .or(stillOn)
                    .limit(50)

                if (error) throw error

                // Nothing upcoming — show the most recent approved events instead,
                // so a quiet week doesn't leave Home empty. Ended ones stay out.
                let list = data || []
                if (list.length === 0) {
                    const { data: latest } = await supabase
                        .from('events')
                        .select('*')
                        .eq('is_approved', true)
                        .or(stillOn)
                        .limit(8)
                    list = latest || []
                }

                // Sorted here, not in the query: the real date of a recurring event
                // is computed, so no column can order it. Over-fetch, then the cut
                // to 8 happens at render, after the category filter.
                setEvents(list.sort(compareEventsByWhen))
            } catch (err) {
                console.error('Error loading events', err)
            } finally {
                setLoading(false)
            }
        }
        fetchUpcoming()
    }, [])

    // Filter first, then cut to 8 — cutting first would leave a chip with one or
    // two events out of the 8 soonest, instead of the 8 soonest of that type.
    // Guests get today and tomorrow only; the rest is behind login.
    // ponytail: filtered here, not in RLS — the API still serves every approved
    // event to the anon key. Fine for public listings; move to a policy if not.
    const visible = user ? events : events.filter(e => isTodayOrTomorrow(e))
    const categories = categoriesIn(visible)
    const active = activeCategory(categories, category)
    const shown = visible.filter(e => !active || e.category === active).slice(0, 8)
    const featuredEvents = shown.filter(e => e.is_feature)
    // How many events each town has on today, for the lake map. From the full
    // list, not the category-filtered one: the map answers "where is it on tonight".
    const todayByTown = {}
    for (const e of events) if (happeningToday(e)) todayByTown[e.town_id] = (todayByTown[e.town_id] || 0) + 1
    const regularEvents = shown.filter(e => !e.is_feature)

    return (
        <div className="px-4 py-2 space-y-8">

            {/* 1. Static Branding / Welcome - FlipCard */}
            <div className="flex justify-center py-4">
                <FlipCard
                    className="w-full max-w-[320px] h-[200px]"
                    front={
                        <img
                            src="https://tcdjxxnjfqnfbnseuhsa.supabase.co/storage/v1/object/public/logo/Logo.png"
                            alt="Atitlán Vibes Logo"
                            className="w-full h-full object-contain drop-shadow-sm"
                        />
                    }
                    back={
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            <p className="mb-4">
                                {t('home.welcome')} <span className="font-bold text-turquoise">Atitlán Vibes</span>
                                {t('home.welcomeRest')}
                            </p>
                            <p className="text-xl font-black text-turquoise">{t('home.findVibes')}</p>
                        </div>
                    }
                />
            </div>

            {/* 2. Vertical Town Menu (Now in Body) */}
            <section>
                <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 text-center">
                    {t('home.exploreByTown')}
                </h2>

                <LakeMap todayByTown={todayByTown} />

                <div className="mt-4">
                    <TownPicker />
                </div>
            </section>

            {/* 3. Events Section */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-xl font-bold text-black dark:text-white">{t('home.nextEvents')}</h2>
                    <span className="text-xs font-bold text-turquoise uppercase tracking-wide">{t('home.seeAll')}</span>
                </div>

                <CategoryChips categories={categories} value={active} onChange={setCategory} />

                {/* Inline Add Event Button */}
                <button
                    onClick={handleAddEvent}
                    className={`w-full mb-4 py-3 px-4 bg-sunflower text-black font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-sunflower/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${user ? '' : 'grayscale opacity-60'}`}
                >
                    <Plus size={20} strokeWidth={3} />
                    <span>{t('common.postVibe')}</span>
                </button>

                {loading ? (
                    <PigeonLoading label={t('home.loadingVibes')} />
                ) : (featuredEvents.length === 0 && regularEvents.length === 0) ? (
                    <div className="p-6 flex flex-col items-center bg-white dark:bg-slate-800 rounded-2xl text-center text-gray-500 dark:text-gray-400 shadow-sm">
                        <Pigeon mood="sleep" className="mb-3" />
                        {t('home.noEvents')}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Featured Events Section */}
                        {featuredEvents.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Star size={16} className="text-sunflower" fill="#FFB800" />
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                        {t('common.featuredEvents')}
                                    </span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-sunflower/50 to-transparent ml-2"></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {featuredEvents.map((event, i) => (
                                        <EventCard key={event.id} event={event} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regular Events Section */}
                        {regularEvents.length > 0 && (
                            <div>
                                {featuredEvents.length > 0 && (
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            {t('common.moreEvents')}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-300 dark:bg-slate-600 ml-2"></div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {regularEvents.map((event, i) => (
                                        <EventCard key={event.id} event={event} index={featuredEvents.length + i} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!user && !loading && <LoginNudge />}
            </section>

            {/* Add Event Modal */}
            {user && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                />
            )}
        </div>
    )
}
