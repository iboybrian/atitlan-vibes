# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Atitlán Vibes — a mobile-first travel/events app for the Lake Atitlán towns (Guatemala). React 19 + Vite SPA, Supabase backend, wrapped for Android via Capacitor. UI copy is English; README/docs are Spanish.

## Commands

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run build` — production build to `dist/`
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run preview` — serve the built `dist/`

Android (Capacitor): `npm run build && npx cap sync` after web changes, then `npx cap open android`. `webDir` is `dist/`, appId `com.atitlanvibes` — this is the package name reserved on Play Store and can never change.

Supabase Edge Function: `npx supabase functions deploy notify-town`. Full setup (secrets, DB webhook, testing) in [supabase/functions/notify-town/README.md](supabase/functions/notify-town/README.md).

No test runner is configured.

## Environment

Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Read via `import.meta.env` in [src/lib/supabase.js](src/lib/supabase.js). Without these the app renders blank (session fetch hangs).

## Architecture

Routing is flat in [src/App.jsx](src/App.jsx): all routes nest under one `<Layout>` (`/`, `/town/:id`, `/town/:townId/chat`, `/event/:id`, `/auth`, `/profile`, `/settings`, `/about`). Deployed as an SPA — [vercel.json](vercel.json) rewrites all paths to `index.html`.

**Auth & global state** live in a single React context, [src/context/AuthContext.jsx](src/context/AuthContext.jsx) (`useAuth()`). It owns the Supabase session, the joined `userProfile` row, and dark mode. Two things to know:
- `AuthProvider` renders `{!loading && children}` — the whole app is gated on the initial `getSession()` resolving. A broken/missing Supabase env means nothing paints.
- `session` (auth) and `userProfile` (the `users` table row) are separate. After editing the profile, call `refreshProfile()` or the header/avatar goes stale.
- Dark mode is a `dark` class on `<html>` persisted to `localStorage`, matching Tailwind's `darkMode: 'class'`.

**Data layer** is direct Supabase calls from components/pages — no API layer, no data-fetching library. Each page does its own `supabase.from(...)` in a `useEffect`. Tables in use: `users`, `towns`, `events`, `chats`, `messages`, `message_reactions`. Events are gated on `is_approved` and (on Home) `is_feature`. Storage buckets: `avatars` (profile pics), `logo`. RLS lives in Supabase, not this repo — only the one migration under [supabase/migrations/](supabase/migrations/) is versioned here.

**"Current town"** is the single explicit choice the user makes ([TownPicker.jsx](src/components/ui/TownPicker.jsx), on Home). It writes two places: `localStorage.current_town` via `getCurrentTown()`/`setCurrentTown()` in [src/lib/utils.js](src/lib/utils.js) — so it works logged out — and `users.current_town_id` when signed in, which is what the push backend targets. Read the local mirror, not the DB, for UI. The footer highlight prefers the `/town/:id` route over the picked town.

**Realtime chat** — [src/pages/ChatRoom.jsx](src/pages/ChatRoom.jsx) subscribes to Postgres changes via `supabase.channel('messages-<chatId>')` and `reactions-<chatId>`. One `chats` row per town; messages and reactions hang off it.

**Push notifications** — native only, end to end. Web push is deliberately off: `isPushSupported()` in [src/lib/pushNotifications.js](src/lib/pushNotifications.js) returns `isNative()`, so in a browser the soft prompt never shows and no token is written (`public/sw.js` is dead weight kept for a future real VAPID setup).

- Client: Capacitor `@capacitor/push-notifications` gets an FCM token, stored on `users.push_token` / `push_enabled`. `register()` resolves *before* the token exists — it arrives on the `registration` event — so `registerForToken()` attaches listeners first and settles from there, with a 10s timeout. FCM rotates tokens, so `refreshPushToken()` runs on every mount of [Layout.jsx](src/components/layout/Layout.jsx) and silently no-ops unless already opted in.
- Server: [supabase/functions/notify-town/index.ts](supabase/functions/notify-town/index.ts) (Deno Edge Function), fired by a Supabase DB webhook on `events` INSERT+UPDATE. It mints a Google OAuth2 token from a service-account JWT and posts to FCM HTTP v1 token by token — there is no topic API in the Capacitor plugin. It notifies once, on the approval transition (new row already approved, or `is_approved` flipping false→true), and nulls tokens that come back `404 UNREGISTERED`.
- The soft-prompt (`PushPromptModal`) fires 2s after first login, gated by a `localStorage` flag.

## Conventions

- **One responsive shell, one width declaration**: everything renders inside a centered column that steps 450 → 576 → 672 → 896px across `sm`/`md`/`lg` ([src/components/layout/Layout.jsx](src/components/layout/Layout.jsx)). That line is the *only* place the shell width is written — child chrome inherits it, so never hardcode a shell width elsewhere.
- **Chrome uses `sticky`, not `fixed`**: `fixed` resolves against the viewport, so on tablet it detaches from the shell and stretches into the gutter. The footer ([TownFooter.jsx](src/components/layout/TownFooter.jsx)) is `sticky bottom-0` as the column's last flex child; the town-chat FAB ([TownDetail.jsx](src/pages/TownDetail.jsx)) is a `sticky bottom-24 flex justify-end h-0 pointer-events-none` row. Reuse those two patterns for any new pinned UI. Centered overlays (modals, the Profile toast) may stay `fixed` — viewport-centered equals shell-centered.
- **z-index tiers**: chrome (Header, TownFooter) is `z-40`; modals and the Sidebar are `z-50` and must cover chrome. Don't raise chrome.
- **Safe-area insets**: `index.html` sets `viewport-fit=cover` because Android 15 (targetSdk 36) forces edge-to-edge — the WebView draws under the status and gesture bars. Chrome pads itself: Header `pt-[env(safe-area-inset-top)]` with `box-content`, footer `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`. Any new pinned UI needs the same.
- **Grids reflow**: event card grids are `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. Prose/form pages (Profile, Settings, About, EventDetail) cap their own content at `max-w-2xl mx-auto` rather than stretching to the full shell.
- **Tailwind brand tokens** ([tailwind.config.js](tailwind.config.js)): `turquoise` `#00CED1`, `sunflower` `#FFB800`, `bg` `#F5F5F0`. Use these, not raw hex.
- **Images**: run any user/DB-supplied image URL through `getDirectImageUrl()` ([src/lib/utils.js](src/lib/utils.js)) — it rewrites Google Drive / Dropbox share links to direct-embed form and falls back to a placeholder.
- **Lint gotcha**: `no-unused-vars` ignores `^[A-Z_]` — capitalized/underscore identifiers won't flag as unused.
- **`android/app/google-services.json` stays committed** — it is Firebase *client* config, not a credential; without it the Gradle plugin skips and push breaks. The Firebase *service account* key is the secret: `.gitignore` blocks `*-service-account*.json` / `serviceAccountKey*.json`, and it belongs only in `supabase secrets`.
