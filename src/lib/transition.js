import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'

/**
 * Card photo -> event hero morph, with the View Transitions API.
 *
 * Done by hand because react-router's <Link viewTransition> only works under a
 * data router, and this app uses <BrowserRouter>. The event page's hero is
 * always named 'event-hero'; this names the tapped card's photo the same just
 * before navigating, so the browser morphs that one picture. Naming every card
 * up front would break it: a name must be unique on the page.
 *
 * Returns an onClick for a <Link>. Without the API (old WebViews), or on a
 * modified click (new tab), it does nothing and the Link navigates normally.
 */
export function useHeroLink() {
    const navigate = useNavigate()

    return (to, state) => (e) => {
        if (!document.startViewTransition || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        const img = e.currentTarget.querySelector('img')
        if (img) img.style.viewTransitionName = 'event-hero'
        // flushSync: the browser snapshots the new page when this callback
        // returns, so React must have rendered it by then.
        document.startViewTransition(() => flushSync(() => navigate(to, { state })))
    }
}
