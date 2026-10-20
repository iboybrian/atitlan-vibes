
import { useState } from 'react'

export default function FlipCard({ front, back, className = "" }) {
    const [isFlipped, setIsFlipped] = useState(false)

    return (
        <div
            className={`group perspective-1000 cursor-pointer ${className}`}
            onClick={() => setIsFlipped(!isFlipped)}
            // Mouse only: a tap fires a synthetic enter AND a click, which would
            // flip the card and straight back, so on a phone it never turned.
            onPointerEnter={(e) => e.pointerType === 'mouse' && setIsFlipped(true)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setIsFlipped(false)}
        >
            <div className={`relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden w-full h-full">
                    {front}
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden w-full h-full rotate-y-180 bg-white dark:bg-slate-800 rounded-3xl p-6 flex items-center justify-center text-center shadow-inner border border-gray-100 dark:border-slate-700">
                    {back}
                </div>
            </div>
        </div>
    )
}
