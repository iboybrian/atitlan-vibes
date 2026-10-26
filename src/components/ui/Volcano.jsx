/**
 * Little animated volcano for the back of the Home hero card: smoke puffing out
 * of the crater, a glowing vent, the lake rippling at its foot, and a pigeon
 * (the mascot) flapping across the sky now and then.
 *
 * Plain SVG + the .volcano-* keyframes in index.css. Everything stops under
 * prefers-reduced-motion; the scene still reads fine frozen.
 */
export default function Volcano({ className = '' }) {
    return (
        <svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={className}>
            <defs>
                <linearGradient id="volcano-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7FE3E5" />
                    <stop offset="1" stopColor="#FFE4A3" />
                </linearGradient>
                <linearGradient id="volcano-cone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#64748B" />
                    <stop offset="1" stopColor="#3F6B4E" />
                </linearGradient>
                <linearGradient id="volcano-lake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#00CED1" />
                    <stop offset="1" stopColor="#0A8FA8" />
                </linearGradient>
                <filter id="volcano-soft"><feGaussianBlur stdDeviation="1.4" /></filter>
            </defs>

            <rect width="320" height="120" fill="url(#volcano-sky)" />
            <circle cx="62" cy="34" r="14" fill="#FFB800" opacity="0.9" />

            {/* the pigeon crossing the sky */}
            <g className="volcano-bird">
                <path className="volcano-wing" d="M0 0 q5 -5 10 0 q5 -5 10 0" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>

            {/* distant volcano */}
            <path d="M-10 104 Q40 66 62 54 L72 54 Q96 70 150 104 Z" fill="#94A3B8" opacity="0.7" />

            {/* smoke, behind the cone so it seems to come out of the crater */}
            <g filter="url(#volcano-soft)" fill="#F1F5F9">
                {[0, 1.2, 2.4, 3.6].map(delay => (
                    <circle key={delay} cx="196" cy="34" r="7" className="volcano-smoke" style={{ animationDelay: `${delay}s` }} />
                ))}
            </g>

            {/* main volcano, with a shaded right flank and a glowing vent */}
            <path d="M104 108 Q158 66 182 38 L210 38 Q236 66 300 108 Z" fill="url(#volcano-cone)" />
            <path d="M210 38 Q236 66 300 108 L222 108 Q214 70 200 40 Z" fill="#000" opacity="0.12" />
            <ellipse cx="196" cy="39" rx="13" ry="3" fill="#FB923C" className="volcano-glow" />

            {/* the lake at its foot */}
            <rect y="98" width="320" height="22" fill="url(#volcano-lake)" />
            <g stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" fill="none">
                <path className="volcano-wave" d="M40 108 q6 -3 12 0 t12 0" />
                <path className="volcano-wave" style={{ animationDelay: '-1.5s' }} d="M150 112 q6 -3 12 0 t12 0" />
                <path className="volcano-wave" style={{ animationDelay: '-3s' }} d="M250 107 q6 -3 12 0 t12 0" />
            </g>
        </svg>
    )
}
