import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useTowns } from '../../lib/towns'
import { dayPhase } from '../../lib/utils'
import { useT } from '../../lib/i18n'

/**
 * Home's illustrated Lake Atitlán, seen from above. Towns sit at their real
 * towns.lat/lng; the lake's light follows the hour in Guatemala (dawn, day,
 * dusk, night — at night the towns light up). Towns with events today pulse
 * and show how many. Towns off the lake (Antigua, the capital) don't fit the
 * picture, so they get plain buttons under it.
 *
 * Stylized, not cartographic: the window below is stretched to fill the panel.
 */
const W = 360
const H = 230
const LNG0 = -91.30, LNG1 = -91.08, LAT0 = 14.57, LAT1 = 14.78

const project = (lat, lng) => [
    (lng - LNG0) / (LNG1 - LNG0) * W,
    (LAT1 - lat) / (LAT1 - LAT0) * H
]
const onLake = (t) => t.lat >= LAT0 && t.lat <= LAT1 && t.lng >= LNG0 && t.lng <= LNG1

// Shoreline, clockwise from Panajachel, including the Santiago inlet.
const SHORE = [
    [14.748, -91.160], [14.742, -91.130], [14.725, -91.112], [14.700, -91.103],
    [14.675, -91.115], [14.662, -91.150], [14.660, -91.185], [14.652, -91.205],
    [14.632, -91.222], [14.645, -91.240], [14.663, -91.250], [14.675, -91.262],
    [14.688, -91.282], [14.705, -91.282], [14.722, -91.265], [14.735, -91.240],
    [14.745, -91.205]
]

// San Pedro, Tolimán, Atitlán: [lat, lng, height in panel units]. The last two
// are nudged apart: at their true spots one cone sits on top of the other.
const VOLCANOES = [[14.656, -91.266, 26], [14.616, -91.205, 30], [14.600, -91.158, 38]]

/** Closed Catmull-Rom curve through the points, as cubic Béziers. */
function smoothClosed(points) {
    const n = points.length
    const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
    let d = `M${f(points[0])}`
    for (let i = 0; i < n; i++) {
        const [p0, p1, p2, p3] = [-1, 0, 1, 2].map(k => points[(i + k + n) % n])
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
        d += ` C${f(c1)} ${f(c2)} ${f(p2)}`
    }
    return d + 'Z'
}

const LAKE = smoothClosed(SHORE.map(([lat, lng]) => project(lat, lng)))

const PALETTE = {
    dawn: { land: '#F3E3EA', water: ['#FBC4D4', '#7FB6DA'], cone: '#D8B9CF', ink: '#3B2440', halo: '#FFFFFF', pin: '#FFFFFF' },
    day: { land: '#DCEFD8', water: ['#5FE3E5', '#0AA7C2'], cone: '#A9CFA4', ink: '#0F3B47', halo: '#FFFFFF', pin: '#FFFFFF' },
    dusk: { land: '#F6DCC0', water: ['#FFB27A', '#7A5AA6'], cone: '#D9AE8C', ink: '#4A2618', halo: '#FFF7ED', pin: '#FFFFFF' },
    night: { land: '#121A2C', water: ['#24589C', '#123062'], cone: '#25314D', ink: '#F8FAFC', halo: '#0A1630', pin: '#FFB800' }
}

// Fixed, so the sky doesn't reshuffle on every render.
const STARS = [[18, 16], [40, 30], [300, 18], [330, 40], [345, 12], [270, 196], [320, 170], [20, 200], [150, 14], [345, 120]]

// Two pins sit close on the north-west shore; these labels go above instead.
const LABEL_ABOVE = new Set(['Tzununa', 'Panajachel'])
const shortName = (name) => name.replace(/ La Laguna$/, '')

export default function LakeMap({ todayByTown = {} }) {
    const t = useT()
    const towns = useTowns()
    const navigate = useNavigate()
    // ponytail: phase is read on render, so an app left open across sunset keeps
    // the old light until the next render. Add a timer if anyone ever notices.
    const phase = dayPhase()
    const c = PALETTE[phase]

    const lakeTowns = towns.filter(onLake)
    const elsewhere = towns.filter(town => !onLake(town))
    const go = (id) => navigate(`/town/${id}`)

    return (
        <div className="max-w-xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden shadow-sm">
                <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label={t(`lake.${phase}`)}>
                    <defs>
                        <linearGradient id="lake-water" x1="0" y1="0" x2="0.4" y2="1">
                            <stop offset="0" stopColor={c.water[0]} />
                            <stop offset="1" stopColor={c.water[1]} />
                        </linearGradient>
                        <clipPath id="lake-clip"><path d={LAKE} /></clipPath>
                    </defs>

                    <rect width={W} height={H} fill={c.land} style={{ transition: 'fill 600ms' }} />

                    {phase === 'night' && STARS.map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.5} fill="#F8FAFC" className="twinkle"
                            style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
                    ))}

                    {/* Volcanoes first: where a cone meets the shore, the water covers it. */}
                    {VOLCANOES.map(([lat, lng, h]) => {
                        const [x, y] = project(lat, lng)
                        return (
                            <g key={lat}>
                                <path d={`M${x - h * 0.8},${y + 6} L${x},${y - h} L${x + h * 0.8},${y + 6} Z`} fill={c.cone} />
                                <path d={`M${x},${y - h} L${x + h * 0.8},${y + 6} L${x + h * 0.15},${y + 6} Z`} fill="#000" opacity="0.08" />
                            </g>
                        )
                    })}

                    <path d={LAKE} fill="url(#lake-water)" />

                    {/* A few slow ripples, kept inside the shoreline */}
                    <g clipPath="url(#lake-clip)" stroke={phase === 'night' ? '#F8FAFC' : '#FFFFFF'} strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" fill="none">
                        <path className="lake-wave" d="M150 70 q8 -4 16 0 t16 0" />
                        <path className="lake-wave" style={{ animationDelay: '-2s' }} d="M210 95 q8 -4 16 0 t16 0" />
                        <path className="lake-wave" style={{ animationDelay: '-3.5s' }} d="M120 110 q8 -4 16 0 t16 0" />
                        {phase === 'night' && <ellipse cx="250" cy="80" rx="22" ry="3" stroke="none" fill="#FFF7D6" opacity="0.25" />}
                    </g>

                    {lakeTowns.map(town => {
                        const [x, y] = project(town.lat, town.lng)
                        const count = todayByTown[town.id] || 0
                        const above = LABEL_ABOVE.has(town.name)
                        const label = shortName(town.name)
                        return (
                            <g
                                key={town.id}
                                role="link"
                                tabIndex={0}
                                aria-label={count ? `${town.name}: ${t('lake.today', { n: count })}` : town.name}
                                onClick={() => go(town.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(town.id) } }}
                                className="cursor-pointer outline-none [&:focus-visible>circle:first-of-type]:stroke-turquoise"
                            >
                                {/* Generous invisible hit target: a 10px dot is too small for a thumb */}
                                <circle cx={x} cy={y} r="18" fill="transparent" stroke="transparent" strokeWidth="3" />
                                {count > 0 && <circle cx={x} cy={y} r="6" fill={phase === 'night' ? '#FFB800' : '#00CED1'} className="lake-pulse" />}
                                {phase === 'night' && <circle cx={x} cy={y} r="11" fill="#FFB800" opacity="0.25" />}
                                <circle cx={x} cy={y} r="5" fill={c.pin} stroke={phase === 'night' ? '#FFF7D6' : '#0F3B47'} strokeWidth="1.5" />
                                <text
                                    x={above ? x : x + 8}
                                    y={above ? y - 10 : y + 16}
                                    textAnchor={above ? 'middle' : 'start'}
                                    fontSize="11"
                                    fontWeight="800"
                                    fill={c.ink}
                                    stroke={c.halo}
                                    strokeWidth="3"
                                    paintOrder="stroke"
                                    strokeLinejoin="round"
                                >
                                    {label}
                                </text>
                                {count > 0 && (
                                    <g>
                                        <circle cx={x + 7} cy={y - 7} r="6.5" fill="#FFB800" stroke={c.halo} strokeWidth="1.5" />
                                        <text x={x + 7} y={y - 4.3} textAnchor="middle" fontSize="8" fontWeight="900" fill="#111827">{count}</text>
                                    </g>
                                )}
                            </g>
                        )
                    })}
                </svg>

                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${phase === 'night' ? 'bg-white/15 text-white' : 'bg-white/70 text-gray-800'}`}>
                    {t(`lake.${phase}`)}
                </span>
            </div>

            {elsewhere.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {elsewhere.map(town => (
                        <button
                            key={town.id}
                            type="button"
                            onClick={() => go(town.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm transition-transform duration-150 ease-out motion-safe:active:scale-95"
                        >
                            <MapPin size={14} className="text-turquoise" />
                            {town.name}
                            {todayByTown[town.id] > 0 && (
                                <span className="ml-0.5 min-w-5 h-5 px-1.5 rounded-full bg-sunflower text-gray-900 text-[11px] font-black flex items-center justify-center">
                                    {todayByTown[town.id]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
