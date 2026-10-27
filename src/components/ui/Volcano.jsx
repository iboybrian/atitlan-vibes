import { dayPhase } from '../../lib/utils'

// Same four lights as the Home lake map (dayPhase(), Guatemala time).
const PALETTE = {
    dawn: { sky: ['#F9A8D4', '#FDE68A'], sun: '#FDBA74', sunY: 92, far: '#A78BFA', cone: ['#6B7280', '#4B5563'], lake: ['#5EC8D6', '#2C8FA8'], smoke: '#FFF1F2', glow: 0.8 },
    day: { sky: ['#7FE3E5', '#FFE4A3'], sun: '#FFB800', sunY: 64, far: '#94A3B8', cone: ['#64748B', '#3F6B4E'], lake: ['#00CED1', '#0A8FA8'], smoke: '#F1F5F9', glow: 0.7 },
    dusk: { sky: ['#7C3AED', '#FB923C'], sun: '#FDBA74', sunY: 98, far: '#6D28D9', cone: ['#3F3F5A', '#27273D'], lake: ['#4C5BA8', '#2E2F6B'], smoke: '#E9D5FF', glow: 1 },
    night: { sky: ['#0B1D3A', '#1E3A5F'], sun: null, sunY: 0, far: '#1E293B', cone: ['#1E293B', '#0F172A'], lake: ['#0E4A6B', '#082F49'], smoke: '#94A3B8', glow: 1 }
}

const STARS = [[20, 18], [48, 40], [96, 14], [130, 34], [168, 10], [238, 22], [270, 46], [300, 14], [112, 56], [290, 70]]

/**
 * Little animated volcano for the Home hero card: smoke puffing out of the
 * crater, a glowing vent, the lake rippling at its foot, and — by day — the
 * pigeon flapping across the sky. Sky, light and colors follow the hour at the
 * lake; at night there's a moon, stars and a hotter crater.
 *
 * Plain SVG + the .volcano-* keyframes in index.css. Everything stops under
 * prefers-reduced-motion; the scene still reads fine frozen.
 */
export default function Volcano({ className = '' }) {
    const phase = dayPhase()
    const c = PALETTE[phase]
    const night = phase === 'night'

    return (
        <svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={className}>
            <defs>
                <linearGradient id="volcano-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={c.sky[0]} />
                    <stop offset="1" stopColor={c.sky[1]} />
                </linearGradient>
                <linearGradient id="volcano-cone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={c.cone[0]} />
                    <stop offset="1" stopColor={c.cone[1]} />
                </linearGradient>
                <linearGradient id="volcano-lake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={c.lake[0]} />
                    <stop offset="1" stopColor={c.lake[1]} />
                </linearGradient>
                <radialGradient id="volcano-lava">
                    <stop offset="0" stopColor="#FDBA74" />
                    <stop offset="1" stopColor="#F97316" stopOpacity="0" />
                </radialGradient>
                <filter id="volcano-soft"><feGaussianBlur stdDeviation="1.4" /></filter>
            </defs>

            <rect width="320" height="150" fill="url(#volcano-sky)" />

            {night ? (
                <>
                    {STARS.map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.5} fill="#F8FAFC" className="twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
                    ))}
                    {/* crescent moon: a disc with a sky-colored disc over one side */}
                    <circle cx="62" cy="40" r="12" fill="#F8FAFC" />
                    <circle cx="68" cy="36" r="11" fill={c.sky[0]} />
                </>
            ) : (
                <circle cx="62" cy={c.sunY} r="14" fill={c.sun} opacity="0.9" />
            )}

            {/* the pigeon crossing the sky — it roosts at night */}
            {!night && (
                <g className="volcano-bird">
                    <path className="volcano-wing" d="M0 30 q5 -5 10 0 q5 -5 10 0" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round" />
                </g>
            )}

            {/* distant volcano */}
            <path d="M-10 134 Q40 96 62 84 L72 84 Q96 100 150 134 Z" fill={c.far} opacity="0.7" />

            {/* smoke, behind the cone so it seems to come out of the crater */}
            <g filter="url(#volcano-soft)" fill={c.smoke} opacity={night ? 0.75 : 1}>
                {[0, 1.2, 2.4, 3.6].map(delay => (
                    <circle key={delay} cx="196" cy="64" r="7" className="volcano-smoke" style={{ animationDelay: `${delay}s` }} />
                ))}
            </g>

            {/* main volcano, with a shaded right flank and a glowing vent */}
            <path d="M104 138 Q158 96 182 68 L210 68 Q236 96 300 138 Z" fill="url(#volcano-cone)" />
            <path d="M210 68 Q236 96 300 138 L222 138 Q214 100 200 70 Z" fill="#000" opacity="0.12" />
            {night && <ellipse cx="196" cy="66" rx="30" ry="14" fill="url(#volcano-lava)" className="volcano-glow" />}
            <ellipse cx="196" cy="69" rx="13" ry="3" fill="#FB923C" opacity={c.glow} className="volcano-glow" />

            {/* the lake at its foot */}
            <rect y="128" width="320" height="22" fill="url(#volcano-lake)" />
            {night && <path d="M170 132 h52" stroke="#FB923C" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />}
            <g stroke="#FFFFFF" strokeOpacity={night ? 0.35 : 0.6} strokeWidth="1.5" strokeLinecap="round" fill="none">
                <path className="volcano-wave" d="M40 138 q6 -3 12 0 t12 0" />
                <path className="volcano-wave" style={{ animationDelay: '-1.5s' }} d="M150 142 q6 -3 12 0 t12 0" />
                <path className="volcano-wave" style={{ animationDelay: '-3s' }} d="M250 137 q6 -3 12 0 t12 0" />
            </g>
        </svg>
    )
}
