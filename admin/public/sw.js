// Service worker des notifications push de Galimo Pharmacie.
// Il reçoit l'alerte envoyée par le serveur, même quand la page est fermée.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}

  event.waitUntil(
    (async () => {
      // Si la page pharmacien est déjà ouverte au premier plan, elle affiche
      // elle-même le message et le son : inutile de doubler avec une notification.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((c) => c.visibilityState === "visible" && c.focused)) return;

      await self.registration.showNotification(data.title || "Galimo Pharmacie", {
        body: data.body || "",
        tag: data.tag,
        data: { url: data.url || "/pharmacien" },
        requireInteraction: true,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/pharmacien";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of windows) {
        if (c.url.includes("/pharmacien") && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
