const V = 'kairos-cathedral-restored-20261110-1';
const SHELL = [
  './', 'index.html', 'style.css', 'ios.css', 'world-theme.css', 'world-theme.css?v=forest-gold-world-books-20261110-3', 'app.js', 'personal.js',
  'upgrade.js', 'kairos.js', 'aevum-3d.js', 'aevum-3d.js?v=cathedral-restored-20261110-1', 'images/kairos-rosary.svg', 'images/kairos-bible.svg', 'images/kairos-home-landscape.svg', 'config.js', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const ours = u.origin === location.origin || u.hostname === 'cdn.jsdelivr.net';
  if (e.request.method !== 'GET' || !ours) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return net.catch(() => hit);
  }));
});
