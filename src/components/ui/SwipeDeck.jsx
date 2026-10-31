import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, X, RotateCcw, MapPin, Star } from 'lucide-react'
import { getDirectImageUrl, placeLine } from '../../lib/utils'
import { useHeroLink } from '../../lib/transition'
import { useT } from '../../lib/i18n'
import When from './When'

// Past this many pixels, or a flick faster than FLICK px/ms, the card goes.
const THROW = 100
const FLICK = 0.5
const FLY_MS = 250

// Ids already swiped away. Per session on purpose: tomorrow's deck should hold
// tonight's events again, and nobody wants to lose a pass to a reload mid-swipe.
// ponytail: sessionStorage; persist per day if people complain about repeats.
const GONE_KEY = 'deck_gone'
const readGone = () => {
    try { return new Set(JSON.parse(sessionStorage.getItem(GONE_KEY)) || []) } catch { return new Set() }
}
const writeGone = (gone) => sessionStorage.setItem(GONE_KEY, JSON.stringify([...gone]))

/**
 * Now's stack: one event at a time. Drag or flick right to save it, left to pass;
 * the buttons underneath do the same for anyone who doesn't drag. Tap opens it.
 *
 * onSave(event) returns false when it won't save (a guest) and the card snaps
 * back; anything else and the card flies while the write runs. onUnsave undoes
 * a save. empty(reset) renders when the deck runs out; reset deals it again.
 */
export default function SwipeDeck({ events, townName, going = {}, onSave, onUnsave, empty }) {
    const t = useT()
    const heroLink = useHeroLink()
    const [gone, setGone] = useState(readGone)
    const [history, setHistory] = useState([])
    const [dx, setDx] = useState(0)
    const [dragging, setDragging] = useState(false)
    const [leaving, setLeaving] = useState(null) // 'left' | 'right'
    const start = useRef(null)
    const moved = useRef(false)

    const deck = events.filter(e => !gone.has(e.id))
    const top = deck[0]
    const next = deck[1]

    const commit = (event, dir) => {
        const nextGone = new Set(gone).add(event.id)
        writeGone(nextGone)
        setGone(nextGone)
        setHistory(h => [...h, { event, dir }])
        setLeaving(null)
        setDx(0)
    }

    const swipe = (dir) => {
        if (!top || leaving) return
        // Synchronous on purpose: the card flies now, the write happens behind it.
        if (dir === 'right' && onSave(top) === false) {
            setDx(0)
            return
        }
        setLeaving(dir)
        const event = top
        setTimeout(() => commit(event, dir), FLY_MS)
    }

    const undo = () => {
        const last = history.at(-1)
        if (!last || leaving) return
        const nextGone = new Set(gone)
        nextGone.delete(last.event.id)
        writeGone(nextGone)
        setGone(nextGone)
        setHistory(h => h.slice(0, -1))
        if (last.dir === 'right') onUnsave(last.event)
    }

    const onPointerDown = (e) => {
        if (leaving) return
        start.current = { x: e.clientX, t: e.timeStamp }
        moved.current = false
        setDragging(true)
    }
    const onPointerMove = (e) => {
        if (!start.current) return
        const d = e.clientX - start.current.x
        if (Math.abs(d) > 6 && !moved.current) {
            moved.current = true
            // Captured only once it is really a drag, so a plain tap still clicks the link.
            e.currentTarget.setPointerCapture(e.pointerId)
        }
        if (moved.current) setDx(d)
    }
    const onPointerUp = (e) => {
        if (!start.current) return
        const v = dx / Math.max(1, e.timeStamp - start.current.t)
        start.current = null
        setDragging(false)
        if (dx > THROW || (v > FLICK && dx > 30)) swipe('right')
        else if (dx < -THROW || (v < -FLICK && dx < -30)) swipe('left')
        else setDx(0)
    }
    // The browser took over (vertical scroll, touch-action: pan-y): snap back.
    const onPointerCancel = () => { start.current = null; setDragging(false); setDx(0) }

    if (!top) return empty(() => {
        writeGone(new Set())
        setGone(new Set())
        setHistory([])
    })

    const x = leaving ? (leaving === 'right' ? 1 : -1) * window.innerWidth : dx
    const done = events.length - deck.length
    const count = going[top.id]?.count ?? 0

    return (
        <div>
            {/* How far through tonight's stack you are */}
            <div className="h-1 mb-3 mx-6 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-turquoise transition-[width] duration-300" style={{ width: `${(done / events.length) * 100}%` }} />
            </div>

            {/* Height leaves room for the header, toolbar, buttons and tab bar on a short phone. */}
            <div className="relative mx-auto max-w-sm aspect-[3/4] max-h-[calc(100svh-24rem)] min-h-[18rem]">
                {next && (
                    <div className="absolute inset-0 rounded-3xl overflow-hidden bg-gray-200 dark:bg-slate-700 scale-[0.94] translate-y-3 opacity-70 transition-transform">
                        <img src={getDirectImageUrl(next.cover_image)} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>
                )}

                <Link
                    key={top.id}
                    data-tour="swipe-deck"
                    to={`/event/${top.id}`}
                    state={{ event: top }}
                    draggable={false}
                    onClick={(e) => {
                        if (moved.current || leaving) return e.preventDefault()
                        heroLink(`/event/${top.id}`, { event: top })(e)
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    className="absolute inset-0 block rounded-3xl overflow-hidden bg-gray-200 dark:bg-slate-700 shadow-xl select-none touch-pan-y card-in"
                    style={{
                        transform: `translateX(${x}px) rotate(${x / 18}deg)`,
                        transition: dragging ? 'none' : `transform ${FLY_MS}ms var(--ease-out-quart)`
                    }}
                >
                    <img src={getDirectImageUrl(top.cover_image)} alt={top.name} className="w-full h-full object-cover" draggable={false} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />

                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wide">
                            <MapPin size={12} />
                            {townName(top.town_id)}
                        </span>
                        {top.is_feature && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sunflower text-black text-xs font-bold">
                                <Star size={12} fill="currentColor" />
                                {t('common.featured')}
                            </span>
                        )}
                    </div>

                    {/* Save / pass stamps fade in with the drag */}
                    <span className="absolute top-16 left-5 -rotate-12 px-3 py-1 rounded-xl border-4 border-sunflower text-sunflower text-2xl font-black" style={{ opacity: Math.max(0, x / THROW) }}>
                        {t('deck.save')}
                    </span>
                    <span className="absolute top-16 right-5 rotate-12 px-3 py-1 rounded-xl border-4 border-white text-white text-2xl font-black" style={{ opacity: Math.max(0, -x / THROW) }}>
                        {t('deck.pass')}
                    </span>

                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                        <span className="inline-block mb-2 px-2.5 py-1 rounded-full bg-white/90 text-gray-900 text-xs font-bold">
                            <When event={top} dot="bg-sunflower" />
                        </span>
                        <h2 className="text-2xl font-black leading-tight line-clamp-3">{top.name}</h2>
                        <p className="mt-1 text-sm text-white/80 truncate">{placeLine(top.venue, townName(top.town_id))}</p>
                        <p className="mt-2 text-sm font-bold text-sunflower">
                            {count ? t('going.count', { n: count }) : t('going.first')}
                        </p>
                    </div>
                </Link>
            </div>

            <div className="flex items-center justify-center gap-5 mt-5">
                <button type="button" onClick={undo} disabled={!history.length} aria-label={t('deck.undo')}
                    className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-gray-500 dark:text-gray-300 disabled:opacity-40 transition-transform motion-safe:active:scale-90">
                    <RotateCcw size={18} />
                </button>
                <button type="button" onClick={() => swipe('left')} aria-label={t('deck.pass')}
                    className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-red-500 transition-transform motion-safe:active:scale-90">
                    <X size={30} strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => swipe('right')} aria-label={t('deck.save')}
                    className="w-16 h-16 rounded-full bg-sunflower shadow-lg shadow-sunflower/40 flex items-center justify-center text-white transition-transform motion-safe:active:scale-90">
                    <Heart size={28} fill="currentColor" />
                </button>
            </div>
        </div>
    )
}
