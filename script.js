
    const branchColors = ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#06b6d4'];

    const firebaseConfig = {
      apiKey: "AIzaSyDZ-XP6H_yE-uZBupOgrLrjnHd1CbAEXjA",
      authDomain: "silsilah-keluarga-9524e.firebaseapp.com",
      databaseURL: "https://silsilah-keluarga-9524e-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "silsilah-keluarga-9524e",
      storageBucket: "silsilah-keluarga-9524e.firebasestorage.app",
      messagingSenderId: "81827361473",
      appId: "1:81827361473:web:032ad4c2746ed6a08c7d50"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const APP_VERSION = '4.4.0';
    const DATA_PATH = 'silsilah_v2';
    const SESSION_KEY = 'silsilah_family_session_v4';
    const CACHE_KEY = 'silsilah_family_cache_v4';
    const OFFLINE_QUEUE_KEY = 'silsilah_offline_queue_v42';
    const HISTORY_PATH = 'silsilah_v2_history';
    const REMINDER_KEY = 'silsilah_reminder_v42';
    const historyRef = db.ref(HISTORY_PATH);
    let cloudRef = db.ref(DATA_PATH);
    let saveTimer = null;
    let isCloudReady = false;
    let familyEvents = [];
    let editingAssets = { gallery: [], documents: [] };
    let pendingHistoryLabel = "";
    let calendarCursor = new Date();
    let presentationPeople = [];
    let presentationIndex = 0;

    function setSyncStatus(state, text, detail = '') {
      const dot = document.getElementById('sync-status-dot');
      const label = document.getElementById('sync-status-text');
      const time = document.getElementById('sync-status-time');
      if (dot) dot.className = `sync-dot ${state}`;
      if (label) label.textContent = text;
      if (time) time.textContent = detail || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const loginStatus = document.querySelector('#login-connection-status .status-dot');
      if (loginStatus) loginStatus.className = `status-dot ${state === 'online' ? 'online' : state === 'offline' ? 'offline' : ''}`;
    }

    function persistLocalCache(pending = false) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ tree: treeData, settings: appSettings, familyEvents, cachedAt: Date.now(), pending })); } catch (_) {}
    }

    function getCloudPayload() {
      return { tree: treeData, settings: appSettings, familyEvents, meta: { version: APP_VERSION, updatedAt: firebase.database.ServerValue.TIMESTAMP } };
    }

    function recordHistory(label = 'Pembaruan data') {
      if (!label || !treeData) return Promise.resolve();
      const snapshot = { label, tree: treeData, settings: appSettings, familyEvents, createdAt: firebase.database.ServerValue.TIMESTAMP, version: APP_VERSION };
      return historyRef.push(snapshot).then(() => historyRef.orderByChild('createdAt').once('value')).then((snap) => {
        const rows = [];
        snap.forEach(child => rows.push({ key: child.key, createdAt: child.val()?.createdAt || 0 }));
        rows.sort((a,b) => b.createdAt-a.createdAt).slice(40).forEach(row => historyRef.child(row.key).remove());
      }).catch(err => console.warn('History snapshot gagal:', err));
    }

    function simpanKeFirebase(historyLabel = '') {
      if (historyLabel) pendingHistoryLabel = historyLabel;
      persistLocalCache(!navigator.onLine);
      setSyncStatus('pending', 'Menyimpan perubahan...', navigator.onLine ? 'Sinkronisasi berjalan' : 'Menunggu internet');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const payload = getCloudPayload();
        if (!navigator.onLine) {
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ ...payload, queuedAt: Date.now(), historyLabel: pendingHistoryLabel }));
          setSyncStatus('offline', 'Perangkat offline', 'Perubahan masuk antrean sinkronisasi');
          return;
        }
        cloudRef.set(payload)
          .then(async () => {
            isCloudReady = true;
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            persistLocalCache(false);
            const label = pendingHistoryLabel; pendingHistoryLabel = '';
            if (label) await recordHistory(label);
            setSyncStatus('online', 'Tersinkron ke cloud', `Terakhir disimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
          })
          .catch((error) => {
            console.error('Firebase write error:', error);
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ ...payload, queuedAt: Date.now(), historyLabel: pendingHistoryLabel }));
            persistLocalCache(true);
            setSyncStatus('offline', 'Gagal menyimpan ke cloud', 'Perubahan tersimpan di antrean perangkat');
            showToast('Cloud belum dapat menyimpan. Perubahan aman di perangkat dan akan dikirim saat online.', true);
          });
      }, 450);
    }

    const todayStr = new Date().toISOString().split('T')[0]; 
    const bdayYear = parseInt(todayStr.split('-')[0]) - 30; 
    const demoBday = `${bdayYear}-${todayStr.split('-')[1]}-${todayStr.split('-')[2]}`;

    // --- BEGIN INITIAL DATA ---
    const initialTreeData = {
      id: 'root-1', name: 'Budi Santoso', gender: 'L', birthYear: '1945', birthDate: '', deathYear: '', notes: 'Kakek Buyut', photoUrl: '', birthPlace: 'Surabaya', gmapUrl: 'https://maps.app.goo.gl/example1?q=-7.2504,112.7688', address: 'Jl. Merdeka No. 45', phone: '081234567890', bloodType: 'O', occupation: 'Pensiunan PNS', isCollapsed: false,
      spouses: [{ id: 'spouse-1', name: 'Siti Aminah', gender: 'P', birthYear: '1948', deathYear: '2015', photoUrl: '', birthPlace: 'Malang', gmapUrl: 'https://www.google.com/maps/place/Malang/@-7.9666,112.6326,12z' }],
      children: [
        {
          id: 'child-1', name: 'Agus Santoso', gender: 'L', birthYear: '1968', isCollapsed: false, birthPlace: 'Jakarta', gmapUrl: 'https://maps.google.com/?q=-6.2088,106.8456',
          spouses: [
            { id: 'spouse-2', name: 'Ratna Ningrum', gender: 'P', birthYear: '1970', notes: 'Cerai thn 2000', birthPlace: 'Bandung', gmapUrl: 'https://maps.google.com/?q=-6.9175,107.6191' },
            { id: 'spouse-2b', name: 'Linda Kusuma', gender: 'P', birthYear: '1975', notes: 'Istri Kedua', birthPlace: 'Semarang', gmapUrl: 'https://maps.google.com/?q=-6.9667,110.4167' }
          ],
          children: [
            { id: 'grandchild-1', name: 'Dewi Lestari', gender: 'P', birthDate: demoBday, occupation: 'Dokter', linkedSpouseId: 'spouse-2', spouses: [], children: [], birthPlace: 'Jakarta', gmapUrl: 'https://maps.google.com/?q=-6.2088,106.8456' },
            { id: 'grandchild-2', name: 'Bima Saputra', gender: 'L', birthYear: '1995', linkedSpouseId: 'spouse-2b', occupation: 'Insinyur', notes: 'Anak dari pernikahan kedua', spouses: [], children: [], birthPlace: 'Tokyo', gmapUrl: 'https://maps.google.com/?q=35.6762,139.6503' }
          ]
        }
      ]
    };

    const initialAppSettings = {
      autoSave: true, 
      accessCode: '12345', 
      appTitle: 'Silsilah Keluarga',
      appSubtitle: 'Family Legacy Workspace',
      enableEdit: true, 
      bgColor: 'bg-slate-100',
      cardStyle: 'default',
      loginTitle: 'Gembok Keluarga',
      loginDesc: 'Masukkan kode akses untuk membuka arsip dan pohon keluarga.',
      reminderDays: 7
    };
    // --- END INITIAL DATA ---

    let treeData;
    let appSettings;
    
    // Kamera kanvas v4.1: koordinat viewport yang stabil, tanpa translate(-50%).
    // Data pohon/Firebase tidak disentuh; hanya cara kanvas ditampilkan yang dirombak.
    let scale = 1;
    let position = { x: 0, y: 0 };
    let searchQuery = '';
    let isRenderPending = false;
    let cameraInitialized = false;
    let lastViewportSize = { width: 0, height: 0 };
    const CAMERA_MIN_SCALE = 0.18;
    const CAMERA_MAX_SCALE = 2.75;
    const CAMERA_SIDE_PADDING = 56;
    const CAMERA_TOP_PADDING = 112;
    const CAMERA_BOTTOM_PADDING = 72;
    
    let modalMode = 'edit'; 
    let selectedNodeId = null;
    let selectedSpouseId = null;

    const treeContainer = document.getElementById('tree-container');
    const transformDiv = document.getElementById('tree-transform');
    const mainArea = document.getElementById('main-area');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const loginScreen = document.getElementById('login-screen');

    let toastTimeout;
    window.showToast = function(message, isError = false) {
      const toast = document.getElementById('toast-notification');
      const icon = toast.querySelector('i');
      
      document.getElementById('toast-message').innerText = message;
      
      if (isError) {
        toast.classList.remove('bg-green-600');
        toast.classList.add('bg-red-600');
        icon.className = 'fa-solid fa-circle-exclamation mr-2';
      } else {
        toast.classList.remove('bg-red-600');
        toast.classList.add('bg-green-600');
        icon.className = 'fa-solid fa-circle-check mr-2';
      }

      toast.classList.remove('translate-y-20', 'opacity-0');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, isError ? 4000 : 3000);
    };

    window.customConfirm = function(title, message, onConfirm) {
      const modal = document.getElementById('custom-confirm-modal');
      const box = document.getElementById('custom-confirm-box');
      
      document.getElementById('custom-confirm-title').innerText = title;
      document.getElementById('custom-confirm-message').innerText = message;
      
      modal.classList.remove('hidden');
      void modal.offsetWidth; 
      modal.classList.remove('opacity-0');
      box.classList.remove('scale-95');

      const btnOk = document.getElementById('custom-confirm-ok');
      const btnCancel = document.getElementById('custom-confirm-cancel');

      const closeAndClean = () => {
        modal.classList.add('opacity-0');
        box.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
      };

      btnCancel.onclick = closeAndClean;
      btnOk.onclick = () => {
        closeAndClean();
        onConfirm();
      };
    };

    function hideBootScreen(message = 'Siap') {
      const boot = document.getElementById('boot-screen');
      const bootMessage = document.getElementById('boot-message');
      if (bootMessage) bootMessage.textContent = message;
      if (!boot) return;
      setTimeout(() => {
        boot.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => boot.classList.add('hidden'), 520);
      }, 240);
    }

    function hasStoredSession() {
      return localStorage.getItem(SESSION_KEY) === 'active' || sessionStorage.getItem(SESSION_KEY) === 'active';
    }

    function setSession(active, persistent = true) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      if (!active) return;
      (persistent ? localStorage : sessionStorage).setItem(SESSION_KEY, 'active');
    }

    function showLogin(force = false) {
      const protectedApp = appSettings?.accessCode && String(appSettings.accessCode).trim() !== '';
      if (!force && (!protectedApp || hasStoredSession())) {
        loginScreen.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => loginScreen.classList.add('hidden'), 320);
        document.getElementById('btn-logout')?.classList.toggle('hidden', !protectedApp);
        return;
      }
      loginScreen.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      document.getElementById('btn-logout')?.classList.add('hidden');
      setTimeout(() => document.getElementById('login-input')?.focus(), 120);
    }

    function applyLoadedData(data, source = 'cloud') {
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
      const usePendingLocal = source === 'cloud' && cached?.pending && cached?.cachedAt > Number(data?.meta?.updatedAt || 0);
      const chosen = usePendingLocal ? cached : data;
      if (chosen?.tree) treeData = chosen.tree;
      if (chosen?.settings) appSettings = { ...initialAppSettings, ...chosen.settings };
      familyEvents = Array.isArray(chosen?.familyEvents) ? chosen.familyEvents : [];
      if (!treeData) treeData = JSON.parse(JSON.stringify(initialTreeData));
      if (!appSettings) appSettings = JSON.parse(JSON.stringify(initialAppSettings));
      const numbersChanged = ensureFamilyNumbers();
      persistLocalCache(usePendingLocal);
      applySettingsToUI();
      showLogin(false);
      renderTree();
      updateSidebarStats();
      hideBootScreen(source === 'cloud' ? 'Data keluarga siap' : 'Mode lokal siap');
      if (usePendingLocal) setTimeout(() => simpanKeFirebase('Sinkronisasi perubahan offline'), 700);
      else if (numbersChanged && source === 'cloud') setTimeout(() => simpanKeFirebase(), 800);
      setTimeout(() => { openProfileFromURL(); checkCalendarReminders(); ensureDailyHistorySnapshot(); }, 900);
    }

    function initApp() {
      appSettings = JSON.parse(JSON.stringify(initialAppSettings));
      treeData = JSON.parse(JSON.stringify(initialTreeData));
      setSyncStatus('pending', 'Menghubungkan cloud...', 'Memuat arsip keluarga');

      cloudRef.on('value', (snapshot) => {
        const data = snapshot.val();
        isCloudReady = true;
        if (data) {
          applyLoadedData(data, 'cloud');
        } else {
          applyLoadedData({ tree: initialTreeData, settings: initialAppSettings }, 'cloud');
          simpanKeFirebase();
        }
        setSyncStatus('online', 'Cloud terhubung', `Diperbarui ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
      }, (error) => {
        console.error('Firebase read error:', error);
        isCloudReady = false;
        let cached = null;
        try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
        applyLoadedData(cached || { tree: initialTreeData, settings: initialAppSettings }, 'local');
        setSyncStatus('offline', 'Cloud tidak dapat diakses', cached ? 'Menampilkan salinan terakhir perangkat' : 'Periksa Firebase Rules dan koneksi');
        const errorMsg = document.getElementById('login-error');
        if (errorMsg) {
          errorMsg.textContent = 'Cloud tidak dapat dibaca. Periksa Firebase Rules atau koneksi internet.';
          errorMsg.classList.remove('hidden');
        }
      });
    }

    window.attemptLogin = function() {
      const input = document.getElementById('login-input').value.trim();
      const expected = String(appSettings?.accessCode ?? '').trim();
      const errorMsg = document.getElementById('login-error');
      if (input && input === expected) {
        setSession(true, document.getElementById('remember-session')?.checked !== false);
        loginScreen.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => loginScreen.classList.add('hidden'), 360);
        document.getElementById('btn-logout')?.classList.remove('hidden');
        document.getElementById('login-input').value = '';
        errorMsg.classList.add('hidden');
        showToast('Ruang keluarga berhasil dibuka.');
      } else {
        errorMsg.textContent = 'Kode akses salah. Periksa kembali dan coba lagi.';
        errorMsg.classList.remove('hidden');
        document.getElementById('login-input').select();
      }
    };

    window.togglePasswordVisibility = function() {
      const input = document.getElementById('login-input');
      const icon = document.querySelector('#toggle-password i');
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      if (icon) icon.className = visible ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
    };

    window.logout = function() {
      setSession(false);
      document.getElementById('login-input').value = '';
      showLogin(true);
      toggleSidebar(false);
      showToast('Sesi ditutup dengan aman.');
    };

    document.getElementById('login-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') attemptLogin();
      if (e.key === 'Escape') this.value = '';
    });

    function applySettingsToUI() {
      document.getElementById('app-main-title').innerText = appSettings.appTitle;
      document.getElementById('app-sub-title').innerText = appSettings.appSubtitle;
      document.title = `${appSettings.appTitle} — Family Legacy Workspace`;
      const versionEl = document.getElementById('app-version');
      if (versionEl) versionEl.textContent = `v${APP_VERSION.split('.').slice(0, 2).join('.')}`;

      document.getElementById('login-title-text').innerText = appSettings.loginTitle || 'Gembok Keluarga';
      document.getElementById('login-desc-text').innerText = appSettings.loginDesc || 'Masukkan kode akses untuk membuka arsip dan pohon keluarga.';

      mainArea.classList.remove('bg-slate-100', 'bg-amber-50', 'bg-blue-50', 'bg-emerald-50', 'bg-white');
      mainArea.classList.add(appSettings.bgColor);

      const protectedApp = appSettings.accessCode && String(appSettings.accessCode).trim() !== '';
      document.getElementById('btn-logout')?.classList.toggle('hidden', !protectedApp || !hasStoredSession());

      const actionContainer = document.getElementById('action-buttons-container');
      const helpText = document.getElementById('help-text-edit');
      if (!appSettings.enableEdit) {
        actionContainer.style.display = 'none';
        helpText.innerHTML = 'Klik kartu untuk melihat <b>Detail Profil</b>.';
      } else {
        actionContainer.style.display = 'flex';
        helpText.innerHTML = 'Klik kartu untuk <b>Edit</b> / <b>Tambah</b>.';
      }
    }

    window.openSettingsModal = function() {
      document.getElementById('set-title').value = appSettings.appTitle;
      document.getElementById('set-subtitle').value = appSettings.appSubtitle;
      document.getElementById('set-password').value = appSettings.accessCode;
      document.getElementById('set-bg').value = appSettings.bgColor;
      document.getElementById('set-cardstyle').value = appSettings.cardStyle || 'default';
      document.getElementById('set-editmode').checked = appSettings.enableEdit;
      document.getElementById('set-login-title').value = appSettings.loginTitle || 'Gembok Keluarga';
      document.getElementById('set-login-desc').value = appSettings.loginDesc || 'Masukkan kode akses untuk membuka arsip dan pohon keluarga.';
      
      document.getElementById('settings-modal').classList.remove('hidden');
    };

    window.closeSettingsModal = function() {
      document.getElementById('settings-modal').classList.add('hidden');
    };

    window.saveSettings = function() {
      appSettings.appTitle = document.getElementById('set-title').value || 'Silsilah Keluarga';
      appSettings.appSubtitle = document.getElementById('set-subtitle').value;
      appSettings.accessCode = document.getElementById('set-password').value;
      appSettings.bgColor = document.getElementById('set-bg').value;
      appSettings.cardStyle = document.getElementById('set-cardstyle').value;
      appSettings.enableEdit = document.getElementById('set-editmode').checked;
      appSettings.loginTitle = document.getElementById('set-login-title').value || 'Gembok Keluarga';
      appSettings.loginDesc = document.getElementById('set-login-desc').value || 'Masukkan kode akses untuk membuka arsip dan pohon keluarga.';
      
      applySettingsToUI();
      simpanKeFirebase('Pengaturan aplikasi diperbarui'); 
      renderTree(); 
      closeSettingsModal();
      showToast('Pengaturan berhasil disimpan!');
    };

    const generateId = () => Math.random().toString(36).substr(2, 9);
    const escapeHTML = (str) => {
      if (!str) return '';
      return str.toString().replace(/[&<>'"]/g, tag => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag] || tag));
    };

    const sanitizeURL = (url) => {
      if (!url) return '';
      const sanitized = escapeHTML(url);
      if (sanitized.trim().toLowerCase().startsWith('javascript:')) {
        return '#'; 
      }
      return sanitized;
    };

    function calculateStats(node, currentDepth = 1, stats = { total: 0, male: 0, female: 0, deceased: 0, maxDepth: 1 }) {
      if (!node) return stats;
      if (currentDepth > stats.maxDepth) stats.maxDepth = currentDepth;
      stats.total++;
      node.gender === 'L' ? stats.male++ : stats.female++;
      if (node.deathDate || node.deathYear) stats.deceased++;

      if (node.spouses && node.spouses.length > 0) {
        node.spouses.forEach(spouse => {
          stats.total++;
          spouse.gender === 'L' ? stats.male++ : stats.female++;
          if (spouse.deathDate || spouse.deathYear) stats.deceased++;
        });
      }
      if (node.children) {
        node.children.forEach(child => calculateStats(child, currentDepth + 1, stats));
      }
      return stats;
    }

    function getAge(birthDate, deathDate) {
       if (!birthDate) return '';
       const [y, m, d] = birthDate.split('-');
       if (!y || !m || !d) return '';
       const birth = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
       const end = deathDate ? new Date(deathDate.split('-')[0], deathDate.split('-')[1]-1, deathDate.split('-')[2]) : new Date();
       
       let age = end.getFullYear() - birth.getFullYear();
       if (end.getMonth() < birth.getMonth() || (end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate())) {
           age--;
       }
       return age >= 0 ? age : 0;
    }

    function checkBirthday(birthDate, deathDate) {
       if (!birthDate || deathDate) return false; 
       const [y, m, d] = birthDate.split('-');
       if (!m || !d) return false;
       const today = new Date();
       return today.getDate() === parseInt(d) && today.getMonth() === (parseInt(m) - 1);
    }

    const ASTRO_SIGNS = [
      { name:'Aries', symbol:'♈', element:'Api', modality:'Kardinal', ruler:'Mars' },
      { name:'Taurus', symbol:'♉', element:'Tanah', modality:'Tetap', ruler:'Venus' },
      { name:'Gemini', symbol:'♊', element:'Udara', modality:'Berubah', ruler:'Merkurius' },
      { name:'Cancer', symbol:'♋', element:'Air', modality:'Kardinal', ruler:'Bulan' },
      { name:'Leo', symbol:'♌', element:'Api', modality:'Tetap', ruler:'Matahari' },
      { name:'Virgo', symbol:'♍', element:'Tanah', modality:'Berubah', ruler:'Merkurius' },
      { name:'Libra', symbol:'♎', element:'Udara', modality:'Kardinal', ruler:'Venus' },
      { name:'Scorpio', symbol:'♏', element:'Air', modality:'Tetap', ruler:'Mars / Pluto' },
      { name:'Sagitarius', symbol:'♐', element:'Api', modality:'Berubah', ruler:'Jupiter' },
      { name:'Capricorn', symbol:'♑', element:'Tanah', modality:'Kardinal', ruler:'Saturnus' },
      { name:'Aquarius', symbol:'♒', element:'Udara', modality:'Tetap', ruler:'Saturnus / Uranus' },
      { name:'Pisces', symbol:'♓', element:'Air', modality:'Berubah', ruler:'Jupiter / Neptunus' }
    ];
    const CHINESE_ANIMALS = [
      {name:'Tikus', symbol:'🐀'}, {name:'Kerbau', symbol:'🐂'}, {name:'Macan', symbol:'🐅'},
      {name:'Kelinci', symbol:'🐇'}, {name:'Naga', symbol:'🐉'}, {name:'Ular', symbol:'🐍'},
      {name:'Kuda', symbol:'🐎'}, {name:'Kambing', symbol:'🐐'}, {name:'Monyet', symbol:'🐒'},
      {name:'Ayam', symbol:'🐓'}, {name:'Anjing', symbol:'🐕'}, {name:'Babi', symbol:'🐖'}
    ];
    const CHINESE_STEMS = [
      {element:'Kayu', polarity:'Yang'}, {element:'Kayu', polarity:'Yin'},
      {element:'Api', polarity:'Yang'}, {element:'Api', polarity:'Yin'},
      {element:'Tanah', polarity:'Yang'}, {element:'Tanah', polarity:'Yin'},
      {element:'Logam', polarity:'Yang'}, {element:'Logam', polarity:'Yin'},
      {element:'Air', polarity:'Yang'}, {element:'Air', polarity:'Yin'}
    ];
    const astrologyCache = new Map();
    const liChunCache = new Map();

    function normDeg(value) {
      const result = Number(value) % 360;
      return result < 0 ? result + 360 : result;
    }

    function degToRad(value) { return Number(value) * Math.PI / 180; }
    function radToDeg(value) { return Number(value) * 180 / Math.PI; }

    function julianDay(date) {
      return date.getTime() / 86400000 + 2440587.5;
    }

    function signFromLongitude(longitude) {
      if (!Number.isFinite(longitude)) return null;
      const lon = normDeg(longitude);
      const index = Math.floor(lon / 30) % 12;
      const degree = lon - index * 30;
      const whole = Math.floor(degree);
      const minutes = Math.floor((degree - whole) * 60);
      return { ...ASTRO_SIGNS[index], index, longitude: lon, degree, degreeText: `${whole}° ${String(minutes).padStart(2,'0')}′` };
    }

    function isValidTimeZone(timeZone) {
      if (!timeZone) return false;
      try { new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date()); return true; }
      catch (_) { return false; }
    }

    function timeZoneOffsetMs(date, timeZone) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone, hour12:false, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit',
        hour:'2-digit', minute:'2-digit', second:'2-digit'
      });
      const parts = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - date.getTime();
    }

    function localWallTimeToUtc(dateStr, timeStr = '12:00', timeZone = '', utcOffset = '') {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute, second = 0] = String(timeStr || '12:00').split(':').map(Number);
      if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
      const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second || 0);
      if (isValidTimeZone(timeZone)) {
        let timestamp = desiredUtc;
        for (let i = 0; i < 4; i++) timestamp = desiredUtc - timeZoneOffsetMs(new Date(timestamp), timeZone);
        return new Date(timestamp);
      }
      const offset = Number(utcOffset);
      if (Number.isFinite(offset) && utcOffset !== '') return new Date(desiredUtc - offset * 3600000);
      return new Date(desiredUtc);
    }

    function birthTimeContext(person = {}) {
      if (!person.birthDate) return null;
      const hasTime = /^\d{2}:\d{2}/.test(person.birthTime || '');
      const timeZone = (person.birthTimezone || '').trim();
      const offset = person.birthUtcOffset ?? '';
      const hasZone = isValidTimeZone(timeZone) || (offset !== '' && Number.isFinite(Number(offset)));
      const instant = localWallTimeToUtc(person.birthDate, hasTime ? person.birthTime : '12:00', timeZone, offset);
      const start = localWallTimeToUtc(person.birthDate, '00:00', timeZone, offset);
      const end = localWallTimeToUtc(person.birthDate, '23:59', timeZone, offset);
      return { instant, start, end, hasTime, hasZone, timeZone: isValidTimeZone(timeZone) ? timeZone : '', utcOffset: offset };
    }

    function approximateSunLongitude(date) {
      const n = julianDay(date) - 2451545.0;
      const meanLongitude = normDeg(280.460 + 0.9856474 * n);
      const meanAnomaly = degToRad(normDeg(357.528 + 0.9856003 * n));
      return normDeg(meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.020 * Math.sin(2 * meanAnomaly));
    }

    function approximateMoonLongitude(date) {
      const d = julianDay(date) - 2451543.5;
      const N = normDeg(125.1228 - 0.0529538083 * d);
      const w = normDeg(318.0634 + 0.1643573223 * d);
      const M = normDeg(115.3654 + 13.0649929509 * d);
      const e = 0.0549;
      let E = degToRad(M + radToDeg(e * Math.sin(degToRad(M)) * (1 + e * Math.cos(degToRad(M)))));
      for (let i=0; i<4; i++) E = E - (E - e*Math.sin(E) - degToRad(M)) / (1 - e*Math.cos(E));
      const xv = Math.cos(E) - e;
      const yv = Math.sqrt(1 - e*e) * Math.sin(E);
      const v = radToDeg(Math.atan2(yv, xv));
      let lon = normDeg(v + w + N);
      const Lm = normDeg(N + w + M);
      const Ls = normDeg(280.460 + 0.9856474 * d);
      const Ms = normDeg(357.528 + 0.9856003 * d);
      const D = normDeg(Lm - Ls);
      const F = normDeg(Lm - N);
      const s = value => Math.sin(degToRad(value));
      lon += -1.274*s(M-2*D) + 0.658*s(2*D) - 0.186*s(Ms) - 0.059*s(2*M-2*D)
           - 0.057*s(M-2*D+Ms) + 0.053*s(M+2*D) + 0.046*s(2*D-Ms)
           + 0.041*s(M-Ms) - 0.035*s(D) - 0.031*s(M+Ms) - 0.015*s(2*F-2*D) + 0.011*s(M-4*D);
      return normDeg(lon);
    }

    function astronomyEngineReady() {
      return !!(window.Astronomy && typeof Astronomy.SunPosition === 'function' && typeof Astronomy.EclipticGeoMoon === 'function');
    }

    function bodyLongitude(body, date) {
      if (!date) return NaN;
      if (astronomyEngineReady()) {
        try {
          if (body === 'sun') return normDeg(Astronomy.SunPosition(date).elon);
          if (body === 'moon') return normDeg(Astronomy.EclipticGeoMoon(date).lon);
        } catch (error) { console.warn('Astronomy Engine fallback:', error); }
      }
      return body === 'sun' ? approximateSunLongitude(date) : approximateMoonLongitude(date);
    }

    function bodySignForPerson(person, body) {
      const context = birthTimeContext(person);
      if (!context) return null;
      if (context.hasTime) {
        const sign = signFromLongitude(bodyLongitude(body, context.instant));
        return sign ? { ...sign, precision: context.hasZone ? 'tinggi' : 'sedang', uncertain:false } : null;
      }
      const startSign = signFromLongitude(bodyLongitude(body, context.start));
      const endSign = signFromLongitude(bodyLongitude(body, context.end));
      const noonSign = signFromLongitude(bodyLongitude(body, context.instant));
      if (!startSign || !endSign || !noonSign) return null;
      if (startSign.index === endSign.index) return { ...noonSign, precision:'tanggal', uncertain:false, dateOnly:true };
      return {
        ...noonSign, precision:'batas', uncertain:true, dateOnly:true,
        candidates:[startSign, endSign].filter((sign, index, array) => array.findIndex(item => item.index === sign.index) === index)
      };
    }

    function meanObliquity(date) {
      const T = (julianDay(date) - 2451545.0) / 36525;
      return 23 + 26/60 + (21.448 - 46.8150*T - 0.00059*T*T + 0.001813*T*T*T) / 3600;
    }

    function fallbackSiderealTimeHours(date) {
      const jd = julianDay(date);
      const T = (jd - 2451545.0) / 36525;
      const theta = 280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T*T - T*T*T/38710000;
      return normDeg(theta) / 15;
    }

    function ascendantLongitude(date, latitude, longitude) {
      if (!date || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 89.5) return NaN;
      let siderealHours = fallbackSiderealTimeHours(date);
      if (astronomyEngineReady() && typeof Astronomy.SiderealTime === 'function') {
        try { siderealHours = Astronomy.SiderealTime(date); } catch (_) {}
      }
      const theta = degToRad(normDeg(siderealHours * 15 + longitude));
      const epsilon = degToRad(meanObliquity(date));
      const phi = degToRad(latitude);
      const y = -Math.cos(theta);
      const x = Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon);
      return normDeg(radToDeg(Math.atan2(y, x)) + 180);
    }

    function chineseYearFromIntl(value) {
      try {
        let date = value instanceof Date ? value : null;
        if (!date) {
          const [y,m,d] = String(value || '').split('-').map(Number);
          date = new Date(Date.UTC(y,m-1,d,12));
        }
        if (Number.isNaN(date.getTime())) return NaN;
        const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { year:'numeric', month:'numeric', day:'numeric', timeZone:'Asia/Shanghai' }).formatToParts(date);
        const related = parts.find(part => part.type === 'relatedYear');
        return related ? Number(related.value) : NaN;
      } catch (_) { return NaN; }
    }

    function liChunInstant(year) {
      if (liChunCache.has(year)) return liChunCache.get(year);
      let instant = new Date(Date.UTC(year,1,4,10));
      if (astronomyEngineReady() && typeof Astronomy.SearchSunLongitude === 'function') {
        try {
          const found = Astronomy.SearchSunLongitude(315, new Date(Date.UTC(year,0,31)), 8);
          if (found?.date) instant = found.date;
        } catch (_) {}
      }
      liChunCache.set(year, instant);
      return instant;
    }

    function chineseZodiacForPerson(person = {}) {
      const year = Number((person.birthDate || '').slice(0,4) || person.birthYear);
      if (!Number.isFinite(year)) return null;
      const basis = person.chineseZodiacBasis === 'lichun' ? 'lichun' : 'cny';
      let chineseYear = year;
      let uncertain = false;
      if (person.birthDate) {
        if (basis === 'cny') {
          const context = birthTimeContext(person);
          if (context?.hasTime && context?.hasZone) {
            const exact = chineseYearFromIntl(context.instant);
            if (Number.isFinite(exact)) chineseYear = exact;
          } else if (context) {
            const startYear = chineseYearFromIntl(context.start);
            const endYear = chineseYearFromIntl(context.end);
            const noonYear = chineseYearFromIntl(context.instant);
            if (Number.isFinite(noonYear)) chineseYear = noonYear;
            if (Number.isFinite(startYear) && Number.isFinite(endYear) && startYear !== endYear) uncertain = true;
          } else {
            const exact = chineseYearFromIntl(person.birthDate);
            if (Number.isFinite(exact)) chineseYear = exact;
          }
          if (!Number.isFinite(chineseYear)) {
            chineseYear = year;
            const monthDay = person.birthDate.slice(5);
            if (monthDay < '02-05') chineseYear = year - 1;
          }
        } else {
          const context = birthTimeContext(person);
          const boundary = liChunInstant(year);
          if (context?.hasTime) chineseYear = context.instant < boundary ? year - 1 : year;
          else {
            const before = context?.start && context.start < boundary;
            const after = context?.end && context.end >= boundary;
            if (before && after) uncertain = true;
            chineseYear = context?.instant && context.instant < boundary ? year - 1 : year;
          }
        }
      }
      const animal = CHINESE_ANIMALS[((chineseYear - 4) % 12 + 12) % 12];
      const stem = CHINESE_STEMS[((chineseYear - 4) % 10 + 10) % 10];
      return { ...animal, ...stem, chineseYear, basis, uncertain, label:`${animal.name} · ${stem.element} ${stem.polarity}` };
    }

    function getAstrologyProfile(person = {}) {
      const key = JSON.stringify([
        person.birthDate, person.birthYear, person.birthTime, person.birthTimezone, person.birthUtcOffset,
        person.birthLatitude, person.birthLongitude, person.chineseZodiacBasis
      ]);
      if (astrologyCache.has(key)) return astrologyCache.get(key);
      const context = birthTimeContext(person);
      const sun = bodySignForPerson(person, 'sun');
      const moon = person.birthDate ? bodySignForPerson(person, 'moon') : null;
      const latitude = Number(person.birthLatitude);
      const longitude = Number(person.birthLongitude);
      let ascendant = null;
      if (context?.hasTime && context?.hasZone && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        ascendant = signFromLongitude(ascendantLongitude(context.instant, latitude, longitude));
        if (ascendant) ascendant = { ...ascendant, precision:'tinggi' };
      }
      const chinese = chineseZodiacForPerson(person);
      let score = person.birthDate ? 35 : 0;
      if (context?.hasTime) score += 20;
      if (context?.hasZone) score += 20;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) score += 25;
      const result = {
        sun, moon, ascendant, chinese, score,
        engine: astronomyEngineReady() ? 'Astronomy Engine ±1 arcminute' : 'Perhitungan lokal cadangan',
        level: score >= 95 ? 'Presisi sangat tinggi' : score >= 70 ? 'Presisi tinggi' : score >= 45 ? 'Presisi sedang' : 'Data belum lengkap',
        context
      };
      astrologyCache.set(key, result);
      return result;
    }

    function getZodiac(birthDate, person = {}) {
      const result = getAstrologyProfile({ ...person, birthDate: birthDate || person.birthDate });
      if (!result.sun) return '';
      if (result.sun.uncertain) return result.sun.candidates.map(sign => sign.name).join(' / ');
      return result.sun.name;
    }

    function getShio(birthDate, birthYear, person = {}) {
      return chineseZodiacForPerson({ ...person, birthDate: birthDate || person.birthDate, birthYear: birthYear || person.birthYear })?.name || '';
    }

    function astrologyBadgeHtml(person) {
      const profile = getAstrologyProfile(person);
      if (!profile.sun && !profile.chinese) return '';
      const rows = [];
      if (profile.sun) {
        const text = profile.sun.uncertain ? profile.sun.candidates.map(sign => sign.name).join('/') : profile.sun.name;
        rows.push(`<span class="astro-badge sun" title="Matahari tropikal: ${escapeHTML(text)}${profile.sun.degreeText ? ` ${profile.sun.degreeText}` : ''}"><b>☉</b>${escapeHTML(text)}</span>`);
      }
      if (profile.moon && !profile.moon.uncertain) rows.push(`<span class="astro-badge moon" title="Bulan: ${escapeHTML(profile.moon.name)} ${profile.moon.degreeText}"><b>☾</b>${escapeHTML(profile.moon.name)}</span>`);
      if (profile.ascendant) rows.push(`<span class="astro-badge rising" title="Ascendant: ${escapeHTML(profile.ascendant.name)} ${profile.ascendant.degreeText}"><b>↑</b>${escapeHTML(profile.ascendant.name)}</span>`);
      if (profile.chinese) rows.push(`<span class="astro-badge chinese" title="Shio ${escapeHTML(profile.chinese.label)} — dasar ${profile.chinese.basis === 'lichun' ? 'Li Chun' : 'Tahun Baru Imlek'}">${profile.chinese.symbol}${escapeHTML(profile.chinese.name)}</span>`);
      return `<div class="astrology-badges">${rows.join('')}</div>`;
    }

    function astrologyFormPerson() {
      const read = id => document.getElementById(id)?.value || '';
      return {
        birthDate:read('input-birthdate'), birthYear:read('input-birthyear'), birthTime:read('input-birthtime'),
        birthTimezone:read('input-birthtimezone').trim(), birthUtcOffset:read('input-birthutcoffset'),
        birthLatitude:read('input-birthlatitude'), birthLongitude:read('input-birthlongitude'),
        chineseZodiacBasis:read('input-chinesezodiacbasis') || 'cny'
      };
    }

    function astrologyResultCard(icon, title, result, role) {
      if (!result) return `<article class="astrology-result-card muted"><div class="astro-result-icon">${icon}</div><div><small>${title}</small><strong>Belum tersedia</strong><p>${role}</p></div></article>`;
      const name = result.uncertain ? result.candidates.map(sign => sign.name).join(' / ') : `${result.symbol || ''} ${result.name}`;
      const detail = result.uncertain ? 'Jam lahir diperlukan karena tanda berubah pada tanggal ini.' : `${result.degreeText || ''} · ${result.element || ''} ${result.modality ? `· ${result.modality}` : ''}`;
      return `<article class="astrology-result-card"><div class="astro-result-icon">${icon}</div><div><small>${title}</small><strong>${escapeHTML(name)}</strong><p>${escapeHTML(detail || role)}</p></div></article>`;
    }

    window.previewAstrologyFromForm = function() {
      const preview = document.getElementById('astrology-preview');
      const status = document.getElementById('astrology-engine-status');
      if (!preview) return;
      const person = astrologyFormPerson();
      if (!person.birthDate) {
        preview.innerHTML = '<div class="astrology-empty"><i class="fa-solid fa-star-and-crescent"></i><span>Isi tanggal lahir untuk melihat hasil astrologi.</span></div>';
        if (status) status.textContent = astronomyEngineReady() ? 'Astronomy Engine aktif' : 'Mode cadangan aktif';
        return;
      }
      const profile = getAstrologyProfile(person);
      if (status) {
        status.textContent = profile.engine;
        status.classList.toggle('fallback', !astronomyEngineReady());
      }
      const chinese = profile.chinese
        ? `<article class="astrology-result-card"><div class="astro-result-icon">${profile.chinese.symbol}</div><div><small>Shio & Elemen</small><strong>${escapeHTML(profile.chinese.label)}</strong><p>${profile.chinese.basis === 'lichun' ? 'Batas tahun: Li Chun (Matahari 315°)' : 'Batas tahun: Tahun Baru Imlek'}${profile.chinese.uncertain ? ' · jam lahir diperlukan pada hari batas' : ''}</p></div></article>`
        : astrologyResultCard('🐉','Shio',null,'Tanggal/tahun lahir diperlukan');
      preview.innerHTML = `
        <div class="astrology-quality"><div><span>Skor kelengkapan data</span><strong>${profile.level}</strong></div><div class="astrology-score"><span style="width:${Math.min(100,profile.score)}%"></span></div><b>${profile.score}%</b></div>
        <div class="astrology-results-grid">
          ${astrologyResultCard('☉','Matahari',profile.sun,'Identitas inti dalam tradisi astrologi')}
          ${astrologyResultCard('☾','Bulan',profile.moon,'Respons emosional dalam tradisi astrologi')}
          ${astrologyResultCard('↑','Ascendant',profile.ascendant,'Memerlukan jam, zona waktu, latitude, dan longitude')}
          ${chinese}
        </div>
        <div class="astrology-input-note"><i class="fa-solid fa-circle-info"></i><span>${profile.context?.hasTime ? 'Jam lahir tersedia.' : 'Tanpa jam lahir, Bulan bisa berada di dua tanda dan Ascendant tidak dihitung.'} ${profile.context?.hasZone ? 'Zona waktu terselesaikan.' : 'Isi zona waktu IANA atau UTC offset agar waktu UTC akurat.'}</span></div>`;
    };

    function guessIndonesianTimeZone(place) {
      const value = String(place || '').toLowerCase();
      if (/jayapura|sorong|manokwari|ambon|ternate|merauke|papua|maluku/.test(value)) return { zone:'Asia/Jayapura', offset:9 };
      if (/denpasar|bali|mataram|lombok|makassar|manado|palu|kendari|kupang|balikpapan|samarinda|sulawesi|nusa tenggara/.test(value)) return { zone:'Asia/Makassar', offset:8 };
      if (/surabaya|jakarta|bandung|semarang|yogyakarta|jogja|malang|solo|medan|padang|palembang|aceh|java|jawa|sumatra|kalimantan barat|pontianak/.test(value)) return { zone:'Asia/Jakarta', offset:7 };
      return null;
    }

    window.fillAstrologyCoordinates = async function() {
      const place = document.getElementById('input-birthplace')?.value.trim();
      const mapUrl = document.getElementById('input-gmap')?.value.trim();
      let coords = parseGmapUrl(mapUrl);
      if (!coords && place) {
        showToast(`Mencari koordinat ${place}...`);
        coords = await getCoordinatesFromNominatim(place);
      }
      if (!coords) { showToast('Koordinat belum ditemukan. Isi latitude dan longitude secara manual.', true); return; }
      document.getElementById('input-birthlatitude').value = Number(coords.lat).toFixed(6);
      document.getElementById('input-birthlongitude').value = Number(coords.lon).toFixed(6);
      const guess = guessIndonesianTimeZone(place);
      if (guess && !document.getElementById('input-birthtimezone').value) {
        document.getElementById('input-birthtimezone').value = guess.zone;
        document.getElementById('input-birthutcoffset').value = guess.offset;
      }
      previewAstrologyFromForm();
      showToast('Koordinat astrologi berhasil diisi. Periksa kembali zona waktunya.');
    };

    function updateSidebarStats() {
      if (!treeData) return;
      const stats = calculateStats(treeData);
      const month = new Date().getMonth() + 1;
      const birthdays = getUpcomingBirthdays(treeData, month, []);
      const totalEl = document.getElementById('sidebar-stat-total');
      const depthEl = document.getElementById('sidebar-stat-depth');
      const bdayEl = document.getElementById('sidebar-stat-birthday');
      if (totalEl) totalEl.textContent = stats.total;
      if (depthEl) depthEl.textContent = stats.maxDepth;
      if (bdayEl) bdayEl.textContent = birthdays.length;
    }

    window.setActiveNav = function(view) {
      document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
      if (window.innerWidth <= 1024) toggleSidebar(false);
    };

    window.openTreeView = function(button) {
      document.getElementById('map-wrapper')?.classList.add('hidden');
      document.getElementById('stats-modal')?.classList.add('hidden');
      setActiveNav('tree');
      if (button) button.classList.add('active');
      setTimeout(() => requestTransformUpdate(true), 80);
    };

    window.toggleSidebar = function(force) {
      const sidebar = document.getElementById('app-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      const shouldOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
      sidebar.classList.toggle('open', shouldOpen);
      overlay.classList.toggle('open', shouldOpen);
    };

    window.refreshCloudData = function() {
      setSyncStatus('pending', 'Memuat ulang cloud...', 'Mohon tunggu');
      cloudRef.once('value').then(snapshot => {
        if (snapshot.exists()) applyLoadedData(snapshot.val(), 'cloud');
        setSyncStatus('online', 'Cloud diperbarui', `Diperbarui ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
        showToast('Data cloud berhasil dimuat ulang.');
      }).catch(error => {
        console.error(error);
        setSyncStatus('offline', 'Gagal memuat cloud', 'Periksa koneksi atau Firebase Rules');
        showToast('Tidak dapat memuat ulang cloud.', true);
      });
    };

    window.addEventListener('online', () => {
      setSyncStatus('pending', 'Koneksi kembali...', 'Menghubungkan ulang cloud');
      refreshCloudData();
    });
    window.addEventListener('offline', () => setSyncStatus('offline', 'Perangkat offline', 'Perubahan disimpan sementara'));

    // --- RENDER LOGIC ---
    function buildPersonCard(person, isSpouse, hasChildren, isCollapsed, level, parentId, parentSpouses = null, spouseColorMap = {}) {
      const isMale = person.gender === 'L';
      const isDeceased = !!person.deathDate || !!person.deathYear;
      
      let bgColor, headerColor, fontClass, borderClass, roundedClass;
      const theme = appSettings.cardStyle || 'default';

      if (theme === 'classic') {
        bgColor = 'bg-[#fdf6e3]';
        headerColor = 'bg-[#d4a373]';
        fontClass = 'font-serif';
        borderClass = 'border-2 border-[#d4a373]';
        roundedClass = 'rounded-md';
      } else if (theme === 'minimalist') {
        bgColor = 'bg-white';
        headerColor = 'bg-slate-200';
        fontClass = 'font-sans';
        borderClass = 'border border-slate-300';
        roundedClass = 'rounded-xl';
      } else { 
        bgColor = isMale ? 'bg-blue-50 border-blue-200' : 'bg-pink-50 border-pink-200';
        headerColor = isMale ? 'bg-blue-500' : 'bg-pink-500';
        fontClass = 'font-sans';
        borderClass = 'border-2';
        roundedClass = 'rounded-xl';
      }
      
      const isHighlighted = searchQuery && person.name.toLowerCase().includes(searchQuery.toLowerCase());
      const highlightStyle = isHighlighted ? 'ring-4 ring-yellow-400 shadow-xl scale-105 z-10' : '';
      const deadStyle = isDeceased ? 'opacity-85 grayscale-[40%]' : '';

      const clickAction = isSpouse ? `handleNodeClick('${parentId}', '${person.id}')` : `handleNodeClick('${person.id}', null)`;

      let extraIcons = '';
      if (person.phone) extraIcons += `<a href="tel:${sanitizeURL(person.phone)}" onclick="event.stopPropagation()" class="text-emerald-600 hover:text-emerald-800 transition-colors pointer-events-auto" title="Telepon: ${escapeHTML(person.phone)}"><i class="fa-solid fa-phone"></i></a>`;
      if (person.occupation) extraIcons += `<i class="fa-solid fa-briefcase" title="Pekerjaan: ${escapeHTML(person.occupation)}"></i>`;
      if (person.address) extraIcons += `<i class="fa-solid fa-house" title="Alamat: ${escapeHTML(person.address)}"></i>`;
      if (person.birthPlace && !person.gmapUrl) extraIcons += `<i class="fa-solid fa-location-dot" title="Tempat: ${escapeHTML(person.birthPlace)}"></i>`;
      if (person.gmapUrl) extraIcons += `<a href="${sanitizeURL(person.gmapUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-blue-600 hover:text-blue-800 transition-colors pointer-events-auto" title="Buka di GMap"><i class="fa-solid fa-map"></i></a>`;
      if (person.bloodType) extraIcons += `<i class="fa-solid fa-droplet" title="Gol. Darah: ${escapeHTML(person.bloodType)}"></i>`;
      if (person.biography && person.biography.trim() !== '') extraIcons += `<i class="fa-solid fa-book-open text-amber-600" title="Ada catatan Biografi"></i>`;

      const avatar = person.photoUrl 
        ? `<img src="${sanitizeURL(person.photoUrl)}" class="w-full h-full object-cover" crossorigin="anonymous" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDJDMi4xMyAyIDExLjIgMiAxMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bTAtMTRjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNC0xLjc5LTQtNC00em0wIDZjLTEuMSAwLTItLjktMi0yczktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6bTcgNGMtMS0xLTYuNjMtMy03LTNzLTYgMS43Ny03IDNsMSAxYzEuMjUtMS4yNyAzLjcyLTIgNi0yczQuNzUuNzMgNiAybDEtMXoiLz48L3N2Zz4='">`
        : `<i class="fa-solid fa-user text-2xl ${theme === 'minimalist' ? 'text-slate-400' : ''}"></i>`;

      const expandBtn = (!isSpouse && hasChildren) ? `
        <button onclick="event.stopPropagation(); toggleCollapse('${person.id}')" class="absolute -bottom-4 bg-white border border-slate-300 text-slate-600 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-slate-100 z-20 pointer-events-auto" data-html2canvas-ignore>
          <i class="fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'} text-xs"></i>
        </button>
      ` : '';

      const badge = !isSpouse ? `<div class="absolute -top-3 -right-3 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 border border-white">Gen ${level}</div>` : '';

      let birthText = person.birthDate ? person.birthDate.split('-')[0] : (person.birthYear || '?');
      let deathText = person.deathDate ? person.deathDate.split('-')[0] : (person.deathYear || 'Sekarang');
      let ageText = '';
      
      if (person.birthDate) {
         const calculatedAge = getAge(person.birthDate, person.deathDate);
         if (calculatedAge !== '') ageText = ` (${calculatedAge} thn)`;
      }

      const astrologiHtml = astrologyBadgeHtml(person);

      let spouseBadge = '';
      if (!isSpouse && person.linkedSpouseId && parentSpouses) {
          const spouse = parentSpouses.find(s => s.id === person.linkedSpouseId);
          if (spouse) {
              const assignedColor = spouseColorMap[spouse.id] || '#4f46e5';
              spouseBadge = `<div class="text-white text-[9px] font-bold px-1.5 py-[1px] rounded mt-1 truncate w-full shadow-sm" style="background-color: ${assignedColor};" title="Anak dari: ${escapeHTML(spouse.name)}">Dari: ${escapeHTML(spouse.name.split(' ')[0])}</div>`;
          }
      }

      let statusBadge = '';
      if (!isSpouse && parentId && person.childStatus && person.childStatus !== 'kandung') {
          const statusText = person.childStatus === 'tiri' ? 'Anak Tiri' : 'Anak Adopsi';
          const statusColor = person.childStatus === 'tiri' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-teal-100 text-teal-700 border-teal-200';
          statusBadge = `<div class="${statusColor} text-[9px] font-bold px-1.5 py-[1px] rounded mt-1 border truncate w-full" title="Status: ${statusText}">${statusText}</div>`;
      }

      let otherPartnerBadge = '';
      if (person.otherPartner) {
          otherPartnerBadge = `<div class="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-[1px] rounded mt-1 border border-purple-200 w-full truncate" title="Pernah menikah / Pasangan lain: ${escapeHTML(person.otherPartner)}"><i class="fa-solid fa-ring text-[8px]"></i> Eks: ${escapeHTML(person.otherPartner.split(' ')[0])}</div>`;
      }

      const isBday = checkBirthday(person.birthDate, person.deathDate);
      const bdayIcon = isBday ? `<div class="absolute -top-4 -left-4 text-3xl z-20 animate-bounce filter drop-shadow-md" title="Selamat Ulang Tahun!">🎂</div>` : '';

      return `
        <div class="relative flex flex-col items-center ${fontClass} pointer-events-auto">
          <div onclick="${clickAction}" class="relative min-w-[175px] max-w-[220px] shadow-sm cursor-pointer transition-transform duration-200 hover:shadow-md hover:-translate-y-1 hover:z-30 ${borderClass} ${roundedClass} ${bgColor} ${deadStyle} ${highlightStyle}">
            ${badge}
            ${bdayIcon}
            ${theme !== 'minimalist' ? `<div class="h-2 w-full ${headerColor} ${theme === 'classic' ? 'rounded-t-sm' : 'rounded-t-lg'}"></div>` : ''}
            <div class="p-3 flex flex-col items-center text-center">
              <div class="w-14 h-14 rounded-full flex items-center justify-center mb-2 text-white shadow-inner overflow-hidden border-2 border-white ${headerColor}">
                ${avatar}
              </div>
              <h3 class="font-bold text-gray-800 text-sm leading-tight mb-0.5">${escapeHTML(person.name) || 'Tanpa Nama'}</h3>
              <p class="text-[11px] text-gray-600 font-medium ${theme==='classic' ? 'bg-transparent' : 'bg-white/60 px-2 rounded-full border border-black/5'} py-0.5 mb-1 whitespace-nowrap">
                ${escapeHTML(birthText)} - ${escapeHTML(deathText)} <span class="${theme==='classic' ? 'text-amber-700' : 'text-blue-600'} font-bold">${ageText}</span>
              </p>
              ${astrologiHtml}
              ${spouseBadge}
              ${statusBadge}
              ${otherPartnerBadge}
              <div class="flex flex-wrap gap-2 mt-1.5 text-gray-500 items-center justify-center text-[11px]">
                ${extraIcons}
              </div>
              ${person.notes ? `<p class="text-[10px] text-gray-500 mt-2 italic border-t border-gray-200/60 pt-1.5 w-full truncate px-1">${escapeHTML(person.notes)}</p>` : ''}
            </div>
          </div>
          ${expandBtn}
        </div>
      `;
    }

    function buildNodeHTML(node, level, parentSpouses = null, spouseColorMapContext = {}) {
      if (!node) return '';
      let hasChildren = node.children && node.children.length > 0;
      
      let currentSpouseColorMap = {};
      if (node.spouses && node.spouses.length > 0) {
         node.spouses.forEach((s, idx) => {
            currentSpouseColorMap[s.id] = branchColors[idx % branchColors.length];
            if (s.spouses) {
               s.spouses.forEach((ss, idx2) => {
                   currentSpouseColorMap[ss.id] = branchColors[(idx + idx2 + 1) % branchColors.length];
               });
            }
         });
      }

      let liClass = '';
      let liStyle = '';
      
      if (node.linkedSpouseId && spouseColorMapContext[node.linkedSpouseId]) {
         liClass = 'has-branch-color';
         liStyle = `style="--branch-color: ${spouseColorMapContext[node.linkedSpouseId]};"`;
      }

      let html = `<li class="${liClass}" ${liStyle}>
        <div class="flex flex-col items-center">
           <div class="flex items-center justify-center relative">`;
      
      html += `<div class="relative z-10">${buildPersonCard(node, false, hasChildren, node.isCollapsed, level, null, parentSpouses, spouseColorMapContext)}</div>`;

      if (node.spouses && node.spouses.length > 0) {
        node.spouses.forEach(spouse => {
          const spouseColor = currentSpouseColorMap[spouse.id];
          html += `<div class="flex items-center relative ml-6">`;
          
          if (spouse.parents && spouse.parents.length > 0) {
              html += `
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 flex flex-col items-center pb-2 z-20 pointer-events-none">
                 <div class="flex justify-center items-end w-max">
                     ${spouse.parents.map((p, i) => `
                       <div class="relative flex flex-col items-center px-4">
                         ${buildPersonCard(p, false, false, false, level-1, spouse.id)}
                         <div class="w-[4px] h-6 bg-slate-400 relative z-10 pointer-events-none"></div>
                         ${spouse.parents.length > 1 ? `
                            <div class="absolute bottom-0 ${i === 0 ? 'right-0 w-[50%]' : 'left-0 w-[50%]'} h-[4px] bg-slate-400 pointer-events-none"></div>
                         ` : ''}
                       </div>
                     `).join('')}
                 </div>
                 <div class="w-[4px] h-6 bg-slate-400 pointer-events-none"></div>
              </div>`;
          }

          html += `<div class="relative z-10 flex items-center">`;
          html += `<div class="spouse-connector colored w-6 right-full" style="--branch-color: ${spouseColor};"></div>`;
          html += buildPersonCard(spouse, true, false, false, level, node.id, null, {});
          
          if (spouse.spouses && spouse.spouses.length > 0) {
              spouse.spouses.forEach(secSpouse => {
                  html += `<div class="flex items-center relative ml-6">`;
                  html += `<div class="spouse-connector w-6 right-full" style="background-color: #94a3b8;"></div>`;
                  html += buildPersonCard(secSpouse, true, false, false, level, spouse.id, null, {});
                  html += `</div>`;
              });
          }

          html += `</div>`;
          html += `</div>`;
        });
      }

      html += `</div></div>`;
      
      if (hasChildren && !node.isCollapsed) {
        let childHasSpouseParents = node.children.some(c => c.spouses && c.spouses.some(s => s.parents && s.parents.length > 0));
        let ulClass = childHasSpouseParents ? (node.children.length === 1 ? 'extend-ul' : 'extend-li') : '';

        let sortedChildren = [...node.children].sort((a, b) => {
            let spA = a.linkedSpouseId || '';
            let spB = b.linkedSpouseId || '';
            return spA.localeCompare(spB);
        });

        html += `<ul class="${ulClass}">`;
        sortedChildren.forEach(child => {
          html += buildNodeHTML(child, level + 1, node.spouses, currentSpouseColorMap);
        });
        html += `</ul>`;
      }
      html += `</li>`;
      return html;
    }

    // =============================================================
    // CANVAS CAMERA ENGINE v4.1
    // Model transform: screen = position + (world * scale).
    // Dengan origin (0,0), titik di bawah kursor selalu tetap di tempatnya
    // saat zoom, sehingga pohon tidak lagi bergeser diagonal/miring.
    // =============================================================
    function clampScale(value) {
      return Math.min(Math.max(value, CAMERA_MIN_SCALE), CAMERA_MAX_SCALE);
    }

    function getViewportPoint(clientX, clientY) {
      const rect = mainArea.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function updateZoomIndicator() {
      const label = document.getElementById('zoom-level');
      if (label) label.textContent = `${Math.round(scale * 100)}%`;
    }

    function executeTransformRAF() {
      transformDiv.style.transform = `translate3d(${position.x.toFixed(2)}px, ${position.y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      updateZoomIndicator();
      isRenderPending = false;
    }

    function requestTransformUpdate(useSmooth = false) {
      if (useSmooth) {
        transformDiv.classList.add('smooth-transform');
        window.clearTimeout(requestTransformUpdate.smoothTimer);
        requestTransformUpdate.smoothTimer = window.setTimeout(() => transformDiv.classList.remove('smooth-transform'), 280);
      }
      if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(executeTransformRAF);
      }
    }

    function zoomAt(nextScale, focalPoint, useSmooth = false) {
      const clampedScale = clampScale(nextScale);
      if (!Number.isFinite(clampedScale) || Math.abs(clampedScale - scale) < 0.0001) return;

      // Koordinat dunia yang tepat berada di bawah titik fokus sebelum zoom.
      const worldX = (focalPoint.x - position.x) / scale;
      const worldY = (focalPoint.y - position.y) / scale;

      scale = clampedScale;
      // Kembalikan koordinat dunia tadi ke titik layar yang sama sesudah zoom.
      position.x = focalPoint.x - (worldX * scale);
      position.y = focalPoint.y - (worldY * scale);
      requestTransformUpdate(useSmooth);
    }

    function getTreeNaturalSize() {
      return {
        width: Math.max(transformDiv.offsetWidth, transformDiv.scrollWidth, 1),
        height: Math.max(transformDiv.offsetHeight, transformDiv.scrollHeight, 1)
      };
    }

    function fitTreeToViewport(useSmooth = true) {
      if (!treeData || !mainArea.clientWidth || !mainArea.clientHeight) return;
      const treeSize = getTreeNaturalSize();
      const availableWidth = Math.max(240, mainArea.clientWidth - (CAMERA_SIDE_PADDING * 2));
      const availableHeight = Math.max(220, mainArea.clientHeight - CAMERA_TOP_PADDING - CAMERA_BOTTOM_PADDING);
      const fitScale = clampScale(Math.min(availableWidth / treeSize.width, availableHeight / treeSize.height, 1.15));

      scale = fitScale;
      position.x = (mainArea.clientWidth - (treeSize.width * scale)) / 2;
      position.y = CAMERA_TOP_PADDING + Math.max(0, (availableHeight - (treeSize.height * scale)) / 2);
      cameraInitialized = true;
      requestTransformUpdate(useSmooth);
    }

    // Kompatibel dengan tombol HTML lama: angka positif memperbesar, negatif memperkecil.
    window.adjustZoom = function(delta) {
      const focal = { x: mainArea.clientWidth / 2, y: mainArea.clientHeight / 2 };
      const factor = delta > 0 ? 1.18 : (1 / 1.18);
      zoomAt(scale * factor, focal, true);
    };

    window.resetZoom = function() {
      fitTreeToViewport(true);
    };

    window.setZoom100 = function() {
      const focal = { x: mainArea.clientWidth / 2, y: mainArea.clientHeight / 2 };
      zoomAt(1, focal, true);
    };

    function renderTree() {
      if (!treeData) return;

      const rootHasSpouseParents = treeData.spouses && treeData.spouses.some(s => s.parents && s.parents.length > 0);
      treeContainer.style.cssText = rootHasSpouseParents ? 'margin-top: 260px;' : '';
      treeContainer.innerHTML = buildNodeHTML(treeData, 1);
      updateSidebarStats();

      // Tunggu layout final agar ukuran pohon benar sebelum auto-fit pertama.
      requestAnimationFrame(() => {
        if (!cameraInitialized) fitTreeToViewport(false);
        else requestTransformUpdate(false);
      });
    }

    // Scroll/trackpad: zoom eksponensial terasa konsisten pada mouse dan touchpad.
    mainArea.addEventListener('wheel', (event) => {
      if (event.target.closest('input, textarea, select')) return;
      event.preventDefault();
      const focal = getViewportPoint(event.clientX, event.clientY);
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomAt(scale * factor, focal, false);
    }, { passive: false });

    // Pointer Events menyatukan mouse, pena, dan sentuhan.
    const activePointers = new Map();
    const interactiveTouchPointers = new Set();
    let panGesture = null;
    let pinchGesture = null;
    let suppressNextCanvasClick = false;

    function isInteractiveTarget(target) {
      return Boolean(target.closest('button, a, input, textarea, select, label, .cursor-pointer, [data-no-pan]'));
    }

    function distanceBetween(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function midpointBetween(a, b) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function beginPinchGesture() {
      const points = [...activePointers.values()].slice(0, 2);
      if (points.length < 2) return;
      const midpoint = midpointBetween(points[0], points[1]);
      pinchGesture = {
        startDistance: Math.max(distanceBetween(points[0], points[1]), 1),
        startScale: scale,
        worldAnchor: {
          x: (midpoint.x - position.x) / scale,
          y: (midpoint.y - position.y) / scale
        }
      };
      panGesture = null;
    }

    mainArea.addEventListener('pointerdown', (event) => {
      const interactive = isInteractiveTarget(event.target);
      // Mouse/stylus pada kartu tetap menjadi klik biasa. Sentuhan disimpan agar
      // pinch dua jari tetap dapat dimulai walaupun jari pertama berada di kartu.
      if (interactive && event.pointerType !== 'touch') return;

      const point = getViewportPoint(event.clientX, event.clientY);
      activePointers.set(event.pointerId, point);
      if (interactive) interactiveTouchPointers.add(event.pointerId);
      transformDiv.classList.remove('smooth-transform');

      if (activePointers.size === 1) {
        if (interactive) return;
        try { mainArea.setPointerCapture(event.pointerId); } catch (_) {}
        panGesture = {
          pointerId: event.pointerId,
          startPoint: point,
          startPosition: { ...position }
        };
        mainArea.classList.add('cursor-grabbing', 'is-gesturing');
      } else if (activePointers.size === 2) {
        for (const pointerId of activePointers.keys()) {
          try { mainArea.setPointerCapture(pointerId); } catch (_) {}
        }
        suppressNextCanvasClick = true;
        beginPinchGesture();
        mainArea.classList.add('cursor-grabbing', 'is-gesturing');
      }
    });

    mainArea.addEventListener('pointermove', (event) => {
      if (!activePointers.has(event.pointerId)) return;
      const point = getViewportPoint(event.clientX, event.clientY);
      activePointers.set(event.pointerId, point);

      if (activePointers.size >= 2 && pinchGesture) {
        const points = [...activePointers.values()].slice(0, 2);
        const midpoint = midpointBetween(points[0], points[1]);
        const currentDistance = Math.max(distanceBetween(points[0], points[1]), 1);
        scale = clampScale(pinchGesture.startScale * (currentDistance / pinchGesture.startDistance));
        position.x = midpoint.x - (pinchGesture.worldAnchor.x * scale);
        position.y = midpoint.y - (pinchGesture.worldAnchor.y * scale);
        suppressNextCanvasClick = true;
        requestTransformUpdate(false);
      } else if (activePointers.size === 1 && panGesture && panGesture.pointerId === event.pointerId) {
        position.x = panGesture.startPosition.x + (point.x - panGesture.startPoint.x);
        position.y = panGesture.startPosition.y + (point.y - panGesture.startPoint.y);
        requestTransformUpdate(false);
      }
    });

    function finishPointer(event) {
      activePointers.delete(event.pointerId);
      interactiveTouchPointers.delete(event.pointerId);
      try { mainArea.releasePointerCapture(event.pointerId); } catch (_) {}

      if (activePointers.size === 1) {
        const [pointerId, point] = activePointers.entries().next().value;
        pinchGesture = null;
        panGesture = { pointerId, startPoint: point, startPosition: { ...position } };
      } else if (activePointers.size === 0) {
        panGesture = null;
        pinchGesture = null;
        mainArea.classList.remove('cursor-grabbing', 'is-gesturing');
      } else {
        beginPinchGesture();
      }
    }

    mainArea.addEventListener('pointerup', finishPointer);
    mainArea.addEventListener('pointercancel', finishPointer);
    mainArea.addEventListener('lostpointercapture', (event) => {
      if (activePointers.has(event.pointerId)) finishPointer(event);
    });

    // Cegah klik profil yang tidak disengaja setelah gerakan pinch.
    mainArea.addEventListener('click', (event) => {
      if (!suppressNextCanvasClick) return;
      suppressNextCanvasClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    // Klik dua kali area kosong = rapikan dan muat seluruh pohon.
    mainArea.addEventListener('dblclick', (event) => {
      if (isInteractiveTarget(event.target)) return;
      fitTreeToViewport(true);
    });

    // Pintasan desktop: +/− untuk zoom, 0/F untuk fit, 1 untuk 100%.
    window.addEventListener('keydown', (event) => {
      if (event.target.matches('input, textarea, select')) return;
      if (event.key === '+' || event.key === '=') { event.preventDefault(); window.adjustZoom(1); }
      else if (event.key === '-') { event.preventDefault(); window.adjustZoom(-1); }
      else if (event.key === '0' || event.key.toLowerCase() === 'f') { event.preventDefault(); fitTreeToViewport(true); }
      else if (event.key === '1') { event.preventDefault(); window.setZoom100(); }
    });

    // Saat ukuran jendela/sidebar berubah, pertahankan pusat visual pengguna.
    const resizeObserver = new ResizeObserver(() => {
      const next = { width: mainArea.clientWidth, height: mainArea.clientHeight };
      if (!next.width || !next.height) return;
      if (!lastViewportSize.width) {
        lastViewportSize = next;
        return;
      }
      const deltaX = (next.width - lastViewportSize.width) / 2;
      const deltaY = (next.height - lastViewportSize.height) / 2;
      lastViewportSize = next;
      if (cameraInitialized) {
        position.x += deltaX;
        position.y += deltaY;
        requestTransformUpdate(false);
      }
    });
    resizeObserver.observe(mainArea);


    // Dynamic viewport pada HP/tablet: keyboard, rotasi, split-screen, dan browser bar.
    let viewportTimer = null;
    function reconcileMobileViewport() {
      window.clearTimeout(viewportTimer);
      viewportTimer = window.setTimeout(() => {
        const vv = window.visualViewport;
        if (vv) document.documentElement.style.setProperty('--visual-viewport-height', `${vv.height}px`);
        if (!mainArea.clientWidth || !mainArea.clientHeight) return;
        lastViewportSize = {width:mainArea.clientWidth,height:mainArea.clientHeight};
        if (cameraInitialized) requestTransformUpdate(false);
      }, 120);
    }
    window.visualViewport?.addEventListener('resize', reconcileMobileViewport);
    window.visualViewport?.addEventListener('scroll', reconcileMobileViewport);
    window.addEventListener('orientationchange', () => {
      window.setTimeout(() => { cameraInitialized = false; fitTreeToViewport(false); reconcileMobileViewport(); }, 320);
    });

    function setAllCollapse(node, state) {
      if (!node) return;
      node.isCollapsed = state;
      if (node.children) {
        node.children.forEach(c => setAllCollapse(c, state));
      }
    }
    
    window.expandAll = function() {
      setAllCollapse(treeData, false);
      cameraInitialized = false;
      renderTree();
      simpanKeFirebase();
      showToast('Semua cabang dibuka dan tampilan disesuaikan.');
    };
    
    window.collapseAll = function() {
      setAllCollapse(treeData, true);
      cameraInitialized = false;
      renderTree();
      simpanKeFirebase();
      showToast('Semua cabang ditutup dan tampilan disesuaikan.');
    };

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
      renderTree();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderTree();
    });

    function findNodeById(node, id) {
      if (!node) return null;
      if (node.id === id) return node;
      if (node.spouses) {
        for (let s of node.spouses) {
          if (s.id === id) return s;
          if (s.spouses) {
             let foundSS = s.spouses.find(ss => ss.id === id);
             if (foundSS) return foundSS;
          }
          if (s.parents) {
             let found = s.parents.find(p => p.id === id);
             if (found) return found;
          }
        }
      }
      if (node.children) {
        for (let child of node.children) {
          let found = findNodeById(child, id);
          if (found) return found;
        }
      }
      return null;
    }

    function findParent(node, childId) {
      if (!node.children) return null;
      for (let child of node.children) {
          if (child.id === childId) return node;
          let found = findParent(child, childId);
          if (found) return found;
      }
      return null;
    }

    function findNodeBySpouseId(node, spouseId) {
      if (!node) return null;
      if (node.spouses && node.spouses.some(s => s.id === spouseId)) return node;
      if (node.children) {
        for (let c of node.children) {
          let f = findNodeBySpouseId(c, spouseId);
          if (f) return f;
        }
      }
      return null;
    }
    
    function isSpouseParent(node, id) {
      if (!node) return false;
      if (node.spouses) {
        for (let s of node.spouses) {
          if (s.parents && s.parents.some(p => p.id === id)) return true;
        }
      }
      if (node.children) {
        for (let c of node.children) {
          if (isSpouseParent(c, id)) return true;
        }
      }
      return false;
    }

    function updateTreeData(node, id, updatedData) {
      if (node.id === id) return typeof updatedData === 'function' ? updatedData(node) : { ...node, ...updatedData };
      
      let newNode = { ...node };
      if (newNode.spouses) {
        newNode.spouses = newNode.spouses.map(s => {
           if (s.id === id) return typeof updatedData === 'function' ? updatedData(s) : { ...s, ...updatedData };
           if (s.spouses) {
               s.spouses = s.spouses.map(ss => ss.id === id ? (typeof updatedData === 'function' ? updatedData(ss) : { ...ss, ...updatedData }) : ss);
           }
           if (s.parents) {
             s.parents = s.parents.map(p => p.id === id ? (typeof updatedData === 'function' ? updatedData(p) : { ...p, ...updatedData }) : p);
           }
           return s;
        });
      }

      if (newNode.children) {
        newNode.children = newNode.children.map(child => updateTreeData(child, id, updatedData));
      }
      return newNode;
    }

    function deleteNodeFromTreeData(node, idToDelete) {
      let newNode = { ...node };
      if (newNode.spouses) {
        newNode.spouses = newNode.spouses.filter(s => s.id !== idToDelete).map(s => {
           if (s.spouses) {
               s.spouses = s.spouses.filter(ss => ss.id !== idToDelete);
           }
           if (s.parents) {
              s.parents = s.parents.filter(p => p.id !== idToDelete);
           }
           return s;
        });
      }
      if (!newNode.children) return newNode;
      newNode.children = newNode.children.filter(c => c.id !== idToDelete).map(c => deleteNodeFromTreeData(c, idToDelete));
      return newNode;
    }

    window.toggleCollapse = function(nodeId) {
      treeData = updateTreeData(treeData, nodeId, node => ({ ...node, isCollapsed: !node.isCollapsed }));
      renderTree();
      simpanKeFirebase();
    };

    // --- MODAL LOGIC & ACTIONS ---
    const modal = document.getElementById('editor-modal');
    const formFields = [
      'name', 'gender', 'notes', 'otherpartner', 'childstatus', 'photo', 'birthplace', 'blood', 
      'phone', 'occupation', 'address', 'gmap', 'birthdate', 'birthyear', 
      'deathdate', 'deathyear', 'linkedspouse', 'biography', 'surname', 'marriagedate', 'source', 'familynumber',
      'birthtime', 'birthtimezone', 'birthutcoffset', 'birthlatitude', 'birthlongitude', 'chinesezodiacbasis'
    ];

    function getFormData() {
      let data = {};
      formFields.forEach(f => {
        const el = document.getElementById(`input-${f}`);
        if(el) {
          let key = f;
          if(f === 'photo') key = 'photoUrl';
          if(f === 'birthplace') key = 'birthPlace';
          if(f === 'blood') key = 'bloodType';
          if(f === 'gmap') key = 'gmapUrl';
          if(f === 'birthdate') key = 'birthDate';
          if(f === 'birthyear') key = 'birthYear';
          if(f === 'deathdate') key = 'deathDate';
          if(f === 'deathyear') key = 'deathYear';
          if(f === 'linkedspouse') key = 'linkedSpouseId';
          if(f === 'otherpartner') key = 'otherPartner';
          if(f === 'childstatus') key = 'childStatus';
          if(f === 'familynumber') key = 'familyNumber';
          if(f === 'marriagedate') key = 'marriageDate';
          if(f === 'birthtime') key = 'birthTime';
          if(f === 'birthtimezone') key = 'birthTimezone';
          if(f === 'birthutcoffset') key = 'birthUtcOffset';
          if(f === 'birthlatitude') key = 'birthLatitude';
          if(f === 'birthlongitude') key = 'birthLongitude';
          if(f === 'chinesezodiacbasis') key = 'chineseZodiacBasis';
          data[key] = el.value;
        }
      });
      return data;
    }

    function setFormData(data) {
      formFields.forEach(f => {
        const el = document.getElementById(`input-${f}`);
        if(el) {
          let key = f;
          if(f === 'photo') key = 'photoUrl';
          if(f === 'birthplace') key = 'birthPlace';
          if(f === 'blood') key = 'bloodType';
          if(f === 'gmap') key = 'gmapUrl';
          if(f === 'birthdate') key = 'birthDate';
          if(f === 'birthyear') key = 'birthYear';
          if(f === 'deathdate') key = 'deathDate';
          if(f === 'deathyear') key = 'deathYear';
          if(f === 'linkedspouse') key = 'linkedSpouseId';
          if(f === 'otherpartner') key = 'otherPartner';
          if(f === 'childstatus') key = 'childStatus';
          if(f === 'familynumber') key = 'familyNumber';
          if(f === 'marriagedate') key = 'marriageDate';
          if(f === 'birthtime') key = 'birthTime';
          if(f === 'birthtimezone') key = 'birthTimezone';
          if(f === 'birthutcoffset') key = 'birthUtcOffset';
          if(f === 'birthlatitude') key = 'birthLatitude';
          if(f === 'birthlongitude') key = 'birthLongitude';
          if(f === 'chinesezodiacbasis') key = 'chineseZodiacBasis';
          
          if(key === 'childStatus' && !data[key]) el.value = 'kandung';
          else el.value = data[key] || '';
        }
      });
      document.getElementById('input-photo-file').value = '';
      const basisEl = document.getElementById('input-chinesezodiacbasis');
      if (basisEl && !basisEl.value) basisEl.value = 'cny';
      setTimeout(() => window.previewAstrologyFromForm?.(), 0);
    }

    function populateSpouseDropdown(parentNode) {
      const select = document.getElementById('input-linkedspouse');
      const container = document.getElementById('container-childrelations');
      select.innerHTML = '<option value="">-- Pilih Pasangan (Ibu/Ayah) --</option>';
      
      if (parentNode && parentNode.spouses && parentNode.spouses.length > 0) {
          parentNode.spouses.forEach(s => {
              select.innerHTML += `<option value="${s.id}">Anak bersama: ${escapeHTML(s.name)}</option>`;
              if (s.spouses) {
                  s.spouses.forEach(ss => {
                      select.innerHTML += `<option value="${ss.id}">Anak bersama: ${escapeHTML(ss.name)} (Eks/Lain)</option>`;
                  });
              }
          });
          container.classList.remove('hidden');
          select.disabled = false;
      } else if (parentNode) {
          container.classList.remove('hidden');
          select.disabled = true;
      } else {
          container.classList.add('hidden');
      }
    }

    document.getElementById('input-photo-file').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          const MAX_WIDTH = 300;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = height * (MAX_WIDTH / width);
            width = MAX_WIDTH;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          document.getElementById('input-photo').value = canvas.toDataURL('image/jpeg', 0.8);
          showToast('Foto berhasil dimuat!');
        }
        img.src = event.target.result;
      }
      reader.readAsDataURL(file);
    });



    function setQuickActionState(id, enabled, reason = '') {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = !enabled;
      button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      if (reason) button.title = reason;
    }

    function updateQuickActions(person, isEditAllowed) {
      const panel = document.getElementById('quick-actions-panel');
      if (!panel) return;
      panel.classList.toggle('hidden', !isEditAllowed);
      const context = document.getElementById('relation-action-context');
      if (context) context.textContent = person?.name ? `Kelola relasi ${person.name}` : 'Pilih tindakan untuk anggota ini';
      if (!isEditAllowed) return;
      const spouseParent = isSpouseParent(treeData, selectedNodeId);
      const isRoot = !selectedSpouseId && selectedNodeId === treeData?.id;
      const isSpouse = modalMode === 'editSpouse';
      setQuickActionState('quick-action-parents', isSpouse || isRoot,
        isSpouse ? 'Tambah ayah dan ibu untuk pasangan ini' : isRoot ? 'Tambah generasi leluhur di atas profil utama' : 'Orang tua profil ini sudah ditentukan oleh cabang pohon');
      setQuickActionState('quick-action-sibling', !isSpouse && !spouseParent,
        isSpouse ? 'Saudara pasangan dikelola melalui cabang keluarganya' : 'Tambah saudara pada generasi yang sama');
      setQuickActionState('quick-action-partner', !spouseParent,
        spouseParent ? 'Penambahan pasangan pada profil besan belum didukung' : 'Tambah suami, istri, atau pasangan');
      setQuickActionState('quick-action-child', !spouseParent,
        spouseParent ? 'Anak tidak dapat ditambahkan dari profil besan' : 'Tambah anak dan kaitkan dengan pasangan yang dipilih');
      setQuickActionState('quick-action-share', true, 'Bagikan profil atau tampilkan kode QR');
      setQuickActionState('quick-action-delete', true, 'Hapus profil dengan konfirmasi');
    }

    window.handleNodeClick = function(nodeId, spouseId) {
      selectedNodeId = nodeId;
      selectedSpouseId = spouseId;
      modalMode = spouseId ? 'editSpouse' : 'edit';
      
      let targetId = spouseId || nodeId;
      let person = findNodeById(treeData, targetId) || {};
      
      setFormData(person);
      editingAssets = { gallery: Array.isArray(person.gallery) ? JSON.parse(JSON.stringify(person.gallery)) : [], documents: Array.isArray(person.documents) ? JSON.parse(JSON.stringify(person.documents)) : [] };
      renderProfileAssets();

      if (!spouseId && nodeId !== treeData.id) {
          const parent = findParent(treeData, nodeId);
          populateSpouseDropdown(parent);
          document.getElementById('input-linkedspouse').value = person.linkedSpouseId || '';
          document.getElementById('input-childstatus').value = person.childStatus || 'kandung';
          document.getElementById('container-childrelations').classList.remove('hidden');
      } else {
          document.getElementById('container-childrelations').classList.add('hidden');
      }
      
      const isEditAllowed = appSettings.enableEdit;
      
      document.getElementById('modal-title-text').innerText = isEditAllowed ? 'Edit Profil' : 'Detail Profil';
      document.getElementById('modal-title-icon').className = isEditAllowed ? 'fa-solid fa-pen-to-square mr-2 text-blue-600' : 'fa-solid fa-address-card mr-2 text-blue-600';
      
      updateQuickActions(person, isEditAllowed);
      document.getElementById('btn-save').style.display = isEditAllowed ? 'block' : 'none';
      document.getElementById('btn-cancel').innerText = isEditAllowed ? 'Batal' : 'Tutup';

      document.querySelectorAll('.edit-only-field').forEach(el => el.style.display = isEditAllowed ? 'block' : 'none');

      formFields.forEach(f => {
        const el = document.getElementById(`input-${f}`);
        if (el) {
           if (!isEditAllowed) el.setAttribute('readonly', true);
           else el.removeAttribute('readonly');
        }
      });
      document.getElementById('input-gender').disabled = !isEditAllowed;
      document.getElementById('input-blood').disabled = !isEditAllowed;
      document.getElementById('input-linkedspouse').disabled = !isEditAllowed && !document.getElementById('input-linkedspouse').disabled;
      document.getElementById('input-childstatus').disabled = !isEditAllowed;
      const chineseBasis = document.getElementById('input-chinesezodiacbasis');
      if (chineseBasis) chineseBasis.disabled = !isEditAllowed;

      modal.classList.remove('hidden');
      const editorScroll = modal.querySelector('.editor-scroll');
      if (editorScroll) editorScroll.scrollTop = 0;
    };

    window.actionAddChild = function() {
       if (isSpouseParent(treeData, selectedNodeId)) {
           showToast("Anak tidak dapat ditambahkan pada profil mertua/besan.", true);
           return;
       }
    
       const newId = generateId();
       const newChild = { id: newId, name: 'Anak Baru', gender: 'L', children: [], spouses: [], isCollapsed: false };
       
       if (modalMode === 'editSpouse') {
           let hostNode = findNodeBySpouseId(treeData, selectedSpouseId);
           if (hostNode) {
               newChild.linkedSpouseId = selectedSpouseId;
               if (!hostNode.children) hostNode.children = [];
               hostNode.children.push(newChild);
           } else {
               showToast("Tambahkan anak melalui profil keturunan utama.", true);
               return;
           }
       } else {
           let node = findNodeById(treeData, selectedNodeId);
           if (!node.children) node.children = [];
           node.children.push(newChild);
       }
       simpanKeFirebase('Anak ditambahkan');
       renderTree();
       handleNodeClick(newId, null); 
       showToast("Anak berhasil ditambahkan.");
    };

    window.actionAddPartner = function() {
       if (isSpouseParent(treeData, selectedNodeId)) {
           showToast("Penambahan pasangan pada profil besan belum didukung.", true);
           return;
       }
       const current = findNodeById(treeData, selectedSpouseId || selectedNodeId) || {};
       const newId = generateId();
       const newPartner = {
         id: newId,
         name: 'Pasangan Baru',
         gender: current.gender === 'P' ? 'L' : 'P',
         children: [],
         spouses: [],
         isCollapsed: false
       };
       const targetId = selectedSpouseId || selectedNodeId;
       treeData = updateTreeData(treeData, targetId, node => ({
           ...node,
           spouses: [...(Array.isArray(node.spouses) ? node.spouses : []), newPartner]
       }));
       simpanKeFirebase('Pasangan ditambahkan');
       renderTree();
       handleNodeClick(selectedNodeId, newId);
       showToast("Pasangan baru berhasil ditambahkan. Lengkapi profil lalu simpan.");
    };

    window.actionAddSibling = function() {
       if (modalMode === 'editSpouse') {
           showToast("Saudara dari pasangan dapat dibuat di pohon silsilah terpisah.", true);
           return;
       }
       if (isSpouseParent(treeData, selectedNodeId)) {
           showToast("Penambahan saudara pada profil ini belum didukung.", true);
           return;
       }
       
       const newId = generateId();
       const newSibling = { id: newId, name: 'Saudara Baru', gender: 'L', children: [], spouses: [], isCollapsed: false };
       
       if (selectedNodeId === treeData.id) {
           const newRoot = { id: generateId(), name: 'Orang Tua', gender: 'L', children: [treeData, newSibling], spouses: [], isCollapsed: false };
           treeData = newRoot;
       } else {
           let parent = findParent(treeData, selectedNodeId);
           if (parent) {
               parent.children.push(newSibling);
           }
       }
       simpanKeFirebase('Saudara ditambahkan');
       renderTree();
       handleNodeClick(newId, null);
       showToast("Saudara berhasil ditambahkan.");
    };

    window.actionAddParents = function() {
       if (modalMode === 'editSpouse') {
           let spouse = findNodeById(treeData, selectedSpouseId);
           if (!spouse) return;
           if (!spouse.parents) spouse.parents = [];
           
           if (spouse.parents.length >= 2) {
               showToast("Pasangan ini sudah memiliki orang tua penuh.", true);
               return;
           }
           
           spouse.parents.push({ id: generateId(), name: 'Ayah Pasangan', gender: 'L' });
           spouse.parents.push({ id: generateId(), name: 'Ibu Pasangan', gender: 'P' });
           
           treeData = updateTreeData(treeData, selectedSpouseId, spouse);
           simpanKeFirebase();
           renderTree();
           closeEditorModal();
           showToast("Orang tua dari pasangan berhasil ditambah.");
       } else if (selectedNodeId === treeData.id) {
           const newRoot = { id: generateId(), name: 'Ayah', gender: 'L', children: [treeData], spouses: [{ id: generateId(), name: 'Ibu', gender: 'P' }], isCollapsed: false };
           treeData = newRoot;
           simpanKeFirebase();
           renderTree();
           closeEditorModal();
           showToast("Generasi leluhur berhasil ditambahkan.");
       } else {
           showToast("Klik profil paling atas untuk menambah orang tua / generasi baru.", true);
       }
    };

    window.closeEditorModal = function() {
      modal.classList.add('hidden');
    };

    window.handleSave = function() {
      if(!appSettings.enableEdit) return;
      if(!document.getElementById('input-name').value) { showToast('Nama tidak boleh kosong!', true); return; }
      
      const newData = { ...getFormData(), gallery: editingAssets.gallery, documents: editingAssets.documents };
      const targetId = selectedSpouseId || selectedNodeId;
      
      treeData = updateTreeData(treeData, targetId, newData);
      
      closeEditorModal();
      simpanKeFirebase('Profil anggota diperbarui');
      renderTree();
      showToast('Data berhasil disimpan!');
    };

    window.handleDelete = function() {
      if(!appSettings.enableEdit) return;
      
      customConfirm('Hapus Anggota', 'Apakah Anda yakin ingin menghapus data ini secara permanen?', () => {
        const targetId = selectedSpouseId || selectedNodeId;
        
        if (treeData.id === targetId) {
          if (treeData.children && treeData.children.length === 1) {
            treeData = treeData.children[0];
          } else if (treeData.children && treeData.children.length > 1) {
            closeEditorModal();
            showToast("Tidak bisa menghapus akar utama yang memiliki lebih dari satu cabang. Hapus cabang di bawahnya dulu.", true);
            return;
          } else {
            treeData = { id: generateId(), name: 'Anggota Pertama', gender: 'L', isCollapsed: false };
          }
        } else {
          treeData = deleteNodeFromTreeData(treeData, targetId);
        }
        closeEditorModal();
        simpanKeFirebase('Anggota keluarga dihapus');
        renderTree();
        showToast('Data berhasil dihapus!');
      });
    };

    // --- STATS & EXPORT/IMPORT ---
    const statsModal = document.getElementById('stats-modal');
    
    function getUpcomingBirthdays(node, currentMonth, list = []) {
      if (!node) return list;
      
      const checkBday = (person) => {
        if (person.birthDate && !person.deathDate && !person.deathYear) {
          const [y, m, d] = person.birthDate.split('-');
          if (parseInt(m) === currentMonth) {
            list.push({ name: person.name, date: parseInt(d), dateStr: person.birthDate });
          }
        }
      };
      
      checkBday(node);
      if (node.spouses) node.spouses.forEach(s => checkBday(s));
      if (node.children) node.children.forEach(c => getUpcomingBirthdays(c, currentMonth, list));
      
      return list;
    }

    window.openStatsModal = function() {
      const stats = calculateStats(treeData);
      document.getElementById('stat-total').innerText = stats.total;
      document.getElementById('stat-depth').innerText = stats.maxDepth + ' Generasi';
      document.getElementById('stat-male').innerText = stats.male;
      document.getElementById('stat-female').innerText = stats.female;
      document.getElementById('stat-deceased').innerText = stats.deceased + ' orang';
      
      const currentMonth = new Date().getMonth() + 1;
      let bdays = getUpcomingBirthdays(treeData, currentMonth);
      bdays.sort((a, b) => a.date - b.date); 
      
      const bdayContainer = document.getElementById('stat-birthdays');
      if (bdays.length === 0) {
        bdayContainer.innerHTML = '<p class="text-slate-500 italic text-center py-2">Tidak ada yang berulang tahun bulan ini.</p>';
      } else {
        bdayContainer.innerHTML = bdays.map(b => `
          <div class="flex justify-between items-center bg-amber-50 p-2 rounded border border-amber-100">
            <span class="font-medium text-amber-900">${escapeHTML(b.name)}</span>
            <span class="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">Tgl ${b.date}</span>
          </div>
        `).join('');
      }
      
      statsModal.classList.remove('hidden');
      setActiveNav('stats');
    };
    window.closeStatsModal = function() { statsModal.classList.add('hidden'); setActiveNav('tree'); };

    // ========================================================
    // EXPORT ENGINE v4.4 — HIGH RES, A3 MULTI-PAGE, MOBILE SAFE
    // ========================================================
    window.openExportModal = function() { document.getElementById('export-modal').classList.remove('hidden'); };
    window.closeExportModal = function() { document.getElementById('export-modal').classList.add('hidden'); };

    function waitForImages(root) {
      const images = [...root.querySelectorAll('img')];
      return Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        const done = () => resolve(); img.addEventListener('load', done, {once:true}); img.addEventListener('error', done, {once:true});
        setTimeout(done, 8000);
      })));
    }

    function downloadBlob(filename, blob) {
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    async function captureFamilyTreeCanvas() {
      if (typeof html2canvas === 'undefined') throw new Error('Library html2canvas tidak tersedia');
      const treeElement = document.querySelector('.family-tree');
      if (!treeElement) throw new Error('Pohon keluarga tidak ditemukan');
      await document.fonts?.ready?.catch?.(() => {});
      const host = document.createElement('div');
      host.className = 'export-capture-host';
      host.style.padding = '72px';
      host.style.width = 'max-content';
      host.style.height = 'max-content';
      const clone = treeElement.cloneNode(true);
      clone.style.padding = '0'; clone.style.margin = '0'; clone.style.transform = 'none'; clone.style.width = 'max-content';
      clone.querySelectorAll('[data-html2canvas-ignore], button').forEach(el => el.remove());
      clone.querySelectorAll('*').forEach(el => { el.style.animation = 'none'; el.style.transition = 'none'; });
      host.appendChild(clone); document.body.appendChild(host);
      try {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await waitForImages(host);
        const width = Math.max(host.scrollWidth, host.offsetWidth, 1);
        const height = Math.max(host.scrollHeight, host.offsetHeight, 1);
        const mobile = Math.min(window.innerWidth, window.innerHeight) < 760;
        const desired = mobile ? 1.45 : 2;
        const maxPixels = mobile ? 18000000 : 32000000;
        const maxDimension = mobile ? 10000 : 15000;
        const scaleByPixels = Math.sqrt(maxPixels / Math.max(width * height, 1));
        const scaleByDimension = Math.min(maxDimension / width, maxDimension / height);
        const renderScale = Math.max(.7, Math.min(desired, scaleByPixels, scaleByDimension));
        return await html2canvas(host, {
          backgroundColor:'#f8fafc', scale:renderScale, useCORS:true, allowTaint:false,
          logging:false, imageTimeout:15000, width, height, windowWidth:width, windowHeight:height,
          scrollX:0, scrollY:0
        });
      } finally { host.remove(); }
    }

    function addPdfHeaderFooter(pdf, title, pageNumber, totalPages, pageW, pageH) {
      pdf.setFillColor(248,250,252); pdf.rect(0,0,pageW,14,'F');
      pdf.setTextColor(15,23,42); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.text(title,10,9);
      pdf.setDrawColor(226,232,240); pdf.line(10,pageH-11,pageW-10,pageH-11);
      pdf.setFont('helvetica','normal'); pdf.setTextColor(100,116,139); pdf.setFontSize(7.5);
      pdf.text(`Halaman ${pageNumber} dari ${totalPages}`,pageW-10,pageH-6,{align:'right'});
      pdf.text(new Date().toLocaleDateString('id-ID'),10,pageH-6);
    }

    async function exportTreeAsPdf(canvas) {
      if (!window.jspdf) throw new Error('Library PDF tidak tersedia');
      const { jsPDF } = window.jspdf;
      const pageW = 420, pageH = 297, marginX = 10, top = 18, bottom = 15;
      const contentW = pageW - marginX*2, contentH = pageH - top - bottom;
      const pageAspect = contentW / contentH;
      const canvasAspect = canvas.width / canvas.height;
      let cols = 1, rows = 1;
      if (!(canvasAspect <= pageAspect * 1.25 && canvas.height <= canvas.width * 1.8)) {
        const pixelsPerPage = Math.max(1300, Math.min(2600, canvas.width));
        cols = Math.max(1, Math.ceil(canvas.width / pixelsPerPage));
        const tileW = canvas.width / cols;
        const tileH = tileW / pageAspect;
        rows = Math.max(1, Math.ceil(canvas.height / tileH));
      }
      const total = cols * rows;
      const pdf = new jsPDF({orientation:'landscape', unit:'mm', format:'a3', compress:true});
      const overlap = 10;
      let pageNo = 0;
      for (let row=0; row<rows; row++) {
        for (let col=0; col<cols; col++) {
          if (pageNo) pdf.addPage('a3','landscape'); pageNo++;
          const nominalW = canvas.width / cols, nominalH = canvas.height / rows;
          const sx = Math.max(0, Math.floor(col*nominalW - (col ? overlap : 0)));
          const sy = Math.max(0, Math.floor(row*nominalH - (row ? overlap : 0)));
          const sw = Math.min(canvas.width - sx, Math.ceil(nominalW + (col ? overlap : 0) + (col<cols-1 ? overlap : 0)));
          const sh = Math.min(canvas.height - sy, Math.ceil(nominalH + (row ? overlap : 0) + (row<rows-1 ? overlap : 0)));
          const tile = document.createElement('canvas'); tile.width = sw; tile.height = sh;
          tile.getContext('2d').drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);
          const ratio = Math.min(contentW/sw, contentH/sh);
          const drawW = sw*ratio, drawH = sh*ratio;
          const x = (pageW-drawW)/2, y = top + (contentH-drawH)/2;
          pdf.addImage(tile.toDataURL('image/jpeg',.94),'JPEG',x,y,drawW,drawH,undefined,'FAST');
          addPdfHeaderFooter(pdf, appSettings.appTitle || 'Silsilah Keluarga', pageNo, total, pageW, pageH);
          tile.width = tile.height = 1;
        }
      }
      pdf.save(`Bagan_Silsilah_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    window.executeExport = async function(format) {
      closeExportModal();
      showToast(`Menyiapkan ${format === 'png' ? 'gambar' : 'PDF'} profesional...`);
      try {
        const canvas = await captureFamilyTreeCanvas();
        if (format === 'png') {
          const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
          if (!blob) throw new Error('Gagal membuat gambar PNG');
          downloadBlob(`Bagan_Silsilah_${new Date().toISOString().slice(0,10)}.png`,blob);
          showToast(`PNG berhasil dibuat (${canvas.width} × ${canvas.height}px).`);
        } else {
          await exportTreeAsPdf(canvas);
          showToast('PDF bagan berhasil dibuat. Halaman disusun otomatis.');
        }
        canvas.width = canvas.height = 1;
      } catch (error) {
        console.error('Export error:',error); showToast(error.message || 'Ekspor gagal diproses.',true);
      }
    };

    window.exportJSON = function() {
      const exportObject = {
        version: "2.0",
        settings: appSettings,
        tree: treeData,
        familyEvents
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr); dl.setAttribute("download", "silsilah_keluarga_lengkap.json");
      document.body.appendChild(dl); dl.click(); dl.remove();
      showToast('Data JSON berhasil disimpan!');
    };

    document.getElementById('import-input').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const json = JSON.parse(event.target.result);
          
          if (json.version === "2.0" && json.tree && json.settings) {
            treeData = json.tree;
            appSettings = json.settings;
            familyEvents = Array.isArray(json.familyEvents) ? json.familyEvents : [];
          } 
          else if (json && json.id && json.name) {
            treeData = json;
          } else {
            throw new Error("Format Tidak Dikenal");
          }
          
          applySettingsToUI();
          cameraInitialized = false;
          renderTree();
          simpanKeFirebase('Impor data JSON');
          showToast('Data berhasil dimuat dan tampilan disesuaikan!');
        } catch (err) { showToast("Format file JSON tidak valid", true); }
      };
      reader.readAsText(file);
      e.target.value = ''; 
    });

    window.exportWebProject = async function() {
      if (typeof JSZip === 'undefined') {
        showToast("Sistem kompresor gagal dimuat.", true);
        return;
      }

      showToast('Memproses file export web...');
      const zip = new JSZip();

      const bodyClone = document.body.cloneNode(true);
      
      bodyClone.querySelector('#tree-container').innerHTML = '\n          <!-- Tree Nodes will be injected here via JS -->\n        ';
      bodyClone.querySelector('#tree-transform').style.transform = '';
      bodyClone.querySelector('#editor-modal').classList.add('hidden');
      bodyClone.querySelector('#stats-modal').classList.add('hidden');
      bodyClone.querySelector('#settings-modal').classList.add('hidden');
      bodyClone.querySelector('#custom-confirm-modal').classList.add('hidden');
      bodyClone.querySelector('#export-modal').classList.add('hidden');
      bodyClone.querySelector('#map-wrapper').classList.add('hidden');
      bodyClone.querySelector('#clear-search').style.display = 'none';
      bodyClone.querySelector('#search-input').value = '';
      
      if (appSettings.accessCode && appSettings.accessCode.trim() !== '') {
          bodyClone.querySelector('#login-screen').classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      } else {
          bodyClone.querySelector('#login-screen').classList.add('hidden');
      }
      
      const scripts = bodyClone.querySelectorAll('script');
      scripts.forEach(s => s.remove());
      
      const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHTML(appSettings.appTitle)}</title>
  
  <script src="https://cdn.tailwindcss.com"></` + `script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></` + `script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></` + `script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></` + `script>
  <script src="https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"></` + `script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></` + `script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></` + `script>

  <link rel="stylesheet" href="style.css">
</head>
<body class="${bodyClone.className}">
${bodyClone.innerHTML}
  <script src="script.js"></` + `script>
</body>
</html>`;

      let cssContent = '';
      let jsContent = '';
      try {
        [cssContent, jsContent] = await Promise.all([
          fetch('style.css', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('style.css tidak ditemukan'); return r.text(); }),
          fetch('script.js', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('script.js tidak ditemukan'); return r.text(); })
        ]);
      } catch (error) {
        console.error(error);
        showToast('Gagal membaca file proyek untuk diekspor.', true);
        return;
      }
      
      const newTreeStr = JSON.stringify(treeData, null, 2);
      const newSetStr = JSON.stringify(appSettings, null, 2);
      
      jsContent = jsContent.replace(
        /\/\/ --- BEGIN INITIAL DATA ---[\s\S]*?\/\/ --- END INITIAL DATA ---/,
        `// --- BEGIN INITIAL DATA ---
    const initialTreeData = ${newTreeStr};

    const initialAppSettings = ${newSetStr};
    // --- END INITIAL DATA ---`
      );

      zip.file("index.html", htmlContent);
      zip.file("style.css", cssContent);
      zip.file("script.js", jsContent);

      zip.generateAsync({type:"blob"}).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Proyek_Silsilah_Keluarga_Web.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Proyek Web berhasil diekspor!');
      });
    };

    // ==========================================
    // BAGIAN INTEGRASI PETA (LEAFLET)
    // ==========================================
    let mapInstance = null;
    let mapLayerGroup = null;
    let leafletLoadingPromise = null;
    const geocodeCache = {};

    function loadLeaflet() {
      if (window.L) return Promise.resolve();
      if (leafletLoadingPromise) return leafletLoadingPromise;

      leafletLoadingPromise = new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
      return leafletLoadingPromise;
    }

    function parseGmapUrl(url) {
      if (!url) return null;
      let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
      match = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
      match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (match) return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
      return null;
    }

    async function getCoordinatesFromNominatim(placeName) {
      if (!placeName) return null;
      const query = placeName.trim().toLowerCase();
      if (geocodeCache[query] !== undefined) return geocodeCache[query]; 

      try {
        await new Promise(r => setTimeout(r, 1100)); 
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          geocodeCache[query] = coords;
          return coords;
        }
        
        geocodeCache[query] = null;
        return null;
      } catch (e) {
        console.error("Gagal mendapatkan koordinat untuk:", placeName, e);
        return null;
      }
    }

    function extractMapData(rootNode) {
      let mapNodes = [];
      let mapEdges = [];

      function traverse(node, parentNode = null) {
        if (!node) return;
        mapNodes.push(node);
        
        if (parentNode) {
           mapEdges.push({ from: parentNode.id, to: node.id });
        }

        if (node.spouses) {
          node.spouses.forEach(spouse => {
             mapNodes.push(spouse);
             mapEdges.push({ from: node.id, to: spouse.id, isSpouse: true });
          });
        }

        if (node.children) {
          node.children.forEach(child => traverse(child, node));
        }
      }
      
      traverse(rootNode);
      return { mapNodes, mapEdges };
    }

    async function renderMapData() {
      const statusEl = document.getElementById('map-loading-status');
      
      if (mapLayerGroup) {
         mapLayerGroup.clearLayers(); 
      } else {
         mapLayerGroup = L.layerGroup().addTo(mapInstance);
      }

      const { mapNodes, mapEdges } = extractMapData(treeData);
      
      statusEl.innerText = `Menyiapkan ${mapNodes.length} data lokasi... (Mohon tunggu)`;
      
      const nodeCoords = {};
      const bounds = [];
      
      for (let i = 0; i < mapNodes.length; i++) {
         const node = mapNodes[i];
         statusEl.innerText = `Memproses lokasi ${i+1}/${mapNodes.length}: ${node.name}`;
         
         let coords = null;
         
         if (node.gmapUrl) {
             coords = parseGmapUrl(node.gmapUrl);
         }
         
         if (!coords && node.birthPlace) {
             coords = await getCoordinatesFromNominatim(node.birthPlace);
         }
         
         if (coords) {
             nodeCoords[node.id] = coords;
             bounds.push([coords.lat, coords.lon]);

             const iconHtml = `<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white overflow-hidden">${node.photoUrl ? `<img src="${escapeHTML(node.photoUrl)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-xs"></i>`}</div>`;
             const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 32] });

             let locationText = '';
             if (node.gmapUrl) locationText += `<a href="${escapeHTML(node.gmapUrl)}" target="_blank" class="text-blue-600 hover:text-blue-800 transition underline text-xs block mb-1">Buka di Google Maps</a>`;
             if (node.birthPlace) locationText += `Asal/Lahir: <b>${escapeHTML(node.birthPlace)}</b>`;

             const popupContent = `
                <div class="text-center min-w-[120px] p-1">
                   <h4 class="font-bold text-slate-800 text-sm mb-1">${escapeHTML(node.name)}</h4>
                   <p class="text-xs text-slate-600 leading-tight">${locationText}</p>
                </div>
             `;

             L.marker([coords.lat, coords.lon], { icon: customIcon })
              .addTo(mapLayerGroup)
              .bindPopup(popupContent);
         }
      }

      statusEl.innerText = "Menggambar garis migrasi...";

      mapEdges.forEach(edge => {
         const coordFrom = nodeCoords[edge.from];
         const coordTo = nodeCoords[edge.to];
         
         if (coordFrom && coordTo && (coordFrom.lat !== coordTo.lat || coordFrom.lon !== coordTo.lon)) {
             const color = edge.isSpouse ? '#ec4899' : '#3b82f6';
             const dashArray = edge.isSpouse ? '5, 5' : null;
             const weight = edge.isSpouse ? 2 : 3;
             const opacity = edge.isSpouse ? 0.6 : 0.4;

             L.polyline([ [coordFrom.lat, coordFrom.lon], [coordTo.lat, coordTo.lon] ], {
                 color: color, weight: weight, opacity: opacity, dashArray: dashArray
             }).addTo(mapLayerGroup);
         }
      });

      if (bounds.length > 0) {
         mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
      }

      statusEl.innerText = `${bounds.length} titik lokasi divisualisasikan.`;
    }

    window.openMapMode = async function() {
      const mapWrapper = document.getElementById('map-wrapper');
      const statusEl = document.getElementById('map-loading-status');
      
      mapWrapper.classList.remove('hidden');
      setActiveNav('map');
      statusEl.innerText = "Memuat pustaka peta...";
      
      try {
         await loadLeaflet();
         
         if (!mapInstance) {
            statusEl.innerText = "Menyiapkan peta...";
            mapInstance = L.map('map-container').setView([-0.7893, 113.9213], 5); 
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(mapInstance);
         }

         setTimeout(() => mapInstance.invalidateSize(), 100);

         await renderMapData();

      } catch (err) {
         statusEl.innerText = "Gagal memuat sistem peta.";
         console.error(err);
      }
    };

    window.closeMapMode = function() {
      document.getElementById('map-wrapper').classList.add('hidden');
      setActiveNav('tree');
    };



    // ========================================================
    // SILSILAH PRO v4.2 — MODUL PROFESIONAL (NON-AUTH)
    // ========================================================
    const deepClone = (value) => JSON.parse(JSON.stringify(value ?? null));
    const normalizeText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const getPersonYear = (person, field = 'birth') => {
      const date = field === 'birth' ? person.birthDate : person.deathDate;
      const year = field === 'birth' ? person.birthYear : person.deathYear;
      return Number(date?.slice(0,4) || year || 0);
    };

    function flattenPeople(root = treeData) {
      const rows = [];
      const walk = (person, generation = 1, relation = 'keturunan', parentId = null, hostId = null) => {
        if (!person) return;
        rows.push({ person, generation, relation, parentId, hostId });
        (person.spouses || []).forEach(spouse => {
          rows.push({ person: spouse, generation, relation: 'pasangan', parentId: person.id, hostId: person.id });
          (spouse.parents || []).forEach(parent => rows.push({ person: parent, generation: Math.max(1,generation-1), relation: 'besan', parentId: spouse.id, hostId: spouse.id }));
          (spouse.spouses || []).forEach(other => rows.push({ person: other, generation, relation: 'pasangan-lain', parentId: spouse.id, hostId: spouse.id }));
        });
        (person.children || []).forEach(child => walk(child, generation + 1, 'anak', person.id, person.id));
      };
      walk(root);
      return rows;
    }

    function ensureFamilyNumbers() {
      if (!treeData) return false;
      let changed = false;
      const people = flattenPeople();
      const used = new Set(people.map(row => row.person.familyNumber).filter(Boolean));
      let seq = 1;
      people.forEach(({person}) => {
        if (!person.id) { person.id = generateId(); changed = true; }
        if (!person.familyNumber) {
          while (used.has(`FAM-${String(seq).padStart(4,'0')}`)) seq++;
          person.familyNumber = `FAM-${String(seq).padStart(4,'0')}`;
          used.add(person.familyNumber); seq++; changed = true;
        }
      });
      return changed;
    }

    function validateTreeData() {
      const issues = [];
      const people = flattenPeople();
      const ids = new Map();
      const numbers = new Map();
      const fingerprints = new Map();
      people.forEach(row => {
        const p = row.person;
        if (!String(p.name || '').trim()) issues.push({severity:'high', type:'Nama kosong', personId:p.id, message:'Ada profil tanpa nama lengkap.'});
        if (!p.id) issues.push({severity:'high', type:'ID hilang', personId:null, message:`${p.name || 'Profil'} belum memiliki ID.`});
        else if (ids.has(p.id)) issues.push({severity:'high', type:'ID ganda', personId:p.id, message:`ID ${p.id} dipakai lebih dari satu profil.`});
        else ids.set(p.id,p);
        if (p.familyNumber) {
          if (numbers.has(p.familyNumber)) issues.push({severity:'medium', type:'Nomor anggota ganda', personId:p.id, message:`Nomor ${p.familyNumber} juga dipakai ${numbers.get(p.familyNumber).name}.`});
          else numbers.set(p.familyNumber,p);
        } else issues.push({severity:'low', type:'Nomor anggota kosong', personId:p.id, message:`${p.name || 'Profil'} belum memiliki nomor anggota.`});
        const fp = `${normalizeText(p.name)}|${p.birthDate || p.birthYear || ''}`;
        if (normalizeText(p.name) && (p.birthDate || p.birthYear)) {
          if (fingerprints.has(fp) && fingerprints.get(fp).id !== p.id) issues.push({severity:'medium', type:'Kemungkinan duplikat', personId:p.id, otherId:fingerprints.get(fp).id, message:`${p.name} memiliki nama dan tahun/tanggal lahir yang sama dengan profil lain.`});
          else fingerprints.set(fp,p);
        }
        const by=getPersonYear(p,'birth'), dy=getPersonYear(p,'death');
        if (by && dy && dy < by) issues.push({severity:'high',type:'Tanggal tidak logis',personId:p.id,message:`Tahun wafat ${p.name} lebih awal dari tahun lahir.`});
        if (p.linkedSpouseId && !people.some(x=>x.person.id===p.linkedSpouseId)) issues.push({severity:'medium',type:'Relasi pasangan hilang',personId:p.id,message:`Relasi orang tua pasangan untuk ${p.name} tidak ditemukan.`});
      });
      people.filter(r=>r.relation==='anak' && r.parentId).forEach(row=>{
        const parent=people.find(x=>x.person.id===row.parentId)?.person;
        const py=getPersonYear(parent||{},'birth'), cy=getPersonYear(row.person,'birth');
        if(py&&cy){const age=cy-py;if(age<12||age>80) issues.push({severity:'medium',type:'Rentang usia orang tua',personId:row.person.id,message:`Usia ${parent.name} saat ${row.person.name} lahir terdeteksi ${age} tahun.`});}
      });
      const penalty = issues.reduce((s,i)=>s+(i.severity==='high'?12:i.severity==='medium'?6:2),0);
      return { issues, score: Math.max(0,100-penalty), people };
    }

    function openProWorkspace(view, title, subtitle, actionsHtml = '') {
      document.getElementById('pro-workspace').classList.remove('hidden');
      document.getElementById('pro-workspace-title').textContent = title;
      document.getElementById('pro-workspace-subtitle').textContent = subtitle;
      document.getElementById('pro-workspace-actions').innerHTML = actionsHtml;
      setActiveNav(view);
      toggleSidebar(false);
    }
    window.closeProWorkspace = function(){ document.getElementById('pro-workspace').classList.add('hidden'); setActiveNav('tree'); };

    window.openDirectoryWorkspace = function() {
      openProWorkspace('directory','Daftar Anggota','Cari dan saring seluruh anggota lintas generasi.','<button class="pro-secondary-btn" onclick="exportDirectoryCSV()"><i class="fa-solid fa-file-csv mr-2"></i>CSV</button>');
      const content=document.getElementById('pro-workspace-content');
      const gens=[...new Set(flattenPeople().map(r=>r.generation))].sort((a,b)=>a-b);
      const cities=[...new Set(flattenPeople().map(r=>r.person.birthPlace).filter(Boolean))].sort();
      content.innerHTML=`<div class="filter-row"><input id="directory-search" class="pro-input" placeholder="Cari nama, nomor anggota, pekerjaan, marga..."><select id="directory-generation" class="pro-input"><option value="">Semua generasi</option>${gens.map(g=>`<option value="${g}">Generasi ${g}</option>`).join('')}</select><select id="directory-status" class="pro-input"><option value="">Hidup & wafat</option><option value="alive">Masih hidup</option><option value="deceased">Telah wafat</option></select><select id="directory-gender" class="pro-input"><option value="">Semua gender</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select><select id="directory-city" class="pro-input"><option value="">Semua kota</option>${cities.map(c=>`<option>${escapeHTML(c)}</option>`).join('')}</select></div><p id="directory-count" class="mb-4 text-sm font-bold text-slate-500"></p><div id="directory-list" class="directory-grid"></div>`;
      ['directory-search','directory-generation','directory-status','directory-gender','directory-city'].forEach(id=>document.getElementById(id).addEventListener('input',renderDirectory));
      renderDirectory();
    };
    function renderDirectory(){
      const q=normalizeText(document.getElementById('directory-search')?.value), gen=document.getElementById('directory-generation')?.value, status=document.getElementById('directory-status')?.value, gender=document.getElementById('directory-gender')?.value, city=document.getElementById('directory-city')?.value;
      const rows=flattenPeople().filter(({person,generation})=>{const hay=normalizeText([person.name,person.familyNumber,person.occupation,person.surname,person.birthPlace].join(' ')); const deceased=!!(person.deathDate||person.deathYear); return (!q||hay.includes(q))&&(!gen||String(generation)===gen)&&(!status||(status==='deceased'?deceased:!deceased))&&(!gender||person.gender===gender)&&(!city||person.birthPlace===city);});
      document.getElementById('directory-count').textContent=`${rows.length} anggota ditemukan`;
      document.getElementById('directory-list').innerHTML=rows.map(({person,generation,relation})=>`<article class="directory-card" onclick="closeProWorkspace(); openPersonById('${person.id}')"><div class="directory-avatar">${person.photoUrl?`<img src="${sanitizeURL(person.photoUrl)}" class="h-full w-full object-cover">`:'<i class="fa-solid fa-user"></i>'}</div><div class="min-w-0"><div class="flex items-center gap-2"><h3 class="truncate font-black text-slate-900">${escapeHTML(person.name||'Tanpa Nama')}</h3><span class="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">G${generation}</span></div><p class="mt-1 text-xs font-bold text-cyan-700">${escapeHTML(person.familyNumber||'Belum bernomor')}</p><p class="mt-2 truncate text-xs text-slate-500">${escapeHTML([person.occupation,person.birthPlace,person.surname].filter(Boolean).join(' • ')||relation)}</p></div></article>`).join('')||'<div class="module-card p-8 text-center text-slate-500">Tidak ada anggota sesuai filter.</div>';
    }
    window.exportDirectoryCSV=function(){const rows=flattenPeople();const esc=v=>`"${String(v||'').replace(/"/g,'""')}"`;const csv=['Nomor,Nama,Gender,Generasi,Status,Tempat Lahir,Pekerjaan,Marga',...rows.map(r=>[r.person.familyNumber,r.person.name,r.person.gender,r.generation,(r.person.deathDate||r.person.deathYear)?'Wafat':'Hidup',r.person.birthPlace,r.person.occupation,r.person.surname].map(esc).join(','))].join('\n');downloadTextFile('daftar-anggota-keluarga.csv','\ufeff'+csv,'text/csv');};

    function collectTimelineEvents(){
      const events=[];
      flattenPeople().forEach(({person,generation})=>{
        if(person.birthDate||person.birthYear) events.push({date:person.birthDate||`${person.birthYear}-01-01`,year:getPersonYear(person,'birth'),type:'birth',title:`Kelahiran ${person.name}`,personId:person.id,detail:person.birthPlace||`Generasi ${generation}`});
        if(person.marriageDate) events.push({date:person.marriageDate,year:Number(person.marriageDate.slice(0,4)),type:'wedding',title:`Pernikahan ${person.name}`,personId:person.id,detail:person.notes||''});
        if(person.deathDate||person.deathYear) events.push({date:person.deathDate||`${person.deathYear}-01-01`,year:getPersonYear(person,'death'),type:'death',title:`Wafat ${person.name}`,personId:person.id,detail:person.birthPlace||''});
        (person.events||[]).forEach(e=>events.push({...e,year:Number((e.date||'').slice(0,4)),personId:person.id,title:e.title||`Peristiwa ${person.name}`}));
      });
      familyEvents.forEach(e=>events.push({...e,year:Number((e.date||'').slice(0,4))}));
      return events.filter(e=>e.year).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    }
    window.openTimelineWorkspace=function(){openProWorkspace('timeline','Timeline Keluarga','Kronologi kelahiran, pernikahan, peristiwa, dan wafat.','<button class="pro-primary-btn" onclick="openFamilyEventModal()"><i class="fa-solid fa-plus mr-2"></i>Tambah peristiwa</button>');const events=collectTimelineEvents();document.getElementById('pro-workspace-content').innerHTML=`<div class="timeline-list">${events.map(e=>`<div class="timeline-item"><div class="timeline-year">${escapeHTML(e.date||String(e.year))}</div><article class="timeline-card"><p class="text-[10px] font-black uppercase tracking-widest text-cyan-700">${escapeHTML(e.type||'peristiwa')}</p><h3 class="mt-1 font-black text-slate-900">${escapeHTML(e.title)}</h3><p class="mt-2 text-sm text-slate-500">${escapeHTML(e.detail||e.notes||'')}</p></article></div>`).join('')||'<div class="module-card p-8 text-center">Belum ada data kronologi.</div>'}</div>`;};

    function getCalendarEventsForMonth(year,month){
      const rows=[]; flattenPeople().forEach(({person})=>{if(person.birthDate&&!person.deathDate&&!person.deathYear){const [y,m,d]=person.birthDate.split('-').map(Number);if(m===month+1)rows.push({date:`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,title:`Ultah ${person.name}`,type:'birthday',personId:person.id});}if(person.marriageDate){const [,m,d]=person.marriageDate.split('-').map(Number);if(m===month+1)rows.push({date:`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,title:`Anniversary ${person.name}`,type:'wedding',personId:person.id});}}); familyEvents.forEach(e=>{const dt=new Date(`${e.date}T00:00:00`);if(dt.getFullYear()===year&&dt.getMonth()===month)rows.push(e)});return rows;}
    window.openCalendarWorkspace=function(){openProWorkspace('calendar','Kalender Keluarga','Ulang tahun, anniversary, reuni, dan pengingat keluarga.','<button class="pro-secondary-btn" onclick="enableCalendarReminders()"><i class="fa-solid fa-bell mr-2"></i>Aktifkan pengingat</button><button class="pro-primary-btn" onclick="openFamilyEventModal()"><i class="fa-solid fa-plus mr-2"></i>Tambah acara</button>');renderCalendar();};
    function renderCalendar(){const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth(),events=getCalendarEventsForMonth(year,month),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());const names=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];let cells='';for(let i=0;i<42;i++){const date=new Date(start);date.setDate(start.getDate()+i);const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;const dayEvents=events.filter(e=>e.date===iso);cells+=`<div class="calendar-cell ${date.getMonth()!==month?'muted':''}"><span class="calendar-date">${date.getDate()}</span>${dayEvents.map(e=>`<button class="calendar-event" title="${escapeHTML(e.title)}">${escapeHTML(e.title)}</button>`).join('')}</div>`;}document.getElementById('pro-workspace-content').innerHTML=`<div class="module-card"><div class="module-card-body"><div class="calendar-toolbar"><button class="pro-secondary-btn" onclick="moveCalendar(-1)"><i class="fa-solid fa-chevron-left"></i></button><h3 class="text-xl font-black text-slate-900">${calendarCursor.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</h3><button class="pro-secondary-btn" onclick="moveCalendar(1)"><i class="fa-solid fa-chevron-right"></i></button></div><div class="calendar-grid">${names.map(n=>`<div class="calendar-day-name">${n}</div>`).join('')}${cells}</div></div></div><div class="mt-5 module-card"><div class="module-card-header"><h3 class="font-black">Daftar acara bulan ini</h3></div><div class="module-card-body grid gap-2">${events.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p class="font-black text-slate-900">${escapeHTML(e.title)}</p><p class="text-xs text-slate-500">${escapeHTML(e.date)} • ${escapeHTML(e.notes||e.type||'')}</p></div>${e.id?`<button onclick="deleteFamilyEvent('${e.id}')" class="text-rose-600"><i class="fa-solid fa-trash"></i></button>`:''}</div>`).join('')||'<p class="text-sm text-slate-500">Tidak ada acara bulan ini.</p>'}</div></div>`;}
    window.moveCalendar=function(delta){calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+delta,1);renderCalendar();};
    window.openFamilyEventModal=function(){const modal=document.getElementById('family-event-modal');modal.classList.remove('hidden');modal.classList.add('flex');const sel=document.getElementById('event-person');sel.innerHTML='<option value="">— Tidak terkait profil tertentu —</option>'+flattenPeople().map(r=>`<option value="${r.person.id}">${escapeHTML(r.person.name||'Tanpa Nama')}</option>`).join('');document.getElementById('event-date').value=new Date().toISOString().slice(0,10);};
    window.closeFamilyEventModal=function(){const m=document.getElementById('family-event-modal');m.classList.add('hidden');m.classList.remove('flex');};
    window.saveFamilyEvent=function(){const title=document.getElementById('event-title').value.trim(),date=document.getElementById('event-date').value;if(!title||!date)return showToast('Judul dan tanggal acara wajib diisi.',true);familyEvents.push({id:generateId(),title,date,type:document.getElementById('event-type').value,personId:document.getElementById('event-person').value,notes:document.getElementById('event-notes').value.trim(),createdAt:Date.now()});closeFamilyEventModal();simpanKeFirebase('Acara keluarga ditambahkan');openCalendarWorkspace();showToast('Acara keluarga disimpan.');};
    window.deleteFamilyEvent=function(id){customConfirm('Hapus acara','Acara ini akan dihapus dari kalender keluarga.',()=>{familyEvents=familyEvents.filter(e=>e.id!==id);simpanKeFirebase('Acara keluarga dihapus');renderCalendar();});};
    window.enableCalendarReminders=async function(){if(!('Notification'in window))return showToast('Browser ini tidak mendukung notifikasi.',true);const permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem(REMINDER_KEY,'enabled');showToast('Pengingat kalender aktif.');checkCalendarReminders();}else showToast('Izin notifikasi belum diberikan.',true);};
    function checkCalendarReminders(){if(localStorage.getItem(REMINDER_KEY)!=='enabled'||Notification.permission!=='granted')return;const today=new Date();today.setHours(0,0,0,0);const limit=new Date(today);limit.setDate(limit.getDate()+Number(appSettings.reminderDays||7));const events=[];for(let m=0;m<2;m++)events.push(...getCalendarEventsForMonth(today.getFullYear(),today.getMonth()+m));const upcoming=events.filter(e=>{const d=new Date(`${e.date}T00:00:00`);return d>=today&&d<=limit});const key=`silsilah-reminded-${today.toISOString().slice(0,10)}`;if(upcoming.length&&localStorage.getItem(key)!=='yes'){new Notification('Agenda keluarga mendatang',{body:upcoming.slice(0,3).map(e=>`${e.date.slice(5)} ${e.title}`).join(' • ')});localStorage.setItem(key,'yes');}};

    window.openArchiveWorkspace=function(){openProWorkspace('archive','Arsip & Galeri','Seluruh foto dan dokumen keluarga dalam satu tempat.');const photos=[],docs=[];flattenPeople().forEach(({person})=>{(person.gallery||[]).forEach(x=>photos.push({...x,owner:person.name,personId:person.id}));(person.documents||[]).forEach(x=>docs.push({...x,owner:person.name,personId:person.id}));});document.getElementById('pro-workspace-content').innerHTML=`<div class="metric-grid mb-5"><div class="metric-card"><span>${photos.length}</span><small>Foto galeri</small></div><div class="metric-card"><span>${docs.length}</span><small>Dokumen</small></div><div class="metric-card"><span>${new Set([...photos,...docs].map(x=>x.personId)).size}</span><small>Profil berarsip</small></div><div class="metric-card"><span>${formatBytes([...photos,...docs].reduce((s,x)=>s+Number(x.size||0),0))}</span><small>Total arsip</small></div></div><section class="module-card mb-5"><div class="module-card-header"><h3 class="font-black">Galeri keluarga</h3></div><div class="module-card-body archive-grid">${photos.map(x=>`<article class="archive-item"><a href="${x.dataUrl}" target="_blank"><img src="${x.dataUrl}" alt="${escapeHTML(x.name||'Foto')}"></a><div class="archive-item-body"><p class="truncate font-black text-slate-900">${escapeHTML(x.name||'Foto')}</p><p class="mt-1 text-xs text-slate-500">${escapeHTML(x.owner||'')}</p></div></article>`).join('')||'<p class="text-sm text-slate-500">Belum ada foto galeri.</p>'}</div></section><section class="module-card"><div class="module-card-header"><h3 class="font-black">Dokumen keluarga</h3></div><div class="module-card-body grid gap-2">${docs.map(x=>`<a href="${x.dataUrl}" download="${escapeHTML(x.name||'dokumen')}" class="profile-document-item"><span class="doc-icon"><i class="fa-solid fa-file"></i></span><span class="min-w-0 flex-1"><b class="block truncate text-sm">${escapeHTML(x.name)}</b><small class="text-slate-500">${escapeHTML(x.owner)} • ${formatBytes(x.size)}</small></span><i class="fa-solid fa-download text-slate-400"></i></a>`).join('')||'<p class="text-sm text-slate-500">Belum ada dokumen.</p>'}</div></section>`;};

    window.openQualityWorkspace=function(){const result=validateTreeData();openProWorkspace('quality','Kualitas Data','Deteksi kesalahan, relasi tidak logis, dan kemungkinan profil ganda.','<button class="pro-secondary-btn" onclick="repairSafeDataIssues()"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i>Perbaiki yang aman</button>');document.getElementById('pro-workspace-content').innerHTML=`<div class="module-card mb-5"><div class="module-card-body flex flex-wrap items-center gap-8"><div class="quality-score" style="--score:${result.score}%"><span>${result.score}</span></div><div><h3 class="text-2xl font-black text-slate-900">${result.score>=90?'Data sangat rapi':result.score>=70?'Data cukup baik':'Perlu pemeriksaan'}</h3><p class="mt-2 text-sm text-slate-500">${result.people.length} profil diperiksa • ${result.issues.length} catatan ditemukan.</p></div></div></div><div class="grid gap-3">${result.issues.map(i=>`<article class="issue-card ${i.severity}"><div class="mt-1"><i class="fa-solid ${i.severity==='high'?'fa-circle-exclamation text-rose-600':i.severity==='medium'?'fa-triangle-exclamation text-amber-600':'fa-circle-info text-blue-600'}"></i></div><div class="flex-1"><div class="flex items-center gap-2"><h4 class="font-black text-slate-900">${escapeHTML(i.type)}</h4><span class="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">${i.severity}</span></div><p class="mt-1 text-sm text-slate-600">${escapeHTML(i.message)}</p></div>${i.personId?`<button onclick="closeProWorkspace(); openPersonById('${i.personId}')" class="pro-secondary-btn">Buka</button>`:''}</article>`).join('')||'<div class="module-card p-8 text-center"><i class="fa-solid fa-circle-check text-4xl text-emerald-500"></i><h3 class="mt-3 font-black">Tidak ada masalah terdeteksi</h3></div>'}</div>`;};
    window.repairSafeDataIssues=function(){const changed=ensureFamilyNumbers();if(changed){simpanKeFirebase('Perbaikan otomatis ID dan nomor anggota');renderTree();openQualityWorkspace();showToast('ID dan nomor anggota yang kosong telah diperbaiki.');}else showToast('Tidak ada perbaikan otomatis yang diperlukan.');};
    window.openPersonById=function(id){const row=flattenPeople().find(x=>x.person.id===id);if(!row)return showToast('Profil tidak ditemukan.',true);if(row.relation==='pasangan'||row.relation==='pasangan-lain')handleNodeClick(row.hostId||row.parentId,id);else handleNodeClick(id,null);};

    window.openHistoryWorkspace=function(){openProWorkspace('history','Riwayat Versi','Pulihkan kondisi data sebelum perubahan atau dari snapshot harian.','<button class="pro-primary-btn" onclick="recordHistory(\'Snapshot manual\').then(openHistoryWorkspace)"><i class="fa-solid fa-camera mr-2"></i>Snapshot sekarang</button>');const content=document.getElementById('pro-workspace-content');content.innerHTML='<div class="module-card p-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuat riwayat...</div>';historyRef.orderByChild('createdAt').limitToLast(40).once('value').then(snap=>{const rows=[];snap.forEach(c=>rows.push({id:c.key,...c.val()}));rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));content.innerHTML=`<div class="grid gap-3">${rows.map(r=>`<article class="history-item"><div class="history-icon"><i class="fa-solid fa-clock-rotate-left"></i></div><div class="min-w-0 flex-1"><h3 class="truncate font-black text-slate-900">${escapeHTML(r.label||'Versi data')}</h3><p class="mt-1 text-xs text-slate-500">${new Date(r.createdAt||Date.now()).toLocaleString('id-ID')} • v${escapeHTML(r.version||'')}</p></div><button onclick="restoreHistoryVersion('${r.id}')" class="pro-secondary-btn"><i class="fa-solid fa-rotate-left mr-2"></i>Pulihkan</button></article>`).join('')||'<div class="module-card p-8 text-center text-slate-500">Belum ada riwayat versi.</div>'}</div>`;}).catch(()=>content.innerHTML='<div class="module-card p-8 text-center text-rose-600">Riwayat tidak dapat dibaca. Pastikan Firebase Rules mengizinkan path riwayat.</div>');};
    window.restoreHistoryVersion=function(id){customConfirm('Pulihkan versi','Data sekarang akan disimpan sebagai snapshot, lalu diganti dengan versi yang dipilih.',()=>{historyRef.child(id).once('value').then(async snap=>{const v=snap.val();if(!v?.tree)throw new Error('Snapshot tidak valid');await recordHistory('Sebelum pemulihan versi');treeData=deepClone(v.tree);appSettings={...initialAppSettings,...deepClone(v.settings||{})};familyEvents=deepClone(v.familyEvents||[]);ensureFamilyNumbers();applySettingsToUI();cameraInitialized=false;renderTree();simpanKeFirebase('Versi lama dipulihkan');closeProWorkspace();showToast('Versi data berhasil dipulihkan.');}).catch(()=>showToast('Versi tidak dapat dipulihkan.',true));});};
    function ensureDailyHistorySnapshot(){if(!isCloudReady)return;const key=`silsilah-daily-snapshot-${new Date().toISOString().slice(0,10)}`;if(localStorage.getItem(key))return;recordHistory('Snapshot harian otomatis').then(()=>localStorage.setItem(key,'yes'));}

    function aggregateCounts(values){const map={};values.filter(Boolean).forEach(v=>map[v]=(map[v]||0)+1);return Object.entries(map).sort((a,b)=>b[1]-a[1]);}
    function renderBars(rows,total){return `<div class="bar-list">${rows.slice(0,10).map(([label,count])=>`<div class="bar-row"><span class="truncate font-bold text-slate-600">${escapeHTML(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,(count/Math.max(1,total))*100)}%"></div></div><b>${count}</b></div>`).join('')||'<p class="text-sm text-slate-500">Belum ada data.</p>'}</div>`;}
    const originalOpenStatsModal=window.openStatsModal;
    window.openStatsModal=function(){const rows=flattenPeople(),stats=calculateStats(treeData),cities=aggregateCounts(rows.map(r=>r.person.birthPlace)),jobs=aggregateCounts(rows.map(r=>r.person.occupation)),surnames=aggregateCounts(rows.map(r=>r.person.surname));openProWorkspace('stats','Statistik Keluarga','Demografi, persebaran, generasi, dan kelengkapan arsip.','<button class="pro-primary-btn" onclick="exportFamilyBookPDF()"><i class="fa-solid fa-book-open mr-2"></i>Buku PDF</button>');document.getElementById('pro-workspace-content').innerHTML=`<div class="metric-grid mb-5"><div class="metric-card"><span>${stats.total}</span><small>Total anggota</small></div><div class="metric-card"><span>${stats.maxDepth}</span><small>Generasi</small></div><div class="metric-card"><span>${stats.male}/${stats.female}</span><small>Laki-laki / perempuan</small></div><div class="metric-card"><span>${rows.filter(r=>(r.person.gallery||[]).length||(r.person.documents||[]).length).length}</span><small>Profil berarsip</small></div></div><div class="grid gap-5 lg:grid-cols-3"><section class="module-card"><div class="module-card-header"><h3 class="font-black">Kota kelahiran</h3></div><div class="module-card-body">${renderBars(cities,rows.length)}</div></section><section class="module-card"><div class="module-card-header"><h3 class="font-black">Pekerjaan</h3></div><div class="module-card-body">${renderBars(jobs,rows.length)}</div></section><section class="module-card"><div class="module-card-header"><h3 class="font-black">Marga / cabang</h3></div><div class="module-card-body">${renderBars(surnames,rows.length)}</div></section></div>`;};

    function formatBytes(bytes=0){if(!bytes)return '0 KB';const units=['B','KB','MB'];let n=Number(bytes),i=0;while(n>=1024&&i<2){n/=1024;i++}return `${n.toFixed(i?1:0)} ${units[i]}`;}
    function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
    async function compressImageFile(file,max=1200,quality=.78){const data=await readFileAsDataURL(file);return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;if(Math.max(w,h)>max){const ratio=max/Math.max(w,h);w=Math.round(w*ratio);h=Math.round(h*ratio)}const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',quality));};img.onerror=reject;img.src=data;});}
    function renderProfileAssets(){const gallery=document.getElementById('profile-gallery-list'),docs=document.getElementById('profile-document-list');if(!gallery||!docs)return;gallery.innerHTML=editingAssets.gallery.map((x,i)=>`<div class="profile-gallery-item"><a href="${x.dataUrl}" target="_blank"><img src="${x.dataUrl}" alt="${escapeHTML(x.name||'Foto')}"></a>${appSettings.enableEdit?`<button type="button" class="asset-delete" onclick="removeEditingAsset('gallery',${i})"><i class="fa-solid fa-trash"></i></button>`:''}</div>`).join('')||'<p class="col-span-full py-3 text-center text-xs text-slate-400">Belum ada foto galeri.</p>';docs.innerHTML=editingAssets.documents.map((x,i)=>`<div class="profile-document-item"><span class="doc-icon"><i class="fa-solid fa-file"></i></span><a href="${x.dataUrl}" download="${escapeHTML(x.name||'dokumen')}" class="min-w-0 flex-1"><b class="block truncate text-xs text-slate-800">${escapeHTML(x.name)}</b><small class="text-slate-500">${formatBytes(x.size)}</small></a>${appSettings.enableEdit?`<button type="button" class="text-rose-600" onclick="removeEditingAsset('documents',${i})"><i class="fa-solid fa-trash"></i></button>`:''}</div>`).join('')||'<p class="py-3 text-center text-xs text-slate-400">Belum ada dokumen.</p>';}
    window.removeEditingAsset=function(type,index){editingAssets[type].splice(index,1);renderProfileAssets();};
    document.getElementById('input-gallery-files')?.addEventListener('change',async e=>{for(const file of [...e.target.files]){try{const dataUrl=await compressImageFile(file);editingAssets.gallery.push({id:generateId(),name:file.name,type:'image/jpeg',size:Math.round(dataUrl.length*.75),dataUrl,createdAt:Date.now()});}catch(_){showToast(`Foto ${file.name} gagal diproses.`,true)}}renderProfileAssets();e.target.value='';});
    document.getElementById('input-document-files')?.addEventListener('change',async e=>{for(const file of [...e.target.files]){if(file.size>1200000){showToast(`${file.name} melebihi batas 1,2 MB.`,true);continue}try{const dataUrl=file.type.startsWith('image/')?await compressImageFile(file,1400,.8):await readFileAsDataURL(file);editingAssets.documents.push({id:generateId(),name:file.name,type:file.type||'application/octet-stream',size:file.size,dataUrl,createdAt:Date.now()});}catch(_){showToast(`Dokumen ${file.name} gagal diproses.`,true)}}renderProfileAssets();e.target.value='';});

    window.openProfileShare=function(){const id=selectedSpouseId||selectedNodeId,person=findNodeById(treeData,id);if(!person)return;const url=`${location.origin}${location.pathname}?person=${encodeURIComponent(id)}`;document.getElementById('profile-share-name').textContent=person.name||'Bagikan profil';document.getElementById('profile-share-url').value=url;const box=document.getElementById('profile-qr-code');box.innerHTML='';if(window.QRCode)new QRCode(box,{text:url,width:220,height:220,colorDark:'#0f172a',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});document.getElementById('profile-share-modal').classList.remove('hidden');document.getElementById('profile-share-modal').classList.add('flex');};
    window.closeProfileShare=function(){const m=document.getElementById('profile-share-modal');m.classList.add('hidden');m.classList.remove('flex');};
    window.copyProfileShareLink=async function(){const value=document.getElementById('profile-share-url').value;try{await navigator.clipboard.writeText(value);showToast('Tautan profil disalin.');}catch(_){document.getElementById('profile-share-url').select();document.execCommand('copy');}};
    function openProfileFromURL(){const id=new URLSearchParams(location.search).get('person');if(!id||!treeData||!hasStoredSession())return;setTimeout(()=>openPersonById(id),400);}

    window.openPresentationMode=function(){presentationPeople=flattenPeople().map(r=>r.person);if(!presentationPeople.length)return;presentationIndex=0;const m=document.getElementById('presentation-mode');m.classList.remove('hidden');renderPresentation();document.documentElement.requestFullscreen?.().catch(()=>{});};
    function renderPresentation(){const p=presentationPeople[presentationIndex];document.getElementById('presentation-counter').textContent=`${presentationIndex+1} / ${presentationPeople.length}`;document.getElementById('presentation-content').innerHTML=`<div class="presentation-card"><div class="presentation-photo">${p.photoUrl?`<img src="${sanitizeURL(p.photoUrl)}">`:'<i class="fa-solid fa-user"></i>'}</div><div class="presentation-copy"><p class="text-xs font-black uppercase tracking-[.28em] text-cyan-300">${escapeHTML(p.familyNumber||'Profil keluarga')}</p><h2 class="mt-4">${escapeHTML(p.name||'Tanpa Nama')}</h2><div class="presentation-meta">${[p.birthPlace,p.occupation,p.surname,p.birthDate||p.birthYear].filter(Boolean).map(x=>`<span class="presentation-chip">${escapeHTML(x)}</span>`).join('')}</div><p>${escapeHTML(p.biography||p.notes||'Belum ada biografi untuk profil ini.')}</p></div></div>`;}
    window.presentationNext=function(){presentationIndex=(presentationIndex+1)%presentationPeople.length;renderPresentation();};window.presentationPrevious=function(){presentationIndex=(presentationIndex-1+presentationPeople.length)%presentationPeople.length;renderPresentation();};window.closePresentationMode=function(){document.getElementById('presentation-mode').classList.add('hidden');if(document.fullscreenElement)document.exitFullscreen?.();};

    function buildRelationshipIndex() {
      const index = new Map();
      const ensure = id => { if (!index.has(id)) index.set(id,{parents:[],partners:[],children:[]}); return index.get(id); };
      const walk = (node, parent = null) => {
        if (!node) return;
        const rel = ensure(node.id);
        if (parent) { rel.parents.push(parent); ensure(parent.id).children.push(node); }
        (node.spouses || []).forEach(spouse => {
          rel.partners.push(spouse); ensure(spouse.id).partners.push(node);
          (spouse.parents || []).forEach(p => { ensure(spouse.id).parents.push(p); ensure(p.id).children.push(spouse); });
          (spouse.spouses || []).forEach(other => { ensure(spouse.id).partners.push(other); ensure(other.id).partners.push(spouse); });
        });
        (node.children || []).forEach(child => walk(child,node));
      };
      walk(treeData); return index;
    }

    function bookTimelineRows() {
      const rows = [];
      flattenPeople().forEach(({person}) => {
        if (person.birthDate || person.birthYear) rows.push({date:person.birthDate || `${person.birthYear}-01-01`, label:`Kelahiran ${person.name}`, type:'Lahir'});
        if (person.marriageDate) rows.push({date:person.marriageDate, label:`Pernikahan ${person.name}`, type:'Pernikahan'});
        if (person.deathDate || person.deathYear) rows.push({date:person.deathDate || `${person.deathYear}-01-01`, label:`Wafat ${person.name}`, type:'Wafat'});
      });
      familyEvents.forEach(e => rows.push({date:e.date,label:e.title || 'Acara keluarga',type:e.type || 'Acara'}));
      return rows.filter(x=>x.date).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    }

    function formatBookDate(value) {
      if (!value) return '';
      if (/^\d{4}$/.test(String(value))) return String(value);
      const d = new Date(`${String(value).slice(0,10)}T00:00:00`);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    }

    function astrologyBookText(person) {
      const a = getAstrologyProfile(person);
      const sun = a.sun ? (a.sun.uncertain ? a.sun.candidates.map(x=>x.name).join(' / ') : a.sun.name) : '';
      const moon = a.moon ? (a.moon.uncertain ? a.moon.candidates.map(x=>x.name).join(' / ') : a.moon.name) : '';
      const rising = a.ascendant?.name || '';
      const chinese = a.chinese?.label || '';
      return [sun && `Matahari ${sun}`, moon && `Bulan ${moon}`, rising && `Ascendant ${rising}`, chinese && `Shio ${chinese}`].filter(Boolean).join(' • ');
    }

    function createFamilyBookHTML() {
      const rows = flattenPeople(); const stats = calculateStats(treeData); const relIndex = buildRelationshipIndex();
      const timeline = bookTimelineRows().slice(0,80);
      const esc = escapeHTML;
      const profileHtml = rows.map(({person,generation},i) => {
        const rel = relIndex.get(person.id) || {parents:[],partners:[],children:[]};
        const photo = person.photoUrl ? `<img src="${sanitizeURL(person.photoUrl)}" alt="${esc(person.name)}">` : '<div class="photo-fallback">S</div>';
        const meta = [
          ['Nomor anggota',person.familyNumber],['Generasi',generation],['Lahir',formatBookDate(person.birthDate || person.birthYear)],['Wafat',formatBookDate(person.deathDate || person.deathYear)],
          ['Tempat lahir',person.birthPlace],['Pekerjaan',person.occupation],['Marga / cabang',person.surname],['Golongan darah',person.bloodType]
        ].filter(x=>x[1]);
        const astrology = astrologyBookText(person);
        return `<section class="book-page profile-page"><div class="profile-head"><div><small>${esc(person.familyNumber||`ANG-${i+1}`)} • GENERASI ${generation}</small><h2>${esc(person.name||'Tanpa Nama')}</h2></div><span>${i+1}/${rows.length}</span></div><div class="profile-grid"><div class="profile-photo">${photo}</div><div class="meta-grid">${meta.map(([k,v])=>`<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div></div><div class="relation-box"><div><b>Orang tua</b><span>${esc(rel.parents.map(x=>x.name).join(', ')||'—')}</span></div><div><b>Pasangan</b><span>${esc(rel.partners.map(x=>x.name).join(', ')||'—')}</span></div><div><b>Anak</b><span>${esc(rel.children.map(x=>x.name).join(', ')||'—')}</span></div></div>${astrology?`<div class="astro-box"><b>Astrologi data lahir</b><span>${esc(astrology)}</span></div>`:''}${person.biography?`<div class="book-copy"><h3>Biografi / Kisah Hidup</h3><p>${esc(person.biography).replace(/\n/g,'<br>')}</p></div>`:''}${person.source?`<div class="source-box"><b>Sumber informasi</b><p>${esc(person.source).replace(/\n/g,'<br>')}</p></div>`:''}</section>`;
      }).join('');
      return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Buku Keluarga</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#0f172a;background:#fff}.book-page{page-break-after:always;min-height:267mm;position:relative}.cover{display:flex;flex-direction:column;justify-content:center;padding:22mm;background:linear-gradient(145deg,#07111f,#164e63 58%,#4c1d95);color:#fff}.cover small{font-weight:700;letter-spacing:.2em}.cover h1{font-size:34pt;line-height:1.05;margin:12mm 0 4mm}.cover p{color:#cbd5e1}.cover .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:20mm}.cover .stats div{border:1px solid rgba(255,255,255,.18);border-radius:4mm;padding:5mm;background:rgba(255,255,255,.08)}.cover .stats b{display:block;font-size:22pt}.overview h2,.profile-page h2{margin:0;font-size:25pt}.overview-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5mm;margin-top:8mm}.overview-card{padding:6mm;border:1px solid #dbe5ef;border-radius:5mm;background:#f8fafc}.overview-card b{display:block;font-size:21pt}.timeline{margin-top:8mm;border-left:2px solid #0891b2;padding-left:6mm}.timeline-item{margin:0 0 4mm}.timeline-item b{display:block}.profile-head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:5mm;border-bottom:1px solid #dbe5ef}.profile-head small{font-weight:700;color:#0891b2}.profile-head>span{font-size:9pt;color:#64748b}.profile-grid{display:grid;grid-template-columns:45mm 1fr;gap:8mm;margin-top:7mm}.profile-photo{width:45mm;height:56mm;border-radius:5mm;overflow:hidden;background:#e2e8f0;display:flex;align-items:center;justify-content:center}.profile-photo img{width:100%;height:100%;object-fit:cover}.photo-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#164e63,#4f46e5);color:#fff;font-size:28pt;font-weight:bold}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.meta-grid div{padding:3.5mm;border-radius:3mm;background:#f8fafc;border:1px solid #e2e8f0}.meta-grid b,.meta-grid span{display:block}.meta-grid b{font-size:7.5pt;text-transform:uppercase;color:#64748b}.meta-grid span{margin-top:1.5mm;font-size:10pt;font-weight:700}.relation-box{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:6mm}.relation-box div,.astro-box,.source-box{padding:4mm;border:1px solid #dbe5ef;border-radius:4mm;background:#fff}.relation-box b,.relation-box span,.astro-box b,.astro-box span{display:block}.relation-box b,.astro-box b,.source-box b{font-size:8pt;text-transform:uppercase;color:#64748b}.relation-box span,.astro-box span{margin-top:2mm;font-size:9pt}.astro-box{margin-top:4mm;background:#f5f3ff;border-color:#ddd6fe}.book-copy{margin-top:7mm}.book-copy h3{font-size:12pt;margin:0 0 3mm}.book-copy p,.source-box p{font-size:9.5pt;line-height:1.55;margin:0}.source-box{margin-top:5mm;background:#f8fafc}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><section class="book-page cover"><small>BUKU WARISAN KELUARGA</small><h1>${esc(appSettings.appTitle||'Silsilah Keluarga')}</h1><p>${esc(appSettings.appSubtitle||'Arsip keluarga lintas generasi')}</p><div class="stats"><div><b>${rows.length}</b><span>Anggota</span></div><div><b>${stats.maxDepth}</b><span>Generasi</span></div><div><b>${timeline.length}</b><span>Peristiwa</span></div></div><p style="margin-top:auto">Dibuat ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p></section><section class="book-page overview"><h2>Ringkasan Keluarga</h2><div class="overview-grid"><div class="overview-card"><b>${stats.male}</b>Laki-laki</div><div class="overview-card"><b>${stats.female}</b>Perempuan</div><div class="overview-card"><b>${stats.deceased}</b>Telah wafat</div><div class="overview-card"><b>${rows.filter(r=>(r.person.gallery||[]).length||(r.person.documents||[]).length).length}</b>Profil berarsip</div></div><h3 style="margin-top:10mm">Kronologi utama</h3><div class="timeline">${timeline.slice(0,24).map(x=>`<div class="timeline-item"><b>${esc(formatBookDate(x.date))}</b><span>${esc(x.label)}</span></div>`).join('')||'<p>Belum ada kronologi.</p>'}</div></section>${profileHtml}</body></html>`;
    }

    window.printFamilyBook = function() {
      const popup = window.open('', '_blank');
      if (!popup) return showToast('Izinkan pop-up browser untuk membuka pratinjau cetak.',true);
      popup.document.open(); popup.document.write(createFamilyBookHTML()); popup.document.close();
      popup.addEventListener('load',()=>setTimeout(()=>popup.print(),700),{once:true});
    };

    window.exportFamilyBookPDF = async function() {
      if (!window.jspdf) return showToast('Library PDF tidak tersedia.',true);
      showToast('Menyusun buku keluarga profesional...');
      try {
        const {jsPDF}=window.jspdf, rows=flattenPeople(), stats=calculateStats(treeData), relIndex=buildRelationshipIndex();
        const timeline=bookTimelineRows(); const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
        const W=210,H=297,M=15, footerY=286;
        const pageTitle=(title,subtitle='')=>{pdf.setFillColor(9,17,31);pdf.rect(0,0,W,22,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text(title,M,13);if(subtitle){pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(186,230,253);pdf.text(subtitle,W-M,13,{align:'right'});}};
        const footer=(n,total)=>{pdf.setDrawColor(226,232,240);pdf.line(M,footerY-3,W-M,footerY-3);pdf.setTextColor(100,116,139);pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.text(appSettings.appTitle||'Silsilah Keluarga',M,footerY+2);pdf.text(`${n} / ${total}`,W-M,footerY+2,{align:'right'});};
        const wrap=(text,x,y,width,size=9,line=4.6)=>{pdf.setFontSize(size);const lines=pdf.splitTextToSize(String(text||''),width);pdf.text(lines,x,y);return y+lines.length*line;};
        // Cover
        pdf.setFillColor(7,17,31);pdf.rect(0,0,W,H,'F');pdf.setFillColor(8,145,178);pdf.circle(178,35,42,'F');pdf.setFillColor(79,70,229);pdf.circle(190,258,58,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.text('BUKU WARISAN KELUARGA',M,76);pdf.setFontSize(30);let coverY=94;coverY=wrap(appSettings.appTitle||'Silsilah Keluarga',M,coverY,160,30,12);pdf.setFont('helvetica','normal');pdf.setTextColor(203,213,225);pdf.setFontSize(11);pdf.text(appSettings.appSubtitle||'Arsip keluarga lintas generasi',M,coverY+5);pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(22);pdf.text(String(rows.length),M,178);pdf.text(String(stats.maxDepth),72,178);pdf.text(String(timeline.length),126,178);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(203,213,225);pdf.text('ANGGOTA',M,185);pdf.text('GENERASI',72,185);pdf.text('PERISTIWA',126,185);pdf.text(`Dibuat ${new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}`,M,270);
        // Overview
        pdf.addPage();pageTitle('Ringkasan Keluarga','Statistik & kronologi');pdf.setTextColor(15,23,42);pdf.setFont('helvetica','bold');pdf.setFontSize(22);pdf.text('Gambaran Umum',M,38);const cards=[['Total anggota',rows.length],['Laki-laki',stats.male],['Perempuan',stats.female],['Generasi',stats.maxDepth],['Telah wafat',stats.deceased],['Profil berarsip',rows.filter(r=>(r.person.gallery||[]).length||(r.person.documents||[]).length).length]];cards.forEach((c,i)=>{const x=M+(i%3)*59,y=50+Math.floor(i/3)*28;pdf.setFillColor(248,250,252);pdf.roundedRect(x,y,54,21,3,3,'F');pdf.setFontSize(17);pdf.setFont('helvetica','bold');pdf.text(String(c[1]),x+5,y+9);pdf.setFontSize(7.5);pdf.setFont('helvetica','normal');pdf.setTextColor(100,116,139);pdf.text(c[0],x+5,y+16);pdf.setTextColor(15,23,42)});pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text('Kronologi Utama',M,117);let ty=127;timeline.slice(0,28).forEach(x=>{if(ty>272)return;pdf.setFillColor(8,145,178);pdf.circle(M+2,ty-1.5,1.4,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.text(formatBookDate(x.date),M+7,ty);pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.text(pdf.splitTextToSize(x.label,120),M+45,ty);pdf.setTextColor(15,23,42);ty+=7});
        const totalPages=2+rows.length;
        footer(2,totalPages);
        // Profiles
        rows.forEach(({person,generation},i)=>{pdf.addPage();pageTitle(person.name||'Tanpa Nama',`${person.familyNumber||''} • Generasi ${generation}`);let y=34;const photoX=M,photoY=y,photoW=44,photoH=54;pdf.setFillColor(226,232,240);pdf.roundedRect(photoX,photoY,photoW,photoH,4,4,'F');if(person.photoUrl){try{const fmt=/png/i.test(person.photoUrl.slice(0,40))?'PNG':'JPEG';pdf.addImage(person.photoUrl,fmt,photoX,photoY,photoW,photoH,undefined,'FAST')}catch(_){pdf.setTextColor(100);pdf.setFontSize(8);pdf.text('Foto tidak tersedia',photoX+photoW/2,photoY+28,{align:'center'})}}else{pdf.setTextColor(100);pdf.setFontSize(8);pdf.text('Tanpa foto',photoX+photoW/2,photoY+28,{align:'center'})}const meta=[['Lahir',formatBookDate(person.birthDate||person.birthYear)],['Wafat',formatBookDate(person.deathDate||person.deathYear)],['Tempat lahir',person.birthPlace],['Pekerjaan',person.occupation],['Marga / cabang',person.surname],['Golongan darah',person.bloodType]].filter(x=>x[1]);let my=y+3;meta.forEach(([k,v])=>{pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(100,116,139);pdf.text(k.toUpperCase(),66,my);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(15,23,42);const val=pdf.splitTextToSize(String(v),122);pdf.text(val,66,my+4);my+=8+(val.length-1)*4});y=Math.max(photoY+photoH+8,my+2);const rel=relIndex.get(person.id)||{parents:[],partners:[],children:[]};pdf.setFillColor(248,250,252);pdf.roundedRect(M,y,W-M*2,31,3,3,'F');[['Orang tua',rel.parents],['Pasangan',rel.partners],['Anak',rel.children]].forEach((entry,j)=>{const x=M+5+j*59;pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(100,116,139);pdf.text(entry[0].toUpperCase(),x,y+7);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(15,23,42);pdf.text(pdf.splitTextToSize(entry[1].map(p=>p.name).join(', ')||'—',52),x,y+13)});y+=39;const astro=astrologyBookText(person);if(astro){pdf.setFillColor(245,243,255);pdf.roundedRect(M,y,W-M*2,17,3,3,'F');pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(109,40,217);pdf.text('ASTROLOGI DATA LAHIR',M+5,y+6);pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(astro,W-M*2-10),M+5,y+12);y+=23}if(person.biography){pdf.setFont('helvetica','bold');pdf.setTextColor(15,23,42);pdf.setFontSize(11);pdf.text('Biografi / Kisah Hidup',M,y);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(51,65,85);const maxLines=Math.max(1,Math.floor((footerY-y-12)/4.6));const lines=pdf.splitTextToSize(person.biography,W-M*2).slice(0,maxLines);pdf.text(lines,M,y+7);y+=7+lines.length*4.6}if(person.source&&y<footerY-18){pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(100,116,139);pdf.text('SUMBER INFORMASI',M,y+5);pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.text(pdf.splitTextToSize(person.source,W-M*2),M,y+10)}footer(i+3,totalPages)});
        pdf.save(`Buku_Keluarga_${new Date().toISOString().slice(0,10)}.pdf`);showToast('Buku keluarga PDF berhasil dibuat.');
      } catch(error) { console.error(error); showToast('Buku keluarga gagal dibuat: '+(error.message||'error'),true); }
    };

    function gedDate(dateOrYear){if(!dateOrYear)return'';if(/^\d{4}$/.test(String(dateOrYear)))return String(dateOrYear);const d=new Date(`${dateOrYear}T00:00:00`);if(isNaN(d))return String(dateOrYear);return `${d.getDate()} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]} ${d.getFullYear()}`;}
    window.exportGEDCOM=function(){const rows=flattenPeople(),idMap=new Map(rows.map((r,i)=>[r.person.id,`I${i+1}`]));let lines=['0 HEAD','1 SOUR SILSILAH-PRO','1 CHAR UTF-8','1 GEDC','2 VERS 5.5.1'];rows.forEach(({person})=>{const id=idMap.get(person.id);lines.push(`0 @${id}@ INDI`,`1 NAME ${person.name||'Tanpa Nama'}`);if(person.surname)lines.push(`2 SURN ${person.surname}`);lines.push(`1 SEX ${person.gender==='P'?'F':'M'}`);if(person.birthDate||person.birthYear){lines.push('1 BIRT',`2 DATE ${gedDate(person.birthDate||person.birthYear)}`);if(person.birthPlace)lines.push(`2 PLAC ${person.birthPlace}`)}if(person.deathDate||person.deathYear){lines.push('1 DEAT',`2 DATE ${gedDate(person.deathDate||person.deathYear)}`)}if(person.occupation)lines.push(`1 OCCU ${person.occupation}`);if(person.biography)lines.push(`1 NOTE ${person.biography.replace(/\n/g,' ')}`);if(person.familyNumber)lines.push(`1 REFN ${person.familyNumber}`)});let famSeq=1;const walk=node=>{(node.spouses||[]).forEach(sp=>{const fam=`F${famSeq++}`;lines.push(`0 @${fam}@ FAM`,node.gender==='P'?`1 WIFE @${idMap.get(node.id)}@`:`1 HUSB @${idMap.get(node.id)}@`,sp.gender==='P'?`1 WIFE @${idMap.get(sp.id)}@`:`1 HUSB @${idMap.get(sp.id)}@`);if(sp.marriageDate||node.marriageDate)lines.push('1 MARR',`2 DATE ${gedDate(sp.marriageDate||node.marriageDate)}`);(node.children||[]).filter(c=>!c.linkedSpouseId||c.linkedSpouseId===sp.id).forEach(c=>lines.push(`1 CHIL @${idMap.get(c.id)}@`));});(node.children||[]).forEach(walk)};walk(treeData);lines.push('0 TRLR');downloadTextFile('silsilah-keluarga.ged',lines.join('\r\n'),'text/plain');showToast('GEDCOM berhasil diekspor.');};
    function parseGedDate(value){const parts=String(value||'').trim().split(/\s+/);if(parts.length===1&&/^\d{4}$/.test(parts[0]))return{year:parts[0],date:''};if(parts.length>=3){const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};return{year:parts[2],date:`${parts[2]}-${String(months[parts[1].toUpperCase()]||1).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`}}return{year:'',date:''};}
    function importGEDCOMText(text){const lines=text.split(/\r?\n/),individuals={},families={};let current=null,section='';for(const raw of lines){const m=raw.match(/^(\d+)\s+(?:@([^@]+)@\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/);if(!m)continue;const level=Number(m[1]),xref=m[2],tag=m[3],value=m[4]||'';if(level===0&&tag==='INDI'){current=individuals[xref]={id:generateId(),name:'Tanpa Nama',gender:'L',spouses:[],children:[],isCollapsed:false};section='INDI';continue}if(level===0&&tag==='FAM'){current=families[xref]={children:[]};section='FAM';continue}if(section==='INDI'&&current){if(tag==='NAME')current.name=value.replace(/\//g,'').trim();else if(tag==='SEX')current.gender=value==='F'?'P':'L';else if(tag==='BIRT')current._event='birth';else if(tag==='DEAT')current._event='death';else if(tag==='DATE'){const d=parseGedDate(value);if(current._event==='birth'){current.birthDate=d.date;current.birthYear=d.year}else if(current._event==='death'){current.deathDate=d.date;current.deathYear=d.year}}else if(tag==='PLAC'&&current._event==='birth')current.birthPlace=value;else if(tag==='OCCU')current.occupation=value;else if(tag==='NOTE')current.biography=value;else if(tag==='REFN')current.familyNumber=value}else if(section==='FAM'&&current){const ref=(value.match(/@([^@]+)@/)||[])[1];if(tag==='HUSB')current.husb=ref;else if(tag==='WIFE')current.wife=ref;else if(tag==='CHIL'&&ref)current.children.push(ref);else if(tag==='MARR')current._event='marriage';else if(tag==='DATE'&&current._event==='marriage')current.marriageDate=parseGedDate(value).date}}const childRefs=new Set(Object.values(families).flatMap(f=>f.children));const rootRef=Object.keys(individuals).find(id=>!childRefs.has(id))||Object.keys(individuals)[0];const build=id=>{const base=deepClone(individuals[id]);if(!base)return null;const fam=Object.values(families).find(f=>f.husb===id||f.wife===id);if(fam){const spouseRef=fam.husb===id?fam.wife:fam.husb;if(spouseRef&&individuals[spouseRef])base.spouses=[{...deepClone(individuals[spouseRef]),marriageDate:fam.marriageDate||''}];base.children=fam.children.map(build).filter(Boolean);if(base.spouses[0])base.children.forEach(c=>c.linkedSpouseId=base.spouses[0].id)}return base};const root=build(rootRef);if(!root)throw new Error('Tidak ada individu');return root;}
    function bindGedcomInput(id){document.getElementById(id)?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const imported=importGEDCOMText(r.result);customConfirm('Impor GEDCOM','Pohon saat ini akan disimpan ke riwayat, lalu diganti dengan hasil impor GEDCOM.',async()=>{await recordHistory('Sebelum impor GEDCOM');treeData=imported;ensureFamilyNumbers();cameraInitialized=false;renderTree();simpanKeFirebase('Impor GEDCOM');showToast('GEDCOM berhasil diimpor.');});}catch(err){console.error(err);showToast('GEDCOM tidak dapat dibaca.',true)}};r.readAsText(file);e.target.value='';});}bindGedcomInput('gedcom-input');bindGedcomInput('gedcom-input-export');

    function downloadTextFile(name,content,type='text/plain'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
    async function flushOfflineQueue(){const raw=localStorage.getItem(OFFLINE_QUEUE_KEY);if(!raw||!navigator.onLine)return;try{const queued=JSON.parse(raw);treeData=queued.tree||treeData;appSettings={...initialAppSettings,...(queued.settings||{})};familyEvents=queued.familyEvents||familyEvents;await cloudRef.set(getCloudPayload());localStorage.removeItem(OFFLINE_QUEUE_KEY);persistLocalCache(false);if(queued.historyLabel)await recordHistory(queued.historyLabel);setSyncStatus('online','Perubahan offline tersinkron','Antrean selesai dikirim');showToast('Perubahan offline berhasil disinkronkan.');}catch(err){console.warn('Antrean offline belum terkirim',err)}}
    window.addEventListener('online',()=>setTimeout(flushOfflineQueue,500));
    document.addEventListener('keydown',e=>{if(document.getElementById('presentation-mode')?.classList.contains('hidden'))return;if(e.key==='ArrowRight')presentationNext();if(e.key==='ArrowLeft')presentationPrevious();if(e.key==='Escape')closePresentationMode();});


    const ASTROLOGY_INPUT_IDS = ['input-birthdate','input-birthyear','input-birthtime','input-birthtimezone','input-birthutcoffset','input-birthlatitude','input-birthlongitude','input-chinesezodiacbasis'];
    ASTROLOGY_INPUT_IDS.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener(element.tagName === 'SELECT' ? 'change' : 'input', () => {
        clearTimeout(element._astroTimer);
        element._astroTimer = setTimeout(() => window.previewAstrologyFromForm?.(), 120);
      });
    });

    // --- MULAI APLIKASI ---
    initApp();
  