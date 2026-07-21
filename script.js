
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
    const APP_VERSION = '4.2.0';
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

    function getZodiac(birthDate) {
        if (!birthDate) return '';
        const [y, mStr, dStr] = birthDate.split('-');
        if (!mStr || !dStr) return '';
        const m = parseInt(mStr);
        const d = parseInt(dStr);
        if ((m == 3 && d >= 21) || (m == 4 && d <= 19)) return 'Aries';
        if ((m == 4 && d >= 20) || (m == 5 && d <= 20)) return 'Taurus';
        if ((m == 5 && d >= 21) || (m == 6 && d <= 20)) return 'Gemini';
        if ((m == 6 && d >= 21) || (m == 7 && d <= 22)) return 'Cancer';
        if ((m == 7 && d >= 23) || (m == 8 && d <= 22)) return 'Leo';
        if ((m == 8 && d >= 23) || (m == 9 && d <= 22)) return 'Virgo';
        if ((m == 9 && d >= 23) || (m == 10 && d <= 22)) return 'Libra';
        if ((m == 10 && d >= 23) || (m == 11 && d <= 21)) return 'Scorpio';
        if ((m == 11 && d >= 22) || (m == 12 && d <= 21)) return 'Sagitarius';
        if ((m == 12 && d >= 22) || (m == 1 && d <= 19)) return 'Capricorn';
        if ((m == 1 && d >= 20) || (m == 2 && d <= 18)) return 'Aquarius';
        if ((m == 2 && d >= 19) || (m == 3 && d <= 20)) return 'Pisces';
        return '';
    }

    function getShio(birthDate, birthYear) {
        let y = 0;
        let m = 0;
        let d = 0;
        
        if (birthDate) {
            const parts = birthDate.split('-');
            y = parseInt(parts[0]);
            m = parseInt(parts[1]);
            if (parts[2]) d = parseInt(parts[2]);
        } else if (birthYear) {
            y = parseInt(birthYear);
        }
        
        if (!y) return '';

        // Koreksi: Imlek rata-rata jatuh pada akhir Januari hingga pertengahan Februari.
        // Pendekatan: Jika lahir bulan Januari atau sebelum 4 Februari, ikut shio tahun sebelumnya.
        if (m === 1 || (m === 2 && d > 0 && d < 4)) {
            y -= 1;
        }
        
        const shioArr = ['Monyet', 'Ayam', 'Anjing', 'Babi', 'Tikus', 'Kerbau', 'Macan', 'Kelinci', 'Naga', 'Ular', 'Kuda', 'Kambing'];
        return shioArr[((y % 12) + 12) % 12];
    }

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

      let zodiac = getZodiac(person.birthDate);
      let shio = getShio(person.birthDate, person.birthYear);
      
      let astrologiHtml = '';
      if (zodiac || shio) {
         astrologiHtml += `<div class="flex flex-wrap justify-center gap-1 mt-1 w-full max-w-full">`;
         if (zodiac) astrologiHtml += `<span class="bg-indigo-100/70 border border-indigo-200 text-indigo-800 text-[8px] px-1.5 py-0.5 rounded shadow-sm" title="Zodiak"><i class="fa-solid fa-star mr-0.5"></i>${zodiac}</span>`;
         if (shio) astrologiHtml += `<span class="bg-rose-100/70 border border-rose-200 text-rose-800 text-[8px] px-1.5 py-0.5 rounded shadow-sm" title="Shio Tiongkok"><i class="fa-solid fa-dragon mr-0.5"></i>${shio}</span>`;
         astrologiHtml += `</div>`;
      }

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
      'deathdate', 'deathyear', 'linkedspouse', 'biography', 'surname', 'marriagedate', 'source', 'familynumber'
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
          
          if(key === 'childStatus' && !data[key]) el.value = 'kandung';
          else el.value = data[key] || '';
        }
      });
      document.getElementById('input-photo-file').value = ''; 
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
      
      document.getElementById('quick-actions-panel').style.display = isEditAllowed ? 'block' : 'none';
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

      modal.classList.remove('hidden');
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
           showToast("Penambahan pasangan pada profil ini belum didukung.", true);
           return;
       }
       
       const newId = generateId();
       const newPartner = { id: newId, name: 'Pasangan Baru', gender: 'P' };
       
       let targetId = selectedSpouseId || selectedNodeId;
       treeData = updateTreeData(treeData, targetId, node => ({
           ...node, spouses: [...(node.spouses || []), newPartner]
       }));
       
       simpanKeFirebase('Pasangan ditambahkan');
       renderTree();
       handleNodeClick(selectedNodeId, newId);
       showToast("Pasangan berhasil ditambahkan.");
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

    // --- FITUR EXPORT PNG & PDF TINGKAT LANJUT (ANTI BERANTAKAN) ---
    window.openExportModal = function() {
       document.getElementById('export-modal').classList.remove('hidden');
    };
    window.closeExportModal = function() {
       document.getElementById('export-modal').classList.add('hidden');
    };

    window.executeExport = function(format) {
      closeExportModal();
      
      if (typeof html2canvas === 'undefined') {
        showToast("Sistem render gagal dimuat.", true);
        return;
      }
      
      showToast('Menyiapkan dokumen ' + format.toUpperCase() + ' (Harap tunggu)...', false);
      
      const treeElement = document.querySelector('.family-tree');
      
      const printContainer = document.createElement('div');
      printContainer.style.position = 'absolute';
      printContainer.style.top = '0';
      printContainer.style.left = '0';
      printContainer.style.width = 'max-content';
      printContainer.style.height = 'max-content';
      printContainer.style.backgroundColor = '#f8fafc';
      printContainer.style.padding = '80px';
      printContainer.style.zIndex = '-9999';
      
      const clonedTree = treeElement.cloneNode(true);
      
      clonedTree.querySelectorAll('[data-html2canvas-ignore]').forEach(el => el.remove());
      
      clonedTree.querySelectorAll('*').forEach(el => {
          el.style.transition = 'none';
          el.style.animation = 'none';
      });

      printContainer.appendChild(clonedTree);
      document.body.appendChild(printContainer);
      
      setTimeout(() => {
        html2canvas(printContainer, {
          backgroundColor: '#f8fafc',
          scale: 2, 
          useCORS: true, 
          allowTaint: true,
          logging: false
        }).then(canvas => {
          document.body.removeChild(printContainer);
          
          if (format === 'png') {
              const link = document.createElement('a');
              link.download = `Silsilah_Keluarga_${new Date().getTime()}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
              showToast('Gambar PNG berhasil diunduh!');
          } else if (format === 'pdf') {
              if (typeof window.jspdf === 'undefined') {
                  showToast('Library PDF gagal dimuat', true);
                  return;
              }
              const { jsPDF } = window.jspdf;
              
              const pdfOrientation = canvas.width > canvas.height ? 'l' : 'p';
              let pdf = new jsPDF({
                  orientation: pdfOrientation,
                  unit: 'px',
                  format: [canvas.width, canvas.height]
              });
              
              pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, canvas.width, canvas.height);
              pdf.save(`Silsilah_Keluarga_${new Date().getTime()}.pdf`);
              showToast('Dokumen PDF berhasil diunduh!');
          }
        }).catch(err => {
          console.error("html2canvas error:", err);
          document.body.removeChild(printContainer);
          showToast('Gagal merender gambar.', true);
        });
      }, 800); 
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

    window.exportFamilyBookPDF=async function(){if(!window.jspdf)return showToast('Library PDF tidak tersedia.',true);showToast('Menyusun buku keluarga PDF...');const {jsPDF}=window.jspdf,pdf=new jsPDF({unit:'mm',format:'a4'}),rows=flattenPeople();const pageW=210,pageH=297,margin=16;const addWrapped=(text,x,y,maxWidth,size=10,line=5)=>{pdf.setFontSize(size);const lines=pdf.splitTextToSize(String(text||''),maxWidth);pdf.text(lines,x,y);return y+lines.length*line};pdf.setFillColor(9,17,31);pdf.rect(0,0,pageW,pageH,'F');pdf.setTextColor(255);pdf.setFontSize(28);pdf.text(appSettings.appTitle||'Silsilah Keluarga',margin,70);pdf.setFontSize(12);pdf.setTextColor(180,205,220);pdf.text('Buku Warisan Keluarga',margin,82);pdf.text(`${rows.length} anggota • ${calculateStats(treeData).maxDepth} generasi • dibuat ${new Date().toLocaleDateString('id-ID')}`,margin,94);for(let i=0;i<rows.length;i++){const p=rows[i].person;if(i||true)pdf.addPage();pdf.setTextColor(15,23,42);pdf.setFontSize(9);pdf.text(`${p.familyNumber||''} • Generasi ${rows[i].generation}`,margin,18);pdf.setFontSize(22);pdf.setFont(undefined,'bold');pdf.text(String(p.name||'Tanpa Nama'),margin,32);pdf.setFont(undefined,'normal');let y=45;if(p.photoUrl&&p.photoUrl.startsWith('data:image')){try{pdf.addImage(p.photoUrl,'JPEG',margin,y,45,55);y+=62}catch(_){}}const meta=[['Lahir',p.birthDate||p.birthYear],['Wafat',p.deathDate||p.deathYear],['Tempat lahir',p.birthPlace],['Pekerjaan',p.occupation],['Marga',p.surname],['Golongan darah',p.bloodType]].filter(x=>x[1]);meta.forEach(([k,v])=>{pdf.setFont(undefined,'bold');pdf.text(`${k}:`,margin,y);pdf.setFont(undefined,'normal');pdf.text(String(v),margin+34,y);y+=6});y+=4;if(p.biography){pdf.setFont(undefined,'bold');pdf.text('Biografi',margin,y);pdf.setFont(undefined,'normal');y=addWrapped(p.biography,margin,y+7,pageW-margin*2,10,5);}if(p.source){y+=5;pdf.setFont(undefined,'bold');pdf.text('Sumber',margin,y);pdf.setFont(undefined,'normal');addWrapped(p.source,margin,y+7,pageW-margin*2,9,4.5);}pdf.setDrawColor(226,232,240);pdf.line(margin,pageH-18,pageW-margin,pageH-18);pdf.setFontSize(8);pdf.setTextColor(100);pdf.text(`${i+1}/${rows.length}`,pageW-margin,pageH-11,{align:'right'});}pdf.save(`Buku_Keluarga_${new Date().toISOString().slice(0,10)}.pdf`);showToast('Buku keluarga PDF berhasil dibuat.');};

    function gedDate(dateOrYear){if(!dateOrYear)return'';if(/^\d{4}$/.test(String(dateOrYear)))return String(dateOrYear);const d=new Date(`${dateOrYear}T00:00:00`);if(isNaN(d))return String(dateOrYear);return `${d.getDate()} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]} ${d.getFullYear()}`;}
    window.exportGEDCOM=function(){const rows=flattenPeople(),idMap=new Map(rows.map((r,i)=>[r.person.id,`I${i+1}`]));let lines=['0 HEAD','1 SOUR SILSILAH-PRO','1 CHAR UTF-8','1 GEDC','2 VERS 5.5.1'];rows.forEach(({person})=>{const id=idMap.get(person.id);lines.push(`0 @${id}@ INDI`,`1 NAME ${person.name||'Tanpa Nama'}`);if(person.surname)lines.push(`2 SURN ${person.surname}`);lines.push(`1 SEX ${person.gender==='P'?'F':'M'}`);if(person.birthDate||person.birthYear){lines.push('1 BIRT',`2 DATE ${gedDate(person.birthDate||person.birthYear)}`);if(person.birthPlace)lines.push(`2 PLAC ${person.birthPlace}`)}if(person.deathDate||person.deathYear){lines.push('1 DEAT',`2 DATE ${gedDate(person.deathDate||person.deathYear)}`)}if(person.occupation)lines.push(`1 OCCU ${person.occupation}`);if(person.biography)lines.push(`1 NOTE ${person.biography.replace(/\n/g,' ')}`);if(person.familyNumber)lines.push(`1 REFN ${person.familyNumber}`)});let famSeq=1;const walk=node=>{(node.spouses||[]).forEach(sp=>{const fam=`F${famSeq++}`;lines.push(`0 @${fam}@ FAM`,node.gender==='P'?`1 WIFE @${idMap.get(node.id)}@`:`1 HUSB @${idMap.get(node.id)}@`,sp.gender==='P'?`1 WIFE @${idMap.get(sp.id)}@`:`1 HUSB @${idMap.get(sp.id)}@`);if(sp.marriageDate||node.marriageDate)lines.push('1 MARR',`2 DATE ${gedDate(sp.marriageDate||node.marriageDate)}`);(node.children||[]).filter(c=>!c.linkedSpouseId||c.linkedSpouseId===sp.id).forEach(c=>lines.push(`1 CHIL @${idMap.get(c.id)}@`));});(node.children||[]).forEach(walk)};walk(treeData);lines.push('0 TRLR');downloadTextFile('silsilah-keluarga.ged',lines.join('\r\n'),'text/plain');showToast('GEDCOM berhasil diekspor.');};
    function parseGedDate(value){const parts=String(value||'').trim().split(/\s+/);if(parts.length===1&&/^\d{4}$/.test(parts[0]))return{year:parts[0],date:''};if(parts.length>=3){const months={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12};return{year:parts[2],date:`${parts[2]}-${String(months[parts[1].toUpperCase()]||1).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`}}return{year:'',date:''};}
    function importGEDCOMText(text){const lines=text.split(/\r?\n/),individuals={},families={};let current=null,section='';for(const raw of lines){const m=raw.match(/^(\d+)\s+(?:@([^@]+)@\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/);if(!m)continue;const level=Number(m[1]),xref=m[2],tag=m[3],value=m[4]||'';if(level===0&&tag==='INDI'){current=individuals[xref]={id:generateId(),name:'Tanpa Nama',gender:'L',spouses:[],children:[],isCollapsed:false};section='INDI';continue}if(level===0&&tag==='FAM'){current=families[xref]={children:[]};section='FAM';continue}if(section==='INDI'&&current){if(tag==='NAME')current.name=value.replace(/\//g,'').trim();else if(tag==='SEX')current.gender=value==='F'?'P':'L';else if(tag==='BIRT')current._event='birth';else if(tag==='DEAT')current._event='death';else if(tag==='DATE'){const d=parseGedDate(value);if(current._event==='birth'){current.birthDate=d.date;current.birthYear=d.year}else if(current._event==='death'){current.deathDate=d.date;current.deathYear=d.year}}else if(tag==='PLAC'&&current._event==='birth')current.birthPlace=value;else if(tag==='OCCU')current.occupation=value;else if(tag==='NOTE')current.biography=value;else if(tag==='REFN')current.familyNumber=value}else if(section==='FAM'&&current){const ref=(value.match(/@([^@]+)@/)||[])[1];if(tag==='HUSB')current.husb=ref;else if(tag==='WIFE')current.wife=ref;else if(tag==='CHIL'&&ref)current.children.push(ref);else if(tag==='MARR')current._event='marriage';else if(tag==='DATE'&&current._event==='marriage')current.marriageDate=parseGedDate(value).date}}const childRefs=new Set(Object.values(families).flatMap(f=>f.children));const rootRef=Object.keys(individuals).find(id=>!childRefs.has(id))||Object.keys(individuals)[0];const build=id=>{const base=deepClone(individuals[id]);if(!base)return null;const fam=Object.values(families).find(f=>f.husb===id||f.wife===id);if(fam){const spouseRef=fam.husb===id?fam.wife:fam.husb;if(spouseRef&&individuals[spouseRef])base.spouses=[{...deepClone(individuals[spouseRef]),marriageDate:fam.marriageDate||''}];base.children=fam.children.map(build).filter(Boolean);if(base.spouses[0])base.children.forEach(c=>c.linkedSpouseId=base.spouses[0].id)}return base};const root=build(rootRef);if(!root)throw new Error('Tidak ada individu');return root;}
    function bindGedcomInput(id){document.getElementById(id)?.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const imported=importGEDCOMText(r.result);customConfirm('Impor GEDCOM','Pohon saat ini akan disimpan ke riwayat, lalu diganti dengan hasil impor GEDCOM.',async()=>{await recordHistory('Sebelum impor GEDCOM');treeData=imported;ensureFamilyNumbers();cameraInitialized=false;renderTree();simpanKeFirebase('Impor GEDCOM');showToast('GEDCOM berhasil diimpor.');});}catch(err){console.error(err);showToast('GEDCOM tidak dapat dibaca.',true)}};r.readAsText(file);e.target.value='';});}bindGedcomInput('gedcom-input');bindGedcomInput('gedcom-input-export');

    function downloadTextFile(name,content,type='text/plain'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
    async function flushOfflineQueue(){const raw=localStorage.getItem(OFFLINE_QUEUE_KEY);if(!raw||!navigator.onLine)return;try{const queued=JSON.parse(raw);treeData=queued.tree||treeData;appSettings={...initialAppSettings,...(queued.settings||{})};familyEvents=queued.familyEvents||familyEvents;await cloudRef.set(getCloudPayload());localStorage.removeItem(OFFLINE_QUEUE_KEY);persistLocalCache(false);if(queued.historyLabel)await recordHistory(queued.historyLabel);setSyncStatus('online','Perubahan offline tersinkron','Antrean selesai dikirim');showToast('Perubahan offline berhasil disinkronkan.');}catch(err){console.warn('Antrean offline belum terkirim',err)}}
    window.addEventListener('online',()=>setTimeout(flushOfflineQueue,500));
    document.addEventListener('keydown',e=>{if(document.getElementById('presentation-mode')?.classList.contains('hidden'))return;if(e.key==='ArrowRight')presentationNext();if(e.key==='ArrowLeft')presentationPrevious();if(e.key==='Escape')closePresentationMode();});


    // --- MULAI APLIKASI ---
    initApp();
  