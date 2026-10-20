/**
 * The mascot. Drawn inline so it themes with the app and costs no request:
 * blue-grey body, the brand turquoise as the iridescent neck sheen, sunflower beak.
 *
 * mood="peck"  — pecking at the ground: something is loading.
 * mood="sleep" — dozing with z's: there's nothing here (empty states).
 *
 * Animations live in index.css (.pigeon-peck / .pigeon-sleep) and stop under
 * prefers-reduced-motion. Decorative: the caption next to it carries the meaning.
 */
export default function Pigeon({ mood = 'peck', size = 96, className = '' }) {
    const asleep = mood === 'sleep'

    return (
        <svg
            viewBox="0 0 120 100"
            width={size}
            height={size * 100 / 120}
            aria-hidden="true"
            overflow="visible" // the z's float above the box
            className={`pigeon-${mood} ${className}`}
        >
            <ellipse cx="58" cy="92" rx="34" ry="4" className="fill-black/10 dark:fill-black/30" />

            <g className="pigeon-body">
                {/* legs */}
                <path d="M50 78 L48 90 M48 90 L44 92 M48 90 L52 92 M64 78 L66 90 M66 90 L62 92 M66 90 L70 92"
                    stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* tail */}
                <path d="M28 58 L6 66 L10 72 L30 70 Z" fill="#64748B" />
                {/* body */}
                <ellipse cx="56" cy="62" rx="32" ry="20" fill="#94A3B8" />
                {/* wing with its two dark bars */}
                <path d="M34 56 Q52 44 74 54 Q66 72 40 70 Q32 66 34 56 Z" fill="#7C8BA1" />
                <path d="M44 58 Q54 56 64 60 M42 63 Q52 61 62 65" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>

            {/* head + neck, pivots at the base of the neck when pecking */}
            <g className="pigeon-head" transform={asleep ? 'rotate(18 78 50)' : undefined}>
                <path d="M70 58 Q68 40 80 30 Q90 40 86 56 Z" fill="#94A3B8" />
                {/* neck sheen */}
                <path d="M71 54 Q70 44 78 38 Q84 46 82 54 Z" fill="#00CED1" opacity="0.75" />
                <circle cx="84" cy="28" r="12" fill="#A3B1C2" />
                {/* beak */}
                <path d="M95 27 L104 30 L95 32 Z" fill="#FFB800" />
                <circle cx="96" cy="27" r="1.6" fill="#F8FAFC" />
                {asleep ? (
                    <path d="M84 27 Q88 30 92 27" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
                ) : (
                    <>
                        <circle cx="88" cy="25" r="3.6" fill="#F97316" />
                        <circle cx="88.6" cy="25" r="1.8" fill="#1E293B" />
                    </>
                )}
            </g>

            {asleep && (
                <g className="fill-slate-400" fontFamily="inherit" fontWeight="800">
                    <text className="pigeon-z" x="96" y="18" fontSize="15">z</text>
                    <text className="pigeon-z" x="104" y="12" fontSize="12">z</text>
                    <text className="pigeon-z" x="111" y="7" fontSize="9">z</text>
                </g>
            )}
        </svg>
    )
}

/** Pecking pigeon over a caption — drop-in replacement for a "Loading..." line. */
export function PigeonLoading({ label }) {
    return (
        <div role="status" className="flex flex-col items-center gap-2 py-10 text-gray-500 dark:text-gray-400">
            <Pigeon mood="peck" />
            <p className="text-sm font-medium">{label}</p>
        </div>
    )
}
