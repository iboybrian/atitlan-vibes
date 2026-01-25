/**
 * Service Worker for Push Notifications
 * 
 * This file should be placed in the public folder
 * so it's accessible at the root of your domain.
 */

// Listen for push events
self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push received:', event);

    let data = {
        title: 'Atitlán Vibes',
        body: 'You have a new notification',
        icon: '/logo.png',
        badge: '/logo.png'
    };

    // Try to parse the push data
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now()
        },
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click:', event.action);

    event.notification.close();

    // Navigate to the URL specified in the notification data
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                // Check if there's already a window/tab open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Service worker activation
self.addEventListener('activate', function (event) {
    console.log('[Service Worker] Activated');
});

// Service worker installation  
self.addEventListener('install', function (event) {
    console.log('[Service Worker] Installed');
    self.skipWaiting();
});
