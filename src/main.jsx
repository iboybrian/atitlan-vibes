import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as CapacitorApp } from '@capacitor/app'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase'
import { isNative } from './lib/pushNotifications'

// Native OAuth return leg. Google runs in the system browser, so the redirect comes
// back through the com.atitlanvibes:// intent — never through the WebView's own URL,
// which is why detectSessionInUrl can't see it. The client is on PKCE, so what
// arrives is a one-shot ?code=; exchangeCodeForSession trades it for the session
// using the code_verifier signInWithOAuth stashed in this WebView's localStorage.
if (isNative()) {
  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    const code = new URLSearchParams(url.split('?')[1] || '').get('code')
    if (!code) return
    // onAuthStateChange in AuthContext takes it from here.
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) return console.error('OAuth code exchange failed:', error.message)
      // A recovery link and a Google login arrive through the same deep link and
      // both notify SIGNED_IN — under PKCE, PASSWORD_RECOVERY is never emitted.
      // redirectType is the only thing that tells them apart.
      // ponytail: full reload to hand off to the router, which lives out of reach
      // here; the listener has to be registered before React mounts or a cold
      // start from the intent misses the event entirely.
      if (data?.redirectType === 'PASSWORD_RECOVERY') {
        window.location.replace('/reset-password')
      }
    })
  })
}

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration.scope)
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error)
      })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

