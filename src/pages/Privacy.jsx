
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

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
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Privacy Policy</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: July 25, 2026</p>
                    </div>
                </div>
            </div>

            <Section title="Overview">
                <p>
                    Atitlán Vibes ("we", "our", "the app") is a community events app for the towns
                    around Lake Atitlán, Guatemala. This policy explains what information we collect
                    when you use the app, why we collect it, and the choices you have.
                </p>
            </Section>

            <Section title="Information you provide">
                <p><strong>Account.</strong> Email and password, or your name, email, and profile photo if you sign in with Google or Apple.</p>
                <p><strong>Profile.</strong> First and last name, country, avatar photo, Instagram handle, house affinity, and traveler type — all optional, set on the Profile screen.</p>
                <p><strong>Content you post.</strong> Events you submit (name, description, dates, venue, cost, contact phone/link, cover photo) and messages you send in town chat rooms, including read receipts on reactions.</p>
            </Section>

            <Section title="Information collected automatically">
                <p><strong>Push notification token.</strong> If you enable push notifications, a device or browser token is stored so we can send you notifications. You can turn this off anytime in Settings.</p>
                <p>
                    We do not use analytics, advertising, or tracking SDKs of any kind. We do not
                    sell your data.
                </p>
            </Section>

            <Section title="How we use your information">
                <p>To create and secure your account, show your profile and posts to other users, run the town chat rooms, moderate submitted events before they go live, and — if enabled — send you push notifications.</p>
            </Section>

            <Section title="Who can see your information">
                <p>Your display name, avatar, and house affinity are visible to other signed-in users, since the app is a shared community space. Events you post are public once approved. Chat messages are visible to other members of that town's chat. Your email and phone number are never shown to other users.</p>
            </Section>

            <Section title="Third-party services">
                <p>
                    We use <strong>Supabase</strong> to host our database, authentication, and file
                    storage (profile photos and event images) — your data is processed on their
                    infrastructure. If you sign in with Google or Apple, they process your sign-in
                    per their own privacy policies. The Android app is packaged with{' '}
                    <strong>Capacitor</strong>, which does not itself collect or transmit data.
                </p>
            </Section>

            <Section title="Data retention & deletion">
                <p>
                    We keep your account and content for as long as your account is active. To
                    delete your account and associated data, contact us using the details below —
                    we do not currently offer automatic in-app deletion, but will process your
                    request promptly.
                </p>
            </Section>

            <Section title="Children's privacy">
                <p>Atitlán Vibes is not directed at children under 13, and we do not knowingly collect information from them.</p>
            </Section>

            <Section title="Changes to this policy">
                <p>We may update this policy as the app changes. Material changes will be reflected by updating the date above.</p>
            </Section>

            <Section title="Contact us">
                <p>Questions about this policy or your data:</p>
                <a
                    href="https://wa.me/50253638941"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 bg-green-500 text-white font-bold py-2 px-4 rounded-xl shadow-sm hover:shadow-md hover:bg-green-600 transition-all"
                >
                    Contact us on WhatsApp
                </a>
            </Section>
        </div>
    )
}
