/* زاد عبيدة — إضافات التصميم الجديد (v52)
   يضيف عناصر جديدة فقط، ولا يلمس منطق المواقيت أو أذكاري أو الترجمة أو التثبيت. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function toast(m) { if (window.zadToast) window.zadToast(m); }

  function init() {
    var main = $('#main'); if (!main) return;

    /* 1) سطر الثقة في الواجهة الترحيبية */
    var heroActions = $('.hero-actions');
    if (heroActions && !$('.hero-trust')) {
      heroActions.after(el('<ul class="hero-trust"><li>كل نص مع مصدره</li><li>درجة الحديث مذكورة</li><li>مراجعة قبل النشر</li></ul>'));
    }

    /* 2) بطاقة «الآن في وقتك» حسب ساعة الجهاز */
    var dash = $('.dashboard');
    if (dash && !$('.now-card')) {
      var h = new Date().getHours(), d;
      if (h >= 4 && h < 12) d = ['أذكار الصباح', 'تبدأ بعد صلاة الفجر وتمتد إلى الضحى. اقرأها بهدوء، وكل ذكر معه مصدره.', 'azkar-morning.html', '☀️ الآن في وقتك', 'أذكار المساء', 'azkar-evening.html'];
      else if (h >= 15 && h < 22) d = ['أذكار المساء', 'تبدأ بعد صلاة العصر وتمتد إلى المغرب. اقرأها بهدوء، وكل ذكر معه مصدره.', 'azkar-evening.html', '🌙 الآن في وقتك', 'أذكار الصباح', 'azkar-morning.html'];
      else if (h >= 22 || h < 4) d = ['أذكار النوم', 'أذكار تُقال قبل النوم، اختم بها يومك بسكينة.', 'azkar-sleep.html', '💤 الآن في وقتك', 'أذكار المساء', 'azkar-evening.html'];
      else d = ['وردك اليومي', 'نظّم أذكارك وقراءتك، وابدأ من حيث توقفت.', 'wird.html', '🌿 الآن في وقتك', 'الأذكار المختارة', 'adhkar.html'];
      dash.insertBefore(el(
        '<div class="dash-card now-card"><div><span class="now-badge">' + d[3] + '</span><h2>' + d[0] + '</h2><p>' + d[1] + '</p></div>' +
        '<div class="now-actions"><a class="btn-gold" href="./' + d[2] + '">افتح ' + d[0] + '</a><a class="link-alt" href="./' + d[5] + '">' + d[4] + '</a></div></div>'
      ), dash.firstChild);
    }

    /* 3) أزرار نسخ/مشاركة لآية اليوم وحديث اليوم (خارج الحاوية التي يملؤها app.js) */
    function actions(id, cls, withMore) {
      var body = document.getElementById(id); if (!body) return;
      var card = body.closest('.dash-card'); if (!card || card.querySelector('.card-actions')) return;
      card.classList.add(cls);
      var bar = el('<div class="card-actions"><button type="button" class="chip-btn" data-a="copy">نسخ</button><button type="button" class="chip-btn" data-a="share">مشاركة</button>' + (withMore ? '<a class="more" href="./nawawi.html">اقرأ الحديث كاملاً</a>' : '') + '</div>');
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var txt = (body.innerText || '').trim() + '\n— زاد عبيدة';
        if (b.dataset.a === 'share' && navigator.share) { navigator.share({ text: txt, url: location.href }).catch(function () {}); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('تم النسخ ✓'); }, function () { toast('تعذّر النسخ'); });
        else toast('النسخ غير مدعوم في هذا المتصفح');
      });
      card.appendChild(bar);
    }
    actions('dailyAyah', 'dash-ayah', false);
    actions('dailyHadith', 'dash-hadith', true);

    /* 4) أيقونات خطية بدل الإيموجي في «أبواب الموقع» */
    var P = {
      'wird': '<path d="M11 20A7 7 0 0 1 4 13c0-5 5-9 16-9 0 11-4 16-9 16z"/><path d="M4 20c3-6 6-9 11-12"/>',
      'adhkar': '<circle cx="12" cy="5" r="2"/><circle cx="5.5" cy="12" r="2"/><circle cx="18.5" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>',
      'morning': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      'evening': '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
      'sleep': '<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/>',
      'my': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      'nawawi': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
      'quran': '<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
      'duas': '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
      'articles': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>'
    };
    var map = { 'wird.html': 'wird', 'adhkar.html': 'adhkar', 'azkar-morning.html': 'morning', 'azkar-evening.html': 'evening', 'azkar-sleep.html': 'sleep', '#my-adhkar': 'my', 'nawawi.html': 'nawawi', 'quran.html': 'quran', 'duas.html': 'duas', 'articles.html': 'articles' };
    document.querySelectorAll('.nav-card').forEach(function (c) {
      if (c.querySelector('.ico-tile')) return;
      var href = (c.getAttribute('href') || '').replace('./', ''), k = map[href];
      if (!k) return;
      c.insertBefore(el('<span class="ico-tile" aria-hidden="true"><svg viewBox="0 0 24 24">' + P[k] + '</svg></span>'), c.firstChild);
    });

    /* 5) قسم «ثقة قبل النشر» قبل «أذكاري» */
    var mine = $('#my-adhkar');
    if (mine && !$('.trust')) {
      mine.before(el(
        '<section class="section trust" aria-labelledby="trustTitle"><div class="wrap"><div class="trust-grid">' +
        '<div><p class="trust-eyebrow">ما يميّزنا</p><h2 id="trustTitle">ثقة قبل النشر</h2>' +
        '<p class="lead">لا ننشر نصًّا بلا مصدر. هذه خطواتنا مع كل ذكر وحديث ودعاء على الموقع.</p>' +
        '<a class="btn-primary" href="./about.html">اقرأ المنهجية كاملة</a></div>' +
        '<div class="trust-steps">' +
        '<div class="trust-step"><b>1</b><h3>مصدر معتمد</h3><p>نختار من كتب السنة المعروفة، ونذكر الكتاب والباب.</p></div>' +
        '<div class="trust-step"><b>2</b><h3>درجة واضحة</h3><p>تظهر درجة الحديث بشارة مرئية بجانب النص.</p></div>' +
        '<div class="trust-step"><b>3</b><h3>مراجعة ثم نشر</h3><p>يُراجع النص مقابل المصدر قبل أن يظهر لك.</p></div>' +
        '</div></div></div></section>'
      ));
    }

    /* 6) شريط «خذ زادك معك»: ننقل زرّي التثبيت والتذكير كما هما (بمستمعاتهما) */
    var inst = document.getElementById('installAppBtn'), notif = document.getElementById('enableNotifBtn');
    if (mine && inst && notif && !$('.get-app')) {
      var band = el(
        '<section class="get-app"><div class="wrap"><div class="get-app-box">' +
        '<div><h2>خذ زادك معك</h2><p>ثبّت التطبيق على جهازك ليعمل بدون إنترنت، وفعّل تذكيرًا هادئًا في أوقات الأذكار.</p></div>' +
        '<div class="get-app-btns"></div></div></div></section>'
      );
      var box = $('.get-app-btns', band);
      box.appendChild(inst); box.appendChild(notif);
      mine.after(band);
      var old = $('.action-buttons'); if (old && !old.children.length) old.remove();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
