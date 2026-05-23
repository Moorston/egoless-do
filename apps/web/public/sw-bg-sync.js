// ─── Background Sync event handler (registered alongside main SW) ─
// This file is registered separately from the next-pwa generated sw.js
// to handle Background Sync API events.

self.addEventListener('sync', (event) => {
  if (event.tag === 'egoless-do-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_REQUEST' });
  }
}
