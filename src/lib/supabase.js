
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// PKCE over the supabase-js default (implicit): the OAuth return leg carries a
// short-lived ?code= instead of the real tokens, so no access_token ever lands in
// a URL or the system browser's history. Costs one extra step — the code has to be
// exchanged for a session, which detectSessionInUrl does on web but main.jsx has
// to do by hand for the native deep link.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { flowType: 'pkce' }
})
