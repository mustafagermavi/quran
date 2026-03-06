/**
 * app.js – Islamic Super App
 * Modular ES6+ architecture with advanced features:
 * Prayer times (Aladhan API), Qibla compass, Dhikr with haptics,
 * Quran recitation, smart copy, offline support, battery saver,
 * voice search, and more.
 */

/********** UTILITIES **********/
const storage = {
  get: (key) => JSON.parse(localStorage.getItem(key)),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value))
};

const showSkeleton = (selector) => {
  document.querySelectorAll(selector).forEach(el => el.classList.add('skeleton-card'));
};
const hideSkeleton = (selector) => {
  document.querySelectorAll(selector).forEach(el => el.classList.remove('skeleton-card'));
};

/********** MAIN APP CONTROLLER **********/
class IslamicSuperApp {
  constructor() {
    this.settings = new SettingsManager();
    this.prayer = new PrayerManager(this);
    this.dhikr = new DhikrManager(this);
    this.quran = new QuranManager(this);
    this.ui = new UIManager(this);
    this.compass = new CompassManager(this);
    this.voice = new VoiceManager(this);
    this.khatm = new KhatmManager(this);
    this.init();
  }

  async init() {
    await this.settings.load();
    this.applyBatterySaver();
    this.registerServiceWorker();
    this.prayer.init();
    this.dhikr.init();
    this.quran.init();
    this.compass.init();
    this.voice.init();
    this.khatm.init();
    // Event listeners for UI toggles
    document.getElementById('kidsModeToggle')?.addEventListener('change', (e) => this.ui.toggleKidsMode(e.target.checked));
    document.getElementById('nightShiftToggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.ui.toggleNightShift(!this.settings.nightShift);
    });
  }

  applyBatterySaver() {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        const update = () => {
          if (battery.level < 0.2 && !battery.charging) {
            document.body.classList.add('battery-saver');
          } else {
            document.body.classList.remove('battery-saver');
          }
        };
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
        update();
      });
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.warn);
    }
  }
}

/********** SETTINGS MANAGER **********/
class SettingsManager {
  constructor() {
    this.keys = ['lastAyah', 'dhikrCounts', 'fontSize', 'theme', 'kidsMode', 'nightShift'];
  }

  async load() {
    this.keys.forEach(key => {
      this[key] = storage.get(key) ?? this.default(key);
    });
    this.apply();
  }

  default(key) {
    const defaults = {
      fontSize: 'medium',
      theme: 'dark',
      kidsMode: false,
      nightShift: false,
      dhikrCounts: {},
      lastAyah: { surah: 1, ayah: 1 }
    };
    return defaults[key];
  }

  save(key, value) {
    this[key] = value;
    storage.set(key, value);
    this.apply();
  }

  apply() {
    document.documentElement.style.setProperty('--font-size-multiplier', this.getFontMultiplier());
    document.body.classList.toggle('kids-mode', this.kidsMode);
    document.body.classList.toggle('night-shift', this.nightShift);
  }

  getFontMultiplier() {
    const map = { small: 0.9, medium: 1, large: 1.2 };
    return map[this.fontSize] ?? 1;
  }
}

/********** PRAYER MANAGER **********/
class PrayerManager {
  constructor(app) {
    this.app = app;
    this.timer = null;
    this.nextPrayer = null;
    this.adhanAudio = new Audio('https://www.islamcan.com/audio/adhan/azan1.mp3'); // example URL
  }

  async init() {
    await this.getLocationAndFetch();
    this.startCountdown();
    // refresh every day at midnight
    const nextMidnight = new Date();
    nextMidnight.setHours(24,0,0,0);
    setTimeout(() => this.refresh(), nextMidnight - Date.now());
  }

  async getLocationAndFetch() {
    showSkeleton('.prayer-times-list');
    try {
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      await this.fetchPrayerTimes(latitude, longitude);
    } catch (err) {
      console.warn('GPS denied or error, using fallback coordinates', err);
      await this.fetchPrayerTimes(21.4225, 39.8262); // Makkah fallback
    } finally {
      hideSkeleton('.prayer-times-list');
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject('Geolocation not supported');
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
    });
  }

  async fetchPrayerTimes(lat, lon) {
    const date = new Date();
    const response = await fetch(`https://api.aladhan.com/v1/timings/${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}?latitude=${lat}&longitude=${lon}&method=3`);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    this.timings = data.data.timings;
    this.updateUI();
    this.calculateNextPrayer();
    this.setRamadanTimes(); // if Ramadan
  }

  updateUI() {
    const container = document.querySelector('.prayer-times-list');
    if (!container) return;
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    container.innerHTML = prayers.map(p => `
      <div class="prayer-item">
        <span>${this.getLocalizedName(p)}</span>
        <span class="prayer-time">${this.timings[p]}</span>
      </div>
    `).join('');
  }

  getLocalizedName(p) {
    const names = { Fajr: 'بەیان', Dhuhr: 'نیوەڕۆ', Asr: 'عەسر', Maghrib: 'مەغریب', Isha: 'عیشا' };
    return names[p] || p;
  }

  calculateNextPrayer() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const prayerTimes = [
      { name: 'Fajr', time: this.timings.Fajr },
      { name: 'Dhuhr', time: this.timings.Dhuhr },
      { name: 'Asr', time: this.timings.Asr },
      { name: 'Maghrib', time: this.timings.Maghrib },
      { name: 'Isha', time: this.timings.Isha }
    ].map(p => {
      const [h, m] = p.time.split(':').map(Number);
      return { ...p, minutes: h * 60 + m };
    }).sort((a,b) => a.minutes - b.minutes);

    let next = prayerTimes.find(p => p.minutes > currentTime);
    if (!next) next = prayerTimes[0]; // next day Fajr
    this.nextPrayer = next;
    this.updateNextPrayerUI();
  }

  updateNextPrayerUI() {
    const el = document.querySelector('.next-prayer');
    if (!el) return;
    const now = new Date();
    const [h, m] = this.nextPrayer.time.split(':').map(Number);
    const nextDate = new Date(now);
    nextDate.setHours(h, m, 0);
    if (nextDate < now) nextDate.setDate(nextDate.getDate() + 1);
    const diff = nextDate - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    el.innerHTML = `<i class="fas fa-hourglass-half gold-glow"></i> نوێژی داهاتوو: ${this.getLocalizedName(this.nextPrayer.name)} · ${hours}:${minutes.toString().padStart(2,'0')} دەمێنێ`;
  }

  startCountdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.updateNextPrayerUI(), 1000);
  }

  setRamadanTimes() {
    const today = new Date();
    const month = today.getMonth() + 1;
    if (month === 3 || month === 4) { // approximate
      document.querySelector('.ramadan-info')?.classList.remove('hidden');
      document.getElementById('iftarTime').textContent = this.timings.Maghrib;
      document.getElementById('suhurTime').textContent = this.timings.Fajr;
    }
  }

  playAdhan() {
    this.adhanAudio.play().catch(() => {});
  }
}

/********** DHIKR MANAGER **********/
class DhikrManager {
  constructor(app) {
    this.app = app;
    this.counts = app.settings.dhikrCounts || {};
  }

  init() {
    this.restoreCounts();
    this.setupEventListeners();
    this.startHourlyReminder();
  }

  setupEventListeners() {
    document.querySelectorAll('.tasbih-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.increment(e.target.dataset.dhikr));
    });
    document.querySelectorAll('.reset-tasbih').forEach(btn => {
      btn.addEventListener('click', (e) => this.reset(e.target.dataset.dhikr));
    });
  }

  increment(id) {
    if (!this.counts[id]) this.counts[id] = 0;
    this.counts[id] = (this.counts[id] + 1) % 100; // max 99
    this.updateDisplay(id);
    this.app.settings.save('dhikrCounts', this.counts);
    if (navigator.vibrate) navigator.vibrate(50);
  }

  reset(id) {
    this.counts[id] = 0;
    this.updateDisplay(id);
    this.app.settings.save('dhikrCounts', this.counts);
  }

  updateDisplay(id) {
    const el = document.querySelector(`.tasbih-count[data-dhikr="${id}"]`);
    if (el) el.textContent = this.counts[id] || 0;
  }

  restoreCounts() {
    for (let id in this.counts) {
      this.updateDisplay(id);
    }
  }

  startHourlyReminder() {
    setInterval(() => {
      const now = new Date();
      if (now.getMinutes() === 0) {
        if (Notification.permission === 'granted') {
          new Notification('ئەذکار', { body: 'کاتی یادکردنەوەی خوا' });
        }
      }
    }, 60000);
    if (Notification.permission === 'default') Notification.requestPermission();
  }
}

/********** QURAN MANAGER **********/
class QuranManager {
  constructor(app) {
    this.app = app;
    this.currentSurah = app.settings.lastAyah?.surah || 1;
    this.currentAyah = app.settings.lastAyah?.ayah || 1;
    this.audio = new Audio();
    this.surahList = [];
  }

  async init() {
    await this.loadSurahList();
    this.restoreLastAyah();
    this.setupCopyButtons();
    this.setupScrollTracking();
    window.searchQuran = (term) => this.search(term);
  }

  async loadSurahList() {
    // Simulated data – in production use a JSON file.
    this.surahList = [
      { id: 1, name: 'الفاتحة', type: 'مەکی', verses: 7, translation: 'فاتحة' },
      { id: 2, name: 'البقرة', type: 'مەدەنی', verses: 286, translation: 'بقرة' }
    ];
    this.renderSurahList();
  }

  renderSurahList() {
    const container = document.querySelector('.surah-list');
    if (!container) return;
    container.innerHTML = this.surahList.map(s => `
      <div class="surah-row" data-surah="${s.id}">
        <span>${s.id}. ${s.name} <span class="makki-badge">${s.type}</span></span>
        <span>${s.verses} ئایەت</span>
      </div>
    `).join('');
  }

  restoreLastAyah() {
    const ayahEl = document.querySelector(`[data-ayah="${this.currentAyah}"]`);
    if (ayahEl) {
      ayahEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ayahEl.classList.add('highlight');
    }
  }

  setupCopyButtons() {
    document.querySelectorAll('.copy-ayah-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const container = e.target.closest('.ayah-container');
        if (!container) return;
        const arabic = container.querySelector('.verse-arabic')?.textContent || '';
        const kurdish = container.querySelector('.translation-kurdish')?.textContent || '';
        const surahName = container.dataset.surahName || '';
        const ayahNumber = container.dataset.ayah || '';
        const textToCopy = `${arabic}\n${kurdish}\nسورەتی ${surahName} · ئایەت ${ayahNumber}`;
        navigator.clipboard.writeText(textToCopy).then(() => this.app.ui.showCopyToast());
      });
    });
  }

  setupScrollTracking() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const ayah = entry.target.dataset.ayah;
          const surah = entry.target.dataset.surah;
          if (ayah && surah) {
            this.app.settings.save('lastAyah', { surah: Number(surah), ayah: Number(ayah) });
          }
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-ayah]').forEach(el => observer.observe(el));
  }

  search(term) {
    const matched = this.surahList.find(s => s.name.includes(term) || s.translation.includes(term));
    if (matched) {
      document.querySelector(`[data-surah="${matched.id}"]`)?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/********** UI MANAGER **********/
class UIManager {
  constructor(app) {
    this.app = app;
  }

  toggleKidsMode(active) {
    this.app.settings.save('kidsMode', active);
  }

  toggleNightShift(active) {
    this.app.settings.save('nightShift', active);
    if (active) this.applyNightShiftFilter();
  }

  applyNightShiftFilter() {
    const now = new Date();
    const sunset = this.app.prayer.timings?.Sunset;
    if (sunset) {
      const [h, m] = sunset.split(':').map(Number);
      const sunsetTime = new Date(now);
      sunsetTime.setHours(h, m, 0);
      if (now > sunsetTime || now < sunsetTime.setHours(0,0,0)) {
        document.body.style.filter = 'sepia(0.3) brightness(0.9)';
      } else {
        document.body.style.filter = '';
      }
    }
  }

  showCopyToast() {
    const toast = document.querySelector('.copy-toast');
    if (!toast) return;
    toast.innerHTML = '<i class="fa-regular fa-circle-check"></i><span>کۆپی سەرکەوتوو بوو</span>';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

/********** COMPASS MANAGER **********/
class CompassManager {
  constructor(app) {
    this.app = app;
  }

  async init() {
    if (!window.DeviceOrientationEvent) return;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') return;
      } catch (e) { return; }
    }
    window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
  }

  handleOrientation(event) {
    const azimuth = event.webkitCompassHeading || event.alpha;
    if (azimuth === null) return;
    const qiblaDirection = 137; // example – should be calculated based on user location
    const difference = (qiblaDirection - azimuth + 360) % 360;
    const compassNeedle = document.querySelector('.qibla-radar i');
    if (compassNeedle) {
      compassNeedle.style.transform = `rotate(${difference}deg)`;
    }
    if (Math.abs(difference) < 5) {
      document.querySelector('.qibla-radar')?.classList.add('aligned');
    } else {
      document.querySelector('.qibla-radar')?.classList.remove('aligned');
    }
  }
}

/********** VOICE MANAGER **********/
class VoiceManager {
  constructor(app) {
    this.app = app;
    this.recognition = null;
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.lang = 'ar-SA';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  init() {
    document.getElementById('voiceSearchBtn')?.addEventListener('click', () => this.startListening());
  }

  startListening() {
    if (!this.recognition) {
      alert('Voice not supported');
      return;
    }
    this.recognition.start();
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.querySelector('.voice-search input').value = transcript;
      if (window.searchQuran) window.searchQuran(transcript);
    };
  }
}

/********** KHATM MANAGER **********/
class KhatmManager {
  constructor(app) {
    this.app = app;
    this.pagesRead = 0;
  }

  init() {
    this.loadProgress();
    this.setupCertificateButton();
  }

  loadProgress() {
    this.pagesRead = storage.get('khatmPages') || 0;
  }

  setupCertificateButton() {
    document.getElementById('generateCertificate')?.addEventListener('click', () => this.generateCertificate());
  }

  generateCertificate() {
    const canvas = document.getElementById('certificateCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 600;
    ctx.fillStyle = '#f5e6d3';
    ctx.fillRect(0,0,800,600);
    ctx.font = 'bold 40px Vazirmatn';
    ctx.fillStyle = '#b8860b';
    ctx.fillText('بڕیارنامەی خەتمی قورئان', 150, 150);
    ctx.font = '30px Vazirmatn';
    ctx.fillStyle = '#000';
    ctx.fillText(`بە ناوی: بەکارهێنەر`, 250, 300);
    ctx.fillText(`ڕێکەوت: ${new Date().toLocaleDateString('ku')}`, 250, 400);
    const link = document.createElement('a');
    link.download = 'khatm-certificate.png';
    link.href = canvas.toDataURL();
    link.click();
  }
}

/********** START THE APP **********/
window.addEventListener('DOMContentLoaded', () => {
  window.app = new IslamicSuperApp();
});
