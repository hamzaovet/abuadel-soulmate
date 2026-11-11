/* eslint-disable no-restricted-globals */
// Service Worker for Abu Adel & Soulmate VIP — PWA Install + Background Web Push Notifications

const SW_VERSION = "abuadel-soulmate-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

// Minimal fetch pass-through (satisfies Chromium PWA installability without stale-cache traps on live POS/API)
self.addEventListener("fetch", () => {
  // Intentionally delegate directly to network so live POS/Admin data stays 100% real-time.
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "حلواني أبو عادل & سول ميت VIP",
    body: "لديك إشعار جديد في المنظومة",
    url: "/",
    tag: "abuadel-soulmate-alert",
    requireInteraction: false,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      try {
        payload.body = event.data.text() || payload.body;
      } catch {
        // Keep defaults
      }
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    tag: payload.tag || "abuadel-soulmate-alert",
    renotify: true,
    silent: false,
    requireInteraction: Boolean(payload.requireInteraction),
    vibrate: [220, 90, 220, 90, 320],
    dir: "rtl",
    lang: "ar",
    timestamp: Date.now(),
    data: {
      url: payload.url || "/",
      tag: payload.tag,
    },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title, options);
      try {
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clientList) {
          client.postMessage({ type: "PUSH_RECEIVED", payload });
        }
      } catch {
        // Ignore client broadcast errors
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const origin = self.location.origin;
      const fullTarget = targetUrl.startsWith("http")
        ? targetUrl
        : new URL(targetUrl, origin).href;

      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (client.url.startsWith(origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== fullTarget) {
            try {
              await client.navigate(fullTarget);
            } catch {
              // Some browsers restrict navigate on certain frames
            }
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(fullTarget);
      }
    })()
  );
});
