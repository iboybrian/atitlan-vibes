
import { useState } from 'react'

export default function FlipCard({ front, back, className = "" }) {
    const [isFlipped, setIsFlipped] = useState(false)

    return (
        <div
            className={`group perspective-1000 cursor-pointer ${className}`}
            onClick={() => setIsFlipped(!isFlipped)}
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden w-full h-full">
                    {front}
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden w-full h-full rotate-y-180 bg-white rounded-3xl p-6 flex items-center justify-center text-center shadow-inner border border-gray-100">
                    {back}
                </div>
            </div>
        </div>
    )
}
