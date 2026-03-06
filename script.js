// ===== script.js =====
(function() {
  // ---------- GLOBAL DATA ----------
  const surahList = [
    { id:1, ar:"الفاتحة", ku:"فاتیحە" },
    { id:2, ar:"البقرة", ku:"بەقەرە" },
    { id:3, ar:"آل عمران", ku:"ئالی عیمران" },
    { id:4, ar:"النساء", ku:"نیسا" },
    { id:5, ar:"المائدة", ku:"مائیدە" },
    { id:6, ar:"الأنعام", ku:"ئەنعام" },
    { id:7, ar:"الأعراف", ku:"ئەعراف" },
    { id:8, ar:"الأنفال", ku:"ئەنفال" },
    { id:9, ar:"التوبة", ku:"تەوبە" },
    { id:10, ar:"يونس", ku:"یونس" }
  ];

  // Dummy verses for detail
  const dummyVerses = [
    { ar:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation:"بە ناوی خودای بەخشندەی میهرەبان" },
    { ar:"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation:"سوپاس بۆ خوا، پەروەردگاری جیهانیان" },
    { ar:"الرَّحْمَٰنِ الرَّحِيمِ", translation:"بەخشندەی میهرەبان" },
    { ar:"مَالِكِ يَوْمِ الدِّينِ", translation:"خاوەنی ڕۆژی سزا" }
  ];

  // ---------- UTILS ----------
  function updateGreeting() {
    const el = document.getElementById('greeting');
    if (el) {
      const hour = new Date().getHours();
      let msg = (hour < 12) ? 'بەیانی باش' : (hour < 18) ? 'نیوەڕۆ باش' : 'ئێوارە باش';
      el.innerHTML = `${msg} <span class="kurdish-name">(باش)</span>`;
    }
  }

  // static hijri (could be dynamic via API, but here static)
  document.getElementById('hijriDateDisplay').innerText = '١٠ ڕەمەزان ١٤٤٥';
  document.getElementById('hijriShort').innerText = '١٥ ڕەمەزان';

  // ---------- SURAH GRID POPULATION ----------
  const surahGrid = document.getElementById('surahGrid');
  function renderSurahGrid() {
    surahGrid.innerHTML = '';
    surahList.forEach(s => {
      const div = document.createElement('div');
      div.className = 'surah-item';
      div.setAttribute('data-id', s.id);
      div.innerHTML = `<span class="surah-arabic">${s.ar}</span> <span class="surah-kurdish">${s.ku}</span>`;
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        openSurahDetail(s);
      });
      surahGrid.appendChild(div);
    });
  }

  // ---------- SURAH DETAIL VIEW ----------
  const homeSection = document.getElementById('home-section');
  const detailSection = document.getElementById('surahDetail-section');
  const versesContainer = document.getElementById('versesContainer');
  const backBtn = document.getElementById('backFromDetail');
  const detailNameAr = document.getElementById('detailSurahNameAr');
  const detailNameKu = document.getElementById('detailSurahNameKu');

  function openSurahDetail(surah) {
    // hide all sections, show detail
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    detailSection.classList.add('active');
    detailNameAr.innerText = surah.ar;
    detailNameKu.innerText = surah.ku;

    // populate verses
    versesContainer.innerHTML = '';
    dummyVerses.forEach((v, idx) => {
      const verseDiv = document.createElement('div');
      verseDiv.className = 'verse-card glass-card sharp';
      verseDiv.innerHTML = `
        <div class="verse-arabic">${v.ar}</div>
        <div class="verse-translation">${v.translation}</div>
        <div class="verse-actions">
          <button class="icon-btn" onclick="copyText(this, '${v.ar}')"><i class="fas fa-copy"></i></button>
          <button class="icon-btn" onclick="shareText(this, '${v.ar}')"><i class="fas fa-share-alt"></i></button>
          <button class="icon-btn" onclick="bookmark(this)"><i class="fas fa-bookmark"></i></button>
        </div>
      `;
      versesContainer.appendChild(verseDiv);
    });
  }

  backBtn.addEventListener('click', () => {
    detailSection.classList.remove('active');
    homeSection.classList.add('active');
  });

  // ---------- BOTTOM NAVIGATION ----------
  const navItems = document.querySelectorAll('.nav-item');
  const sections = {
    home: document.getElementById('home-section'),
    search: document.getElementById('search-section'),
    favorites: document.getElementById('favorites-section'),
    audio: document.getElementById('audio-section'),
    settings: document.getElementById('settings-section')
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionName = item.getAttribute('data-section');
      // hide all sections
      Object.values(sections).forEach(s => s.classList.remove('active'));
      // if we are in detail view, also hide detail (optional)
      detailSection.classList.remove('active');
      // show selected
      if (sections[sectionName]) {
        sections[sectionName].classList.add('active');
      }
      // update active nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // ---------- AUDIO SECTION: populate surah dropdown ----------
  const surahSelect = document.getElementById('surahSelect');
  if (surahSelect) {
    surahList.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.ar} (${s.ku})`;
      surahSelect.appendChild(opt);
    });
    // change audio src (simple example)
    const audio = document.getElementById('quranAudio');
    surahSelect.addEventListener('change', (e) => {
      // In real app, change src based on surah ID. using same for demo
      audio.src = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${e.target.value}.mp3`;
      audio.load();
      audio.play().catch(() => {}); // autoplay may be blocked
    });
  }

  // ---------- SETTINGS ----------
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;
  themeToggle.addEventListener('click', () => {
    if (body.classList.contains('dark-theme')) {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
      themeToggle.innerHTML = 'گۆڕین بۆ تاریک';
    } else {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
      themeToggle.innerHTML = 'گۆڕین بۆ ڕووناک';
    }
  });

  // font size slider
  const fontRange = document.getElementById('fontRange');
  fontRange.addEventListener('input', (e) => {
    document.querySelectorAll('.verse-arabic, .arabic, p, .translation').forEach(el => {
      el.style.fontSize = e.target.value + 'px';
    });
  });

  // background switcher (simple class on body)
  const bgSelect = document.getElementById('bgSelect');
  bgSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'dark-bokeh') {
      body.style.backgroundImage = 'radial-gradient(circle at 30% 40%, #2a4b5f 0%, #0a111f 70%), radial-gradient(circle at 80% 70%, #1d3a47 0%, transparent 50%)';
    } else if (val === 'light-bokeh') {
      body.style.backgroundImage = 'radial-gradient(circle at 20% 30%, #c0d9e8, #a2b9d1)';
    } else if (val === 'mosaic') {
      body.style.backgroundImage = 'url("https://www.transparenttextures.com/patterns/dark-mosaic.png")';
    }
  });

  // ---------- ZIKR COUNTER ----------
  let zikrCount = 33;
  const zikrBtn = document.getElementById('zikrBtn');
  const zikrCounter = document.getElementById('zikrCounter');
  if (zikrBtn) {
    zikrBtn.addEventListener('click', () => {
      zikrCount = (zikrCount % 99) + 1;
      zikrCounter.innerText = zikrCount;
    });
  }

  // ---------- LAST READ (localStorage) ----------
  const lastReadBtn = document.getElementById('lastReadBtn');
  lastReadBtn.addEventListener('click', () => {
    const lastSurah = localStorage.getItem('lastSurah');
    if (lastSurah) {
      const surah = JSON.parse(lastSurah);
      openSurahDetail(surah);
    } else {
      alert('ھێشتا هیچ خوێندنەوەیەک تۆمار نەکراوە');
    }
  });

  // when a surah is opened, save as last read
  function saveLastRead(surah) {
    localStorage.setItem('lastSurah', JSON.stringify(surah));
  }
  // override openSurahDetail to save
  const originalOpen = openSurahDetail;
  openSurahDetail = function(surah) {
    saveLastRead(surah);
    originalOpen(surah);
  };
  window.openSurahDetail = openSurahDetail; // make global for onclick

  // ---------- GLOBAL FUNCTIONS FOR BUTTONS (copy/share/bookmark) ----------
  window.copyText = (btn, text) => {
    const content = text || 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ';
    navigator.clipboard?.writeText(content).then(() => alert('کۆپی کرا')).catch(() => alert('نەتوانی کۆپی بکات'));
  };

  window.shareText = (btn, text) => {
    const content = text || 'ئایەتێکی پیرۆز';
    if (navigator.share) navigator.share({ title: 'قورئان', text: content }).catch(() => {});
    else alert('شیەرکردن: ' + content);
  };

  window.bookmark = (btn) => {
    btn.classList.toggle('active');
    alert('دڵخواز کراوە / لابرا');
  };

  // ---------- INIT ----------
  renderSurahGrid();
  updateGreeting();

  // Simulate prayer times (static)
  // Qibla arrow rotate simulation
  // 99 names placeholder ok

  // Make sure home active
  homeSection.classList.add('active');
  detailSection.classList.remove('active');

  // handle global search (just placeholder)
  document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    // simple filter on surah grid items (if home visible)
    const term = e.target.value.trim();
    document.querySelectorAll('.surah-item').forEach(item => {
      const text = item.innerText;
      item.style.display = text.includes(term) ? 'flex' : 'none';
    });
  });
})();
