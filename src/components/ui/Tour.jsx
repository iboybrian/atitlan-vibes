
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getCurrentTown, markTourDone } from '../../lib/utils'
import { useT } from '../../lib/i18n'

/**
 * First-run guided tour. Testers said the app never explains itself, and a plain
 * modal would only move the About page in front of them — so this points at the
 * real controls in place and walks across routes to do it.
 *
 * target: the data-tour attribute to cut out of the dim. null = centered card.
 * route:  where the step lives. {town} resolves to the user's picked town.
 */
const STEPS = [
    { route: '/', target: null, title: 'tour.welcomeTitle', body: 'tour.welcomeBody' },
    { route: '/', target: 'menu', title: 'tour.menuTitle', body: 'tour.menuBody' },
    { route: '/', target: 'town-picker', title: 'tour.pickerTitle', body: 'tour.pickerBody' },
    { route: '/', target: 'town-footer', title: 'tour.footerTitle', body: 'tour.footerBody' },
    { route: '/town/{town}', target: 'town-chat', title: 'tour.chatTitle', body: 'tour.chatBody' },
    { route: '/town/{town}/chat', target: null, title: 'tour.chatRoomTitle', body: 'tour.chatRoomBody' },
    { route: '/town/{town}', target: 'post-vibe', title: 'tour.postTitle', body: 'tour.postBody' }
]

const PAD = 8 // breathing room around the highlighted element

export default function Tour({ isOpen, onClose }) {
    const t = useT()
    const navigate = useNavigate()
    const location = useLocation()
    const [index, setIndex] = useState(0)
    const [fallbackTown, setFallbackTown] = useState(null)
    const [rect, setRect] = useState(null)

    const step = STEPS[index]
    // Read straight from localStorage every render: the user may pick their town
    // during step 3, and the town steps have to follow that choice.
    const townId = getCurrentTown()?.id ?? fallbackTown

    // Nothing picked yet — Antigua if it exists, else whatever comes first.
    useEffect(() => {
        if (!isOpen || getCurrentTown()?.id) return
        supabase.from('towns').select('id, name').order('name').then(({ data }) => {
            const list = data || []
            setFallbackTown((list.find(x => /antigua/i.test(x.name)) || list[0])?.id ?? null)
        })
    }, [isOpen])

    // Put the app on the route this step talks about.
    useEffect(() => {
        if (!isOpen || !step) return
        const needsTown = step.route.includes('{town}')
        if (needsTown && !townId) return // still resolving, or no towns at all
        const path = step.route.replace('{town}', townId)
        if (location.pathname !== path) navigate(path)
        // location is read, not tracked: re-running on every navigation would fight
        // the user's own taps inside the spotlight.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, index, townId])

    // Follow the target: it can arrive late after a route change, move while the
    // page smooth-scrolls, or grow when a dropdown inside it opens.
    useEffect(() => {
        if (!isOpen || !step?.target) {
            setRect(null)
            return
        }

        let scrolled = false
        const measure = () => {
            const el = document.querySelector(`[data-tour="${step.target}"]`)
            if (!el) return setRect(null)
            if (!scrolled) {
                scrolled = true
                el.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
            const r = el.getBoundingClientRect()
            setRect(prev =>
                prev && prev.top === r.top && prev.left === r.left &&
                    prev.width === r.width && prev.height === r.height
                    ? prev
                    : r
            )
        }

        measure()
        // ponytail: a 150ms poll instead of ResizeObserver plus scroll and resize
        // listeners — one timer covers all three, and the tour is short-lived.
        const id = setInterval(measure, 150)
        return () => clearInterval(id)
    }, [isOpen, index, step?.target, location.pathname])

    if (!isOpen || !step) return null

    const finish = () => {
        markTourDone()
        setIndex(0)
        onClose()
        navigate('/')
    }

    const isLast = index === STEPS.length - 1
    const next = () => (isLast ? finish() : setIndex(index + 1))

    // The dim is four strips around the target rather than one sheet with a hole,
    // so the highlighted control stays tappable — the user really does pick their
    // town on step 3.
    const strips = rect
        ? [
            { top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) },
            { top: rect.bottom + PAD, left: 0, right: 0, bottom: 0 },
            { top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 },
            { top: rect.top - PAD, left: rect.right + PAD, right: 0, height: rect.height + PAD * 2 }
        ]
        : [{ inset: 0 }]

    // Card goes under the target when there's room for it, otherwise above.
    const cardStyle = rect
        ? rect.bottom + 300 < window.innerHeight
            ? { top: rect.bottom + PAD + 16 }
            : { bottom: window.innerHeight - rect.top + PAD + 16 }
        : { top: '50%', transform: 'translate(-50%, -50%)' }

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none">
            {strips.map((s, i) => (
                <div key={i} className="absolute bg-black/70 pointer-events-auto" style={s} />
            ))}

            {rect && (
                <div
                    className="absolute rounded-2xl ring-4 ring-turquoise pointer-events-none"
                    style={{
                        top: rect.top - PAD,
                        left: rect.left - PAD,
                        width: rect.width + PAD * 2,
                        height: rect.height + PAD * 2
                    }}
                />
            )}

            <div
                className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 pointer-events-auto animate-in zoom-in-95 duration-200"
                style={cardStyle}
            >
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">{t(step.title)}</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{t(step.body)}</p>

                <div className="flex justify-center gap-2 my-5">
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-turquoise' : 'w-2 bg-gray-200 dark:bg-slate-600'}`}
                        />
                    ))}
                </div>

                <button
                    onClick={next}
                    className="w-full py-3 bg-turquoise text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                    {isLast ? t('tour.finish') : t('tour.continue')}
                </button>

                <button
                    onClick={finish}
                    className="w-full py-2 mt-2 text-gray-400 dark:text-gray-500 font-medium text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    {t('tour.skip')}
                </button>
            </div>
        </div>
    )
}
