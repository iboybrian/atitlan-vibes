
import { useState } from 'react'
import { ChevronDown, MessageCircle, Info } from 'lucide-react'
import { useT } from '../lib/i18n'

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
    const t = useT()
    return (
        <div className="px-4 py-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-turquoise/10 flex items-center justify-center">
                    <Info size={24} className="text-turquoise" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{t('about.title')}</h1>
                    <p className="text-sm text-gray-500">{t('about.subtitle')}</p>
                </div>
            </div>

            {/* Section 1: About Atitlán Vibes */}
            <Accordion label={t('about.section1')} defaultOpen={true}>
                <div className="pt-4 space-y-4">
                    <h2 className="text-xl font-black text-gray-900 leading-tight">
                        {t('about.heading')}
                    </h2>

                    <p className="text-gray-600 leading-relaxed">{t('about.intro')}</p>

                    <div className="pt-2">
                        <h3 className="font-bold text-gray-800 mb-3">{t('about.whyLove')}</h3>

                        <div className="space-y-4">
                            {['vibeSearch', 'zeroNoise', 'creator', 'inside'].map(key => (
                                <div key={key} className="bg-gray-50 p-4 rounded-xl">
                                    <h4 className="font-bold text-turquoise mb-1">{t(`about.${key}`)}</h4>
                                    <p className="text-sm text-gray-600">{t(`about.${key}Body`)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Accordion>

            {/* Section 2: Contact Us */}
            <Accordion label={t('about.contact')}>
                <div className="pt-4">
                    <p className="text-gray-600 mb-4">{t('about.contactBody')}</p>
                    <a
                        href="https://wa.me/50253638941"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:bg-green-600 transition-all active:scale-[0.98]"
                    >
                        <MessageCircle size={20} />
                        <span>{t('common.contactWhatsApp')}</span>
                    </a>
                </div>
            </Accordion>

            {/* App Info */}
            <div className="mt-10 text-center text-xs text-gray-400">
                <p>Atitlán Vibes v1.0.0</p>
                <p className="mt-1">{t('common.madeWith')}</p>
            </div>
        </div>
    )
}
