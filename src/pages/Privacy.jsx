
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { useT } from '../lib/i18n'

function Section({ title, children }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                {children}
            </div>
        </div>
    )
}

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

            <Section title={t('privacy.overview')}>
                <p>{t('privacy.overviewBody')}</p>
            </Section>

            <Section title={t('privacy.provide')}>
                <p><strong>{t('privacy.accountLabel')}</strong> {t('privacy.accountBody')}</p>
                <p><strong>{t('privacy.profileLabel')}</strong> {t('privacy.profileBody')}</p>
                <p><strong>{t('privacy.contentLabel')}</strong> {t('privacy.contentBody')}</p>
            </Section>

            <Section title={t('privacy.automatic')}>
                <p><strong>{t('privacy.tokenLabel')}</strong> {t('privacy.tokenBody')}</p>
                <p>{t('privacy.noTracking')}</p>
            </Section>

            <Section title={t('privacy.howWeUse')}>
                <p>{t('privacy.howWeUseBody')}</p>
            </Section>

            <Section title={t('privacy.whoSees')}>
                <p>{t('privacy.whoSeesBody')}</p>
            </Section>

            <Section title={t('privacy.thirdParty')}>
                <p>
                    {t('privacy.thirdPartyA')}<strong>Supabase</strong>
                    {t('privacy.thirdPartyB')}<strong>Capacitor</strong>
                    {t('privacy.thirdPartyC')}
                </p>
            </Section>

            <Section title={t('privacy.retention')}>
                <p>{t('privacy.retentionBody')}</p>
            </Section>

            <Section title={t('privacy.children')}>
                <p>{t('privacy.childrenBody')}</p>
            </Section>

            <Section title={t('privacy.changes')}>
                <p>{t('privacy.changesBody')}</p>
            </Section>

            <Section title={t('privacy.contact')}>
                <p>{t('privacy.contactBody')}</p>
                <a
                    href="https://wa.me/50253638941"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 bg-green-500 text-white font-bold py-2 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-green-600 transition-all"
                >
                    {t('common.contactWhatsApp')}
                </a>
            </Section>
        </div>
    )
}
