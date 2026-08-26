
import { useT } from '../../lib/i18n'

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

/**
 * The policy body, minus any page chrome. Lives here because two places show it:
 * the /privacy route and the consent modal on the sign-up form. Play Store review
 * has to find the same text at a real URL, so neither copy may drift.
 */
export default function PrivacyContent() {
    const t = useT()

    return (
        <>
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
        </>
    )
}
