'use strict';

/* ============================================================
   زاد عبيدة — Service Worker  (v47)
   ضعه في جذر الموقع بجانب index.html (وليس داخل assets).
   ============================================================ */

const VERSION = 'v47';                       // ⚠️ غيّره عند كل نشر يغيّر ملفات ثابتة
const STATIC_CACHE = 'zad-static-' + VERSION;
const RUNTIME_CACHE = 'zad-runtime-v1';      // ✅ v46: للصور وغيرها بسقف، حتى لا تُحذف الملفات الأساسية
const FONT_CACHE = 'zad-fonts-v1';
const KEEP = [STATIC_CACHE, RUNTIME_CACHE, FONT_CACHE];
const FONT_CACHE_MAX = 40;
const RUNTIME_CACHE_MAX = 60;

const CORE_ASSETS = [
  './',
  './index.html',
  './wird.html',
  './adhkar.html',
  './azkar-morning.html',
  './azkar-evening.html',
  './azkar-sleep.html',
  './nawawi.html',
  './quran.html',
  './duas.html',
  './articles.html',
  './about.html',
  './opinions.html',
  './assets/style.css',
  './assets/enhancements.css',
  './assets/data.js',
  './assets/app.js',
  './assets/common.js',
  './assets/home.js',
  './logo-zad-almuslim.webp.png',
  './manifest.json'
];

const NAV_TIMEOUT_MS = 4000;
const ASSET_TIMEOUT_MS = 3000;

const OFFLINE_HTML = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark">
<title>لا يوجد اتصال — زاد عبيدة</title>
<style>body{font-family:Tahoma,sans-serif;background:#fafaf7;color:#1a1a1a;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
.c{max-width:420px}h1{color:#0d7a5f;font-size:1.6rem}a{display:inline-block;margin-top:16px;background:#0d7a5f;color:#fff;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:700}
@media(prefers-color-scheme:dark){body{background:#121212;color:#e8e8e8}h1{color:#4fd1ab}}</style></head>
<body><div class="c"><div style="font-size:3rem">📡</div><h1>لا يوجد اتصال بالإنترنت</h1>
<p>هذه الصفحة لم تُحفظ بعد على جهازك. افتحها مرة واحدة وأنت متصل لتعمل بعدها دون إنترنت.</p>
<a href="./index.html">العودة للرئيسية</a></div></body></html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---------------- التثبيت ---------------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const results = await Promise.allSettled(
      CORE_ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' })))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn('[SW] فشل تخزين:', CORE_ASSETS[i], r.reason && r.reason.message);
    });
    await self.skipWaiting();
  })());
});

/* ---------------- التنشيط ---------------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const isUpdate = keys.some(k => k.startsWith('zad-static-') && k !== STATIC_CACHE);
    await Promise.all(
      keys.filter(k => k.startsWith('zad') && !KEEP.includes(k)).map(k => caches.delete(k))
    );
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
    if (isUpdate) {
      const list = await self.clients.matchAll({ type: 'window' });
      list.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: VERSION }));
    }
  })());
});

/* ---------------- أدوات مساعدة ---------------- */
function isCacheable(res) {
  return res && res.status === 200 && !res.redirected && (res.type === 'basic' || res.type === 'cors');
}

function pageKey(url) {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.href;
}

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

// مهلة موحّدة تعيد null بدل الرفض — آمنة مع Promise.race
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ---------------- استراتيجيات الجلب ---------------- */

async function handleNavigation(event) {
  const req = event.request;
  const cache = await caches.open(STATIC_CACHE);
  const key = pageKey(req.url);

  const netPromise = (async () => {
    const pre = await event.preloadResponse;
    const res = pre || await fetch(req);
    if (isCacheable(res)) await cache.put(key, res.clone()).catch(() => {});
    return res;
  })();
  netPromise.catch(() => {});
  // ✅ v46: إبقاء العامل حيًّا حتى يكتمل التخزين حتى لو أُرجعت الاستجابة مبكرًا
  event.waitUntil(netPromise.catch(() => {}));

  // يطابق الصفحة، وإن كان الطلب للجذر دون اتصال يرجع إلى index.html
  const fromCache = async () =>
    (await cache.match(key)) ||
    (new URL(key).pathname.endsWith('/') ? await cache.match('./index.html') : null);

  try {
    const first = await withTimeout(netPromise, NAV_TIMEOUT_MS);
    if (first && first.status < 500) return first;
    const cached = await fromCache();
    if (cached) return cached;
    return first || await netPromise;
  } catch (err) {
    const cached = await fromCache();
    return cached || offlineResponse();
  }
}

async function networkFirst(event, cacheName, timeoutMs) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const net = fetch(req).then(async res => {
    if (isCacheable(res)) await cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  net.catch(() => {});
  event.waitUntil(net.catch(() => {}));   // ✅ v46: إكمال التخزين في الخلفية

  // ✅ v46: ignoreSearch حتى يُقدَّم app.js من الكاش لو طُلب باسم app.js?v=...
  const fromCache = () => cache.match(req, { ignoreSearch: true });

  try {
    const first = await withTimeout(net, timeoutMs);
    if (first && first.status < 500) return first;
    const cached = await fromCache();
    if (cached) return cached;
    return first || await net;
  } catch (err) {
    const cached = await fromCache();
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(event, cacheName, maxEntries) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const update = fetch(req).then(async res => {
    if (isCacheable(res)) {
      await cache.put(req, res.clone()).catch(() => {});
      if (maxEntries) await trimCache(cache, maxEntries).catch(() => {});
    }
    return res;
  }).catch(() => null);

  if (cached) { event.waitUntil(update); return cached; }
  const res = await update;
  return res || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(event, FONT_CACHE, FONT_CACHE_MAX));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (req.destination === 'script' || req.destination === 'style' || /\/manifest\.json$/.test(url.pathname)) {
    event.respondWith(networkFirst(event, STATIC_CACHE, ASSET_TIMEOUT_MS));
    return;
  }

  // ✅ v46: بقية الملفات (صور وغيرها) في كاش مستقل بسقف 60 ملفًا
  event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE, RUNTIME_CACHE_MAX));
});

/* ---------------- الإشعارات المحلية ---------------- */

self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'SKIP_WAITING') { self.skipWaiting(); return; }

  if (msg.type === 'SHOW_REMINDER' || msg.type === 'SCHEDULE_REMINDER') {
    event.waitUntil(self.registration.showNotification(msg.title || 'زاد عبيدة', {
      body: msg.body || 'تذكير بوردك اليومي',
      icon: './logo-zad-almuslim.webp.png',
      badge: './logo-zad-almuslim.webp.png',
      lang: 'ar',
      dir: 'rtl',
      tag: 'zad-local-reminder',
      data: { local: true, url: msg.url || './' }
    }));
  }
});

self.addEventListener('notificationclick', event => {
  const d = event.notification.data;
  if (!d || !d.local) return;
  event.stopImmediatePropagation();
  event.notification.close();

  const target = new URL(d.url || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
        const focused = await c.focus();
        if (focused && 'navigate' in focused && focused.url !== target) {
          try { await focused.navigate(target); } catch (e) {}
        }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

/* ---------------- Webpushr ---------------- */
try {
  importScripts('https://cdn.webpushr.com/sw-server.min.js');
} catch (e) {
  console.warn('[SW] تعذّر تحميل Webpushr:', e && e.message);
}
