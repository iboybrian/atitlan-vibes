
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, Search, X, SlidersHorizontal, Sunrise, Sun, Sunset, Moon, RotateCcw, Layers, List } from 'lucide-react'
import AddEventModal from '../components/ui/AddEventModal'
import { VibeSheet } from '../components/ui/CategoryChips'
import LoginNudge from '../components/ui/LoginNudge'
import Pigeon, { PigeonLoading } from '../components/ui/Pigeon'
import HeroCard from '../components/ui/HeroCard'
import SwipeDeck from '../components/ui/SwipeDeck'
import { EventList } from '../components/ui/EventRow'
import { supabase } from '../lib/supabase'
import { useEvents } from '../lib/events'
import { useTowns, useCurrentTown } from '../lib/towns'
import { useGoing } from '../lib/going'
import { categoriesIn, isTodayOrTomorrow, timeFilter, matchesSearch, dayPhase } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { useT } from '../lib/i18n'
import { coo } from '../lib/sound'

const PHASE_ICONS = { dawn: Sunrise, day: Sun, dusk: Sunset, night: Moon }
const TIME_CHIPS = ['today', 'week', 'weekend', 'free']

const VIBES_KEY = 'vibes'
const readVibes = () => {
    try { return JSON.parse(localStorage.getItem(VIBES_KEY)) || [] } catch { return [] }
}

export default function Home() {
    const t = useT()
    const { user } = useAuth()
    const { askLogin } = useOutletContext()
    const events = useEvents()
    const towns = useTowns()
    const town = useCurrentTown()
    const [mode, setMode] = useState('stack')
    const [vibes, setVibes] = useState(readVibes)
    const [vibesOpen, setVibesOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [when, setWhen] = useState(null)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)

    // Guests get today and tomorrow only; the rest is behind login.
    // ponytail: filtered here, not in RLS — the API still serves every approved
    // event to the anon key. Fine for public listings; move to a policy if not.
    const inTown = (events ?? []).filter(e => (!town || e.town_id === town.id) && (user || isTodayOrTomorrow(e)))
    // A saved vibe the town has no events for counts as not picked, or it would
    // hide everything with nothing on screen to clear it.
    const categories = categoriesIn(inTown)
    const activeVibes = vibes.filter(v => categories.includes(v))
    const feed = activeVibes.length ? inTown.filter(e => activeVibes.includes(e.category)) : inTown
    // Featured first, same as the old Home's featured section: that is the
    // placement promotions pay for. Stable, so each half stays soonest-first.
    const deck = [...feed.filter(e => e.is_feature), ...feed.filter(e => !e.is_feature)]
    const list = feed.filter(e => (!when || timeFilter(e, when)) && matchesSearch(e, query))
    const going = useGoing(deck.slice(0, 30).map(e => e.id))

    const townName = (id) => towns.find(x => x.id === id)?.name ?? ''
    const PhaseIcon = PHASE_ICONS[dayPhase()]

    const pickVibes = (next) => {
        setVibes(next)
        localStorage.setItem(VIBES_KEY, JSON.stringify(next))
    }

    // The card flies at once and the write happens behind it. 23505 is "already
    // saved" (from the event page) — same outcome, not an error.
    const save = (event) => {
        if (!user) { askLogin(); return false }
        coo()
        supabase.from('event_favorites').insert({ user_id: user.id, event_id: event.id })
            .then(({ error }) => { if (error && error.code !== '23505') console.error('Save failed:', error) })
    }
    const unsave = (event) => {
        supabase.from('event_favorites').delete().eq('user_id', user.id).eq('event_id', event.id)
            .then(({ error }) => { if (error) console.error('Unsave failed:', error) })
    }

    if (!events) return <PigeonLoading label={t('home.loadingVibes')} />

    return (
        <div className="px-4 pt-3 pb-8">
            <h1 className="text-2xl font-black leading-tight text-gray-900 dark:text-white">
                {town ? t('now.titleIn', { town: town.name }) : t('now.title')}
            </h1>
            <p className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-sunflower/15 text-xs font-bold text-gray-700 dark:text-gray-200">
                <PhaseIcon size={13} className="text-sunflower" />
                {t(`lake.${dayPhase()}`)}
            </p>

            <div className="flex items-center gap-2 mt-3 mb-4">
                <button
                    type="button"
                    onClick={() => setVibesOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-sunflower text-black text-sm font-bold shadow-md transition-transform motion-safe:active:scale-95"
                >
                    <SlidersHorizontal size={16} />
                    {activeVibes.length ? t('vibes.picked', { n: activeVibes.length }) : t('vibes.everything')}
                </button>
                <button
                    type="button"
                    data-tour="post-vibe"
                    onClick={() => user ? setIsAddEventOpen(true) : askLogin()}
                    aria-label={t('common.postVibe')}
                    title={t('common.postVibe')}
                    className={`w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-turquoise shadow-sm flex items-center justify-center ${user ? '' : 'grayscale opacity-60'}`}
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={() => setMode(mode === 'stack' ? 'list' : 'stack')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-turquoise text-white text-sm font-bold shadow-md transition-transform motion-safe:active:scale-95"
                >
                    {mode === 'stack'
                        ? <><List size={16} />{t('now.seeAll')}<span className="px-1.5 rounded-full bg-white/25 text-xs">{feed.length}</span></>
                        : <><Layers size={16} />{t('now.stack')}</>}
                </button>
            </div>

            {feed.length === 0 ? (
                <div className="p-6 flex flex-col items-center bg-white dark:bg-slate-800 rounded-3xl text-center text-gray-500 dark:text-gray-400 shadow-sm">
                    <Pigeon mood="sleep" className="mb-3" />
                    {t('home.noEvents')}
                </div>
            ) : mode === 'stack' ? (
                <SwipeDeck
                    events={deck}
                    townName={townName}
                    going={going}
                    onSave={save}
                    onUnsave={unsave}
                    empty={(reset) => (
                        // Out of cards: the volcano and a fun fact, then the ways forward.
                        <div className="flex flex-col items-center gap-4 pt-2">
                            <HeroCard />
                            <p className="text-center font-bold text-gray-700 dark:text-gray-200">
                                {t('deck.done', { town: town?.name ?? t('now.theLake') })}
                            </p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setMode('list')} className="px-4 py-2 rounded-full bg-turquoise text-white text-sm font-bold shadow-md">
                                    {t('now.seeAll')}
                                </button>
                                <button type="button" onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 text-sm font-bold shadow-sm">
                                    <RotateCcw size={14} />
                                    {t('deck.again')}
                                </button>
                            </div>
                        </div>
                    )}
                />
            ) : (
                <>
                    <div className="relative mb-3">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-turquoise" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('now.search')}
                            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-800 dark:text-gray-200 rounded-2xl border-2 border-turquoise/20 focus:border-turquoise outline-none shadow-sm transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label={t('now.clearSearch')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 mb-3 no-scrollbar">
                        {TIME_CHIPS.map(key => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setWhen(when === key ? null : key)}
                                aria-pressed={when === key}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${when === key
                                    ? 'bg-turquoise text-white shadow-md shadow-turquoise/30'
                                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm'
                                    }`}
                            >
                                {t(`now.${key}`)}
                            </button>
                        ))}
                    </div>

                    {list.length ? (
                        <EventList events={list} townName={townName} />
                    ) : (
                        <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-turquoise/30">
                            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('town.noMatches')}</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('town.tryAnother')}</p>
                        </div>
                    )}
                </>
            )}

            {!user && <LoginNudge />}

            {vibesOpen && (
                <VibeSheet categories={categories} value={activeVibes} onChange={pickVibes} onClose={() => setVibesOpen(false)} />
            )}

            {user && (
                <AddEventModal
                    isOpen={isAddEventOpen}
                    onClose={() => setIsAddEventOpen(false)}
                />
            )}
        </div>
    )
}
