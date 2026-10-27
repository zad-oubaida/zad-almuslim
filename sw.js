'use strict';

/* ============================================================
   زاد عبيدة — Service Worker
   ضعه في جذر الموقع بجانب index.html (وليس داخل assets).
   ============================================================ */

const VERSION = 'v41';                       // غيّره عند أي نشر يتضمن ملفات ثابتة جديدة
const STATIC_CACHE = 'zad-static-' + VERSION; // الصفحات والملفات المحلية
const FONT_CACHE = 'zad-fonts-v1';            // خطوط Google (لا تتغير غالباً)
const KEEP = [STATIC_CACHE, FONT_CACHE];

// ملفات الهيكل الأساسي: تُخزَّن عند التثبيت
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
  './assets/data.js',
  './assets/app.js',
  './assets/common.js',
  './assets/home.js',
  './logo-zad-almuslim.webp.png',
  './manifest.json'
  // quran.json كبير: يُخزَّن عند أول فتح لصفحة القرآن (عبر معالج الجلب أدناه) فلا يبطئ التثبيت
];

const NAV_TIMEOUT_MS = 4000;

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
      // cache: 'reload' لتجاوز كاش المتصفح (GitHub Pages يخزّن الملفات ~10 دقائق)
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
    await Promise.all(
      keys.filter(k => k.startsWith('zad') && !KEEP.includes(k)).map(k => caches.delete(k))
    );
    // يبدأ طلب الصفحة بالتوازي مع إقلاع الـ Service Worker (أسرع على الجوال)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

/* ---------------- استراتيجيات الجلب ---------------- */
function isCacheable(res) {
  // لا نخزّن الردود المعاد توجيهها: المتصفح يرفض تقديمها لطلبات التنقل
  return res && res.status === 200 && !res.redirected && (res.type === 'basic' || res.type === 'cors');
}

// مفتاح الصفحة في الكاش بدون ?query حتى لا تمتلئ الذاكرة بنسخ ?utm_... وغيرها
function pageKey(url) {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.href;
}

// الصفحات: الشبكة أولاً (محتوى حديث دائماً) مع الرجوع للكاش عند الانقطاع أو البطء
async function handleNavigation(event) {
  const req = event.request;
  const cache = await caches.open(STATIC_CACHE);
  const key = pageKey(req.url);

  const netPromise = (async () => {
    const pre = await event.preloadResponse;       // undefined إن لم يكن التفعيل مدعوماً
    const res = pre || await fetch(req);
    if (isCacheable(res)) cache.put(key, res.clone()).catch(() => {});
    return res;
  })();
  netPromise.catch(() => {});                       // يمنع تحذير "unhandled rejection" إن فاز المؤقّت

  let timer;
  try {
    const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), NAV_TIMEOUT_MS); });
    const first = await Promise.race([netPromise, timeout]);
    if (first) return first;
    // الشبكة بطيئة: قدّم النسخة المخزنة إن وُجدت، وأكمل التحديث في الخلفية
    const cached = await cache.match(key);
    if (cached) { event.waitUntil(netPromise.catch(() => {})); return cached; }
    return await netPromise;
  } catch (err) {
    const cached = await cache.match(key);
    return cached || offlineResponse();
  } finally {
    clearTimeout(timer);
  }
}

// الملفات الثابتة: من الكاش فوراً ثم التحديث في الخلفية (stale-while-revalidate)
async function staleWhileRevalidate(event, cacheName, allowOpaque) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const update = fetch(req).then(res => {
    if (isCacheable(res) || (allowOpaque && res && res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);

  if (cached) { event.waitUntil(update); return cached; }
  const res = await update;
  return res || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;                    // لا نتدخل في طلبات الصوت/الفيديو الجزئية
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // خطوط Google
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(event, FONT_CACHE, true));
    return;
  }

  // أي مصدر خارجي آخر (واجهات المواقيت والآيات، الترجمة، Webpushr): مباشرة من الشبكة دون تخزين
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  event.respondWith(staleWhileRevalidate(event, STATIC_CACHE, false));
});

/* ---------------- الإشعارات ----------------
   إشعارات الدفع (push) والنقر عليها يتولاها Webpushr عبر sw-server.min.js في آخر الملف،
   لذلك لا يوجد هنا معالج push حتى لا يظهر الإشعار مرتين.
   أدناه فقط: الإشعارات المحلية التي تطلقها الصفحة (مثل التجربة) ونقرها. */

self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'SKIP_WAITING') { self.skipWaiting(); return; }

  // SCHEDULE_REMINDER اسم قديم: يعرض الإشعار فوراً ولا يجدول شيئاً
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

// ينفّذ فقط للإشعارات المحلية؛ أما إشعارات Webpushr فيعالجها كودهم
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
        if (focused && 'navigate' in focused && focused.url !== target) { try { await focused.navigate(target); } catch (e) {} }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

/* ---------------- Webpushr ----------------
   في آخر الملف عمداً: يُسجَّل معالج نقرنا أولاً. ومُغلَّف بـ try حتى لا يفشل تحديث
   الـ Service Worker كله إن تعذّر تحميل السكربت الخارجي. */
try {
  importScripts('https://cdn.webpushr.com/sw-server.min.js');
} catch (e) {
  console.warn('[SW] تعذّر تحميل Webpushr:', e && e.message);
}
