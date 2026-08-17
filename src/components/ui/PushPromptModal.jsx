
import { useState } from 'react'
import { X, Bell, BellOff, Settings } from 'lucide-react'
import {
    requestPushPermission,
    savePushToken,
    markPushPromptShown,
    isPushSupported
} from '../../lib/pushNotifications'
import { useT } from '../../lib/i18n'

export default function PushPromptModal({ isOpen, onClose, userId }) {
    const t = useT()
    const [status, setStatus] = useState('idle') // idle, loading, success, denied, error
    const [errorMessage, setErrorMessage] = useState('')

    if (!isOpen) return null

    const handleEnable = async () => {
        setStatus('loading')

        const result = await requestPushPermission()

        if (result.success && result.token) {
            console.log('Mobile Push Token Captured:', result.token)

            // Save to database
            const saved = await savePushToken(userId, result.token)

            if (saved) {
                setStatus('success')
                markPushPromptShown()
                // Auto-close after success
                setTimeout(() => onClose(), 2000)
            } else {
                setStatus('error')
                setErrorMessage(t('push.savePrefsFailed'))
            }
        } else if (result.error === 'denied') {
            setStatus('denied')
            setErrorMessage(result.message)
            markPushPromptShown()
        } else {
            setStatus('error')
            setErrorMessage(result.error || t('push.wrong'))
            markPushPromptShown() // don't re-prompt on every login after a failure
        }
    }

    const handleSkip = () => {
        markPushPromptShown()
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

                {/* Header with icon */}
                <div className="bg-gradient-to-br from-turquoise to-turquoise/80 p-6 text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell size={32} className="text-white" />
                    </div>
                    <h2 className="text-xl font-black">{t('push.title')}</h2>
                </div>

                {/* Body */}
                <div className="p-6">
                    {status === 'idle' && (
                        <>
                            <p className="text-gray-600 dark:text-gray-300 text-center mb-6 leading-relaxed">
                                {t('push.bodyStart')}<span className="font-bold">{t('push.boat')}</span>,{' '}
                                <span className="font-bold">{t('push.reminders')}</span>,{' '}
                                <span className="font-bold">{t('push.replies')}</span>.
                            </p>

                            {!isPushSupported() && (
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-xl p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
                                    {t('push.unsupported')}
                                </div>
                            )}

                            <button
                                onClick={handleEnable}
                                className="w-full py-3 bg-turquoise text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] mb-3"
                            >
                                {t('push.enable')}
                            </button>

                            <button
                                onClick={handleSkip}
                                className="w-full py-2 text-gray-400 dark:text-gray-500 font-medium text-sm hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                {t('push.later')}
                            </button>
                        </>
                    )}

                    {status === 'loading' && (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 border-4 border-turquoise border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-300">{t('push.requesting')}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('push.allSet')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('push.allSetBody')}</p>
                        </div>
                    )}

                    {status === 'denied' && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BellOff size={32} className="text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('push.blocked')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{errorMessage}</p>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl">
                                <Settings size={14} />
                                <span>{t('push.deviceSettings')}</span>
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-4 px-6 py-2 text-gray-500 dark:text-gray-400 font-medium text-sm hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                {t('push.gotIt')}
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('push.wrong')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{errorMessage}</p>

                            <button
                                onClick={() => setStatus('idle')}
                                className="px-6 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600"
                            >
                                {t('push.tryAgain')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Close button (only show in idle state) */}
                {status === 'idle' && (
                    <button
                        onClick={handleSkip}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    )
}
