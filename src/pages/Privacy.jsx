
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import PrivacyContent from '../components/ui/PrivacyContent'
import { useT } from '../lib/i18n'

export default function Privacy() {
    const t = useT()
    return (
        <div className="px-4 py-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link to="/" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                    <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-turquoise/10 flex items-center justify-center">
                        <Shield size={24} className="text-turquoise" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('privacy.title')}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('privacy.updated')}</p>
                    </div>
                </div>
            </div>

            <PrivacyContent />
        </div>
    )
}
