import { useEffect, useState } from 'react'
import Volcano from './Volcano'
import { useT, getLang } from '../../lib/i18n'
import { GUATEMALA_FACTS, nextFactIndex } from '../../lib/guatemalaFacts'

// Bumped if the hint ever needs to replay for everyone.
const HINT_KEY = 'hero_flip_hint_v1'

/**
 * Home hero. Front: the welcome text. Back: the animated volcano and a Guatemala
 * fun fact — a different one every time the card turns over.
 *
 * Nobody guesses a card flips, so the very first visit turns it once on its
 * own and back again. Tap (or Enter/Space) flips it; on a computer, hover does.
 */
export default function HeroCard() {
    const t = useT()
    const [flipped, setFlipped] = useState(false)
    const [fact, setFact] = useState(() => nextFactIndex(-1))

    const flip = (next = !flipped) => {
        if (next && !flipped) setFact(nextFactIndex)
        setFlipped(next)
    }

    useEffect(() => {
        let seen = false
        try { seen = !!localStorage.getItem(HINT_KEY) } catch { /* private mode: show it */ }
        if (seen) return
        const show = setTimeout(() => {
            setFlipped(true)
            // Set here, not up front: StrictMode mounts twice in dev, and the
            // first mount's cleanup would otherwise eat the hint.
            try { localStorage.setItem(HINT_KEY, '1') } catch { /* fine */ }
        }, 1200)
        const hide = setTimeout(() => setFlipped(false), 4500)
        return () => { clearTimeout(show); clearTimeout(hide) }
    }, [])

    const face = 'absolute inset-0 backface-hidden rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700'

    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={t('home.flipHint')}
            className="w-full max-w-[320px] h-[200px] perspective-1000 cursor-pointer outline-none rounded-3xl focus-visible:ring-2 focus-visible:ring-turquoise"
            onClick={() => flip()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } }}
            // Mouse only: a tap fires a synthetic enter AND a click, which would
            // flip the card and straight back.
            onPointerEnter={(e) => e.pointerType === 'mouse' && flip(true)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && flip(false)}
        >
            <div className={`relative w-full h-full transform-style-3d hero-flip ${flipped ? 'rotate-y-180' : ''}`}>
                <div aria-hidden={flipped} className={`${face} bg-white dark:bg-slate-800 p-6 flex items-center justify-center text-center shadow-inner`}>
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        <p className="mb-4">
                            {t('home.welcome')} <span className="font-bold text-turquoise">Atitlán Vibes</span>
                            {t('home.welcomeRest')}
                        </p>
                        <p className="text-xl font-black text-turquoise">
                            {t('home.findVibes')} <span className="sparkle" aria-hidden="true">✨</span>
                        </p>
                    </div>
                </div>

                <div aria-hidden={!flipped} className={`${face} rotate-y-180 bg-white dark:bg-slate-800 flex flex-col shadow-sm`}>
                    <div className="relative h-[112px] shrink-0">
                        <Volcano className="absolute inset-0 w-full h-full" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/85 text-[11px] font-bold text-gray-800">
                            {t('home.didYouKnow')}
                        </span>
                    </div>
                    <p className="flex-1 px-4 py-2.5 flex items-center text-[13px] leading-snug text-gray-700 dark:text-gray-200 text-left">
                        {GUATEMALA_FACTS[fact][getLang() === 'es' ? 'es' : 'en']}
                    </p>
                </div>
            </div>
        </div>
    )
}
