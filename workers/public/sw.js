// Replaces the old Next/PWA worker, evicts its caches, and releases controlled pages.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(key => /^(workbox|next|yourself|start-url|pages|static|images|google-fonts)/i.test(key)).map(key => caches.delete(key)));
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({type: 'window'})) await client.navigate(client.url);
})()));
