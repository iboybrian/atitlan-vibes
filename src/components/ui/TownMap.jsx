import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Pin colors, most urgent first: something live, something featured, something on today.
const TONES = {
    live: 'bg-red-500 text-white',
    featured: 'bg-sunflower text-black',
    today: 'bg-turquoise text-white',
    none: 'bg-white text-gray-700'
}
const TIPS = { live: 'bg-red-500', featured: 'bg-sunflower', today: 'bg-turquoise', none: 'bg-white' }

const escapeHtml = (s) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

// The whole lake, for when no town is picked. Antigua and the capital are off
// to the east; the town pill flies there.
const LAKE = [[14.66, -91.30], [14.76, -91.10]]

/**
 * Street map with one pin per town, at towns.lat/lng — events have no
 * coordinates of their own. Plain Leaflet in an effect; react-leaflet would be a
 * second dependency for one map.
 *
 * pins: { [townId]: { tone, count } }. focus: the town to centre on.
 * interactive=false is the event page's mini map: no dragging, no zoom, no taps.
 *
 * `isolate` on the wrapper: Leaflet's panes carry z-index 400-1000, and without
 * a stacking context they would paint over the sticky header and tab bar.
 */
export default function TownMap({ towns, pins = {}, focus, onPick, interactive = true, zoom = 13, className = '' }) {
    const el = useRef(null)
    const map = useRef(null)
    const layer = useRef(null)

    useEffect(() => {
        const m = L.map(el.current, {
            zoomControl: interactive,
            dragging: interactive,
            touchZoom: interactive,
            doubleClickZoom: interactive,
            scrollWheelZoom: false,
            boxZoom: false,
            keyboard: interactive
        })
        // ponytail: OSM's public tiles, fine at this traffic with attribution. If
        // the APK's https://localhost referer gets blocked, swap this one URL.
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(m)
        m.fitBounds(LAKE)
        layer.current = L.layerGroup().addTo(m)
        map.current = m
        return () => m.remove()
    }, [interactive])

    // Cheap to rebuild: a handful of towns.
    useEffect(() => {
        layer.current.clearLayers()
        for (const town of towns) {
            if (town.lat == null || town.lng == null) continue
            const { tone = 'none', count = 0 } = pins[town.id] ?? {}
            const ring = focus?.id === town.id ? ' ring-2 ring-offset-2 ring-gray-900/40' : ''
            const icon = L.divIcon({
                className: '',
                iconSize: [0, 0],
                // Bottom-centre of the label sits on the coordinate.
                html: `<div class="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center">
                    <div class="flex items-center gap-1 px-2.5 py-1 rounded-full shadow-md text-xs font-bold whitespace-nowrap ${TONES[tone]}${ring}">
                        ${escapeHtml(town.name.replace(/ La Laguna$/, ''))}
                        ${count ? `<span class="min-w-[1rem] h-4 px-1 rounded-full bg-white/90 text-gray-900 text-[10px] font-black flex items-center justify-center">${count}</span>` : ''}
                    </div>
                    <div class="w-2.5 h-2.5 -mt-1.5 rotate-45 ${TIPS[tone]}"></div>
                </div>`
            })
            L.marker([town.lat, town.lng], { icon, interactive: !!onPick, keyboard: !!onPick, title: town.name })
                .on('click', () => onPick?.(town.id))
                .addTo(layer.current)
        }
    }, [towns, pins, focus, onPick])

    useEffect(() => {
        if (focus?.lat == null || focus?.lng == null) return
        map.current.setView([focus.lat, focus.lng], zoom, { animate: interactive })
    }, [focus?.id, focus?.lat, focus?.lng, zoom, interactive])

    return <div ref={el} className={`isolate z-0 bg-gray-200 dark:bg-slate-700 ${className}`} />
}
