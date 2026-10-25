'use strict';

const CACHE_NAME = 'zad-obaidah-v17';
const ASSETS = [
  './',
  './index.html',
  './wird.html',
  './adhkar.html',
  './azkar-morning.html',
  './azkar-evening.html',
  './azkar-sleep.html',   // تمت الإضافة
  './nawawi.html',
  './quran.html',
  './duas.html',
  './articles.html',
  './about.html',
  './assets/style.css',
  './assets/data.js',
  './assets/app.js',
  './logo-zad-almuslim.webp.png',
  './manifest.json',
  './quran.json'
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        ASSETS.map(url => cache.add(url).catch(() => console.warn('فشل تخزين:', url)))
      ))
  );
  self.skipWaiting();
});

// تنشيط Service Worker وحذف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// استراتيجية الجلب (Fetch)
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ============ دعم الإشعارات ============
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'زاد عبيدة', body: 'تذكير بوردك اليومي' };
  const options = {
    body: data.body,
    icon: './logo-zad-almuslim.webp.png',
    badge: './logo-zad-almuslim.webp.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// فتح الرابط عند النقر على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || './'));
});

// استقبال رسائل من الصفحة الرئيسية (لإرسال إشعار تجريبي)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: './logo-zad-almuslim.webp.png'
    });
  }
});
