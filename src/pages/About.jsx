
import { useState } from 'react'
import { ChevronDown, MessageCircle, Info } from 'lucide-react'

// Accordion Component
function Accordion({ label, children, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
                <span className="font-bold text-gray-900">{label}</span>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-4 pb-4 border-t border-gray-100">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default function About() {
    return (
        <div className="px-4 py-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-turquoise/10 flex items-center justify-center">
                    <Info size={24} className="text-turquoise" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">About</h1>
                    <p className="text-sm text-gray-500">Learn more about Atitlán Vibes</p>
                </div>
            </div>

            {/* Section 1: About Atitlán Vibes */}
            <Accordion label="About Atitlán Vibes" defaultOpen={true}>
                <div className="pt-4 space-y-4">
                    <h2 className="text-xl font-black text-gray-900 leading-tight">
                        Atitlán Vibes — Know What's Happening
                    </h2>

                    <p className="text-gray-600 leading-relaxed">
                        Atitlán Vibes is the pulse of the lake. It's a community-powered map that shows you exactly what's happening right now and this weekend in every town around the water.
                    </p>

                    <div className="pt-2">
                        <h3 className="font-bold text-gray-800 mb-3">Why you'll love it:</h3>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-turquoise mb-1">🔍 The 'Vibe' Search</h4>
                                <p className="text-sm text-gray-600">
                                    Whether you want a wild night in San Pedro or a quiet yoga workshop in San Marcos, you can filter by town and find your flow in seconds.
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-turquoise mb-1">🔇 Zero Noise</h4>
                                <p className="text-sm text-gray-600">
                                    No more 'Good morning' messages or random chat clutter. Just high-quality posters, times, prices, and direct links to the organizers' Instagrams or WhatsApps.
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-turquoise mb-1">🎨 Be the Creator</h4>
                                <p className="text-sm text-gray-600">
                                    If you're hosting a jam session at your house or a workshop at your hostel, you can upload it in 30 seconds. You don't need to be a promoter; you just need a vibe to share.
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-turquoise mb-1">🌋 The 'Inside' Track</h4>
                                <p className="text-sm text-gray-600">
                                    It's built by people who live here for people who love it here. It's the easiest way to make sure you never miss that 'one legendary night' everyone talks about the next morning.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Accordion>

            {/* Section 2: Contact Us */}
            <Accordion label="Contact Us">
                <div className="pt-4">
                    <p className="text-gray-600 mb-4">
                        Have questions, feedback, or want to collaborate? We'd love to hear from you!
                    </p>
                    <a
                        href="https://wa.me/50253638941"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:bg-green-600 transition-all active:scale-[0.98]"
                    >
                        <MessageCircle size={20} />
                        <span>Contact us on WhatsApp</span>
                    </a>
                </div>
            </Accordion>

            {/* App Info */}
            <div className="mt-10 text-center text-xs text-gray-400">
                <p>Atitlán Vibes v1.0.0</p>
                <p className="mt-1">Made with 🌋 in Lake Atitlán</p>
            </div>
        </div>
    )
}
