import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useT } from '../../lib/i18n'

// Closes a guest's today/tomorrow list: everything past tomorrow needs an account.
export default function LoginNudge() {
    const t = useT()
    return (
        <div className="mt-6 p-6 bg-white dark:bg-slate-800 rounded-2xl text-center shadow-sm border-2 border-dashed border-turquoise/30">
            <Lock size={24} className="mx-auto mb-2 text-turquoise" />
            <p className="text-gray-700 dark:text-gray-200 font-medium mb-4">{t('guest.seeMore')}</p>
            <Link to="/auth" className="inline-block px-6 py-2.5 bg-turquoise text-white font-bold rounded-xl shadow-sm">
                {t('common.logIn')}
            </Link>
        </div>
    )
}
