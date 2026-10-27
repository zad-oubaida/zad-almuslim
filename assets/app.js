/* ============================================================
   زاد عبيدة — الوظائف المشتركة (النسخة النهائية الكاملة)
   ============================================================ */

'use strict';

/* ============ Toast ============ */
let toastTimer;
function showToast(msg){
  let el = document.getElementById('toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2400);
}

/* ============ الوضع الليلي ============ */
(function initTheme(){
  const btn = document.getElementById('themeToggle');
  function applyTheme(dark){
    document.body.classList.toggle('dark', dark);
    if(btn) btn.textContent = dark ? '☀️' : '🌙';
    try { localStorage.setItem('zad_theme', dark ? 'dark' : 'light'); } catch {}
  }
  let saved = null;
  try { saved = localStorage.getItem('zad_theme'); } catch {}
  if(!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches){
    saved = 'dark';
  }
  applyTheme(saved === 'dark');
  if(btn){
    btn.addEventListener('click', ()=>{
      applyTheme(!document.body.classList.contains('dark'));
    });
  }
})();

/* ============ نسخ النص ============ */
async function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if(!ok) throw new Error('copy failed');
}

/* ============ الاستماع (Text-to-Speech) ============ */
let arabicVoice = null;
let voicesReady = false;
function loadVoices(){
  if(!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  arabicVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ar')) || null;
  voicesReady = voices.length > 0;
}
if('speechSynthesis' in window){
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}
function speak(text){
  if(!('speechSynthesis' in window)){
    showToast('⚠️ المتصفح لا يدعم النطق');
    return;
  }
  if(!text || !text.trim()) return;
  window.speechSynthesis.cancel();
  if(!voicesReady || !arabicVoice) loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 0.85;
  if(arabicVoice) u.voice = arabicVoice;
  u.onerror = (e)=>{
    if(e.error === 'not-allowed') showToast('⚠️ المتصفح منع التشغيل — انقر مرة أخرى');
    else showToast('⚠️ تعذّر التشغيل');
  };
  u.onstart = ()=> showToast('🔊 جارٍ الاستماع…');
  try { window.speechSynthesis.speak(u); }
  catch { showToast('⚠️ تعذّر التشغيل'); }
}

/* ============ مشاركة ============ */
async function shareContent(data){
  if(navigator.share){
    try { await navigator.share(data); } catch {}
  } else {
    try {
      await copyText(data.url || data.text || '');
      showToast('تم نسخ الرابط ✓');
    } catch { showToast('تعذّرت المشاركة'); }
  }
}

/* ============ العدّادات (localStorage) ============ */
const STORAGE_KEY = 'zad_counts_v2';
function loadCounts(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCounts(c){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch {}
}

/* ============ مواقيت الصلاة ============ */
const PRAYER_LABELS = { Fajr:'الفجر', Dhuhr:'الظهر', Asr:'العصر', Maghrib:'المغرب', Isha:'العشاء' };
let countdownInterval = null;

function formatPrayerTime(t){
  const clean = String(t).split(' ')[0];
  const [h,m] = clean.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return hh + ':' + String(m).padStart(2,'0') + ' ' + period;
}

function renderPrayerTimes(timings){
  const container = document.getElementById('prayerTimes');
  if(!container) return;
  container.className = '';
  container.replaceChildren();

  const ul = document.createElement('ul');
  ul.className = 'prayer-list';
  ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(k=>{
    const li = document.createElement('li');
    li.className = 'prayer-item';
    li.dataset.key = k;
    const name = document.createElement('span');
    name.textContent = PRAYER_LABELS[k];
    const time = document.createElement('strong');
    time.textContent = formatPrayerTime(timings[k]);
    li.append(name, time);
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function startPrayerCountdown(timings){
  if(countdownInterval) clearInterval(countdownInterval);
  const el = document.getElementById('prayerCountdown');
  if(!el) return;
  el.style.display = 'block';
  
  const now = new Date();
  const arr = ['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(k=>{
    const [h,m] = String(timings[k]).split(' ')[0].split(':').map(Number);
    const d = new Date(now);
    d.setHours(h,m,0,0);
    return { k, date: d };
  });
  const next = arr.find(p => p.date > now);
  document.querySelectorAll('.prayer-item').forEach(li => li.classList.remove('active'));
  if(!next){
    el.textContent = 'انتهت صلوات اليوم — تقبّل الله 🌙';
    return;
  }
  const active = document.querySelector('.prayer-item[data-key="'+next.k+'"]');
  if(active) active.classList.add('active');
  const tick = ()=>{
    const diff = next.date - new Date();
    if(diff <= 0){
      el.textContent = 'حان وقت ' + PRAYER_LABELS[next.k] + ' 🕌';
      clearInterval(countdownInterval);
      return;
    }
    const hh = Math.floor(diff / 3600000);
    const mm = Math.floor((diff % 3600000) / 60000);
    const ss = Math.floor((diff % 60000) / 1000);
    el.textContent = 'متبقٍ لصلاة ' + PRAYER_LABELS[next.k] + ': ' +
      String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
  };
  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function fetchPrayerTimes(lat, lng, city){
  const container = document.getElementById('prayerTimes');
  if(!container) return;
  container.textContent = 'جارٍ تحميل المواقيت…';
  try {
    const url = (lat != null && lng != null)
      ? 'https://api.aladhan.com/v1/timings?latitude=' + lat + '&longitude=' + lng + '&method=3'
      : 'https://api.aladhan.com/v1/timingsByCity?city=' + encodeURIComponent(city || 'Algiers') + '&country=Algeria&method=3';
      
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    renderPrayerTimes(j.data.timings);
    startPrayerCountdown(j.data.timings);
  } catch(err) {
    container.textContent = 'تعذّر جلب المواقيت.';
  }
}

function locateUserForPrayer(){
  const container = document.getElementById('prayerTimes');
  if(!navigator.geolocation){
    if(container) container.textContent = 'المتصفح لا يدعم الموقع.';
    return;
  }
  if(container) container.textContent = 'جارٍ تحديد موقعك…';
  navigator.geolocation.getCurrentPosition(
    p => fetchPrayerTimes(p.coords.latitude, p.coords.longitude),
    () => {
      if(container) container.textContent = 'تعذّر تحديد الموقع. أدخل مدينتك.';
    },
    { timeout: 8000 }
  );
}

/* ============ آية اليوم وحديث اليوم ============ */
function initDailyContent(){
  const ayahEl = document.getElementById('dailyAyah');
  const hadithEl = document.getElementById('dailyHadith');
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);

  if(ayahEl && typeof DAILY_AYAT !== 'undefined'){
    const a = DAILY_AYAT[day % DAILY_AYAT.length];
    ayahEl.innerHTML = '';
    const p = document.createElement('div');
    p.style.fontSize = '1.1rem';
    p.style.color = 'var(--text)';
    p.style.lineHeight = '2';
    p.textContent = '"' + a.text + '"';
    const s = document.createElement('div');
    s.style.fontSize = '0.85rem';
    s.style.color = '#7f8c8d';
    s.style.marginTop = '8px';
    s.textContent = a.src;
    ayahEl.append(p, s);
  }

  if(hadithEl && typeof NAWAWI_HADITHS !== 'undefined'){
    const h = NAWAWI_HADITHS[day % NAWAWI_HADITHS.length];
    hadithEl.innerHTML = '';
    const p = document.createElement('div');
    p.style.fontSize = '1rem';
    p.style.color = 'var(--text)';
    p.style.lineHeight = '2';
    p.textContent = '"' + (h.text.length > 200 ? h.text.slice(0, 200) + '…' : h.text) + '"';
    const s = document.createElement('div');
    s.style.fontSize = '0.85rem';
    s.style.color = '#7f8c8d';
    s.style.marginTop = '8px';
    s.textContent = h.title;
    hadithEl.append(p, s);
  }
}
initDailyContent();

/* ============ الترجمة ============ */
window.doTranslate = function(lang) {
  if (lang === 'ar') {
    window.location.reload();
    return;
  }
  const url = window.location.href;
  window.open('https://translate.google.com/translate?sl=ar&tl=' + lang + '&u=' + encodeURIComponent(url), '_blank');
};

/* ============ Service Worker ============ */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    const sw = new URL('./sw.js', location.href).href;
    navigator.serviceWorker.register(sw, { scope: './' })
      .then(r => console.log('✅ SW:', r.scope))
      .catch(e => console.warn('⚠️ SW failed:', e.message));
  });
}

/* ============ تصدير للصفحات ============ */
window.ZadApp = {
  showToast, copyText, speak, shareContent,
  loadCounts, saveCounts,
  fetchPrayerTimes, locateUserForPrayer,
  PRAYER_LABELS, formatPrayerTime, startPrayerCountdown
};
