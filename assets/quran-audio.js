(() => {
  // قائمة أسماء السور الـ 114
  const SURAH_NAMES = [
    "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
    "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
    "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
    "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
    "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
    "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
    "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
    "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
    "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
    "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
    "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
    "المسد","الإخلاص","الفلق","الناس"
  ];

  // الحالة العامة للتطبيق
  let allReciters = [];
  let filteredReciters = [];
  let favorites = [];
  try {
    favorites = JSON.parse(localStorage.getItem('zad_fav_reciters') || '[]');
  } catch (e) {
    favorites = [];
  }

  let currentFilter = 'all';
  let activeReciter = null;
  let activeSurahList = [];
  let currentTrackIndex = -1;

  // عناصر الواجهة
  const cratesView = document.getElementById('cratesView');
  const wheelView = document.getElementById('wheelView');
  const cratesCarousel = document.getElementById('cratesCarousel');
  const wheelScrollList = document.getElementById('wheelScrollList');
  const reciterSearchInput = document.getElementById('reciterSearchInput');
  const surahSearchInput = document.getElementById('surahSearchInput');
  const audio = document.getElementById('qaAudio');
  const playBtn = document.getElementById('qaPlay');
  const seekBar = document.getElementById('qaSeek');
  const curTimeEl = document.getElementById('qaCurrentTime');
  const durTimeEl = document.getElementById('qaDuration');

  if (!cratesCarousel || !wheelScrollList || !audio) return;

  // 1. جلب القرّاء من واجهة MP3Quran
  async function loadReciters() {
    try {
      const res = await fetch('https://www.mp3quran.net/api/v3/reciters?language=ar');
      const data = await res.json();
      allReciters = (data.reciters || []).map(r => {
        const moshaf = r.moshaf && r.moshaf[0] ? r.moshaf[0] : null;
        return {
          id: r.id,
          name: r.name,
          rewaya: moshaf ? moshaf.name : 'حفص عن عاصم',
          server: moshaf ? moshaf.server : '',
          surahTotal: moshaf ? moshaf.surah_total : 0,
          surahList: moshaf && moshaf.surah_list ? moshaf.surah_list.split(',').map(Number) : []
        };
      }).filter(r => r.server && r.surahList.length > 0);

      applyReciterFilters();
      checkRecentPlayback();
    } catch (err) {
      cratesCarousel.innerHTML = `<div style="padding:30px;text-align:center;width:100%;">تعذّر الاتصال بالمكتبة الصوتية. تأكد من الإنترنت وأعد المحاولة.</div>`;
    }
  }

  // 2. فلترة وعرض بطاقات الفينيل
  function applyReciterFilters() {
    const query = reciterSearchInput ? reciterSearchInput.value.trim() : '';
    filteredReciters = allReciters.filter(r => {
      if (currentFilter === 'complete' && r.surahTotal < 114) return false;
      if (currentFilter === 'favorites' && !favorites.includes(r.id)) return false;
      if (query && !r.name.includes(query)) return false;
      return true;
    });

    renderCrates();
  }

  function renderCrates() {
    if (filteredReciters.length === 0) {
      cratesCarousel.innerHTML = `<div style="padding:40px;text-align:center;width:100%;color:var(--qa-muted);">لا توجد نتائج مطابقة لبحثك.</div>`;
      return;
    }

    const listToShow = filteredReciters.slice(0, 70);
    cratesCarousel.innerHTML = listToShow.map((r, idx) => {
      const isFav = favorites.includes(r.id);
      return `
        <article class="vinyl-crate" data-theme="${idx % 4}" data-id="${r.id}">
          <div class="vinyl-pocket">
            <div class="vinyl-record"></div>
          </div>
          <div class="crate-slot"></div>

          <div class="crate-top-row">
            <span class="crate-badge">${r.surahTotal} سورة</span>
            <button class="crate-fav-btn ${isFav ? 'faved' : ''}" data-fav="${r.id}" type="button" title="إضافة للمفضلة">
              ${isFav ? '★' : '☆'}
            </button>
          </div>

          <div class="crate-body">
            <h3>${r.name}</h3>
            <p>${r.rewaya}</p>
            <button class="open-crate-btn" type="button">
              <span>افتح التلاوات</span>
              <span>←</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    requestAnimationFrame(updateCarouselTilt);
  }

  // 3. فيزياء الميلان الثلاثي الأبعاد عند سحب البطاقات
  function updateCarouselTilt() {
    const boxRect = cratesCarousel.getBoundingClientRect();
    const centerX = boxRect.left + boxRect.width / 2;
    const cards = cratesCarousel.querySelectorAll('.vinyl-crate');

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = (cardCenter - centerX) / (boxRect.width / 2);
      const clamped = Math.max(-1.2, Math.min(1.2, dist));

      const rotateZ = clamped * 4.5;
      const scale = 1 - Math.min(Math.abs(clamped), 1) * 0.06;

      card.style.transform = `scale(${scale}) rotate(${rotateZ}deg)`;
      if (Math.abs(clamped) < 0.28) {
        card.classList.add('is-active');
      } else {
        card.classList.remove('is-active');
      }
    });
  }

  cratesCarousel.addEventListener('scroll', () => requestAnimationFrame(updateCarouselTilt));

  cratesCarousel.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      const id = Number(favBtn.dataset.fav);
      if (favorites.includes(id)) {
        favorites = favorites.filter(x => x !== id);
      } else {
        favorites.push(id);
      }
      localStorage.setItem('zad_fav_reciters', JSON.stringify(favorites));
      applyReciterFilters();
      return;
    }

    const card = e.target.closest('.vinyl-crate');
    if (card) {
      const id = Number(card.dataset.id);
      const reciter = allReciters.find(r => r.id === id);
      if (reciter) openReciterWheel(reciter);
    }
  });

  // 4. الانتقال إلى شاشة العجلة الدائرية للسور
  function openReciterWheel(reciter) {
    activeReciter = reciter;
    document.getElementById('activeReciterName').textContent = reciter.name;
    document.getElementById('activeReciterMeta').textContent = `${reciter.rewaya} · ${reciter.surahTotal} سورة`;
    if (surahSearchInput) surahSearchInput.value = '';

    cratesView.classList.add('view-hidden');
    wheelView.classList.remove('view-hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderWheelSurahs('');
  }

  const backBtn = document.getElementById('backToCratesBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      wheelView.classList.add('view-hidden');
      cratesView.classList.remove('view-hidden');
      requestAnimationFrame(updateCarouselTilt);
    });
  }

  function renderWheelSurahs(filterQuery) {
    if (!activeReciter) return;
    activeSurahList = activeReciter.surahList.map(num => ({
      number: num,
      name: SURAH_NAMES[num - 1] || `سورة ${num}`,
      url: `${activeReciter.server}${String(num).padStart(3, '0')}.mp3`
    })).filter(s => !filterQuery || s.name.includes(filterQuery) || String(s.number) === filterQuery);

    wheelScrollList.innerHTML = activeSurahList.map((s, idx) => `
      <div class="wheel-row" data-idx="${idx}">
        <div class="wheel-row-info">
          <div class="wheel-disc-icon">${s.number}</div>
          <div>
            <div class="wheel-row-title">سورة ${s.name}</div>
            <div class="wheel-row-sub">${activeReciter.name}</div>
          </div>
        </div>
        <button class="wheel-play-pill" type="button">▶ تشغيل</button>
      </div>
    `).join('');

    wheelScrollList.scrollTop = 0;
    requestAnimationFrame(updateWheelArc);
  }

  // 5. فيزياء القوس الدائري للسور
  function updateWheelArc() {
    const stageRect = wheelScrollList.getBoundingClientRect();
    const centerY = stageRect.top + stageRect.height / 2;
    const halfH = stageRect.height / 2;
    const rows = wheelScrollList.querySelectorAll('.wheel-row');

    rows.forEach(row => {
      const rect = row.getBoundingClientRect();
      const rowCenter = rect.top + rect.height / 2;
      const dist = (rowCenter - centerY) / halfH;
      const absDist = Math.min(Math.abs(dist), 1);

      const arcX = Math.pow(absDist, 2) * 58;
      const scale = 1 - absDist * 0.26;
      const opacity = 1 - absDist * 0.72;
      const rotate = dist * -4;

      row.style.transform = `translateX(${arcX}px) scale(${scale}) rotate(${rotate}deg)`;
      row.style.opacity = opacity;

      if (absDist < 0.15) {
        row.classList.add('centered');
      } else {
        row.classList.remove('centered');
      }
    });
  }

  wheelScrollList.addEventListener('scroll', () => requestAnimationFrame(updateWheelArc));

  wheelScrollList.addEventListener('click', (e) => {
    const row = e.target.closest('.wheel-row');
    if (!row) return;
    const idx = Number(row.dataset.idx);
    playSurahAtIndex(idx);
  });

  // 6. تشغيل الصوت والتحكم في المشغل
  function playSurahAtIndex(idx) {
    if (idx < 0 || idx >= activeSurahList.length || !activeReciter) return;
    currentTrackIndex = idx;
    const track = activeSurahList[idx];

    document.getElementById('qaNowTitle').textContent = `سورة ${track.name}`;
    document.getElementById('qaNowSub').textContent = `${activeReciter.name} · ${activeReciter.rewaya}`;

    audio.src = track.url;
    audio.play().then(() => {
      playBtn.textContent = '⏸';
    }).catch(() => {});

    wheelScrollList.querySelectorAll('.wheel-row').forEach((r, i) => {
      r.classList.toggle('is-playing', i === idx);
    });

    localStorage.setItem('zad_last_audio', JSON.stringify({
      reciterId: activeReciter.id,
      reciterName: activeReciter.name,
      surahNumber: track.number,
      surahName: track.name,
      url: track.url
    }));
  }

  playBtn.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '⏸';
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  });

  document.getElementById('qaNext').addEventListener('click', () => {
    if (currentTrackIndex + 1 < activeSurahList.length) {
      playSurahAtIndex(currentTrackIndex + 1);
    }
  });

  document.getElementById('qaPrev').addEventListener('click', () => {
    if (currentTrackIndex - 1 >= 0) {
      playSurahAtIndex(currentTrackIndex - 1);
    }
  });

  audio.addEventListener('ended', () => {
    if (currentTrackIndex + 1 < activeSurahList.length) {
      playSurahAtIndex(currentTrackIndex + 1);
    } else {
      playBtn.textContent = '▶';
    }
  });

  function fmtTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  audio.addEventListener('timeupdate', () => {
    curTimeEl.textContent = fmtTime(audio.currentTime);
    durTimeEl.textContent = fmtTime(audio.duration);
    if (audio.duration) {
      seekBar.value = Math.floor((audio.currentTime / audio.duration) * 1000);
    }
  });

  seekBar.addEventListener('input', () => {
    if (audio.duration) {
      audio.currentTime = (seekBar.value / 1000) * audio.duration;
    }
  });

  if (reciterSearchInput) reciterSearchInput.addEventListener('input', applyReciterFilters);
  if (surahSearchInput) surahSearchInput.addEventListener('input', (e) => renderWheelSurahs(e.target.value.trim()));

  const filterPills = document.getElementById('filterPills');
  if (filterPills) {
    filterPills.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      filterPills.querySelectorAll('.qa-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyReciterFilters();
    });
  }

  function checkRecentPlayback() {
    try {
      const saved = JSON.parse(localStorage.getItem('zad_last_audio'));
      if (saved && saved.url) {
        const banner = document.getElementById('recentBanner');
        document.getElementById('recentText').textContent = `سورة ${saved.surahName} — ${saved.reciterName}`;
        banner.style.display = 'flex';
        document.getElementById('resumeRecentBtn').onclick = () => {
          document.getElementById('qaNowTitle').textContent = `سورة ${saved.surahName}`;
          document.getElementById('qaNowSub').textContent = saved.reciterName;
          audio.src = saved.url;
          audio.play();
          playBtn.textContent = '⏸';
        };
      }
    } catch (e) {}
  }

  loadReciters();
})();
