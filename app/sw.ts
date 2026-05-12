import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Push notification listener
(self as any).addEventListener("push", (event: any) => {
  const data = event.data?.json();
  if (!data) return;

  const title = data.title || "BWD Online Update";
  const options = {
    body: data.body || "There is a new update for you.",
    icon: "/logo-main.jpg",
    badge: "/logo-main.jpg",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil((self as any).registration.showNotification(title, options));
});

// Notification click listener
(self as any).addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil(
    (self as any).clients.matchAll({ type: "window" }).then((clientList: any[]) => {
      const url = event.notification.data.url;
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if ((self as any).clients.openWindow) return (self as any).clients.openWindow(url);
    })
  );
});
