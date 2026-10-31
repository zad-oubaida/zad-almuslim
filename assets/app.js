/* ============================================================
   زاد عبيدة — الوظائف المشتركة (v3)
   متوافق مع الصفحات الحالية: كل الدوال القديمة ما زالت متاحة
   كمتغيرات عامة (window.*) وعبر window.ZadApp.
   ============================================================ */
(function () {
'use strict';

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
const onReady = fn => document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', fn) : fn();

/* ============ Toast ============ */
let toastTimer;
function showToast(msg) {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ============ الوضع الليلي ============
   لا نحفظ الاختيار إلا عند نقر المستخدم، حتى يبقى الموقع تابعًا لإعداد الجهاز قبل ذلك. */
function initTheme() {
  const btn = $('themeToggle');
  const meta = document.querySelector('meta[name="theme-color"]');
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply(dark) {
    document.body.classList.toggle('dark', dark);
    if (btn) {
      btn.textContent = dark ? '☀️' : '🌙';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.title = dark ? 'الوضع النهاري' : 'الوضع الليلي';
    }
    if (meta) meta.setAttribute('content', dark ? '#121212' : '#0d7a5f');
  }
  const saved = store.get('zad_theme');
  apply(saved ? saved === 'dark' : !!(mq && mq.matches));
  if (btn) btn.addEventListener('click', () => {
    const dark = !document.body.classList.contains('dark');
    apply(dark);
    store.set('zad_theme', dark ? 'dark' : 'light');
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', e => {
    if (!store.get('zad_theme')) apply(e.matches);
  });
}

/* ============ نسخ النص ============ */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  try {
    ta.select();
    if (!document.execCommand('copy')) throw new Error('copy failed');
  } finally { ta.remove(); }
}

/* ============ الاستماع (Text-to-Speech) ============ */
let arabicVoice = null;
let voicesReady = false;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  arabicVoice = voices.find(v => /^ar[-_]sa/i.test(v.lang || ''))
             || voices.find(v => /^ar/i.test(v.lang || '')) || null;
  voicesReady = voices.length > 0;
}
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}
// تقسيم النص الطويل إلى مقاطع قصيرة (متصفح كروم يتوقف عن النطق في النصوص الطويلة)
function splitForSpeech(text, max = 180) {
  const parts = text.replace(/\s+/g, ' ').match(/[^.،؛!؟:\n]+[.،؛!؟:]*/g) || [text];
  const out = [];
  let cur = '';
  parts.forEach(p => {
    if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = ''; }
    cur += p + ' ';
  });
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
function speak(text) {
  if (!('speechSynthesis' in window)) { showToast('⚠️ المتصفح لا يدعم النطق'); return; }
  if (!text || !text.trim()) return;
  window.speechSynthesis.cancel();
  if (!voicesReady || !arabicVoice) loadVoices();
  let announced = false;
  splitForSpeech(text).forEach(chunk => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = 'ar-SA';
    u.rate = 0.85;
    if (arabicVoice) u.voice = arabicVoice;
    u.onstart = () => { if (!announced) { announced = true; showToast('🔊 جارٍ الاستماع…'); } };
    u.onerror = e => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      showToast(e.error === 'not-allowed' ? '⚠️ المتصفح منع التشغيل — انقر مرة أخرى' : '⚠️ تعذّر التشغيل');
    };
    try { window.speechSynthesis.speak(u); } catch { showToast('⚠️ تعذّر التشغيل'); }
  });
}

/* ============ مشاركة ============ */
async function shareContent(data) {
  data = Object.assign({ url: location.href }, data || {});
  if (navigator.share) {
    try { await navigator.share(data); }
    catch (e) { if (e && e.name !== 'AbortError') showToast('تعذّرت المشاركة'); }
    return;
  }
  try {
    await copyText(data.url || data.text || '');
    showToast('تم نسخ الرابط ✓');
  } catch { showToast('تعذّرت المشاركة'); }
}

/* ============ العدّادات (localStorage) ============ */
const STORAGE_KEY = 'zad_counts_v2';
function loadCounts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
  catch { return {}; }
}
function saveCounts(c) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch {}
}

/* ============ طلب JSON بمهلة زمنية ============ */
function getJSON(url, ms = 10000) {
  const ctrl = window.AbortController ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), ms);
  return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(r => {
    clearTimeout(timer);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }, e => { clearTimeout(timer); throw e; });
}

/* ============ مواقيت الصلاة ============
   الطريقة 19 = وزارة الشؤون الدينية الجزائرية (كانت 3 = رابطة العالم الإسلامي). */
const PRAYER_METHOD = 19;
const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_LABELS = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
const prayer = { timings: null, tz: null, label: '', stale: false, shown: null, date: '', reload: null, timer: null };

const dateStr = () => { const d = new Date(); return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear(); };
const toSecs = s => { const m = String(s).match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 3600 + (+m[2]) * 60 : 0; };

function formatPrayerTime(t) {
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!m) return String(t);
  const h = +m[1];
  return (h % 12 === 0 ? 12 : h % 12) + ':' + m[2] + ' ' + (h >= 12 ? 'م' : 'ص');
}

// الوقت الحالي بالثواني في منطقة المدينة (لا منطقة الجهاز)
function secsNow(tz) {
  const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  let parts;
  try { parts = new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: tz || undefined }, opts)).formatToParts(new Date()); }
  catch { parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(new Date()); }
  const g = t => parseInt(parts.find(p => p.type === t).value, 10);
  return (g('hour') % 24) * 3600 + g('minute') * 60 + g('second');
}

function renderPrayerTimes(timings, activeKey) {
  const box = $('prayerTimes');
  if (!box) return;
  box.classList.remove('is-loading');           // (كان className='' يُسقط تنسيق dash-body)
  box.replaceChildren();
  if (prayer.label) {
    const c = document.createElement('div');
    c.className = 'city-name';
    c.textContent = '📍 ' + prayer.label;
    box.appendChild(c);
  }
  const ul = document.createElement('ul');
  ul.className = 'prayer-list';
  const rows = [['Fajr', 'الفجر'], ['Sunrise', 'الشروق'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']];
  rows.forEach(([k, label]) => {
    if (!timings[k]) return;
    const li = document.createElement('li');
    li.className = 'prayer-item' + (k === activeKey ? ' active' : '');
    li.dataset.key = k;
    const name = document.createElement('span');
    name.textContent = label;
    const time = document.createElement('strong');
    time.textContent = formatPrayerTime(timings[k]);
    li.append(name, time);
    ul.appendChild(li);
  });
  box.appendChild(ul);
  if (prayer.stale) {
    const n = document.createElement('div');
    n.className = 'stale-note';
    n.textContent = 'تُعرض آخر مواقيت محفوظة (تعذّر التحديث).';
    box.appendChild(n);
  }
}

function prayerTick() {
  const el = $('prayerCountdown');
  if (!prayer.timings || !el) return;
  if (!prayer.stale && prayer.date && prayer.date !== dateStr() && prayer.reload) { prayer.reload(); return; } // يوم جديد
  const now = secsNow(prayer.tz);
  let key = null, left = 0;
  for (const k of PRAYER_KEYS) {
    const s = toSecs(prayer.timings[k]);
    if (s > now) { key = k; left = s - now; break; }
  }
  if (!key) { key = 'Fajr'; left = 86400 - now + toSecs(prayer.timings.Fajr); }   // بعد العشاء: العدّ لفجر الغد
  if (key !== prayer.shown) { prayer.shown = key; renderPrayerTimes(prayer.timings, key); }  // نعيد البناء فقط عند التغيّر
  el.style.display = 'block';
  el.textContent = 'متبقٍ لصلاة ' + PRAYER_LABELS[key] + ': ' +
    pad(Math.floor(left / 3600)) + ':' + pad(Math.floor((left % 3600) / 60)) + ':' + pad(left % 60);
}

function startPrayerCountdown(timings, tz) {
  clearInterval(prayer.timer);
  if (timings) { prayer.timings = timings; if (tz !== undefined) prayer.tz = tz; }
  prayer.shown = null;
  prayerTick();
  prayer.timer = setInterval(prayerTick, 1000);
}

function showPrayerError(box) {
  clearInterval(prayer.timer);
  prayer.timings = null;
  const cd = $('prayerCountdown');
  if (cd) cd.style.display = 'none';
  box.classList.remove('is-loading');
  box.textContent = 'تعذّر جلب المواقيت. تحقّق من الاتصال أو اسم المدينة.';
  box.appendChild(document.createElement('br'));
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'retry-btn'; b.textContent = 'إعادة المحاولة';
  b.addEventListener('click', () => prayer.reload && prayer.reload());
  box.appendChild(b);
}

function loadPrayer(buildUrl, label) {
  const box = $('prayerTimes');
  if (!box) return Promise.resolve();
  prayer.reload = () => loadPrayer(buildUrl, label);
  box.classList.add('is-loading');
  box.textContent = 'جارٍ تحميل المواقيت…';
  return getJSON(buildUrl()).then(j => {
    if (!j || j.code !== 200 || !j.data) throw new Error('bad response');
    const tz = j.data.meta && j.data.meta.timezone;
    store.set('zad_pt_cache', JSON.stringify({ label, times: j.data.timings, tz }));   // نفس مفتاح الاحتياطي في index.html
    Object.assign(prayer, { label, stale: false, date: dateStr() });
    startPrayerCountdown(j.data.timings, tz);
  }).catch(() => {
    let c = null;
    try { c = JSON.parse(store.get('zad_pt_cache')); } catch {}
    if (c && c.times) {
      Object.assign(prayer, { label: c.label || label, stale: true, date: '' });
      startPrayerCountdown(c.times, c.tz);
    } else showPrayerError(box);
  });
}

const urlByCoords = (lat, lng) => () =>
  'https://api.aladhan.com/v1/timings/' + dateStr() + '?method=' + PRAYER_METHOD + '&latitude=' + lat + '&longitude=' + lng;
const urlByCity = city => () =>
  'https://api.aladhan.com/v1/timingsByAddress/' + dateStr() + '?method=' + PRAYER_METHOD + '&address=' + encodeURIComponent(city);

function fetchPrayerTimes(lat, lng, city) {      // نفس التوقيع القديم
  if (lat != null && lng != null) return loadPrayer(urlByCoords(lat, lng), 'موقعك الحالي');
  const c = city || store.get('zad_city') || 'Algiers';
  return loadPrayer(urlByCity(c), c);
}

function locateUserForPrayer() {
  const box = $('prayerTimes');
  const fallbackCity = () => fetchPrayerTimes(null, null, store.get('zad_city') || 'Algiers');
  if (!navigator.geolocation) { showToast('المتصفح لا يدعم تحديد الموقع'); fallbackCity(); return; }
  if (box) { box.classList.add('is-loading'); box.textContent = 'جارٍ تحديد موقعك…'; }
  navigator.geolocation.getCurrentPosition(
    p => fetchPrayerTimes(p.coords.latitude, p.coords.longitude),
    err => { showToast(err && err.code === 1 ? 'تم رفض إذن الموقع — أدخل مدينتك' : 'تعذّر تحديد الموقع'); fallbackCity(); },
    { timeout: 8000, maximumAge: 600000 }
  );
}

// ربط أدوات الصفحة الرئيسية (حقل المدينة وأزرار التحديث والموقع)
function initPrayerWidget() {
  if (!$('prayerTimes')) return;
  const input = $('cityInput'), btn = $('cityBtn'), geo = $('geoBtn');
  const useCity = () => {
    const v = input ? input.value.trim() : '';
    if (!v) { showToast('اكتب اسم مدينتك أولاً'); return; }
    store.set('zad_city', v);
    fetchPrayerTimes(null, null, v);
  };
  if (btn) btn.addEventListener('click', useCity);
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') useCity(); });
  if (geo) geo.addEventListener('click', locateUserForPrayer);

  const saved = store.get('zad_city');
  if (saved) { if (input) input.value = saved; fetchPrayerTimes(null, null, saved); return; }
  // بلا طلب إذن مفاجئ: نستخدم الموقع تلقائيًا فقط إن كان الإذن ممنوحًا مسبقًا
  const fallbackDefault = () => fetchPrayerTimes(null, null, 'Algiers');
  if (navigator.permissions && navigator.permissions.query && navigator.geolocation) {
    navigator.permissions.query({ name: 'geolocation' })
      .then(r => r.state === 'granted' ? locateUserForPrayer() : fallbackDefault())
      .catch(fallbackDefault);
  } else fallbackDefault();
}

/* ============ آية اليوم وحديث اليوم ============ */
function initDailyContent() {
  const ayahEl = $('dailyAyah');
  const hadithEl = $('dailyHadith');
  const now = new Date();
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const mk = (cls, text) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; return d; };
  const cut = (t, n) => {
    if (t.length <= n) return t;
    const s = t.slice(0, n), i = s.lastIndexOf(' ');
    return (i > n * 0.6 ? s.slice(0, i) : s) + '…';           // لا نقطع الكلمة من منتصفها
  };

  if (ayahEl && typeof DAILY_AYAT !== 'undefined' && DAILY_AYAT.length) {
    const a = DAILY_AYAT[day % DAILY_AYAT.length];
    ayahEl.replaceChildren(mk('verse-text', '﴿ ' + a.text + ' ﴾'), mk('verse-src', a.src));
    ayahEl.classList.remove('is-loading');
  }
  if (hadithEl && typeof NAWAWI_HADITHS !== 'undefined' && NAWAWI_HADITHS.length) {
    const h = NAWAWI_HADITHS[day % NAWAWI_HADITHS.length];
    const more = document.createElement('a');
    more.href = './nawawi.html';
    more.className = 'verse-src';
    more.textContent = 'اقرأ الحديث كاملًا';
    hadithEl.replaceChildren(mk('hadith-text', '«' + cut(h.text, 200) + '»'), mk('verse-src', h.title), more);
    hadithEl.classList.remove('is-loading');
  }
}

/* ============ الترجمة (احتياطي؛ index.html يعرّف نسخته الخاصة ويحلّ محلها) ============ */
window.doTranslate = window.doTranslate || function (lang) {
  if (lang === 'ar') { window.location.reload(); return; }
  window.open('https://translate.google.com/translate?sl=ar&tl=' + lang + '&u=' + encodeURIComponent(location.href), '_blank', 'noopener');
};

/* ============ Service Worker ============ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.js', location.href).href, { scope: './' })
      .catch(e => console.warn('⚠️ SW failed:', e.message));
  });
}

/* ============ تشغيل ============ */
onReady(() => { initTheme(); initDailyContent(); initPrayerWidget(); });

/* ============ تصدير للصفحات (توافق كامل مع الإصدار السابق) ============ */
const api = {
  showToast, copyText, speak, stopSpeaking, shareContent,
  loadCounts, saveCounts, getJSON,
  fetchPrayerTimes, locateUserForPrayer,
  PRAYER_LABELS, formatPrayerTime, startPrayerCountdown,
  themeManaged: true, swManaged: true, prayerManaged: true   // يعرفها index.html فلا يكرّر العمل
};
window.ZadApp = api;
['showToast', 'copyText', 'speak', 'stopSpeaking', 'shareContent', 'loadCounts', 'saveCounts',
 'fetchPrayerTimes', 'locateUserForPrayer', 'formatPrayerTime'].forEach(k => { window[k] = api[k]; });
})();
