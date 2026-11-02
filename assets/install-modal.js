'use strict';

/* ============================================================
   زاد عبيدة — نافذة تثبيت التطبيق (اختيار النظام ثم التثبيت)
   ضعه في: assets/install-modal.js
   يعمل فوق الزر الموجود #installAppBtn دون تعديل أي كود سابق:
   - يعترض الضغط على الزر ويعرض نافذة اختيار النظام.
   - أندرويد/كمبيوتر: زر «تثبيت الآن» يستدعي نافذة التثبيت الأصلية للمتصفح.
   - آيفون: خطوات واضحة (Apple لا تسمح بالتثبيت البرمجي).
   - إن تعذّر تحميل هذا الملف يبقى السلوك القديم كما هو.
   ============================================================ */
(function () {
  if (window.__zadInstallModal) return;
  window.__zadInstallModal = true;

  var openBtn = document.getElementById('installAppBtn');
  if (!openBtn) return;

  var ua = navigator.userAgent || '';
  var deferred = null;

  /* ---------- اكتشاف البيئة ---------- */
  function detectOS() {
    if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
  }
  // متصفحات داخل التطبيقات (فيسبوك/إنستغرام…) لا تدعم التثبيت
  var inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly/i.test(ua);
  // متصفحات آيفون غير Safari
  var iosOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  function toast(msg) { if (typeof window.zadToast === 'function') window.zadToast(msg); }

  /* ---------- التنسيق (يتبع متغيرات style.css والوضع الليلي) ---------- */
  var css = document.createElement('style');
  css.id = 'zad-install-css';
  css.textContent =
    '.zad-inst{border:0;padding:0;background:transparent;color:inherit;max-width:100vw;max-height:100vh;overflow:visible}' +
    '.zad-inst::backdrop{background:rgba(0,0,0,.6)}' +
    '.zad-inst[open]{display:block;position:fixed;inset:0;margin:auto;width:min(460px,92vw);height:fit-content;max-height:90vh}' +
    '.zad-inst-card{background:var(--card,#fff);color:var(--text,#1a1a1a);border:1px solid var(--line,#e8e6dd);border-radius:16px;padding:22px;max-height:90vh;overflow:auto;overscroll-behavior:contain;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '.zad-inst-card h3{font-family:"Amiri",serif;font-size:1.4rem;color:var(--ink,#0d7a5f);margin:0 0 6px}' +
    '.zad-inst-sub{font-size:.92rem;color:var(--text-muted,#5f6670);margin:0 0 14px}' +
    '.zad-inst-os{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}' +
    '.zad-inst-os button{min-height:48px;padding:8px 4px;border:2px solid var(--primary,#0d7a5f);border-radius:12px;background:transparent;color:var(--ink,#0d7a5f);font-weight:700;font-size:.9rem;line-height:1.4}' +
    '.zad-inst-os button[aria-pressed="true"]{background:var(--primary,#0d7a5f);color:#fff}' +
    '.zad-inst-panel{display:none;line-height:1.9;font-size:.98rem}' +
    '.zad-inst-panel.show{display:block}' +
    '.zad-inst-panel ol{padding-inline-start:1.4rem;margin:8px 0}' +
    '.zad-inst-go{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:12px;min-height:48px;padding:12px;border-radius:12px;background:var(--primary,#0d7a5f);color:#fff;font-weight:700;font-size:1rem}' +
    '.zad-inst-go:disabled{opacity:.6}' +
    '.zad-inst-go:hover:not(:disabled){background:var(--primary-dark,#095a45)}' +
    '.zad-inst-note{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--accent-light,#fef3d7);border:1px dashed var(--accent,#f0b429);font-size:.88rem;line-height:1.8}' +
    '.zad-inst-done{margin-top:12px;padding:12px;border-radius:10px;background:var(--primary-light,#e8f4f0);color:var(--ink,#0d7a5f);font-weight:700;text-align:center}' +
    '.zad-inst-close{display:block;width:100%;margin-top:14px;padding:10px;border-radius:10px;background:var(--primary-light,#e8f4f0);color:var(--ink,#0d7a5f);font-weight:700}';
  document.head.appendChild(css);

  /* ---------- النافذة ---------- */
  var dlg = document.createElement('dialog');
  dlg.className = 'zad-inst';
  dlg.setAttribute('aria-labelledby', 'zadInstTitle');
  dlg.innerHTML =
    '<div class="zad-inst-card">' +
      '<h3 id="zadInstTitle">ثبّت «زاد عبيدة» على جهازك</h3>' +
      '<p class="zad-inst-sub">اختر نوع جهازك ليظهر لك الاختصار على شاشتك الرئيسية.</p>' +
      '<div class="zad-inst-note" data-inapp hidden>أنت تتصفح من داخل تطبيق آخر (مثل فيسبوك أو إنستغرام)، وهذا لا يدعم التثبيت. اضغط على ⋮ أو «فتح في المتصفح» ثم افتح الموقع في Chrome (أندرويد) أو Safari (آيفون).</div>' +
      '<div class="zad-inst-os" role="group" aria-label="نوع الجهاز">' +
        '<button type="button" data-os="android" aria-pressed="false">🤖<br>أندرويد</button>' +
        '<button type="button" data-os="ios" aria-pressed="false">🍎<br>آيفون / آيباد</button>' +
        '<button type="button" data-os="desktop" aria-pressed="false">💻<br>كمبيوتر</button>' +
      '</div>' +

      '<div class="zad-inst-panel" data-panel="android">' +
        '<p>اضغط الزر وسيُضاف اختصار التطبيق إلى شاشتك الرئيسية مباشرة.</p>' +
        '<button type="button" class="zad-inst-go" data-go>📲 تثبيت الآن</button>' +
        '<div class="zad-inst-note" data-manual hidden>لم يعرض المتصفح نافذة التثبيت تلقائيًا. ثبّته يدويًا:<ol>' +
          '<li>افتح قائمة المتصفح <b>⋮</b> في أعلى الشاشة.</li>' +
          '<li>اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.</li>' +
          '<li>اضغط <b>«تثبيت»</b> أو <b>«إضافة»</b>.</li></ol>' +
          'يُفضّل استخدام Chrome. وإن كان التطبيق مثبّتًا من قبل فلن تظهر النافذة.</div>' +
      '</div>' +

      '<div class="zad-inst-panel" data-panel="ios">' +
        '<p>على آيفون تتم الخطوة يدويًا من المتصفح:</p>' +
        '<ol>' +
          '<li>افتح الموقع في <b>Safari</b>.</li>' +
          '<li>اضغط زر المشاركة <b>⎙</b> (المربع والسهم) أسفل الشاشة.</li>' +
          '<li>مرّر لأسفل واختر <b>«إضافة إلى الشاشة الرئيسية»</b>.</li>' +
          '<li>اضغط <b>«إضافة»</b> في أعلى الشاشة.</li>' +
        '</ol>' +
        '<div class="zad-inst-note" data-ios-other hidden>أنت تستخدم متصفحًا غير Safari. إن لم تجد الخيار في قائمة المشاركة فافتح الرابط في Safari.</div>' +
      '</div>' +

      '<div class="zad-inst-panel" data-panel="desktop">' +
        '<p>اضغط الزر لتثبيت الموقع كتطبيق مستقل على جهازك.</p>' +
        '<button type="button" class="zad-inst-go" data-go>💻 تثبيت الآن</button>' +
        '<div class="zad-inst-note" data-manual hidden>لم يعرض المتصفح نافذة التثبيت تلقائيًا. في Chrome أو Edge اضغط أيقونة التثبيت <b>⊕</b> في شريط العنوان، أو من القائمة <b>⋮</b> اختر «تثبيت زاد عبيدة». أما Firefox على الكمبيوتر فلا يدعم تثبيت المواقع.</div>' +
      '</div>' +

      '<div class="zad-inst-done" data-done hidden role="status">✅ تم تثبيت التطبيق. ستجده على شاشتك الرئيسية.</div>' +
      '<div class="zad-inst-note" data-declined hidden role="status">لم يكتمل التثبيت. يمكنك المحاولة في أي وقت.</div>' +
      '<button type="button" class="zad-inst-close" data-close>إغلاق</button>' +
    '</div>';
  document.body.appendChild(dlg);

  function q(sel, root) { return (root || dlg).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || dlg).querySelectorAll(sel)); }

  if (inApp) q('[data-inapp]').hidden = false;
  if (iosOtherBrowser) q('[data-ios-other]').hidden = false;

  /* ---------- اختيار النظام ---------- */
  function selectOS(os) {
    qa('[data-os]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-os') === os)); });
    qa('[data-panel]').forEach(function (p) { p.classList.toggle('show', p.getAttribute('data-panel') === os); });
    qa('[data-manual]').forEach(function (n) { n.hidden = true; });
    q('[data-declined]').hidden = true;
  }
  qa('[data-os]').forEach(function (b) {
    b.addEventListener('click', function () { selectOS(b.getAttribute('data-os')); });
  });

  /* ---------- فتح/إغلاق ---------- */
  function openDlg() {
    q('[data-done]').hidden = true;
    selectOS(detectOS());
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeDlg() {
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  q('[data-close]').addEventListener('click', closeDlg);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); }); // الضغط على الخلفية

  /* ---------- التثبيت المباشر (أندرويد / كمبيوتر) ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
  });
  window.addEventListener('appinstalled', function () {
    deferred = null;
    qa('[data-panel]').forEach(function (p) { p.classList.remove('show'); });
    q('[data-declined]').hidden = true;
    q('[data-done]').hidden = false;
    toast('تم تثبيت التطبيق ✓');
  });

  qa('[data-go]').forEach(function (go) {
    go.addEventListener('click', function () {
      var panel = go.closest('[data-panel]');
      var manual = q('[data-manual]', panel);
      if (!deferred) { if (manual) manual.hidden = false; return; }
      var ev = deferred;
      deferred = null;                // الحدث يُستخدم مرة واحدة فقط
      go.disabled = true;
      ev.prompt();
      ev.userChoice.then(function (r) {
        go.disabled = false;
        if (r && r.outcome === 'accepted') {
          q('[data-done]').hidden = false;
          qa('[data-panel]').forEach(function (p) { p.classList.remove('show'); });
        } else {
          q('[data-declined]').hidden = false;
        }
      }, function () { go.disabled = false; });
    });
  });

  /* ---------- اعتراض ضغطة الزر القديم ----------
     نلتقط الضغطة في مرحلة الالتقاط على window فتسبق أي معالج سابق (في index.html أو app.js)،
     ثم نمنعه من العمل كي لا تظهر نافذتان. */
  window.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#installAppBtn') : null;
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openDlg();
  }, true);
})();
