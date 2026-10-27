import { useEffect, useState } from 'react'
import Volcano from './Volcano'
import { useT, getLang } from '../../lib/i18n'
import { GUATEMALA_FACTS, nextFactIndex } from '../../lib/guatemalaFacts'

/**
 * Home hero. Front: the animated volcano (it follows the hour at the lake) over
 * the welcome line and "Find your Vibes". Back: a Guatemala fun fact — a different one every
 * time the card turns over.
 *
 * Every time Home loads, the card turns over on its own and back again: it shows
 * a fact without asking, and tells people the card flips. Tap (or Enter/Space)
 * flips it; on a computer, hover does.
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
        // The first fact was already picked in useState, so no reroll here.
        const show = setTimeout(() => setFlipped(true), 1200)
        const hide = setTimeout(() => setFlipped(false), 5200)
        return () => { clearTimeout(show); clearTimeout(hide) }
    }, [])

    const face = 'absolute inset-0 backface-hidden rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700'

    return (
        <div
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={t('home.flipHint')}
            className="w-full max-w-[320px] h-[270px] perspective-1000 cursor-pointer outline-none rounded-3xl focus-visible:ring-2 focus-visible:ring-turquoise"
            onClick={() => flip()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } }}
            // Mouse only: a tap fires a synthetic enter AND a click, which would
            // flip the card and straight back.
            onPointerEnter={(e) => e.pointerType === 'mouse' && flip(true)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && flip(false)}
        >
            <div className={`relative w-full h-full transform-style-3d hero-flip ${flipped ? 'rotate-y-180' : ''}`}>
                <div aria-hidden={flipped} className={`${face} bg-white dark:bg-slate-800 flex flex-col shadow-sm`}>
                    <div className="relative h-[130px] shrink-0">
                        <Volcano className="absolute inset-0 w-full h-full" />
                    </div>
                    <div className="flex-1 px-5 flex flex-col items-center justify-center text-center gap-2">
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            {t('home.welcome')} <span className="font-bold text-turquoise">Atitlán Vibes</span>
                            {t('home.welcomeRest')}
                        </p>
                        <p className="text-xl font-black text-turquoise">
                            {t('home.findVibes')}&nbsp;<span className="sparkle" aria-hidden="true">✨</span>
                        </p>
                    </div>
                </div>

                <div aria-hidden={!flipped} className={`${face} rotate-y-180 bg-white dark:bg-slate-800 p-5 flex flex-col justify-center gap-2 shadow-inner`}>
                    <span className="self-start px-2.5 py-0.5 rounded-full bg-turquoise/15 text-xs font-bold text-teal-700 dark:text-turquoise">
                        {t('home.didYouKnow')}
                    </span>
                    <p className="text-base leading-snug font-medium text-gray-800 dark:text-gray-100 text-left">
                        {GUATEMALA_FACTS[fact][getLang() === 'es' ? 'es' : 'en']}
                    </p>
                </div>
            </div>
        </div>
    )
}
