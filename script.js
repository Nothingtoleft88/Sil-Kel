// ==========================================================================
// SILSILAH KELUARGA PRO MAX - CORE ENGINE & WORKSPACE LOGIC
// Archetype: Heritage Precision & Obsidian Canvas
// Guidelines: Antislop Core, UI/UX Pro Max, WCAG AA 4.5:1 Accessibility
// ==========================================================================

(() => {
  'use strict';

  // --- BRANCH & RELATION COLORS ---
  const branchColors = ['#0284c7', '#4f46e5', '#059669', '#d97706', '#db2777', '#7c3aed', '#e11d48'];

  // --- FIREBASE CONFIGURATION ---
  const firebaseConfig = {
    apiKey: "AIzaSyDZ-XP6H_yE-uZBupOgrLrjnHd1CbAEXjA",
    authDomain: "silsilah-keluarga-9524e.firebaseapp.com",
    databaseURL: "https://silsilah-keluarga-9524e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "silsilah-keluarga-9524e",
    storageBucket: "silsilah-keluarga-9524e.firebasestorage.app",
    messagingSenderId: "81827361473",
    appId: "1:81827361473:web:032ad4c2746ed6a08c7d50"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();
  const APP_VERSION = '5.0.0-promax';
  const DATA_PATH = 'silsilah_v2';
  const SESSION_KEY = 'silsilah_family_session_v5';
  const CACHE_KEY = 'silsilah_family_cache_v5';
  const OFFLINE_QUEUE_KEY = 'silsilah_offline_queue_v5';
  const HISTORY_PATH = 'silsilah_v2_history';

  const historyRef = db.ref(HISTORY_PATH);
  const cloudRef = db.ref(DATA_PATH);

  // --- APPLICATION STATE ---
  let treeData = null;
  let appSettings = null;
  let familyEvents = [];
  let editingAssets = { gallery: [], documents: [] };
  let currentActiveView = 'tree';
  let treeDensityMode = 'detailed'; // 'detailed' | 'compact'
  let activeInspectorPersonId = null;
  let highlightedLineage = { ancestors: new Set(), descendants: new Set() };
  let calendarCursor = new Date();
  let presentationPeople = [];
  let presentationIndex = 0;
  let saveTimer = null;
  let isCloudReady = false;
  let pendingHistoryLabel = '';

  // Camera State
  let scale = 1;
  let position = { x: 0, y: 0 };
  let cameraInitialized = false;
  let isRenderPending = false;
  const CAMERA_MIN_SCALE = 0.16;
  const CAMERA_MAX_SCALE = 2.8;

  // Selected for Editor / Relation Actions
  let selectedNodeId = null;
  let selectedSpouseId = null;
  let modalMode = 'edit'; // 'edit' | 'editSpouse'

  // --- INITIAL DEMO DATA ---
  const todayStr = new Date().toISOString().split('T')[0];
  const bdayYear = parseInt(todayStr.split('-')[0]) - 32;
  const demoBday = `${bdayYear}-${todayStr.split('-')[1]}-${todayStr.split('-')[2]}`;

  const initialTreeData = {
    id: 'root-1',
    familyNumber: '1.0',
    name: 'Budi Santoso',
    surname: 'Santoso',
    gender: 'L',
    birthYear: '1945',
    birthDate: '1945-08-17',
    deathYear: '',
    deathDate: '',
    notes: 'Kakek Buyut / Pendiri Trah',
    photoUrl: '',
    birthPlace: 'Surabaya',
    gmapUrl: 'https://maps.google.com/?q=-7.2504,112.7688',
    address: 'Jl. Merdeka No. 45, Surabaya',
    phone: '081234567890',
    bloodType: 'O',
    occupation: 'Pensiunan Guru',
    biography: 'Sosok teladan pendidik keluarga yang mencintai ilmu dan menjaga kerukunan antar generasi.',
    isCollapsed: false,
    spouses: [
      {
        id: 'spouse-1',
        familyNumber: '1.0-S1',
        name: 'Siti Aminah',
        gender: 'P',
        birthYear: '1948',
        birthDate: '1948-04-21',
        deathYear: '2015',
        deathDate: '2015-11-10',
        photoUrl: '',
        birthPlace: 'Malang',
        notes: 'Istri Pertama',
        gmapUrl: 'https://maps.google.com/?q=-7.9666,112.6326'
      }
    ],
    children: [
      {
        id: 'child-1',
        familyNumber: '1.1',
        name: 'Agus Santoso',
        surname: 'Santoso',
        gender: 'L',
        birthYear: '1968',
        birthDate: '1968-05-12',
        isCollapsed: false,
        birthPlace: 'Jakarta',
        occupation: 'Wiraswasta',
        gmapUrl: 'https://maps.google.com/?q=-6.2088,106.8456',
        spouses: [
          {
            id: 'spouse-2',
            familyNumber: '1.1-S1',
            name: 'Ratna Ningrum',
            gender: 'P',
            birthYear: '1970',
            notes: 'Pernikahan Pertama',
            birthPlace: 'Bandung',
            gmapUrl: 'https://maps.google.com/?q=-6.9175,107.6191'
          },
          {
            id: 'spouse-2b',
            familyNumber: '1.1-S2',
            name: 'Linda Kusuma',
            gender: 'P',
            birthYear: '1975',
            notes: 'Istri Kedua',
            birthPlace: 'Semarang',
            gmapUrl: 'https://maps.google.com/?q=-6.9667,110.4167'
          }
        ],
        children: [
          {
            id: 'grandchild-1',
            familyNumber: '1.1.1',
            name: 'Dewi Lestari',
            gender: 'P',
            birthDate: demoBday,
            occupation: 'Dokter Spesialis Anak',
            linkedSpouseId: 'spouse-2',
            spouses: [],
            children: [],
            birthPlace: 'Jakarta',
            gmapUrl: 'https://maps.google.com/?q=-6.2088,106.8456',
            biography: 'Lulusan Fakultas Kedokteran dan aktif dalam riset kesehatan anak nusantara.'
          },
          {
            id: 'grandchild-2',
            familyNumber: '1.1.2',
            name: 'Bima Saputra',
            gender: 'L',
            birthYear: '1996',
            birthDate: '1996-09-24',
            linkedSpouseId: 'spouse-2b',
            occupation: 'Software Engineer',
            notes: 'Anak dari pernikahan kedua',
            spouses: [],
            children: [],
            birthPlace: 'Tokyo',
            gmapUrl: 'https://maps.google.com/?q=35.6762,139.6503'
          }
        ]
      },
      {
        id: 'child-2',
        familyNumber: '1.2',
        name: 'Endang Rahayu',
        surname: 'Santoso',
        gender: 'P',
        birthYear: '1972',
        birthDate: '1972-10-30',
        isCollapsed: false,
        birthPlace: 'Surabaya',
        occupation: 'Akademisi & Dosen',
        spouses: [
          {
            id: 'spouse-3',
            familyNumber: '1.2-S1',
            name: 'Hadi Wijaya',
            gender: 'L',
            birthYear: '1970',
            birthPlace: 'Yogyakarta',
            occupation: 'Arsitek'
          }
        ],
        children: [
          {
            id: 'grandchild-3',
            familyNumber: '1.2.1',
            name: 'Rian Wijaya',
            gender: 'L',
            birthYear: '2001',
            birthDate: '2001-03-15',
            linkedSpouseId: 'spouse-3',
            spouses: [],
            children: [],
            birthPlace: 'Yogyakarta',
            occupation: 'Mahasiswa Arsitektur'
          }
        ]
      }
    ]
  };

  const initialAppSettings = {
    autoSave: true,
    accessCode: '12345',
    appTitle: 'Silsilah Keluarga',
    appSubtitle: 'Family Heritage Workspace',
    enableEdit: true,
    cardStyle: 'default',
    reminderDays: 7
  };

  // --- UTILITY FUNCTIONS ---
  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeURL(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (/^(https?:\/\/|mailto:|tel:|data:image\/)/i.test(trimmed)) return trimmed;
    return '';
  }

  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
  }

  function deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (_) {
      return null;
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  }

  function formatBookDate(val) {
    if (!val) return '';
    if (/^\d{4}$/.test(String(val))) return String(val);
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getAge(birthDate, deathDate) {
    if (!birthDate) return '';
    const b = new Date(birthDate);
    if (isNaN(b.getTime())) return '';
    const end = deathDate ? new Date(deathDate) : new Date();
    if (isNaN(end.getTime())) return '';
    let age = end.getFullYear() - b.getFullYear();
    const m = end.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < b.getDate())) age--;
    return age >= 0 ? age : '';
  }

  function checkBirthday(birthDate, deathDate) {
    if (!birthDate || deathDate) return false;
    const b = new Date(birthDate);
    if (isNaN(b.getTime())) return false;
    const now = new Date();
    return b.getDate() === now.getDate() && b.getMonth() === now.getMonth();
  }

  // --- TOAST & CONFIRM DIALOGS ---
  let toastTimer = null;
  window.showToast = function(message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.className = `toast-banner show ${isError ? 'error' : 'success'}`;
    const icon = toast.querySelector('i');
    if (icon) {
      icon.className = isError ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    }

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, isError ? 4200 : 3000);
  };

  window.customConfirm = function(title, message, onConfirm) {
    const modal = document.getElementById('custom-confirm-modal');
    if (!modal) {
      if (confirm(message)) onConfirm();
      return;
    }
    document.getElementById('custom-confirm-title').textContent = title;
    document.getElementById('custom-confirm-message').textContent = message;

    modal.classList.add('open');
    const okBtn = document.getElementById('custom-confirm-ok');
    const cancelBtn = document.getElementById('custom-confirm-cancel');

    const cleanUp = () => {
      modal.classList.remove('open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = cleanUp;
    okBtn.onclick = () => {
      cleanUp();
      onConfirm();
    };
  };

  // --- SYNC STATUS & PERSISTENCE ---
  function setSyncStatus(state, text, detail = '') {
    const dot = document.getElementById('sync-status-dot');
    const label = document.getElementById('sync-status-text');
    const time = document.getElementById('sync-status-time');
    if (dot) dot.className = `status-dot-indicator ${state}`;
    if (label) label.textContent = text;
    if (time) time.textContent = detail || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const loginStatus = document.querySelector('#login-connection-status .status-dot-indicator');
    if (loginStatus) loginStatus.className = `status-dot-indicator ${state}`;
  }

  function persistLocalCache(pending = false) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        tree: treeData,
        settings: appSettings,
        familyEvents,
        cachedAt: Date.now(),
        pending
      }));
    } catch (_) {}
  }

  function getCloudPayload() {
    return {
      tree: treeData,
      settings: appSettings,
      familyEvents,
      meta: {
        version: APP_VERSION,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      }
    };
  }

  function recordHistory(label = 'Pembaruan data') {
    if (!label || !treeData) return Promise.resolve();
    const snapshot = {
      label,
      tree: treeData,
      settings: appSettings,
      familyEvents,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      version: APP_VERSION
    };
    return historyRef.push(snapshot).then(() => historyRef.orderByChild('createdAt').once('value')).then((snap) => {
      const rows = [];
      snap.forEach(child => rows.push({ key: child.key, createdAt: child.val()?.createdAt || 0 }));
      rows.sort((a, b) => b.createdAt - a.createdAt).slice(40).forEach(row => historyRef.child(row.key).remove());
    }).catch(err => console.warn('History snapshot warning:', err));
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
          const label = pendingHistoryLabel;
          pendingHistoryLabel = '';
          if (label) await recordHistory(label);
          setSyncStatus('online', 'Tersinkron ke cloud', `Terakhir disimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
        })
        .catch((error) => {
          console.error('Firebase save error:', error);
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify({ ...payload, queuedAt: Date.now(), historyLabel: pendingHistoryLabel }));
          persistLocalCache(true);
          setSyncStatus('offline', 'Gagal menyimpan ke cloud', 'Perubahan tersimpan di antrean perangkat');
          showToast('Koneksi cloud terganggu. Perubahan aman tersimpan di perangkat lokal.', true);
        });
    }, 450);
  }

  window.refreshCloudData = function() {
    setSyncStatus('pending', 'Memuat ulang cloud...', 'Mohon tunggu');
    cloudRef.once('value').then(snapshot => {
      if (snapshot.exists()) {
        applyLoadedData(snapshot.val(), 'cloud');
      }
      setSyncStatus('online', 'Cloud diperbarui', `Diperbarui ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
      showToast('Data silsilah cloud berhasil diperbarui.');
    }).catch(error => {
      console.error(error);
      setSyncStatus('offline', 'Gagal memuat cloud', 'Periksa koneksi internet');
      showToast('Tidak dapat memuat ulang data cloud.', true);
    });
  };

  // --- DATA HIERARCHY HELPERS ---
  function flattenPeople(node = treeData, generation = 1, parent = null) {
    if (!node) return [];
    let list = [{ person: node, generation, parentId: parent ? parent.id : null, relation: 'utama' }];

    function pushParents(owner, ownerGen) {
      (owner.parents || []).forEach(spParent => {
        list.push({ person: spParent, generation: ownerGen - 1, parentId: owner.id, relation: 'mertua' });
        pushParents(spParent, ownerGen - 1);
      });
    }

    (node.spouses || []).forEach(spouse => {
      list.push({ person: spouse, generation, hostId: node.id, parentId: node.id, relation: 'pasangan' });
      pushParents(spouse, generation);
      (spouse.spouses || []).forEach(secSpouse => {
        list.push({ person: secSpouse, generation, parentId: spouse.id, relation: 'pasangan-lain' });
        pushParents(secSpouse, generation);
      });
    });

    (node.children || []).forEach(child => {
      list = list.concat(flattenPeople(child, generation + 1, node));
    });

    return list;
  }

  function findNodeById(current, id) {
    if (!current || !id) return null;
    if (current.id === id) return current;

    function searchParents(parentsArr) {
      if (!parentsArr) return null;
      for (const p of parentsArr) {
        if (p.id === id) return p;
        const deeper = searchParents(p.parents);
        if (deeper) return deeper;
      }
      return null;
    }

    if (current.spouses) {
      for (const spouse of current.spouses) {
        if (spouse.id === id) return spouse;
        const foundInSpouseParents = searchParents(spouse.parents);
        if (foundInSpouseParents) return foundInSpouseParents;
        if (spouse.spouses) {
          for (const s of spouse.spouses) {
            if (s.id === id) return s;
            const foundInSecParents = searchParents(s.parents);
            if (foundInSecParents) return foundInSecParents;
          }
        }
      }
    }

    if (current.children) {
      for (const child of current.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  function findParent(current, childId) {
    if (!current || !current.children) return null;
    for (const child of current.children) {
      if (child.id === childId) return current;
      const found = findParent(child, childId);
      if (found) return found;
    }
    return null;
  }

  function ensureFamilyNumbers(node = treeData, prefix = '1') {
    if (!node) return;
    if (!node.familyNumber) node.familyNumber = prefix;
    (node.spouses || []).forEach((s, idx) => {
      if (!s.familyNumber) s.familyNumber = `${prefix}-S${idx + 1}`;
    });
    (node.children || []).forEach((child, idx) => {
      ensureFamilyNumbers(child, `${prefix}.${idx + 1}`);
    });
  }

  function calculateStats(root = treeData) {
    const rows = flattenPeople(root);
    let male = 0, female = 0, deceased = 0, maxDepth = 1;
    rows.forEach(({ person, generation }) => {
      if (person.gender === 'L') male++;
      else if (person.gender === 'P') female++;
      if (person.deathDate || person.deathYear) deceased++;
      if (generation > maxDepth) maxDepth = generation;
    });
    return {
      total: rows.length,
      male,
      female,
      deceased,
      living: rows.length - deceased,
      maxDepth
    };
  }

  function updateSidebarStats() {
    if (!treeData) return;
    const stats = calculateStats(treeData);
    const rows = flattenPeople(treeData);
    const currentMonth = new Date().getMonth();
    const birthdays = rows.filter(r => {
      if (!r.person.birthDate || r.person.deathDate) return false;
      const b = new Date(r.person.birthDate);
      return !isNaN(b.getTime()) && b.getMonth() === currentMonth;
    });

    // Data quality completeness calculation
    let totalScore = 0;
    rows.forEach(r => {
      let pScore = 20; // base
      if (r.person.birthDate || r.person.birthYear) pScore += 25;
      if (r.person.photoUrl) pScore += 20;
      if (r.person.birthPlace) pScore += 15;
      if (r.person.occupation || r.person.biography) pScore += 20;
      totalScore += pScore;
    });
    const avgScore = rows.length ? Math.round(totalScore / rows.length) : 100;

    const elTotal = document.getElementById('sidebar-stat-total');
    const elDepth = document.getElementById('sidebar-stat-depth');
    const elBday = document.getElementById('sidebar-stat-birthday');
    const elQuality = document.getElementById('sidebar-stat-quality');

    if (elTotal) elTotal.textContent = stats.total;
    if (elDepth) elDepth.textContent = stats.maxDepth;
    if (elBday) elBday.textContent = birthdays.length;
    if (elQuality) elQuality.textContent = avgScore;
  }

  // --- LINEAGE TRACING & HIGHLIGHTING ---
  function computeLineagePaths(targetId) {
    const ancestors = new Set();
    const descendants = new Set();
    if (!targetId || !treeData) return { ancestors, descendants };

    // Find ancestors upwards
    let currId = targetId;
    while (currId) {
      ancestors.add(currId);
      const parent = findParent(treeData, currId);
      currId = parent ? parent.id : null;
    }

    // Find descendants downwards
    const targetNode = findNodeById(treeData, targetId);
    if (targetNode) {
      const addDescendants = (node) => {
        descendants.add(node.id);
        (node.children || []).forEach(addDescendants);
      };
      (targetNode.children || []).forEach(addDescendants);
    }

    return { ancestors, descendants };
  }

  function applyLineageStyles() {
    document.querySelectorAll('.person-card-node').forEach(card => {
      const id = card.dataset.personId;
      card.classList.remove('selected-card', 'lineage-ancestor', 'lineage-descendant');
      if (id === activeInspectorPersonId) {
        card.classList.add('selected-card');
      } else if (highlightedLineage.ancestors.has(id)) {
        card.classList.add('lineage-ancestor');
      } else if (highlightedLineage.descendants.has(id)) {
        card.classList.add('lineage-descendant');
      }
    });
  }

  // --- TREE CARD RENDERING ---
  function buildPersonCard(person, isSpouse, hasChildren, isCollapsed, level, parentId, parentSpouses = null, spouseColorMap = {}) {
    const isMale = person.gender === 'L';
    const isDeceased = Boolean(person.deathDate || person.deathYear);
    const theme = appSettings?.cardStyle || 'default';

    const isBday = checkBirthday(person.birthDate, person.deathDate);
    const bdayIcon = isBday ? `<div class="birthday-indicator" title="Hari Ini Ulang Tahun!">🎂</div>` : '';

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
        spouseBadge = `<div class="spouse-tag-badge" style="background-color: ${assignedColor};" title="Anak dari: ${escapeHTML(spouse.name)}">Dari: ${escapeHTML(spouse.name.split(' ')[0])}</div>`;
      }
    }

    let extraIcons = '';
    if (person.phone) extraIcons += `<a href="tel:${sanitizeURL(person.phone)}" onclick="event.stopPropagation()" title="Telepon: ${escapeHTML(person.phone)}"><i class="fa-solid fa-phone"></i></a>`;
    if (person.gmapUrl) extraIcons += `<a href="${sanitizeURL(person.gmapUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Buka Google Maps"><i class="fa-solid fa-location-dot"></i></a>`;
    if (person.occupation) extraIcons += `<i class="fa-solid fa-briefcase" title="Profesi: ${escapeHTML(person.occupation)}"></i>`;
    if (person.biography) extraIcons += `<i class="fa-solid fa-book-open" style="color: #d97706;" title="Ada Biografi"></i>`;
    if (person.bloodType) extraIcons += `<span style="font-size: 10px; font-weight: 700; color: #dc2626;" title="Golongan Darah: ${escapeHTML(person.bloodType)}">${escapeHTML(person.bloodType)}</span>`;

    const avatarContent = person.photoUrl
      ? `<img src="${sanitizeURL(person.photoUrl)}" alt="${escapeHTML(person.name)}" crossorigin="anonymous" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDJDMi4xMyAyIDExLjIgMiAxMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bTAtMTRjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNC0xLjc5LTQtNC00em0wIDZjLTEuMSAwLTItLjktMi0yczktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6bTcgNGMtMS0xLTYuNjMtMy03LTNzLTYgMS43Ny03IDNsMSAxYzEuMjUtMS4yNyAzLjcyLTIgNi0yczQuNzUuNzMgNiAybDEtMXoiLz48L3N2Zz4='">`
      : `<i class="fa-solid fa-user"></i>`;

    const expandBtn = (!isSpouse && hasChildren) ? `
      <button onclick="event.stopPropagation(); toggleCollapse('${person.id}')" class="node-collapse-toggle" title="${isCollapsed ? 'Buka Cabang' : 'Tutup Cabang'}" data-html2canvas-ignore>
        <i class="fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'}"></i>
      </button>
    ` : '';

    const clickAction = isSpouse ? `handleCardClick('${parentId}', '${person.id}')` : `handleCardClick('${person.id}', null)`;

    return `
      <div class="relative flex flex-col items-center">
        <div onclick="${clickAction}"
             data-person-id="${escapeHTML(person.id || '')}"
             data-card-role="${isSpouse ? 'spouse' : 'primary'}"
             ${isSpouse && parentId ? `data-spouse-of="${escapeHTML(parentId)}"` : ''}
             class="person-card-node ${isDeceased ? 'is-deceased' : ''}">
          <div class="card-top-strip ${isMale ? 'male' : 'female'}"></div>
          <div class="card-content-body">
            <span class="card-gen-pill">Gen ${level}</span>
            <div class="card-avatar-wrap ${isMale ? 'male' : 'female'}">
              <div class="avatar-circle">
                ${avatarContent}
              </div>
              ${bdayIcon}
            </div>
            <h3 class="card-person-name" title="${escapeHTML(person.name)}">${escapeHTML(person.name || 'Tanpa Nama')}</h3>
            <div class="card-lifespan">
              <span>${escapeHTML(birthText)} - ${escapeHTML(deathText)}</span>
              <span class="age-label">${escapeHTML(ageText)}</span>
            </div>
            ${astrologiHtml}
            ${spouseBadge}
            ${extraIcons ? `<div class="extra-info-icons">${extraIcons}</div>` : ''}
          </div>
        </div>
        ${expandBtn}
      </div>
    `;
  }

  function buildNodeHTML(node, level = 1, parentSpouses = null, spouseColorMapContext = {}) {
    if (!node) return '';
    const hasChildren = node.children && node.children.length > 0;

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

    let html = `<li data-tree-node-id="${escapeHTML(node.id || '')}">
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="display: flex; align-items: center; justify-content: center; position: relative;">`;

    html += `<div style="position: relative; z-index: 10;">
      ${buildPersonCard(node, false, hasChildren, node.isCollapsed, level, null, parentSpouses, spouseColorMapContext)}
    </div>`;

    if (node.spouses && node.spouses.length > 0) {
      node.spouses.forEach(spouse => {
        const parentCount = (spouse.parents || []).length;
        const showUpwardPill = activePerspectiveMode === 'full';
        let upwardPillHtml = '';
        if (showUpwardPill) {
          if (parentCount > 0) {
            upwardPillHtml = `<button type="button" onclick="event.stopPropagation(); openUpwardLineage('${escapeHTML(spouse.id)}')" class="spouse-upward-pill has-parents" title="Buka jalur orang tua dan leluhur ${escapeHTML(spouse.name)} (Mode Jam Pasir)" data-html2canvas-ignore><i class="fa-solid fa-arrow-up"></i><span>Orang Tua (${parentCount})</span></button>`;
          } else {
            upwardPillHtml = `<button type="button" onclick="event.stopPropagation(); openUpwardLineage('${escapeHTML(spouse.id)}')" class="spouse-upward-pill add-parent admin-only-action" title="Tambah atau buka jalur orang tua ${escapeHTML(spouse.name)}" data-html2canvas-ignore><i class="fa-solid fa-arrow-up"></i><span>+ Orang Tua</span></button>`;
          }
        }

        html += `<div style="display: flex; align-items: center; position: relative; margin-left: 28px;">`;
        html += `<div style="position: relative; z-index: 10; display: flex; align-items: center;">`;
        html += `<div class="spouse-card-stack">${upwardPillHtml}${buildPersonCard(spouse, true, false, false, level, node.id, null, {})}</div>`;

        if (spouse.spouses && spouse.spouses.length > 0) {
          spouse.spouses.forEach(secSpouse => {
            html += `<div style="display: flex; align-items: center; position: relative; margin-left: 28px;">`;
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
      html += `<ul data-children-of="${escapeHTML(node.id || '')}">`;
      node.children.forEach(child => {
        html += buildNodeHTML(child, level + 1, node.spouses, currentSpouseColorMap);
      });
      html += `</ul>`;
    }

    html += `</li>`;
    return html;
  }

  // --- SVG RELATIONSHIP CONNECTOR ENGINE ---
  const SVG_NS = 'http://www.w3.org/2000/svg';
  let connectorFrame = 0;

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  }

  function getLocalCardRect(el, rootRect, sX, sY) {
    const r = el.getBoundingClientRect();
    return {
      left: (r.left - rootRect.left) / sX,
      top: (r.top - rootRect.top) / sY,
      right: (r.right - rootRect.left) / sX,
      bottom: (r.bottom - rootRect.top) / sY,
      width: r.width / sX,
      height: r.height / sY,
      centerX: ((r.left + r.right) / 2 - rootRect.left) / sX,
      centerY: ((r.top + r.bottom) / 2 - rootRect.top) / sY
    };
  }

  function generateRoundedPath(points, radius = 10) {
    if (!points || points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const d1x = curr.x - prev.x;
      const d1y = curr.y - prev.y;
      const len1 = Math.hypot(d1x, d1y);

      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;
      const len2 = Math.hypot(d2x, d2y);

      const r = Math.min(radius, len1 / 2, len2 / 2);

      if (r <= 0 || len1 === 0 || len2 === 0) {
        d += ` L ${curr.x} ${curr.y}`;
        continue;
      }

      const startX = Math.round(curr.x - (d1x / len1) * r);
      const startY = Math.round(curr.y - (d1y / len1) * r);
      const endX = Math.round(curr.x + (d2x / len2) * r);
      const endY = Math.round(curr.y + (d2y / len2) * r);

      d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y} ${endX} ${endY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  function drawUnionLink(svg, rectA, rectB, color, isHighlighted = false) {
    const leftRect = rectA.centerX <= rectB.centerX ? rectA : rectB;
    const rightRect = rectA.centerX <= rectB.centerX ? rectB : rectA;
    const y = Math.round((leftRect.centerY + rightRect.centerY) / 2);
    const startX = Math.round(leftRect.right);
    const endX = Math.round(rightRect.left);
    if (endX <= startX) return null;

    const midX = Math.round((startX + endX) / 2);
    const activeColor = isHighlighted ? '#0284c7' : (color || '#94a3b8');
    const activeWidth = isHighlighted ? 3.5 : 2.5;

    // Halo underlay
    const halo = createSvgEl('path', {
      d: `M ${startX} ${y} L ${endX} ${y}`,
      fill: 'none',
      stroke: 'var(--bg-canvas, #f8fafc)',
      'stroke-width': activeWidth + 4.5,
      'stroke-linecap': 'round',
      class: 'connector-halo'
    });
    svg.appendChild(halo);

    // Horizontal bridge
    const path = createSvgEl('path', {
      d: `M ${startX} ${y} L ${endX} ${y}`,
      fill: 'none',
      stroke: activeColor,
      'stroke-width': activeWidth,
      'stroke-linecap': 'round'
    });
    if (isHighlighted) path.classList.add('lineage-highlight');
    svg.appendChild(path);

    // Heart union badge
    const circle = createSvgEl('circle', {
      cx: midX,
      cy: y,
      r: 10,
      fill: 'var(--bg-surface, #ffffff)',
      stroke: isHighlighted ? '#0284c7' : (color || '#e11d48'),
      'stroke-width': isHighlighted ? 2 : 1.5
    });
    svg.appendChild(circle);

    const text = createSvgEl('text', {
      x: midX,
      y: y + 3.5,
      'text-anchor': 'middle',
      'font-size': 9,
      fill: '#e11d48',
      'user-select': 'none'
    });
    text.textContent = '❤';
    svg.appendChild(text);

    return {
      x: midX,
      y,
      clearanceY: Math.round(Math.max(leftRect.bottom, rightRect.bottom) + 8),
      color,
      isUnion: true
    };
  }

  function drawChildrenBranch(svg, source, childRects, isHighlighted = false) {
    if (!childRects || !childRects.length) return;
    const sorted = [...childRects].sort((a, b) => a.centerX - b.centerX);
    const minChildTop = Math.round(Math.min(...sorted.map(r => r.top)));
    const stemStartY = source.isUnion ? source.y + 10 : source.y;

    const startClearanceY = source.clearanceY ? Math.max(stemStartY + 4, source.clearanceY) : stemStartY + 8;
    let railY = Math.round((startClearanceY + minChildTop) / 2);
    if (railY < stemStartY + 14) railY = stemStartY + 14;
    if (railY > minChildTop - 14) railY = minChildTop - 14;

    const strokeColor = isHighlighted ? '#0284c7' : (source.color || '#94a3b8');
    const strokeWidth = isHighlighted ? 3.5 : 2.5;
    const haloWidth = strokeWidth + 4;

    function appendPath(d) {
      if (!d) return;
      const halo = createSvgEl('path', {
        d,
        fill: 'none',
        stroke: 'var(--bg-canvas, #f8fafc)',
        'stroke-width': haloWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        class: 'connector-halo'
      });
      svg.appendChild(halo);

      const main = createSvgEl('path', {
        d,
        fill: 'none',
        stroke: strokeColor,
        'stroke-width': strokeWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      });
      if (isHighlighted) main.classList.add('lineage-highlight');
      svg.appendChild(main);
    }

    if (sorted.length === 1) {
      const child = sorted[0];
      const cX = Math.round(child.centerX);
      const cY = Math.round(child.top - 2);
      if (Math.abs(cX - source.x) < 4) {
        appendPath(`M ${source.x} ${stemStartY} L ${cX} ${cY}`);
      } else {
        const d = generateRoundedPath([
          { x: source.x, y: stemStartY },
          { x: source.x, y: railY },
          { x: cX, y: railY },
          { x: cX, y: cY }
        ], 12);
        appendPath(d);
      }
      return;
    }

    const minChildX = Math.round(sorted[0].centerX);
    const maxChildX = Math.round(sorted[sorted.length - 1].centerX);

    if (minChildX <= source.x && source.x <= maxChildX) {
      appendPath(`M ${source.x} ${stemStartY} L ${source.x} ${railY}`);

      if (source.x > minChildX) {
        appendPath(generateRoundedPath([
          { x: source.x, y: railY },
          { x: minChildX, y: railY },
          { x: minChildX, y: Math.round(sorted[0].top - 2) }
        ], 12));
      } else {
        appendPath(`M ${minChildX} ${railY} L ${minChildX} ${Math.round(sorted[0].top - 2)}`);
      }

      if (source.x < maxChildX) {
        appendPath(generateRoundedPath([
          { x: source.x, y: railY },
          { x: maxChildX, y: railY },
          { x: maxChildX, y: Math.round(sorted[sorted.length - 1].top - 2) }
        ], 12));
      } else {
        appendPath(`M ${maxChildX} ${railY} L ${maxChildX} ${Math.round(sorted[sorted.length - 1].top - 2)}`);
      }

      for (let i = 1; i < sorted.length - 1; i++) {
        const cX = Math.round(sorted[i].centerX);
        const cY = Math.round(sorted[i].top - 2);
        appendPath(`M ${cX} ${railY} L ${cX} ${cY}`);
      }

      const dot = createSvgEl('circle', {
        cx: source.x,
        cy: railY,
        r: 2.5,
        fill: strokeColor
      });
      svg.appendChild(dot);
    } else if (source.x < minChildX) {
      appendPath(generateRoundedPath([
        { x: source.x, y: stemStartY },
        { x: source.x, y: railY },
        { x: maxChildX, y: railY },
        { x: maxChildX, y: Math.round(sorted[sorted.length - 1].top - 2) }
      ], 12));
      for (let i = 0; i < sorted.length - 1; i++) {
        const cX = Math.round(sorted[i].centerX);
        const cY = Math.round(sorted[i].top - 2);
        appendPath(`M ${cX} ${railY} L ${cX} ${cY}`);
      }
    } else {
      appendPath(generateRoundedPath([
        { x: source.x, y: stemStartY },
        { x: source.x, y: railY },
        { x: minChildX, y: railY },
        { x: minChildX, y: Math.round(sorted[0].top - 2) }
      ], 12));
      for (let i = 1; i < sorted.length; i++) {
        const cX = Math.round(sorted[i].centerX);
        const cY = Math.round(sorted[i].top - 2);
        appendPath(`M ${cX} ${railY} L ${cX} ${cY}`);
      }
    }
  }

  function drawTreeConnectors() {
    const familyTree = document.querySelector('.family-tree-surface');
    const svg = document.getElementById('tree-connectors');
    if (!familyTree || !svg || !treeData) return;

    // Reset SVG dimensions BEFORE measuring surface so stale Full-tree size never inflates Pedigree/Hourglass scrollWidth
    svg.setAttribute('width', 0);
    svg.setAttribute('height', 0);
    svg.replaceChildren();

    const w = Math.max(familyTree.scrollWidth, familyTree.offsetWidth, 1);
    const h = Math.max(familyTree.scrollHeight, familyTree.offsetHeight, 1);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const rootRect = familyTree.getBoundingClientRect();
    const sX = rootRect.width && familyTree.offsetWidth ? rootRect.width / familyTree.offsetWidth : (scale || 1);
    const sY = rootRect.height && familyTree.offsetHeight ? rootRect.height / familyTree.offsetHeight : sX;

    if (activePerspectiveMode === 'pedigree' || activePerspectiveMode === 'hourglass') {
      drawPedigreeConnectors(svg, familyTree, rootRect, sX, sY);
    }

    if (activePerspectiveMode === 'full' || activePerspectiveMode === 'hourglass') {
      const cardScope = (activePerspectiveMode === 'hourglass')
        ? (familyTree.querySelector('.hourglass-descendants-section') || familyTree)
        : familyTree;

      const primaryCards = new Map();
      const spouseCards = new Map();

      cardScope.querySelectorAll('[data-person-id][data-card-role]').forEach(card => {
        const id = card.dataset.personId;
        if (!id) return;
        const rect = getLocalCardRect(card, rootRect, sX, sY);
        if (card.dataset.cardRole === 'spouse') {
          spouseCards.set(id, { element: card, rect, spouseOf: card.dataset.spouseOf || '' });
        } else {
          primaryCards.set(id, { element: card, rect });
        }
      });

      const isLit = (id) => {
        const sid = String(id || '');
        return highlightedLineage.ancestors.has(sid) || highlightedLineage.descendants.has(sid);
      };

      function walkTree(node) {
        if (!node) return;
        const primaryEntry = primaryCards.get(String(node.id));
        if (!primaryEntry) return;

        const primaryRect = primaryEntry.rect;
        const unions = new Map();

        // Draw unions across the marital row linking adjacent cards
        let prevCardRect = primaryRect;
        let prevCardLit = isLit(node.id);
        (node.spouses || []).forEach((spouse, idx) => {
          const spouseEntry = spouseCards.get(String(spouse.id));
          if (!spouseEntry) return;
          const color = branchColors[idx % branchColors.length];
          const currLit = isLit(spouse.id);
          const unionLit = (prevCardLit || isLit(node.id)) && currLit;
          const union = drawUnionLink(svg, prevCardRect, spouseEntry.rect, color, unionLit);
          if (union) unions.set(String(spouse.id), union);
          prevCardRect = spouseEntry.rect;
          prevCardLit = currLit;

          // Secondary spouses of spouse (if any)
          if (spouse.spouses && spouse.spouses.length > 0) {
            let prevSecRect = spouseEntry.rect;
            spouse.spouses.forEach((secSpouse, sIdx) => {
              const secEntry = spouseCards.get(String(secSpouse.id));
              if (!secEntry) return;
              const secColor = branchColors[(idx + sIdx + 1) % branchColors.length];
              const secUnion = drawUnionLink(svg, prevSecRect, secEntry.rect, secColor, currLit && isLit(secSpouse.id));
              if (secUnion) unions.set(String(secSpouse.id), secUnion);
              prevSecRect = secEntry.rect;
            });
          }

          // Connect spouse parents (if present)
          if (spouse.parents && spouse.parents.length > 0) {
            const parentRects = spouse.parents
              .map(p => primaryCards.get(String(p.id))?.rect)
              .filter(Boolean);
            if (parentRects.length === 2) {
              const pUnion = drawUnionLink(svg, parentRects[0], parentRects[1], '#94a3b8');
              if (pUnion) {
                const spouseDropD = `M ${pUnion.x} ${pUnion.y + 10} L ${Math.round(spouseEntry.rect.centerX)} ${Math.round(spouseEntry.rect.top - 2)}`;
                const halo = createSvgEl('path', {
                  d: spouseDropD,
                  fill: 'none',
                  stroke: 'var(--bg-canvas, #f8fafc)',
                  'stroke-width': 6.5,
                  'stroke-linecap': 'round',
                  class: 'connector-halo'
                });
                svg.appendChild(halo);
                const pDrop = createSvgEl('path', {
                  d: spouseDropD,
                  fill: 'none',
                  stroke: '#94a3b8',
                  'stroke-width': 2.5,
                  'stroke-linecap': 'round'
                });
                svg.appendChild(pDrop);
              }
            } else if (parentRects.length === 1) {
              const p0 = parentRects[0];
              const spouseDropD = `M ${Math.round(p0.centerX)} ${Math.round(p0.bottom)} L ${Math.round(spouseEntry.rect.centerX)} ${Math.round(spouseEntry.rect.top - 2)}`;
              const halo = createSvgEl('path', {
                d: spouseDropD,
                fill: 'none',
                stroke: 'var(--bg-canvas, #f8fafc)',
                'stroke-width': 6.5,
                'stroke-linecap': 'round',
                class: 'connector-halo'
              });
              svg.appendChild(halo);
              const pDrop = createSvgEl('path', {
                d: spouseDropD,
                fill: 'none',
                stroke: '#94a3b8',
                'stroke-width': 2.5,
                'stroke-linecap': 'round'
              });
              svg.appendChild(pDrop);
            }
          }
        });

        const renderedChildren = (node.children || []).filter(c => primaryCards.has(String(c.id)));
        if (renderedChildren.length) {
          const groups = new Map();
          const directSpouseIds = (node.spouses || []).map(s => String(s.id)).filter(id => unions.has(id));

          renderedChildren.forEach(child => {
            let key = child.linkedSpouseId ? String(child.linkedSpouseId) : '';
            if (!unions.has(key)) key = directSpouseIds.length === 1 ? directSpouseIds[0] : '__primary__';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ id: String(child.id), rect: primaryCards.get(String(child.id)).rect });
          });

          groups.forEach((items, key) => {
            const source = key === '__primary__'
              ? { x: Math.round(primaryRect.centerX), y: Math.round(primaryRect.bottom), clearanceY: Math.round(primaryRect.bottom + 8), color: '#94a3b8', isUnion: false }
              : unions.get(key);
            if (source) {
              const parentOrSpouseLit = isLit(node.id) || (key !== '__primary__' && isLit(key));
              const childLit = items.some(it => isLit(it.id));
              const isPathActive = (parentOrSpouseLit && childLit) || isLit(node.id);
              drawChildrenBranch(svg, source, items.map(it => it.rect), isPathActive);
            }
          });
        }

        (node.children || []).forEach(walkTree);
      }

      const rootTree = activePerspectiveMode === 'hourglass' ? activeHourglassDescendantTree : treeData;
      walkTree(rootTree);
    }

    updateMinimap();
  }

  function drawPedigreeConnectors(svg, familyTree, rootRect, sX, sY) {
    familyTree.querySelectorAll('.pedigree-parents-row[data-parents-of]').forEach(row => {
      const childId = row.dataset.parentsOf;
      if (!childId) return;

      const branchContainer = row.parentElement;
      let childCardEl = branchContainer?.querySelector(`:scope > .pedigree-card-slot [data-person-id="${childId}"]`)
        || branchContainer?.querySelector(`:scope > .perspective-focal-wrapper [data-person-id="${childId}"]`);

      if (!childCardEl) {
        const descSection = familyTree.querySelector('.hourglass-descendants-section');
        if (descSection) {
          childCardEl = descSection.querySelector(`[data-person-id="${childId}"][data-focal-card="true"]`)
            || descSection.querySelector(`[data-person-id="${childId}"]`);
        }
      }
      if (!childCardEl) return;

      const childRect = getLocalCardRect(childCardEl, rootRect, sX, sY);
      const parentCardEls = Array.from(
        row.querySelectorAll(':scope > .pedigree-couple-unit > .pedigree-branch > .pedigree-card-slot [data-person-id]')
      );
      if (!parentCardEls.length) return;

      const parentRects = parentCardEls.map(el => getLocalCardRect(el, rootRect, sX, sY));

      if (parentRects.length >= 2) {
        const union = drawUnionLink(svg, parentRects[0], parentRects[1], '#0284c7');
        if (union) {
          drawChildrenBranch(svg, union, [childRect], false);
        }
      } else {
        const p0 = parentRects[0];
        const source = {
          x: Math.round(p0.centerX),
          y: Math.round(p0.bottom),
          clearanceY: Math.round(p0.bottom + 8),
          color: '#64748b',
          isUnion: false
        };
        drawChildrenBranch(svg, source, [childRect], false);
      }
    });
  }

  function scheduleTreeConnectorRender() {
    cancelAnimationFrame(connectorFrame);
    connectorFrame = requestAnimationFrame(() => requestAnimationFrame(drawTreeConnectors));
  }

  // --- TREE RENDERING MASTER ---
  function renderTree() {
    const container = document.getElementById('tree-container');
    const svg = document.getElementById('tree-connectors');
    if (!container || !treeData) return;

    if (svg) {
      svg.setAttribute('width', 0);
      svg.setAttribute('height', 0);
      svg.replaceChildren();
    }

    container.innerHTML = renderPerspectiveHTML();
    updateSidebarStats();
    applyLineageStyles();
    scheduleTreeConnectorRender();

    requestAnimationFrame(() => requestAnimationFrame(() => {
      drawTreeConnectors();
      if (!cameraInitialized) {
        fitTreeToViewport(false);
      }
    }));
  }

  // --- CANVAS CAMERA ENGINE ---
  function clampScale(val) {
    return Math.min(Math.max(val, CAMERA_MIN_SCALE), CAMERA_MAX_SCALE);
  }

  function getViewportPoint(clientX, clientY) {
    const mainArea = document.getElementById('view-tree');
    const r = mainArea.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function executeTransform() {
    const transformDiv = document.getElementById('tree-transform');
    if (!transformDiv) return;
    const tx = Math.round(position.x);
    const ty = Math.round(position.y);
    const sc = Number(scale.toFixed(4));
    transformDiv.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
    const zoomLevelEl = document.getElementById('zoom-level');
    if (zoomLevelEl) zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
    isRenderPending = false;
    updateMinimap();
  }

  function requestTransformUpdate(smooth = false) {
    const transformDiv = document.getElementById('tree-transform');
    if (!transformDiv) return;
    if (smooth) {
      transformDiv.classList.add('smooth-transform');
      setTimeout(() => {
        transformDiv.classList.remove('smooth-transform');
        drawTreeConnectors();
      }, 300);
    }
    if (!isRenderPending) {
      isRenderPending = true;
      requestAnimationFrame(executeTransform);
    }
  }

  function zoomAt(targetScale, focal, smooth = false) {
    const clamped = clampScale(targetScale);
    if (Math.abs(clamped - scale) < 0.001) return;
    const worldX = (focal.x - position.x) / scale;
    const worldY = (focal.y - position.y) / scale;
    scale = clamped;
    position.x = focal.x - worldX * scale;
    position.y = focal.y - worldY * scale;
    requestTransformUpdate(smooth);
  }

  window.adjustZoom = function(delta) {
    const mainArea = document.getElementById('view-tree');
    const focal = { x: mainArea.clientWidth / 2, y: mainArea.clientHeight / 2 };
    zoomAt(scale * (1 + delta), focal, true);
  };

  window.setZoom100 = function() {
    const mainArea = document.getElementById('view-tree');
    const focal = { x: mainArea.clientWidth / 2, y: mainArea.clientHeight / 2 };
    zoomAt(1, focal, true);
  };

  window.fitTreeToViewport = function(smooth = true) {
    const mainArea = document.getElementById('view-tree');
    const familyTree = document.querySelector('.family-tree-surface');
    const svg = document.getElementById('tree-connectors');
    if (!mainArea || !familyTree) return;

    const vW = mainArea.clientWidth;
    const vH = mainArea.clientHeight;
    if (vW <= 0 || vH <= 0) return;

    const treeListEl = document.getElementById('tree-container');
    const padOffsetX = 160;
    const padOffsetY = 240;
    const tW = treeListEl ? Math.max(treeListEl.scrollWidth + padOffsetX, familyTree.offsetWidth || 1) : (familyTree.scrollWidth || familyTree.offsetWidth || 1);
    const tH = treeListEl ? Math.max(treeListEl.scrollHeight + padOffsetY, familyTree.offsetHeight || 1) : (familyTree.scrollHeight || familyTree.offsetHeight || 1);

    if (svg && (parseInt(svg.getAttribute('width') || '0', 10) > tW + 10)) {
      svg.setAttribute('width', tW);
      svg.setAttribute('height', tH);
    }

    const padX = 24;
    const padY = 24;

    const scaleX = (vW - padX * 2) / tW;
    const scaleY = (vH - padY * 2) / tH;
    scale = clampScale(Math.min(scaleX, scaleY, 1.0));

    position.x = Math.round((vW - tW * scale) / 2);
    position.y = Math.round((vH - tH * scale) / 2);

    cameraInitialized = true;
    requestTransformUpdate(smooth);
  };

  window.flyToPerson = function(personId, preserveHighlight = false) {
    if (currentActiveView !== 'tree') {
      switchWorkspaceView('tree');
    }

    const card = document.querySelector(`[data-person-id="${personId}"]`);
    const mainArea = document.getElementById('view-tree');
    const familyTree = document.querySelector('.family-tree-surface');
    if (!card && activePerspectiveMode !== 'full') {
      resetTreePerspective();
      setTimeout(() => flyToPerson(personId, preserveHighlight), 120);
      return;
    }
    if (!card || !mainArea || !familyTree) return;

    const rootRect = familyTree.getBoundingClientRect();
    const sX = rootRect.width && familyTree.offsetWidth ? rootRect.width / familyTree.offsetWidth : 1;
    const sY = rootRect.height && familyTree.offsetHeight ? rootRect.height / familyTree.offsetHeight : sX;

    const rect = getLocalCardRect(card, rootRect, sX, sY);
    const vW = mainArea.clientWidth;
    const vH = mainArea.clientHeight;

    scale = Math.max(scale, 0.85);
    position.x = Math.round(vW / 2 - rect.centerX * scale);
    position.y = Math.round(vH / 2 - rect.centerY * scale);

    requestTransformUpdate(true);
    if (!preserveHighlight) {
      highlightPerson(personId);
    } else {
      activeInspectorPersonId = personId;
    }
  };

  function highlightPerson(personId) {
    activeInspectorPersonId = personId;
    highlightedLineage = computeLineagePaths(personId);
    applyLineageStyles();
    scheduleTreeConnectorRender();
  }

  // --- POINTER & GESTURE INTERACTION ---
  function initCanvasGestures() {
    const mainArea = document.getElementById('view-tree');
    if (!mainArea) return;

    mainArea.addEventListener('wheel', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      e.preventDefault();
      const focal = getViewportPoint(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0018);
      zoomAt(scale * factor, focal, false);
    }, { passive: false });

    const activePointers = new Map();
    let panStart = null;
    let pinchStart = null;
    let suppressClick = false;

    function isInteractive(el) {
      return Boolean(el.closest('button, a, input, select, .person-card-node, [data-no-pan]'));
    }

    mainArea.addEventListener('pointerdown', (e) => {
      const interactive = isInteractive(e.target);
      if (interactive && e.pointerType !== 'touch') return;

      const pt = getViewportPoint(e.clientX, e.clientY);
      activePointers.set(e.pointerId, pt);

      if (activePointers.size === 1) {
        if (interactive) return;
        try { mainArea.setPointerCapture(e.pointerId); } catch (_) {}
        panStart = {
          pointerId: e.pointerId,
          startPt: pt,
          startPos: { ...position }
        };
        mainArea.classList.add('cursor-grabbing');
      } else if (activePointers.size === 2) {
        suppressClick = true;
        const pts = [...activePointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        pinchStart = {
          startDist: Math.max(dist, 1),
          startScale: scale,
          worldAnchor: { x: (mid.x - position.x) / scale, y: (mid.y - position.y) / scale }
        };
        panStart = null;
        mainArea.classList.add('cursor-grabbing');
      }
    });

    mainArea.addEventListener('pointermove', (e) => {
      if (!activePointers.has(e.pointerId)) return;
      const pt = getViewportPoint(e.clientX, e.clientY);
      activePointers.set(e.pointerId, pt);

      if (activePointers.size >= 2 && pinchStart) {
        const pts = [...activePointers.values()].slice(0, 2);
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        scale = clampScale(pinchStart.startScale * (dist / pinchStart.startDist));
        position.x = mid.x - pinchStart.worldAnchor.x * scale;
        position.y = mid.y - pinchStart.worldAnchor.y * scale;
        suppressClick = true;
        requestTransformUpdate(false);
      } else if (activePointers.size === 1 && panStart && panStart.pointerId === e.pointerId) {
        position.x = panStart.startPos.x + (pt.x - panStart.startPt.x);
        position.y = panStart.startPos.y + (pt.y - panStart.startPt.y);
        requestTransformUpdate(false);
      }
    });

    const endPointer = (e) => {
      activePointers.delete(e.pointerId);
      try { mainArea.releasePointerCapture(e.pointerId); } catch (_) {}
      if (activePointers.size === 0) {
        panStart = null;
        pinchStart = null;
        mainArea.classList.remove('cursor-grabbing');
      }
    };

    mainArea.addEventListener('pointerup', endPointer);
    mainArea.addEventListener('pointercancel', endPointer);

    mainArea.addEventListener('click', (e) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);

    mainArea.addEventListener('dblclick', (e) => {
      if (isInteractive(e.target)) return;
      fitTreeToViewport(true);
    });

    // Click / Drag Radar Minimap to Pan Viewport
    const minimapBox = document.getElementById('minimap-canvas-box');
    if (minimapBox) {
      let miniDragging = false;
      const panFromMinimap = (evt) => {
        const rect = minimapBox.getBoundingClientRect();
        const familyTree = document.querySelector('.family-tree-surface');
        if (!rect.width || !familyTree) return;
        const tW = familyTree.scrollWidth || 1;
        const tH = familyTree.scrollHeight || 1;
        const mScale = Math.min(rect.width / tW, rect.height / tH) * 0.92;
        const offX = (rect.width - tW * mScale) / 2;
        const offY = (rect.height - tH * mScale) / 2;
        const localX = evt.clientX - rect.left;
        const localY = evt.clientY - rect.top;
        const worldX = (localX - offX) / mScale;
        const worldY = (localY - offY) / mScale;
        position.x = Math.round(mainArea.clientWidth / 2 - worldX * scale);
        position.y = Math.round(mainArea.clientHeight / 2 - worldY * scale);
        requestTransformUpdate(false);
      };
      minimapBox.addEventListener('pointerdown', (evt) => {
        miniDragging = true;
        try { minimapBox.setPointerCapture(evt.pointerId); } catch (_) {}
        panFromMinimap(evt);
      });
      minimapBox.addEventListener('pointermove', (evt) => {
        if (miniDragging) panFromMinimap(evt);
      });
      const stopMini = (evt) => {
        miniDragging = false;
        try { minimapBox.releasePointerCapture(evt.pointerId); } catch (_) {}
      };
      minimapBox.addEventListener('pointerup', stopMini);
      minimapBox.addEventListener('pointercancel', stopMini);
    }
  }

  // --- RADAR MINIMAP ENGINE ---
  function updateMinimap() {
    const minimap = document.getElementById('canvas-minimap');
    if (!minimap || minimap.classList.contains('hidden')) return;

    const canvas = document.getElementById('minimap-canvas');
    const box = document.getElementById('minimap-canvas-box');
    const frame = document.getElementById('minimap-viewport-frame');
    const mainArea = document.getElementById('view-tree');
    const familyTree = document.querySelector('.family-tree-surface');
    if (!canvas || !box || !frame || !mainArea || !familyTree) return;

    const bW = box.clientWidth;
    const bH = box.clientHeight;
    if (bW <= 0 || bH <= 0) return;

    canvas.width = bW;
    canvas.height = bH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, bW, bH);

    const tW = familyTree.scrollWidth || 1;
    const tH = familyTree.scrollHeight || 1;
    const mScale = Math.min(bW / tW, bH / tH) * 0.92;
    const offX = (bW - tW * mScale) / 2;
    const offY = (bH - tH * mScale) / 2;

    // Draw miniature nodes
    const rootRect = familyTree.getBoundingClientRect();
    const sX = rootRect.width && familyTree.offsetWidth ? rootRect.width / familyTree.offsetWidth : 1;
    const sY = rootRect.height && familyTree.offsetHeight ? rootRect.height / familyTree.offsetHeight : sX;

    familyTree.querySelectorAll('.person-card-node').forEach(card => {
      const rect = getLocalCardRect(card, rootRect, sX, sY);
      const isSelected = card.dataset.personId === activeInspectorPersonId;
      ctx.fillStyle = isSelected ? '#0284c7' : '#cbd5e1';
      ctx.fillRect(offX + rect.left * mScale, offY + rect.top * mScale, Math.max(3, rect.width * mScale), Math.max(3, rect.height * mScale));
    });

    // Draw Viewport Frame
    const vW = mainArea.clientWidth;
    const vH = mainArea.clientHeight;

    const frameLeft = offX + (-position.x / scale) * mScale;
    const frameTop = offY + (-position.y / scale) * mScale;
    const frameWidth = (vW / scale) * mScale;
    const frameHeight = (vH / scale) * mScale;

    frame.style.left = `${Math.max(0, frameLeft)}px`;
    frame.style.top = `${Math.max(0, frameTop)}px`;
    frame.style.width = `${Math.min(bW, frameWidth)}px`;
    frame.style.height = `${Math.min(bH, frameHeight)}px`;
  }

  window.toggleMinimap = function(force) {
    const minimap = document.getElementById('canvas-minimap');
    if (!minimap) return;
    const shouldShow = typeof force === 'boolean' ? force : minimap.classList.contains('hidden');
    minimap.classList.toggle('hidden', !shouldShow);
    if (shouldShow) updateMinimap();
  };

  // --- PROFILE INSPECTOR DRAWER (SLIDE-OVER) ---
  window.handleCardClick = function(nodeId, spouseId) {
    const targetId = spouseId || nodeId;
    activeInspectorPersonId = targetId;
    selectedNodeId = nodeId;
    selectedSpouseId = spouseId;

    highlightPerson(targetId);
    openInspectorDrawer(targetId);
  };

  function openInspectorDrawer(personId) {
    const person = findNodeById(treeData, personId);
    if (!person) return;

    const drawer = document.getElementById('inspector-drawer');
    if (!drawer) return;

    // Avatar
    const avatarEl = document.getElementById('inspector-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = person.photoUrl
        ? `<img src="${sanitizeURL(person.photoUrl)}" alt="${escapeHTML(person.name)}">`
        : `<div class="avatar-circle"><i class="fa-solid fa-user"></i></div>`;
    }

    // Name & Generation
    const personRow = flattenPeople(treeData).find(r => r.person.id === personId);
    const gen = personRow ? personRow.generation : 1;
    document.getElementById('inspector-gen-badge').textContent = `Generasi ${gen} • ${person.familyNumber || ''}`;
    document.getElementById('inspector-name').textContent = person.name || 'Tanpa Nama';

    const birthStr = person.birthDate ? formatBookDate(person.birthDate) : (person.birthYear || '?');
    const deathStr = person.deathDate ? formatBookDate(person.deathDate) : (person.deathYear || 'Sekarang');
    const age = getAge(person.birthDate, person.deathDate);
    document.getElementById('inspector-lifespan').textContent = `${birthStr} - ${deathStr} ${age ? `(${age} thn)` : ''}`;

    // Lineage Quick Jump Chips
    renderInspectorRelationChips(person);

    // Render Tab 1: Bio
    renderInspectorBio(person);

    // Render Tab 2: Astro
    renderInspectorAstro(person);

    // Render Tab 3: Media
    renderInspectorMedia(person);

    // Edit & Upward Lineage permission
    const isEdit = Boolean(appSettings?.enableEdit) && !isGuestMode;
    const index = buildGenealogyIndex();
    const pid = String(personId);
    const isUpwardAnc = index.upwardAncestorSet.has(pid);
    const isSpouseOrHost = index.hostMap.has(pid);
    const isRootPerson = pid === String(treeData?.id);
    const canAddParent = isEdit && (isRootPerson || ((isSpouseOrHost || isUpwardAnc) && (person.parents?.length || 0) < 2));

    document.getElementById('inspector-btn-edit').style.display = isEdit ? 'inline-flex' : 'none';
    document.getElementById('inspector-btn-add-child').style.display = (isEdit && !isUpwardAnc) ? 'inline-flex' : 'none';
    document.getElementById('inspector-btn-add-spouse').style.display = (isEdit && !isUpwardAnc) ? 'inline-flex' : 'none';
    const addParentBtn = document.getElementById('inspector-btn-add-parent');
    if (addParentBtn) addParentBtn.style.display = canAddParent ? 'inline-flex' : 'none';
    document.getElementById('inspector-btn-delete').style.display = isEdit ? 'inline-flex' : 'none';

    drawer.classList.add('open');
  }

  window.closeInspectorDrawer = function() {
    const drawer = document.getElementById('inspector-drawer');
    if (drawer) drawer.classList.remove('open');
    activeInspectorPersonId = null;
    highlightedLineage = { ancestors: new Set(), descendants: new Set() };
    applyLineageStyles();
    scheduleTreeConnectorRender();
  };

  function renderInspectorRelationChips(person) {
    const chipsContainer = document.getElementById('inspector-relations-chips');
    if (!chipsContainer) return;

    const index = buildGenealogyIndex();
    const pid = String(person.id);
    const parentIds = Array.from(index.parentMap.get(pid) || []);
    const spouseIds = Array.from(index.spouseMap.get(pid) || []);
    const childIds = Array.from(index.childrenMap.get(pid) || []);

    let chipsHTML = '';

    const chipAction = (targetId) => {
      if (index.upwardAncestorSet.has(String(targetId))) {
        return `setTreePerspective('hourglass', '${escapeHTML(targetId)}'); openInspectorDrawer('${escapeHTML(targetId)}');`;
      }
      return `flyToPerson('${escapeHTML(targetId)}')`;
    };

    parentIds.forEach(parId => {
      const p = index.personMap.get(String(parId));
      if (!p) return;
      chipsHTML += `<button onclick="${chipAction(parId)}" class="relation-jump-chip">
        <i class="fa-solid fa-arrow-up"></i>
        <span>${escapeHTML((p.name || '').split(' ')[0])}</span>
        <span class="badge-role">Orang Tua</span>
      </button>`;
    });

    spouseIds.forEach(sId => {
      const s = index.personMap.get(String(sId));
      if (!s) return;
      chipsHTML += `<button onclick="${chipAction(sId)}" class="relation-jump-chip">
        <i class="fa-solid fa-heart" style="color: #e11d48;"></i>
        <span>${escapeHTML((s.name || '').split(' ')[0])}</span>
        <span class="badge-role">Pasangan</span>
      </button>`;
    });

    childIds.forEach(cId => {
      const c = index.personMap.get(String(cId));
      if (!c) return;
      chipsHTML += `<button onclick="${chipAction(cId)}" class="relation-jump-chip">
        <i class="fa-solid fa-child"></i>
        <span>${escapeHTML((c.name || '').split(' ')[0])}</span>
        <span class="badge-role">Anak</span>
      </button>`;
    });

    chipsContainer.innerHTML = chipsHTML || '<span style="font-size: 11px; color: var(--ink-muted);">Belum ada relasi terhubung langsung.</span>';
  }

  function renderInspectorBio(person) {
    const c = document.getElementById('inspector-bio-details');
    if (!c) return;

    const rows = [
      ['Nomor Anggota', person.familyNumber],
      ['Marga / Trah', person.surname],
      ['Gender', person.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
      ['Tempat Lahir', person.birthPlace],
      ['Pekerjaan', person.occupation],
      ['Gol. Darah', person.bloodType],
      ['No. Telepon', person.phone ? `<a href="tel:${sanitizeURL(person.phone)}" style="color: #0284c7;">${escapeHTML(person.phone)}</a>` : ''],
      ['Alamat', person.address],
      ['Lokasi Peta', person.gmapUrl ? `<a href="${sanitizeURL(person.gmapUrl)}" target="_blank" style="color: #0284c7; font-weight: 700;"><i class="fa-solid fa-map-location-dot"></i> Buka di Google Maps</a>` : ''],
      ['Sumber Data', person.source]
    ].filter(r => r[1]);

    let html = rows.map(([label, val]) => `
      <div class="detail-item-row">
        <span class="detail-item-label">${label}</span>
        <span class="detail-item-value">${val}</span>
      </div>
    `).join('');

    if (person.biography) {
      html += `
        <div style="margin-top: 16px; padding: 14px; background: var(--bg-surface-subtle); border-radius: 12px; border: 1px solid var(--border-subtle);">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-muted); display: block; margin-bottom: 6px;">Biografi & Kisah Hidup</span>
          <p style="font-size: 13px; line-height: 1.6; color: var(--ink-secondary);">${escapeHTML(person.biography)}</p>
        </div>
      `;
    }

    c.innerHTML = html;
  }

  function renderInspectorAstro(person) {
    const c = document.getElementById('inspector-astro-details');
    if (!c) return;
    const profile = getAstrologyProfile(person);

    let html = `
      <div style="background: linear-gradient(135deg, #fdf4ff 0%, #eef2ff 100%); padding: 16px; border-radius: 14px; border: 1px solid #c7d2fe; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-weight: 800; color: #4338ca; text-transform: uppercase;">Akurasi Perhitungan</span>
          <span class="astro-chip" style="font-size: 10px;">${escapeHTML(profile.level)}</span>
        </div>
        <div style="margin-top: 10px; height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
          <div style="height: 100%; width: ${profile.score}%; background: linear-gradient(90deg, #0284c7, #4f46e5); border-radius: inherit;"></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="padding: 12px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a;">
          <span style="font-size: 10px; font-weight: 800; color: #92400e; text-transform: uppercase;">Zodiak Matahari (Sun)</span>
          <h4 style="font-size: 15px; font-weight: 800; color: #78350f; margin-top: 2px;">${escapeHTML(profile.sun?.name || 'Tidak ada')}</h4>
          <p style="font-size: 11px; color: #b45309;">${escapeHTML(profile.sun?.degreeText || '')}</p>
        </div>

        <div style="padding: 12px; border-radius: 12px; background: #eef2ff; border: 1px solid #c7d2fe;">
          <span style="font-size: 10px; font-weight: 800; color: #3730a3; text-transform: uppercase;">Zodiak Bulan (Moon)</span>
          <h4 style="font-size: 15px; font-weight: 800; color: #1e1b4b; margin-top: 2px;">${escapeHTML(profile.moon?.name || 'Perlu jam lahir')}</h4>
          <p style="font-size: 11px; color: #4338ca;">${escapeHTML(profile.moon?.degreeText || '')}</p>
        </div>

        <div style="padding: 12px; border-radius: 12px; background: #ecfdf5; border: 1px solid #a7f3d0;">
          <span style="font-size: 10px; font-weight: 800; color: #065f46; text-transform: uppercase;">Ascendant (Rising)</span>
          <h4 style="font-size: 15px; font-weight: 800; color: #022c22; margin-top: 2px;">${escapeHTML(profile.ascendant?.name || 'Perlu jam + koordinat')}</h4>
        </div>

        <div style="padding: 12px; border-radius: 12px; background: #fdf2f8; border: 1px solid #fbcfe8;">
          <span style="font-size: 10px; font-weight: 800; color: #9d174d; text-transform: uppercase;">Shio & Elemen</span>
          <h4 style="font-size: 15px; font-weight: 800; color: #500724; margin-top: 2px;">${escapeHTML(profile.chinese?.name || 'Tidak ada')}</h4>
          <p style="font-size: 11px; color: #be185d;">${escapeHTML(profile.chinese?.element || '')} ${escapeHTML(profile.chinese?.polarity || '')}</p>
        </div>
      </div>
    `;

    c.innerHTML = html;
  }

  function renderInspectorMedia(person) {
    const c = document.getElementById('inspector-media-details');
    if (!c) return;

    const gallery = person.gallery || [];
    const docs = person.documents || [];

    let html = `<div style="margin-bottom: 20px;">
      <h4 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 10px;">Galeri Foto (${gallery.length})</h4>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
        ${gallery.map(g => `
          <a href="${g.dataUrl}" target="_blank" style="aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #e2e8f0; display: block;">
            <img src="${g.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">
          </a>
        `).join('') || '<p style="grid-column: 1/-1; font-size: 12px; color: var(--ink-subtle);">Belum ada foto dalam galeri profil ini.</p>'}
      </div>
    </div>

    <div>
      <h4 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 10px;">Dokumen Silsilah (${docs.length})</h4>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${docs.map(d => `
          <a href="${d.dataUrl}" download="${escapeHTML(d.name)}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); font-size: 12px;">
            <i class="fa-solid fa-file-pdf" style="font-size: 18px; color: #dc2626;"></i>
            <span style="font-weight: 600; color: var(--ink-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(d.name)}</span>
            <small style="color: var(--ink-muted);">${formatBytes(d.size)}</small>
          </a>
        `).join('') || '<p style="font-size: 12px; color: var(--ink-subtle);">Belum ada dokumen yang dilampirkan.</p>'}
      </div>
    </div>`;

    c.innerHTML = html;
  }

  window.switchInspectorTab = function(tabName) {
    ['bio', 'astro', 'media'].forEach(t => {
      document.getElementById(`tab-btn-${t}`)?.classList.toggle('active', t === tabName);
      document.getElementById(`tab-content-${t}`)?.classList.toggle('hidden', t !== tabName);
    });
  };

  window.openEditorFromInspector = function() {
    closeInspectorDrawer();
    openEditorModal(selectedNodeId, selectedSpouseId);
  };

  // --- DENSITY MODE SWITCHER ---
  window.setTreeDensity = function(mode) {
    treeDensityMode = mode;
    const viewTree = document.getElementById('view-tree');
    const btnDet = document.getElementById('density-detailed');
    const btnComp = document.getElementById('density-compact');

    if (btnDet) btnDet.classList.toggle('active', mode === 'detailed');
    if (btnComp) btnComp.classList.toggle('active', mode === 'compact');

    if (viewTree) {
      viewTree.classList.toggle('compact-mode', mode === 'compact');
    }
    scheduleTreeConnectorRender();
  };

  // --- GLOBAL SEARCH ENGINE ---
  function initGlobalSearch() {
    const input = document.getElementById('search-input');
    const flyout = document.getElementById('search-results-flyout');
    if (!input || !flyout) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        flyout.classList.add('hidden');
        return;
      }

      const rows = flattenPeople(treeData);
      const matches = rows.filter(r => {
        const name = (r.person.name || '').toLowerCase();
        const city = (r.person.birthPlace || '').toLowerCase();
        const surname = (r.person.surname || '').toLowerCase();
        const job = (r.person.occupation || '').toLowerCase();
        return name.includes(q) || city.includes(q) || surname.includes(q) || job.includes(q);
      }).slice(0, 8);

      if (!matches.length) {
        flyout.innerHTML = `<div style="padding: 12px; font-size: 12px; color: var(--ink-muted); text-align: center;">Tidak ditemukan anggota dengan kata kunci "${escapeHTML(q)}"</div>`;
        flyout.classList.remove('hidden');
        return;
      }

      flyout.innerHTML = matches.map(({ person, generation }) => `
        <div onclick="selectSearchResult('${person.id}')" class="search-result-item">
          <div class="search-avatar-mini">
            ${person.photoUrl ? `<img src="${sanitizeURL(person.photoUrl)}">` : `<i class="fa-solid fa-user"></i>`}
          </div>
          <div class="search-meta-text">
            <p class="search-person-name">${escapeHTML(person.name)}</p>
            <p class="search-person-sub">Gen ${generation} • ${escapeHTML(person.birthPlace || person.birthYear || '')}</p>
          </div>
          <i class="fa-solid fa-arrow-right-to-bracket search-jump-icon"></i>
        </div>
      `).join('');

      flyout.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-search-container')) {
        flyout.classList.add('hidden');
      }
    });

    // Keyboard shortcut '/' or 'Ctrl+K'
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  window.selectSearchResult = function(personId) {
    const flyout = document.getElementById('search-results-flyout');
    if (flyout) flyout.classList.add('hidden');
    const input = document.getElementById('search-input');
    if (input) input.value = '';

    flyToPerson(personId);
    openInspectorDrawer(personId);
  };

  // --- UNIFIED WORKSPACE VIEW SWITCHER ---
  window.switchWorkspaceView = function(viewId) {
    currentActiveView = viewId;
    closeInspectorDrawer();

    const viewTitles = {
      tree: 'Pohon Silsilah',
      fan: 'Bagan Kipas (Fan)',
      directory: 'Direktori Anggota',
      timeline: 'Timeline Keluarga',
      calendar: 'Kalender & Acara',
      archive: 'Arsip & Galeri',
      stats: 'Statistik Keluarga',
      map: 'Jejak Migrasi',
      quality: 'Kualitas Data',
      history: 'Riwayat Versi'
    };

    const titleEl = document.getElementById('current-view-title');
    if (titleEl) titleEl.textContent = viewTitles[viewId] || 'Ruang Kerja';

    // Sidebar active state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Show/hide view containers
    const allViews = ['tree', 'fan', 'directory', 'timeline', 'calendar', 'archive', 'stats', 'map', 'quality', 'history'];
    allViews.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle('hidden', v !== viewId);
    });

    if (window.innerWidth <= 1024) {
      toggleSidebar(false);
    }

    // Trigger sub-view renders
    if (viewId === 'tree') {
      scheduleTreeConnectorRender();
    } else if (viewId === 'fan') {
      renderFanChart();
    } else if (viewId === 'directory') {
      renderDirectory();
    } else if (viewId === 'timeline') {
      renderTimeline();
    } else if (viewId === 'calendar') {
      renderCalendar();
    } else if (viewId === 'archive') {
      renderArchive();
    } else if (viewId === 'stats') {
      renderStats();
    } else if (viewId === 'map') {
      renderMap();
    } else if (viewId === 'quality') {
      renderQuality();
    } else if (viewId === 'history') {
      renderHistory();
    }
  };

  // --- MODULE VIEW 2: DIRECTORY ---
  function renderDirectory() {
    const genSelect = document.getElementById('dir-filter-gen');
    if (genSelect) {
      const prevVal = genSelect.value;
      const stats = calculateStats(treeData);
      genSelect.innerHTML = '<option value="">Semua Generasi</option>';
      for (let i = 1; i <= stats.maxDepth; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Generasi ${i}`;
        genSelect.appendChild(opt);
      }
      if (prevVal && genSelect.querySelector(`option[value="${prevVal}"]`)) {
        genSelect.value = prevVal;
      }
    }
    filterDirectory();
  }

  window.filterDirectory = function() {
    const q = (document.getElementById('dir-search')?.value || '').toLowerCase().trim();
    const gen = document.getElementById('dir-filter-gen')?.value || '';
    const gender = document.getElementById('dir-filter-gender')?.value || '';
    const status = document.getElementById('dir-filter-status')?.value || '';
    const sort = document.getElementById('dir-sort')?.value || 'name-asc';

    let rows = flattenPeople(treeData);

    if (q) {
      rows = rows.filter(r => {
        const n = (r.person.name || '').toLowerCase();
        const p = (r.person.birthPlace || '').toLowerCase();
        const j = (r.person.occupation || '').toLowerCase();
        return n.includes(q) || p.includes(q) || j.includes(q);
      });
    }

    if (gen) rows = rows.filter(r => String(r.generation) === String(gen));
    if (gender) rows = rows.filter(r => r.person.gender === gender);
    if (status === 'alive') rows = rows.filter(r => !r.person.deathDate && !r.person.deathYear);
    if (status === 'deceased') rows = rows.filter(r => Boolean(r.person.deathDate || r.person.deathYear));

    // Sort
    rows.sort((a, b) => {
      if (sort === 'name-asc') return (a.person.name || '').localeCompare(b.person.name || '');
      if (sort === 'name-desc') return (b.person.name || '').localeCompare(a.person.name || '');
      if (sort === 'gen-asc') return a.generation - b.generation;
      if (sort === 'birth-asc') {
        const yA = Number((a.person.birthDate || '').slice(0, 4) || a.person.birthYear || 9999);
        const yB = Number((b.person.birthDate || '').slice(0, 4) || b.person.birthYear || 9999);
        return yA - yB;
      }
      return 0;
    });

    const container = document.getElementById('directory-grid-container');
    if (!container) return;

    if (!rows.length) {
      container.innerHTML = `<p style="grid-column: 1/-1; padding: 32px; text-align: center; color: var(--ink-muted); font-size: 13px;">Tidak ada anggota yang sesuai dengan kriteria filter.</p>`;
      return;
    }

    container.innerHTML = rows.map(({ person, generation }) => `
      <div onclick="flyToPerson('${person.id}'); openInspectorDrawer('${person.id}');" class="directory-member-card">
        <div style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background: #e0f2fe; color: #0284c7; display: grid; place-items: center; font-weight: 800; font-size: 16px; flex-shrink: 0;">
          ${person.photoUrl ? `<img src="${sanitizeURL(person.photoUrl)}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fa-solid fa-user"></i>`}
        </div>
        <div style="min-width: 0; flex: 1;">
          <h4 style="font-size: 14px; font-weight: 800; color: var(--ink-primary); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(person.name)}</h4>
          <p style="font-size: 11.5px; color: var(--ink-muted); margin-top: 2px;">
            Gen ${generation} • ${escapeHTML(person.occupation || person.birthPlace || 'Keluarga')}
          </p>
          <span style="font-size: 10.5px; color: var(--ink-subtle);">
            ${person.birthYear || (person.birthDate ? person.birthDate.slice(0, 4) : '?')} - ${person.deathYear || (person.deathDate ? person.deathDate.slice(0, 4) : 'Sekarang')}
          </span>
        </div>
        <i class="fa-solid fa-chevron-right" style="color: var(--ink-subtle); font-size: 11px;"></i>
      </div>
    `).join('');
  }

  // --- MODULE VIEW 3: TIMELINE ---
  function renderTimeline() {
    const container = document.getElementById('timeline-list-container');
    if (!container) return;

    const rows = flattenPeople(treeData);
    const events = [];

    rows.forEach(({ person, generation }) => {
      if (person.birthDate || person.birthYear) {
        const year = Number((person.birthDate || '').slice(0, 4) || person.birthYear);
        if (Number.isFinite(year)) {
          events.push({
            year,
            date: person.birthDate || String(person.birthYear),
            type: 'birth',
            title: `Kelahiran ${person.name}`,
            desc: `Lahir di ${person.birthPlace || 'wilayah keluarga'} (Generasi ${generation}).`,
            personId: person.id
          });
        }
      }
      if (person.deathDate || person.deathYear) {
        const year = Number((person.deathDate || '').slice(0, 4) || person.deathYear);
        if (Number.isFinite(year)) {
          events.push({
            year,
            date: person.deathDate || String(person.deathYear),
            type: 'death',
            title: `Wafat ${person.name}`,
            desc: `Meninggalkan kenangan dan warisan budi luhur bagi trah keluarga.`,
            personId: person.id
          });
        }
      }
    });

    events.sort((a, b) => a.year - b.year);

    container.innerHTML = `
      <div style="position: absolute; left: 18px; top: 0; bottom: 0; width: 2px; background: var(--border-subtle);"></div>
      <div style="display: flex; flex-direction: column; gap: 20px; padding-left: 48px;">
        ${events.map(ev => `
          <div style="position: relative;">
            <div style="position: absolute; left: -36px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: ${ev.type === 'birth' ? '#0284c7' : '#64748b'}; border: 3px solid #fff; box-shadow: var(--shadow-xs);"></div>
            <span style="font-size: 12px; font-weight: 800; color: ${ev.type === 'birth' ? '#0284c7' : '#64748b'}; font-family: 'JetBrains Mono', monospace;">${ev.year}</span>
            <div onclick="flyToPerson('${ev.personId}')" style="cursor: pointer; padding: 14px 16px; border-radius: 12px; background: #fff; border: 1px solid var(--border-subtle); margin-top: 4px; transition: transform 0.15s ease;" onmouseover="this.style.borderColor='#0284c7'" onmouseout="this.style.borderColor='var(--border-subtle)'">
              <h4 style="font-size: 14px; font-weight: 800; color: var(--ink-primary);">${escapeHTML(ev.title)}</h4>
              <p style="font-size: 12px; color: var(--ink-muted); margin-top: 2px;">${escapeHTML(ev.desc)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- MODULE VIEW 4: CALENDAR ---
  function renderCalendar() {
    const c = document.getElementById('calendar-workspace-content');
    if (!c) return;

    const y = calendarCursor.getFullYear();
    const m = calendarCursor.getMonth();
    const monthName = calendarCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // Collect birthdays this month
    const rows = flattenPeople(treeData);
    const bdays = rows.filter(r => {
      if (!r.person.birthDate || r.person.deathDate) return false;
      const b = new Date(r.person.birthDate);
      return !isNaN(b.getTime()) && b.getMonth() === m;
    });

    const mEvents = (familyEvents || []).filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return !isNaN(d.getTime()) && d.getMonth() === m && d.getFullYear() === y;
    });

    c.innerHTML = `
      <div class="module-card-container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <button onclick="moveCalendar(-1)" class="ui-btn"><i class="fa-solid fa-chevron-left"></i> Bulan Lalu</button>
          <h3 style="font-size: 18px; font-weight: 800; color: var(--ink-primary);">${monthName}</h3>
          <button onclick="moveCalendar(1)" class="ui-btn">Bulan Depan <i class="fa-solid fa-chevron-right"></i></button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="padding: 16px; border-radius: 14px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle);">
            <h4 style="font-size: 13px; font-weight: 800; color: #0284c7; margin-bottom: 12px;"><i class="fa-solid fa-cake-candles mr-2"></i> Ulang Tahun Bulan Ini (${bdays.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${bdays.map(r => `
                <div onclick="flyToPerson('${r.person.id}')" style="display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; background: #fff; border-radius: 9px; border: 1px solid var(--border-subtle); cursor: pointer;">
                  <span style="font-weight: 700; font-size: 13px;">${escapeHTML(r.person.name)}</span>
                  <span style="font-size: 11px; color: var(--accent-cyan); font-weight: 700;">Tgl ${new Date(r.person.birthDate).getDate()}</span>
                </div>
              `).join('') || '<p style="font-size: 12px; color: var(--ink-muted);">Tidak ada ulang tahun di bulan ini.</p>'}
            </div>
          </div>

          <div style="padding: 16px; border-radius: 14px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle);">
            <h4 style="font-size: 13px; font-weight: 800; color: var(--ink-secondary); margin-bottom: 12px;"><i class="fa-solid fa-calendar-check mr-2"></i> Agenda & Reuni (${mEvents.length})</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${mEvents.map(e => `
                <div style="padding: 9px 12px; background: #fff; border-radius: 9px; border: 1px solid var(--border-subtle);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 13px;">${escapeHTML(e.title)}</span>
                    <span style="font-size: 11px; color: var(--ink-muted);">${formatBookDate(e.date)}</span>
                  </div>
                  ${e.notes ? `<p style="font-size: 11px; color: var(--ink-secondary); margin-top: 3px;">${escapeHTML(e.notes)}</p>` : ''}
                </div>
              `).join('') || '<p style="font-size: 12px; color: var(--ink-muted);">Belum ada agenda keluarga khusus di bulan ini.</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.moveCalendar = function(delta) {
    calendarCursor.setMonth(calendarCursor.getMonth() + delta);
    renderCalendar();
  };

  // --- MODULE VIEW 5: ARCHIVE ---
  function renderArchive() {
    const c = document.getElementById('archive-workspace-content');
    if (!c) return;

    const rows = flattenPeople(treeData);
    const allPhotos = [];
    const allDocs = [];

    rows.forEach(({ person }) => {
      (person.gallery || []).forEach(g => allPhotos.push({ ...g, personName: person.name, personId: person.id }));
      (person.documents || []).forEach(d => allDocs.push({ ...d, personName: person.name, personId: person.id }));
    });

    c.innerHTML = `
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 14px;">Koleksi Foto Silsilah (${allPhotos.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px;">
          ${allPhotos.map(p => `
            <div onclick="flyToPerson('${p.personId}')" style="border-radius: 12px; overflow: hidden; background: #fff; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs); cursor: pointer;">
              <div style="height: 140px; background: #e2e8f0;">
                <img src="${p.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
              <div style="padding: 10px;">
                <p style="font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(p.name || 'Foto Kenangan')}</p>
                <small style="font-size: 10px; color: var(--ink-muted);">${escapeHTML(p.personName)}</small>
              </div>
            </div>
          `).join('') || '<p style="grid-column: 1/-1; color: var(--ink-muted); font-size: 13px;">Belum ada foto dalam galeri keluarga.</p>'}
        </div>
      </div>

      <div>
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 14px;">Dokumen Arsip & Bukti (${allDocs.length})</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px;">
          ${allDocs.map(d => `
            <a href="${d.dataUrl}" download="${escapeHTML(d.name)}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: #fff; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xs);">
              <i class="fa-solid fa-file-pdf" style="font-size: 24px; color: #dc2626;"></i>
              <div style="min-width: 0; flex: 1;">
                <p style="font-size: 12px; font-weight: 700; color: var(--ink-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(d.name)}</p>
                <small style="font-size: 10px; color: var(--ink-muted);">${escapeHTML(d.personName)} • ${formatBytes(d.size)}</small>
              </div>
            </a>
          `).join('') || '<p style="grid-column: 1/-1; color: var(--ink-muted); font-size: 13px;">Belum ada arsip dokumen yang disimpan.</p>'}
        </div>
      </div>
    `;
  }

  // --- MODULE VIEW 6: STATS ---
  function renderStats() {
    const c = document.getElementById('stats-workspace-content');
    if (!c) return;

    const stats = calculateStats(treeData);
    const rows = flattenPeople(treeData);

    // City distribution
    const cities = {};
    rows.forEach(r => {
      const city = (r.person.birthPlace || 'Tidak Dicatat').trim();
      cities[city] = (cities[city] || 0) + 1;
    });
    const sortedCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 8);

    c.innerHTML = `
      <div class="metric-summary-grid">
        <div class="metric-stat-box">
          <span class="number">${stats.total}</span>
          <span class="label">Total Anggota Keluarga</span>
        </div>
        <div class="metric-stat-box">
          <span class="number">${stats.maxDepth}</span>
          <span class="label">Kedalaman Generasi</span>
        </div>
        <div class="metric-stat-box">
          <span class="number">${stats.male} / ${stats.female}</span>
          <span class="label">Laki-laki / Perempuan</span>
        </div>
        <div class="metric-stat-box">
          <span class="number">${stats.living} / ${stats.deceased}</span>
          <span class="label">Masih Hidup / Telah Wafat</span>
        </div>
      </div>

      <div class="module-card-container">
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 16px;">Sebaran Kota Kelahiran Terbanyak</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${sortedCities.map(([city, count]) => `
            <div style="display: grid; grid-template-columns: 140px 1fr 40px; align-items: center; gap: 14px; font-size: 13px;">
              <span style="font-weight: 700; color: var(--ink-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(city)}</span>
              <div style="height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                <div style="height: 100%; border-radius: inherit; background: linear-gradient(90deg, #0284c7, #4f46e5); width: ${Math.max(6, (count / stats.total) * 100)}%;"></div>
              </div>
              <span style="font-weight: 800; text-align: right;">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- MODULE VIEW 7: LEAFLET MAP ---
  let leafletLoaded = false;
  let leafletMapInstance = null;
  let leafletMarkersLayer = null;

  async function renderMap() {
    const statusEl = document.getElementById('map-loading-status');
    const container = document.getElementById('map-container');
    if (!container) return;

    if (!leafletLoaded) {
      if (statusEl) statusEl.textContent = 'Memuat modul peta Leaflet...';
      try {
        await loadLeafletLibrary();
        leafletLoaded = true;
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Gagal memuat peta internet.';
        return;
      }
    }

    if (statusEl) statusEl.textContent = 'Menampilkan titik lokasi keluarga...';

    if (!leafletMapInstance) {
      leafletMapInstance = L.map('map-container').setView([-2.5, 118.0], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMapInstance);
      leafletMarkersLayer = L.layerGroup().addTo(leafletMapInstance);
    } else {
      leafletMapInstance.invalidateSize();
      if (leafletMarkersLayer) leafletMarkersLayer.clearLayers();
      else leafletMarkersLayer = L.layerGroup().addTo(leafletMapInstance);
    }

    // Geocode or parse locations
    const rows = flattenPeople(treeData);
    const bounds = [];

    rows.forEach(({ person }) => {
      let lat = Number(person.birthLatitude);
      let lng = Number(person.birthLongitude);

      if ((!lat || !lng) && person.gmapUrl) {
        const m = person.gmapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || person.gmapUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (m) {
          lat = Number(m[1]);
          lng = Number(m[2]);
        }
      }

      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
        bounds.push([lat, lng]);
        L.marker([lat, lng])
          .addTo(leafletMarkersLayer)
          .bindPopup(`
            <div style="font-family: 'Inter', sans-serif;">
              <b style="font-size: 13px;">${escapeHTML(person.name)}</b>
              <p style="font-size: 11px; color: #64748b; margin: 4px 0 0;">${escapeHTML(person.birthPlace || 'Lokasi')}</p>
            </div>
          `);
      }
    });

    if (bounds.length) {
      leafletMapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      if (statusEl) statusEl.textContent = `${bounds.length} titik lokasi berhasil dipetakan.`;
    } else {
      if (statusEl) statusEl.textContent = 'Belum ada data koordinat latitude/longitude untuk dipetakan.';
    }
  }

  function loadLeafletLibrary() {
    return new Promise((resolve, reject) => {
      if (window.L) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // --- MODULE VIEW 8: QUALITY AUDIT ---
  function renderQuality() {
    const c = document.getElementById('quality-workspace-content');
    if (!c) return;

    const rows = flattenPeople(treeData);
    const missingPhotos = rows.filter(r => !r.person.photoUrl);
    const missingDates = rows.filter(r => !r.person.birthDate && !r.person.birthYear);
    const missingPlaces = rows.filter(r => !r.person.birthPlace);
    const missingBio = rows.filter(r => !r.person.biography);

    c.innerHTML = `
      <div class="module-card-container">
        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 16px;">Pemeriksaan Kelengkapan Arsip</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div style="padding: 16px; border-radius: 12px; background: #fff1f2; border: 1px solid #fecdd3;">
            <h4 style="font-size: 13px; font-weight: 800; color: #be123c;">Tanpa Foto Profil (${missingPhotos.length})</h4>
            <div style="margin-top: 8px; font-size: 12px; color: #881337;">
              ${missingPhotos.slice(0, 6).map(r => `<span onclick="flyToPerson('${r.person.id}')" style="display: inline-block; cursor: pointer; text-decoration: underline; margin-right: 8px;">${escapeHTML(r.person.name)}</span>`).join('')}
            </div>
          </div>

          <div style="padding: 16px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a;">
            <h4 style="font-size: 13px; font-weight: 800; color: #92400e;">Tanggal Lahir Belum Lengkap (${missingDates.length})</h4>
            <div style="margin-top: 8px; font-size: 12px; color: #78350f;">
              ${missingDates.slice(0, 6).map(r => `<span onclick="flyToPerson('${r.person.id}')" style="display: inline-block; cursor: pointer; text-decoration: underline; margin-right: 8px;">${escapeHTML(r.person.name)}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- MODULE VIEW 9: HISTORY ---
  function renderHistory() {
    const c = document.getElementById('history-workspace-content');
    if (!c) return;
    c.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--ink-muted);">Memuat riwayat snapshot versi...</p>';

    historyRef.orderByChild('createdAt').limitToLast(20).once('value').then(snap => {
      const items = [];
      snap.forEach(child => {
        items.push({ key: child.key, ...child.val() });
      });
      items.reverse();

      if (!items.length) {
        c.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--ink-muted);">Belum ada riwayat snapshot tersimpan.</p>';
        return;
      }

      c.innerHTML = `
        <div class="module-card-container">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${items.map(item => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-radius: 12px; background: #fff; border: 1px solid var(--border-subtle);">
                <div>
                  <h4 style="font-size: 14px; font-weight: 800; color: var(--ink-primary);">${escapeHTML(item.label || 'Snapshot')}</h4>
                  <small style="font-size: 11px; color: var(--ink-muted);">${new Date(item.createdAt).toLocaleString('id-ID')}</small>
                </div>
                <button onclick="restoreHistorySnapshot('${item.key}')" class="ui-btn history-restore-btn admin-only-action" style="font-size: 12px;">
                  <i class="fa-solid fa-rotate-left"></i>
                  <span>Pulihkan</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
  }

  window.restoreHistorySnapshot = function(key) {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    customConfirm('Pulihkan Versi', 'Pohon silsilah saat ini akan diganti dengan snapshot ini.', () => {
      historyRef.child(key).once('value').then(snap => {
        const data = snap.val();
        if (data && data.tree) {
          treeData = data.tree;
          appSettings = { ...initialAppSettings, ...(data.settings || {}) };
          familyEvents = data.familyEvents || [];
          cameraInitialized = false;
          renderTree();
          simpanKeFirebase('Pemulihan riwayat versi');
          showToast('Data versi berhasil dipulihkan.');
        }
      });
    });
  };

  // --- PROFILE EDITOR MODAL ---
  const formFields = [
    'name', 'surname', 'notes', 'otherpartner', 'gender', 'familynumber',
    'birthdate', 'birthyear', 'birthplace', 'deathdate', 'deathyear', 'blood',
    'phone', 'occupation', 'address', 'gmap', 'biography', 'source',
    'birthtime', 'birthtimezone', 'birthutcoffset', 'chinesezodiacbasis', 'birthlatitude', 'birthlongitude'
  ];

  window.openEditorModal = function(nodeId, spouseId) {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    selectedNodeId = nodeId;
    selectedSpouseId = spouseId;
    modalMode = spouseId ? 'editSpouse' : 'edit';

    const targetId = spouseId || nodeId;
    const person = findNodeById(treeData, targetId) || {};

    // Fill form
    document.getElementById('input-name').value = person.name || '';
    document.getElementById('input-surname').value = person.surname || '';
    document.getElementById('input-notes').value = person.notes || '';
    document.getElementById('input-otherpartner').value = person.otherPartner || '';
    document.getElementById('input-gender').value = person.gender || 'L';
    document.getElementById('input-familynumber').value = person.familyNumber || '';
    document.getElementById('input-birthdate').value = person.birthDate || '';
    document.getElementById('input-birthyear').value = person.birthYear || '';
    document.getElementById('input-birthplace').value = person.birthPlace || '';
    document.getElementById('input-deathdate').value = person.deathDate || '';
    document.getElementById('input-deathyear').value = person.deathYear || '';
    document.getElementById('input-blood').value = person.bloodType || '';
    document.getElementById('input-phone').value = person.phone || '';
    document.getElementById('input-occupation').value = person.occupation || '';
    document.getElementById('input-address').value = person.address || '';
    document.getElementById('input-gmap').value = person.gmapUrl || '';
    document.getElementById('input-biography').value = person.biography || '';
    document.getElementById('input-source').value = person.source || '';
    document.getElementById('input-photo').value = person.photoUrl || '';

    // Astrology inputs
    document.getElementById('input-birthtime').value = person.birthTime || '';
    document.getElementById('input-birthtimezone').value = person.birthTimezone || 'Asia/Jakarta';
    document.getElementById('input-birthutcoffset').value = person.birthUtcOffset ?? 7;
    document.getElementById('input-chinesezodiacbasis').value = person.chineseZodiacBasis || 'cny';
    document.getElementById('input-birthlatitude').value = person.birthLatitude || '';
    document.getElementById('input-birthlongitude').value = person.birthLongitude || '';

    // Child relation selectors
    const containerChildRel = document.getElementById('container-childrelations');
    const directParent = (!spouseId && nodeId !== treeData.id) ? findParent(treeData, nodeId) : null;
    if (directParent) {
      populateSpouseDropdown(directParent);
      document.getElementById('input-linkedspouse').value = person.linkedSpouseId || '';
      document.getElementById('input-childstatus').value = person.childStatus || 'kandung';
      containerChildRel.classList.remove('hidden');
    } else {
      containerChildRel.classList.add('hidden');
    }

    editingAssets = {
      gallery: Array.isArray(person.gallery) ? JSON.parse(JSON.stringify(person.gallery)) : [],
      documents: Array.isArray(person.documents) ? JSON.parse(JSON.stringify(person.documents)) : []
    };
    renderEditorAssets();
    setEditTab('general');

    const modal = document.getElementById('editor-modal');
    if (modal) modal.classList.add('open');
  };

  window.closeEditorModal = function() {
    const modal = document.getElementById('editor-modal');
    if (modal) modal.classList.remove('open');
  };

  window.setEditTab = function(tabName) {
    ['general', 'lifespan', 'contact', 'astrology', 'assets'].forEach(t => {
      document.getElementById(`ed-tab-${t}`)?.classList.toggle('hidden', t !== tabName);
      const btn = document.getElementById(`ed-tab-btn-${t}`);
      if (btn) {
        btn.classList.toggle('ui-btn-primary', t === tabName);
      }
    });
  };

  function populateSpouseDropdown(parent) {
    const sel = document.getElementById('input-linkedspouse');
    if (!sel) return;
    sel.innerHTML = '<option value="">- Otomatis / Pasangan Utama -</option>';
    if (!parent || !parent.spouses) return;
    parent.spouses.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.notes || 'Pasangan'})`;
      sel.appendChild(opt);
    });
  }

  function renderEditorAssets() {
    const gal = document.getElementById('profile-gallery-list');
    const docs = document.getElementById('profile-document-list');

    if (gal) {
      gal.innerHTML = editingAssets.gallery.map((g, idx) => `
        <div style="position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #e2e8f0;">
          <img src="${g.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" onclick="removeEditorAsset('gallery', ${idx})" style="position: absolute; right: 4px; top: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; display: grid; place-items: center;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `).join('') || '<p style="grid-column: 1/-1; font-size: 12px; color: var(--ink-muted);">Belum ada foto.</p>';
    }

    if (docs) {
      docs.innerHTML = editingAssets.documents.map((d, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle);">
          <span style="font-size: 12px; font-weight: 600; color: var(--ink-primary);">${escapeHTML(d.name)}</span>
          <button type="button" onclick="removeEditorAsset('documents', ${idx})" style="color: #dc2626; font-size: 13px;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `).join('') || '<p style="font-size: 12px; color: var(--ink-muted);">Belum ada dokumen.</p>';
    }
  }

  window.removeEditorAsset = function(type, idx) {
    editingAssets[type].splice(idx, 1);
    renderEditorAssets();
  };

  // Upload handler in editor
  document.getElementById('input-photo-file')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      document.getElementById('input-photo').value = evt.target.result;
      showToast('Foto profil berhasil diunggah.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  document.getElementById('input-gallery-files')?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        editingAssets.gallery.push({ name: f.name, dataUrl: evt.target.result });
        renderEditorAssets();
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  });

  document.getElementById('input-document-files')?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        editingAssets.documents.push({ name: f.name, size: f.size, dataUrl: evt.target.result });
        renderEditorAssets();
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  });

  window.handleSave = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Perubahan tidak dapat disimpan.', true);
      return;
    }
    const targetId = selectedSpouseId || selectedNodeId;
    const person = findNodeById(treeData, targetId);
    if (!person) return;

    person.name = document.getElementById('input-name').value.trim();
    person.surname = document.getElementById('input-surname').value.trim();
    person.notes = document.getElementById('input-notes').value.trim();
    person.otherPartner = document.getElementById('input-otherpartner').value.trim();
    person.gender = document.getElementById('input-gender').value;
    person.birthDate = document.getElementById('input-birthdate').value;
    person.birthYear = document.getElementById('input-birthyear').value.trim();
    person.birthPlace = document.getElementById('input-birthplace').value.trim();
    person.deathDate = document.getElementById('input-deathdate').value;
    person.deathYear = document.getElementById('input-deathyear').value.trim();
    person.bloodType = document.getElementById('input-blood').value;
    person.phone = document.getElementById('input-phone').value.trim();
    person.occupation = document.getElementById('input-occupation').value.trim();
    person.address = document.getElementById('input-address').value.trim();
    person.gmapUrl = document.getElementById('input-gmap').value.trim();
    person.biography = document.getElementById('input-biography').value.trim();
    person.source = document.getElementById('input-source').value.trim();
    person.photoUrl = document.getElementById('input-photo').value.trim();

    // Astrology
    person.birthTime = document.getElementById('input-birthtime').value;
    person.birthTimezone = document.getElementById('input-birthtimezone').value.trim();
    person.birthUtcOffset = document.getElementById('input-birthutcoffset').value;
    person.chineseZodiacBasis = document.getElementById('input-chinesezodiacbasis').value;
    person.birthLatitude = document.getElementById('input-birthlatitude').value;
    person.birthLongitude = document.getElementById('input-birthlongitude').value;

    if (!selectedSpouseId && selectedNodeId !== treeData.id && findParent(treeData, selectedNodeId)) {
      person.linkedSpouseId = document.getElementById('input-linkedspouse').value;
      person.childStatus = document.getElementById('input-childstatus').value;
    }

    person.gallery = editingAssets.gallery;
    person.documents = editingAssets.documents;

    ensureFamilyNumbers();
    closeEditorModal();
    renderTree();
    simpanKeFirebase(`Perubahan profil ${person.name}`);
    showToast(`Data profil ${person.name} berhasil diperbarui.`);
  };

  // --- RELATION ACTION CREATORS ---
  window.actionAddChild = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    if (!selectedNodeId) return;
    const parent = findNodeById(treeData, selectedNodeId);
    if (!parent) return;

    const newChild = {
      id: generateId(),
      name: 'Anggota Baru',
      gender: 'L',
      spouses: [],
      children: [],
      isCollapsed: false,
      linkedSpouseId: (parent.spouses && parent.spouses.length === 1) ? parent.spouses[0].id : ''
    };

    if (!parent.children) parent.children = [];
    parent.children.push(newChild);
    parent.isCollapsed = false;

    ensureFamilyNumbers();
    renderTree();
    simpanKeFirebase(`Tambah anak untuk ${parent.name}`);
    showToast(`Anak baru berhasil ditambahkan.`);
    flyToPerson(newChild.id);
    openEditorModal(newChild.id, null);
  };

  window.actionAddPartner = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    if (!selectedNodeId) return;
    const person = findNodeById(treeData, selectedNodeId);
    if (!person) return;

    const newSpouse = {
      id: generateId(),
      name: 'Pasangan Baru',
      gender: person.gender === 'L' ? 'P' : 'L',
      notes: 'Pasangan'
    };

    if (!person.spouses) person.spouses = [];
    person.spouses.push(newSpouse);

    ensureFamilyNumbers();
    renderTree();
    simpanKeFirebase(`Tambah pasangan untuk ${person.name}`);
    showToast(`Pasangan berhasil ditambahkan.`);
    openEditorModal(selectedNodeId, newSpouse.id);
  };

  window.openUpwardLineage = function(personId) {
    const person = findNodeById(treeData, personId);
    if (!person) return;
    if ((person.parents && person.parents.length > 0) || isGuestMode) {
      setTreePerspective('hourglass', personId);
      return;
    }
    actionAddParent(personId);
  };

  window.actionAddParent = function(explicitTargetId = null) {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    const targetId = String(explicitTargetId || activeInspectorPersonId || selectedSpouseId || selectedNodeId || '');
    if (!targetId) return;
    const target = findNodeById(treeData, targetId);
    if (!target) return;

    // Case 1: Adding parent above root ancestor
    if (targetId === String(treeData.id)) {
      const newRoot = {
        id: generateId(),
        name: `Orang Tua ${(treeData.name || '').split(' ')[0]}`,
        gender: 'L',
        spouses: [],
        children: [treeData],
        isCollapsed: false
      };
      treeData = newRoot;
      ensureFamilyNumbers();
      closeInspectorDrawer();
      renderTree();
      simpanKeFirebase(`Tambah orang tua puncak untuk ${target.name}`);
      showToast('Orang tua puncak berhasil ditambahkan.');
      openEditorModal(newRoot.id, null);
      return;
    }

    // Case 2: Spouse / In-Law / Upward ancestor
    const index = buildGenealogyIndex();
    const isAllowed = index.hostMap.has(targetId) || index.upwardAncestorSet.has(targetId);
    if (!isAllowed) {
      showToast('Orang tua anggota ini sudah tercatat pada pohon utama.');
      return;
    }

    if (!Array.isArray(target.parents)) target.parents = [];
    if (target.parents.length >= 2) {
      showToast('Maksimal 2 orang tua (Ayah dan Ibu) sudah tercatat.');
      setTreePerspective('hourglass', targetId);
      return;
    }

    const firstGender = target.parents[0]?.gender;
    const gender = target.parents.length === 0 ? 'L' : (firstGender === 'L' ? 'P' : 'L');
    const prefix = gender === 'L' ? 'Ayah' : 'Ibu';
    const newParent = {
      id: generateId(),
      name: `${prefix} ${(target.name || '').split(' ')[0]}`,
      gender,
      notes: prefix,
      parents: []
    };
    target.parents.push(newParent);

    ensureFamilyNumbers();
    closeInspectorDrawer();
    simpanKeFirebase(`Tambah ${prefix} untuk ${target.name}`);

    if (activePerspectiveMode === 'full') {
      setTreePerspective('hourglass', targetId);
    } else {
      renderTree();
      requestAnimationFrame(() => requestAnimationFrame(() => fitTreeToViewport(true)));
    }

    showToast(`${prefix} untuk ${target.name} berhasil ditambahkan.`);
    openEditorModal(newParent.id, null);
  };

  window.handleDelete = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    const targetId = selectedSpouseId || selectedNodeId;
    if (!targetId) return;
    if (targetId === treeData.id) {
      showToast('Akar silsilah utama (root) tidak dapat dihapus.', true);
      return;
    }

    const targetPerson = findNodeById(treeData, targetId);
    const targetName = targetPerson ? targetPerson.name : 'anggota ini';

    customConfirm('Hapus Anggota', `Apakah Anda yakin ingin menghapus "${targetName}" beserta relasinya?`, () => {
      if (selectedSpouseId) {
        const primary = findNodeById(treeData, selectedNodeId);
        if (primary && primary.spouses) {
          primary.spouses = primary.spouses.filter(s => s.id !== selectedSpouseId);
        }
      } else {
        deleteNodeRecursive(treeData, selectedNodeId);
      }
      if (activePerspectiveRootId === targetId) {
        activePerspectiveMode = 'full';
        activePerspectiveRootId = null;
        document.getElementById('tree-focus-banner')?.classList.add('hidden');
        ['full', 'pedigree', 'hourglass'].forEach(m => {
          document.getElementById(`persp-${m}`)?.classList.toggle('active', m === 'full');
        });
      }
      closeInspectorDrawer();
      renderTree();
      simpanKeFirebase(`Hapus ${targetName}`);
      showToast(`"${targetName}" berhasil dihapus.`);
    });
  };

  function deleteNodeRecursive(current, idToDelete) {
    if (!current) return;
    function pruneParents(owner) {
      if (!owner || !Array.isArray(owner.parents)) return;
      owner.parents = owner.parents.filter(p => p.id !== idToDelete);
      owner.parents.forEach(pruneParents);
    }
    if (Array.isArray(current.spouses)) {
      current.spouses = current.spouses.filter(sp => sp.id !== idToDelete);
      current.spouses.forEach(sp => {
        pruneParents(sp);
        if (Array.isArray(sp.spouses)) {
          sp.spouses = sp.spouses.filter(ss => ss.id !== idToDelete);
          sp.spouses.forEach(pruneParents);
        }
      });
    }
    if (!current.children) return;
    current.children = current.children.filter(c => c.id !== idToDelete);
    current.children.forEach(c => deleteNodeRecursive(c, idToDelete));
  }

  window.toggleCollapse = function(nodeId) {
    const node = findNodeById(treeData, nodeId);
    if (node) {
      node.isCollapsed = !node.isCollapsed;
      renderTree();
    }
  };

  window.expandAll = function() {
    const setExp = (n) => {
      n.isCollapsed = false;
      (n.children || []).forEach(setExp);
    };
    setExp(treeData);
    renderTree();
  };

  window.collapseAll = function() {
    const setCol = (n) => {
      if (n !== treeData) n.isCollapsed = true;
      (n.children || []).forEach(setCol);
    };
    setCol(treeData);
    renderTree();
  };

  // --- ASTROLOGY PRECISION ENGINE ---
  const ASTRO_SIGNS = [
    { name: 'Aries', element: 'Api', symbol: '♈' },
    { name: 'Taurus', element: 'Tanah', symbol: '♉' },
    { name: 'Gemini', element: 'Udara', symbol: '♊' },
    { name: 'Cancer', element: 'Air', symbol: '♋' },
    { name: 'Leo', element: 'Api', symbol: '♌' },
    { name: 'Virgo', element: 'Tanah', symbol: '♍' },
    { name: 'Libra', element: 'Udara', symbol: '♎' },
    { name: 'Scorpio', element: 'Air', symbol: '♏' },
    { name: 'Sagittarius', element: 'Api', symbol: '♐' },
    { name: 'Capricorn', element: 'Tanah', symbol: '♑' },
    { name: 'Aquarius', element: 'Udara', symbol: '♒' },
    { name: 'Pisces', element: 'Air', symbol: '♓' }
  ];

  const CHINESE_ANIMALS = [
    { name: 'Tikus', symbol: '🐀' }, { name: 'Kerbau', symbol: '🐂' },
    { name: 'Macan', symbol: '🐅' }, { name: 'Kelinci', symbol: '🐇' },
    { name: 'Naga', symbol: '🐉' },  { name: 'Ular', symbol: '🐍' },
    { name: 'Kuda', symbol: '🐎' },  { name: 'Kambing', symbol: '🐐' },
    { name: 'Monyet', symbol: '🐒' }, { name: 'Ayam', symbol: '🐓' },
    { name: 'Anjing', symbol: '🐕' }, { name: 'Babi', symbol: '🐖' }
  ];

  const CHINESE_STEMS = [
    { element: 'Kayu', polarity: 'Yang' }, { element: 'Kayu', polarity: 'Yin' },
    { element: 'Api', polarity: 'Yang' },  { element: 'Api', polarity: 'Yin' },
    { element: 'Tanah', polarity: 'Yang' }, { element: 'Tanah', polarity: 'Yin' },
    { element: 'Logam', polarity: 'Yang' }, { element: 'Logam', polarity: 'Yin' },
    { element: 'Air', polarity: 'Yang' },  { element: 'Air', polarity: 'Yin' }
  ];

  function normDeg(val) {
    const res = Number(val) % 360;
    return res < 0 ? res + 360 : res;
  }

  function signFromLongitude(longitude) {
    if (!Number.isFinite(longitude)) return null;
    const lon = normDeg(longitude);
    const index = Math.floor(lon / 30) % 12;
    const degree = lon - index * 30;
    const whole = Math.floor(degree);
    const min = Math.floor((degree - whole) * 60);
    return { ...ASTRO_SIGNS[index], index, longitude: lon, degreeText: `${whole}° ${String(min).padStart(2, '0')}′` };
  }

  function astronomyEngineReady() {
    return Boolean(window.Astronomy && typeof Astronomy.SunPosition === 'function');
  }

  function getAstrologyProfile(person = {}) {
    if (!person.birthDate && !person.birthYear) {
      return { sun: null, moon: null, ascendant: null, chinese: null, score: 0, level: 'Data belum diisi' };
    }

    const year = Number((person.birthDate || '').slice(0, 4) || person.birthYear);
    let sun = null, moon = null, ascendant = null;
    let score = 30;

    if (person.birthDate && astronomyEngineReady()) {
      try {
        const [y, m, d] = person.birthDate.split('-').map(Number);
        const [hr, mn] = (person.birthTime || '12:00').split(':').map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d, hr || 12, mn || 0));

        const sunLon = normDeg(Astronomy.SunPosition(utcDate).elon);
        sun = signFromLongitude(sunLon);

        if (person.birthTime) {
          score += 25;
          const moonLon = normDeg(Astronomy.EclipticGeoMoon(utcDate).lon);
          moon = signFromLongitude(moonLon);

          const lat = Number(person.birthLatitude);
          const lng = Number(person.birthLongitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            score += 35;
            const siderealHours = Astronomy.SiderealTime(utcDate);
            const theta = (siderealHours * 15 + lng) * Math.PI / 180;
            const eps = 23.44 * Math.PI / 180;
            const phi = lat * Math.PI / 180;
            const ascY = -Math.cos(theta);
            const ascX = Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps);
            const ascLon = normDeg((Math.atan2(ascY, ascX) * 180 / Math.PI) + 180);
            ascendant = signFromLongitude(ascLon);
          }
        }
      } catch (err) {
        console.warn('Astro calculation fallback:', err);
      }
    }

    // Chinese Zodiac
    const animal = CHINESE_ANIMALS[((year - 4) % 12 + 12) % 12];
    const stem = CHINESE_STEMS[((year - 4) % 10 + 10) % 10];
    const chinese = { ...animal, ...stem };

    return {
      sun,
      moon,
      ascendant,
      chinese,
      score,
      level: score >= 85 ? 'Presisi Sangat Tinggi' : score >= 50 ? 'Presisi Cukup' : 'Estimasi Dasar'
    };
  }

  function astrologyBadgeHtml(person) {
    const p = getAstrologyProfile(person);
    if (!p.sun && !p.chinese) return '';
    let chips = '';
    if (p.sun) chips += `<span class="astro-chip sun" title="Zodiak Matahari: ${p.sun.name}">${p.sun.symbol} ${p.sun.name}</span>`;
    if (p.chinese) chips += `<span class="astro-chip chinese" title="Shio: ${p.chinese.name}">${p.chinese.symbol} ${p.chinese.name}</span>`;
    return chips ? `<div class="card-badges-row">${chips}</div>` : '';
  }

  window.previewAstrologyFromForm = function() {
    const person = {
      birthDate: document.getElementById('input-birthdate')?.value,
      birthYear: document.getElementById('input-birthyear')?.value,
      birthTime: document.getElementById('input-birthtime')?.value,
      birthTimezone: document.getElementById('input-birthtimezone')?.value,
      birthLatitude: document.getElementById('input-birthlatitude')?.value,
      birthLongitude: document.getElementById('input-birthlongitude')?.value
    };
    const profile = getAstrologyProfile(person);
    const preview = document.getElementById('astrology-preview');
    if (!preview) return;

    preview.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
        <div style="padding: 10px; border-radius: 10px; background: #fff; border: 1px solid var(--border-subtle);">
          <small style="font-size: 10px; font-weight: 700; color: #92400e;">SUN SIGN</small>
          <strong style="display: block; font-size: 13px;">${profile.sun?.name || 'Belum diisi'}</strong>
        </div>
        <div style="padding: 10px; border-radius: 10px; background: #fff; border: 1px solid var(--border-subtle);">
          <small style="font-size: 10px; font-weight: 700; color: #3730a3;">MOON SIGN</small>
          <strong style="display: block; font-size: 13px;">${profile.moon?.name || 'Perlu jam'}</strong>
        </div>
        <div style="padding: 10px; border-radius: 10px; background: #fff; border: 1px solid var(--border-subtle);">
          <small style="font-size: 10px; font-weight: 700; color: #065f46;">ASCENDANT</small>
          <strong style="display: block; font-size: 13px;">${profile.ascendant?.name || 'Perlu koordinat'}</strong>
        </div>
      </div>
    `;
  };

  window.fillAstrologyCoordinates = function() {
    const city = (document.getElementById('input-birthplace')?.value || '').toLowerCase().trim();
    const cityCoords = {
      jakarta: { lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta' },
      surabaya: { lat: -7.2575, lng: 112.7521, tz: 'Asia/Jakarta' },
      bandung: { lat: -6.9175, lng: 107.6191, tz: 'Asia/Jakarta' },
      semarang: { lat: -6.9667, lng: 110.4167, tz: 'Asia/Jakarta' },
      yogyakarta: { lat: -7.7956, lng: 110.3695, tz: 'Asia/Jakarta' },
      malang: { lat: -7.9666, lng: 112.6326, tz: 'Asia/Jakarta' },
      medan: { lat: 3.5952, lng: 98.6722, tz: 'Asia/Jakarta' },
      makassar: { lat: -5.1477, lng: 119.4327, tz: 'Asia/Makassar' },
      denpasar: { lat: -8.6705, lng: 115.2126, tz: 'Asia/Makassar' }
    };

    const matchKey = Object.keys(cityCoords).find(k => city.includes(k));
    if (matchKey) {
      const data = cityCoords[matchKey];
      document.getElementById('input-birthlatitude').value = data.lat;
      document.getElementById('input-birthlongitude').value = data.lng;
      document.getElementById('input-birthtimezone').value = data.tz;
      previewAstrologyFromForm();
      showToast(`Koordinat kota ${matchKey} berhasil diisi.`);
    } else {
      showToast('Kota tidak dikenali dalam daftar otomatis. Masukkan koordinat manual.', true);
    }
  };

  // --- EXPORT & PRINT SUITE ---
  window.openExportModal = function() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.add('open');
  };

  window.closeExportModal = function() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('open');
  };

  window.executeExport = async function(format) {
    closeExportModal();
    showToast(`Menyiapkan bagan ${format.toUpperCase()}...`);

    const familyTree = document.querySelector('.family-tree-surface');
    if (!familyTree || typeof html2canvas === 'undefined') {
      showToast('Gagal memuat sistem penangkap kanvas.', true);
      return;
    }

    try {
      // Capture canvas cleanly
      const canvas = await html2canvas(familyTree, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore')
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `Silsilah_Keluarga_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Bagan silsilah PNG berhasil diunduh!');
      } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 10, 10, 400, 277, undefined, 'FAST');
        pdf.save(`Bagan_Silsilah_${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast('Bagan silsilah PDF berhasil dibuat!');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat memproses ekspor.', true);
    }
  };

  // ==========================================================================
  // FITUR 4: PERSPECTIVE VIEW ENGINE (Full, Pedigree / Leluhur, Jam Pasir)
  // ==========================================================================
  let activePerspectiveMode = 'full'; // 'full' | 'pedigree' | 'hourglass'
  let activePerspectiveRootId = null;
  let activeHourglassDescendantTree = null;

  function pickDefaultFocalPerson(mode, index) {
    const rows = flattenPeople(treeData);
    const { parentMap, childrenMap, generationMap } = index;

    if (mode === 'hourglass') {
      const middleRow = rows.find(r => {
        const pid = String(r.person.id);
        return (parentMap.get(pid)?.size || 0) > 0 && (childrenMap.get(pid)?.size || 0) > 0;
      });
      if (middleRow) return String(middleRow.person.id);
    }

    let bestId = null;
    let bestGen = -1;
    rows.forEach(({ person }) => {
      const pid = String(person.id);
      const gen = generationMap.get(pid) || 1;
      if ((parentMap.get(pid)?.size || 0) > 0 && gen >= bestGen) {
        bestGen = gen;
        bestId = pid;
      }
    });

    return bestId || String(treeData?.id || '');
  }

  function buildFocalDescendantTree(focalId, index) {
    const pid = String(focalId);
    const directNode = findNodeById(treeData, pid);
    const hostId = index.hostMap.get(pid);

    if (!hostId && directNode && Array.isArray(directNode.children)) {
      const copy = deepClone(directNode);
      if (copy) copy.isCollapsed = false;
      return copy;
    }

    if (hostId) {
      const hostNode = findNodeById(treeData, hostId);
      const focalObj = index.personMap.get(pid);
      if (hostNode && focalObj) {
        const copy = deepClone(focalObj);
        copy.isCollapsed = false;
        const hostWithoutKids = deepClone(hostNode);
        delete hostWithoutKids.children;
        delete hostWithoutKids.spouses;
        copy.spouses = [hostWithoutKids];

        const hostSpouses = hostNode.spouses || [];
        const matchedChildren = (hostNode.children || []).filter(c => {
          if (c.linkedSpouseId) return String(c.linkedSpouseId) === pid;
          return hostSpouses.length === 1;
        });
        copy.children = matchedChildren.map(c => {
          const childCopy = deepClone(c);
          childCopy.linkedSpouseId = hostNode.id;
          return childCopy;
        });
        return copy;
      }
    }

    const fallback = deepClone(index.personMap.get(pid) || treeData);
    if (fallback) {
      fallback.spouses = fallback.spouses || [];
      fallback.children = fallback.children || [];
      fallback.isCollapsed = false;
    }
    return fallback;
  }

  function getAncestorRoleLabel(depthAboveFocal, gender) {
    const isMale = gender === 'L';
    if (depthAboveFocal === 1) return isMale ? 'Ayah' : 'Ibu';
    if (depthAboveFocal === 2) return isMale ? 'Kakek' : 'Nenek';
    if (depthAboveFocal === 3) return isMale ? 'Kakek Buyut' : 'Nenek Buyut';
    if (depthAboveFocal === 4) return 'Eyang Canggah';
    return `Leluhur (+${depthAboveFocal})`;
  }

  function buildAncestorParentsHTML(childId, currentDepth, maxDepth, index, visited) {
    const cid = String(childId);
    const rawParents = Array.from(index.parentMap.get(cid) || [])
      .filter(pid => !visited.has(String(pid)) && index.personMap.has(String(pid)));

    if (!rawParents.length || currentDepth >= maxDepth) return '';

    rawParents.sort((a, b) => {
      const pA = index.personMap.get(String(a));
      const pB = index.personMap.get(String(b));
      return (pA?.gender === 'L' ? 0 : 1) - (pB?.gender === 'L' ? 0 : 1);
    });

    const parentHtmlBlocks = rawParents.map(parId => {
      const parentObj = index.personMap.get(String(parId));
      const trueGen = index.generationMap.get(String(parId)) || 1;
      const roleLabel = getAncestorRoleLabel(currentDepth + 1, parentObj.gender);

      const nextVisited = new Set(visited);
      nextVisited.add(String(parId));
      const grandParentsHTML = buildAncestorParentsHTML(parId, currentDepth + 1, maxDepth, index, nextVisited);
      const cardHTML = buildPersonCard(parentObj, false, false, false, trueGen, null, null, {});

      return `
        <div class="pedigree-branch">
          ${grandParentsHTML}
          <div class="pedigree-card-slot" data-pedigree-child="${escapeHTML(cid)}">
            <span class="pedigree-role-tag">${escapeHTML(roleLabel)}</span>
            ${cardHTML}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="pedigree-parents-row" data-parents-of="${escapeHTML(cid)}">
        <div class="pedigree-couple-unit" data-couple-for="${escapeHTML(cid)}">
          ${parentHtmlBlocks}
        </div>
      </div>
    `;
  }

  function markFocalCardInHtml(html, focalId) {
    const escapedId = escapeHTML(String(focalId));
    const targetAttr = `data-person-id="${escapedId}"`;
    const idx = html.indexOf(targetAttr);
    if (idx === -1) return html;
    return html.slice(0, idx) + `data-focal-card="true" ` + html.slice(idx);
  }

  function renderPerspectiveHTML() {
    if (activePerspectiveMode === 'full' || !activePerspectiveRootId) {
      activeHourglassDescendantTree = null;
      return buildNodeHTML(treeData, 1);
    }

    const index = buildGenealogyIndex();
    const focalId = String(activePerspectiveRootId);
    const focalPerson = index.personMap.get(focalId);
    if (!focalPerson) {
      activeHourglassDescendantTree = null;
      return buildNodeHTML(treeData, 1);
    }

    const focalGen = index.generationMap.get(focalId) || 1;

    if (activePerspectiveMode === 'pedigree') {
      activeHourglassDescendantTree = null;
      const ancestorsHTML = buildAncestorParentsHTML(focalId, 0, 5, index, new Set([focalId]));
      const focalCardRaw = buildPersonCard(focalPerson, false, false, false, focalGen, null, null, {});
      const focalCardMarked = markFocalCardInHtml(focalCardRaw, focalId);

      return `
        <li class="perspective-root-li perspective-mode-pedigree">
          <div class="pedigree-branch">
            ${ancestorsHTML}
            <div class="perspective-focal-wrapper">
              <span class="pedigree-role-tag focal">Fokus Leluhur</span>
              ${focalCardMarked}
            </div>
          </div>
        </li>
      `;
    }

    if (activePerspectiveMode === 'hourglass') {
      const ancestorsHTML = buildAncestorParentsHTML(focalId, 0, 4, index, new Set([focalId]));
      activeHourglassDescendantTree = buildFocalDescendantTree(focalId, index);
      const descRawHTML = buildNodeHTML(activeHourglassDescendantTree, focalGen);
      const descMarkedHTML = markFocalCardInHtml(descRawHTML, focalId);

      return `
        <li class="perspective-root-li perspective-mode-hourglass">
          <div class="hourglass-layout">
            ${ancestorsHTML ? `<div class="hourglass-ancestors-section">${ancestorsHTML}</div>` : ''}
            <div class="hourglass-descendants-section">
              <ul class="hourglass-root-ul">
                ${descMarkedHTML}
              </ul>
            </div>
          </div>
        </li>
      `;
    }

    activeHourglassDescendantTree = null;
    return buildNodeHTML(treeData, 1);
  }

  function populateFocusPersonSelect(selectedId) {
    const sel = document.getElementById('focus-person-select');
    if (!sel || !treeData) return;

    const rows = flattenPeople(treeData).sort((a, b) => {
      if (a.generation !== b.generation) return b.generation - a.generation;
      return (a.person.name || '').localeCompare(b.person.name || '');
    });

    sel.innerHTML = '';
    rows.forEach(({ person, generation }) => {
      const opt = document.createElement('option');
      opt.value = person.id;
      opt.textContent = `${person.name} (Gen ${generation})`;
      sel.appendChild(opt);
    });

    if (selectedId && sel.querySelector(`option[value="${selectedId}"]`)) {
      sel.value = selectedId;
    }
  }

  window.setTreePerspective = function(mode, rootId = null) {
    const nextMode = mode || activePerspectiveMode || 'full';
    activePerspectiveMode = nextMode;

    if (nextMode === 'full') {
      activePerspectiveRootId = null;
      activeHourglassDescendantTree = null;
    } else {
      const index = buildGenealogyIndex();
      let candidate = rootId || activeInspectorPersonId || activePerspectiveRootId;
      if (!rootId) {
        const hasParents = candidate && (index.parentMap.get(String(candidate))?.size || 0) > 0;
        if (!hasParents) {
          candidate = pickDefaultFocalPerson(nextMode, index);
        }
      }
      activePerspectiveRootId = candidate || treeData?.id;
      populateFocusPersonSelect(activePerspectiveRootId);
    }

    ['full', 'pedigree', 'hourglass'].forEach(m => {
      const btn = document.getElementById(`persp-${m}`);
      if (btn) btn.classList.toggle('active', m === nextMode);
    });

    const banner = document.getElementById('tree-focus-banner');
    if (banner) {
      if (nextMode !== 'full' && activePerspectiveRootId) {
        document.getElementById('focus-mode-tag').textContent = nextMode === 'pedigree' ? 'Leluhur' : 'Jam Pasir';
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }

    if (currentActiveView !== 'tree') {
      switchWorkspaceView('tree');
    }

    renderTree();
    requestAnimationFrame(() => requestAnimationFrame(() => fitTreeToViewport(true)));
  };

  window.resetTreePerspective = function() {
    window.setTreePerspective('full');
  };

  window.actionFocusPerspective = function() {
    if (!activeInspectorPersonId) return;
    const targetId = activeInspectorPersonId;
    closeInspectorDrawer();
    window.setTreePerspective('pedigree', targetId);
  };

  // ==========================================================================
  // FITUR 1: KINSHIP / RELATIONSHIP DEGREE ENGINE
  // ==========================================================================
  let kinshipHighlightPath = [];

  function buildGenealogyIndex() {
    const personMap = new Map();
    const parentMap = new Map();
    const childrenMap = new Map();
    const spouseMap = new Map();
    const generationMap = new Map();
    const hostMap = new Map();
    const upwardAncestorSet = new Set();

    function ensureSet(map, key) {
      if (!map.has(key)) map.set(key, new Set());
      return map.get(key);
    }

    function indexUpwardParents(owner, ownerGen) {
      const ownerId = String(owner.id);
      const pList = owner.parents || [];
      pList.forEach(pParent => {
        const ppid = String(pParent.id);
        personMap.set(ppid, pParent);
        generationMap.set(ppid, Math.max(0, ownerGen - 1));
        upwardAncestorSet.add(ppid);

        ensureSet(parentMap, ownerId).add(ppid);
        ensureSet(childrenMap, ppid).add(ownerId);
        ensureSet(parentMap, ppid);
        ensureSet(spouseMap, ppid);

        indexUpwardParents(pParent, ownerGen - 1);
      });
      if (pList.length === 2) {
        const p1 = String(pList[0].id);
        const p2 = String(pList[1].id);
        ensureSet(spouseMap, p1).add(p2);
        ensureSet(spouseMap, p2).add(p1);
      }
    }

    function indexNode(node, parentId = null, generation = 1) {
      if (!node) return;
      const pid = String(node.id);
      personMap.set(pid, node);
      generationMap.set(pid, generation);

      ensureSet(parentMap, pid);
      ensureSet(childrenMap, pid);
      ensureSet(spouseMap, pid);

      if (parentId) {
        parentMap.get(pid).add(String(parentId));
        ensureSet(childrenMap, String(parentId)).add(pid);
      }

      const spousesList = node.spouses || [];
      spousesList.forEach(sp => {
        const sid = String(sp.id);
        personMap.set(sid, sp);
        generationMap.set(sid, generation);
        hostMap.set(sid, pid);

        ensureSet(parentMap, sid);
        ensureSet(childrenMap, sid);
        ensureSet(spouseMap, sid);

        spouseMap.get(pid).add(sid);
        spouseMap.get(sid).add(pid);

        indexUpwardParents(sp, generation);

        if (sp.spouses && sp.spouses.length > 0) {
          sp.spouses.forEach(secSp => {
            const ssid = String(secSp.id);
            personMap.set(ssid, secSp);
            generationMap.set(ssid, generation);
            hostMap.set(ssid, sid);
            ensureSet(parentMap, ssid);
            ensureSet(childrenMap, ssid);
            ensureSet(spouseMap, ssid).add(sid);
            spouseMap.get(sid).add(ssid);
            indexUpwardParents(secSp, generation);
          });
        }
      });

      (node.children || []).forEach(child => {
        const cid = String(child.id);
        indexNode(child, pid, generation + 1);
        if (child.linkedSpouseId) {
          const lsid = String(child.linkedSpouseId);
          if (personMap.has(lsid)) {
            parentMap.get(cid).add(lsid);
            ensureSet(childrenMap, lsid).add(cid);
          }
        } else if (spousesList.length === 1) {
          const onlySpouseId = String(spousesList[0].id);
          parentMap.get(cid).add(onlySpouseId);
          ensureSet(childrenMap, onlySpouseId).add(cid);
        }
      });
    }

    indexNode(treeData, null, 1);
    return { personMap, parentMap, childrenMap, spouseMap, generationMap, hostMap, upwardAncestorSet };
  }

  function getAncestorsWithDepth(personId, parentMap) {
    const visited = new Map();
    const queue = [{ id: String(personId), depth: 0, path: [String(personId)] }];
    visited.set(String(personId), { depth: 0, path: [String(personId)] });

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift();
      const parents = parentMap.get(id);
      if (parents) {
        parents.forEach(parentId => {
          if (!visited.has(parentId) || visited.get(parentId).depth > depth + 1) {
            const nextPath = [...path, parentId];
            visited.set(parentId, { depth: depth + 1, path: nextPath });
            queue.push({ id: parentId, depth: depth + 1, path: nextPath });
          }
        });
      }
    }
    return visited;
  }

  function findInLawRelation(idA, idB, index) {
    const { personMap, parentMap, childrenMap, spouseMap } = index;
    const pA = personMap.get(idA);
    const pB = personMap.get(idB);
    const isMaleA = pA?.gender === 'L';

    // 1. A adalah Mertua B (A adalah orang tua dari pasangan B)
    const spousesOfB = Array.from(spouseMap.get(idB) || []);
    for (const spB of spousesOfB) {
      if (parentMap.get(spB)?.has(idA)) {
        const spName = personMap.get(spB)?.name || '';
        return {
          title: isMaleA ? 'Mertua (Ayah Mertua)' : 'Mertua (Ibu Mertua)',
          degree: 'Hubungan Semenda',
          desc: `${pA.name} adalah orang tua dari pasangan ${pB.name} (${spName}).`,
          path: [idA, spB, idB]
        };
      }
    }

    // 2. A adalah Menantu B (B adalah orang tua dari pasangan A)
    const spousesOfA = Array.from(spouseMap.get(idA) || []);
    for (const spA of spousesOfA) {
      if (parentMap.get(spA)?.has(idB)) {
        const spName = personMap.get(spA)?.name || '';
        return {
          title: isMaleA ? 'Menantu (Putra)' : 'Menantu (Putri)',
          degree: 'Hubungan Semenda',
          desc: `${pA.name} adalah pasangan dari anak ${pB.name} (${spName}).`,
          path: [idA, spA, idB]
        };
      }
    }

    // Helper: check if two people share a parent (siblings)
    const areSiblings = (u, v) => {
      if (u === v) return false;
      const pU = parentMap.get(u);
      const pV = parentMap.get(v);
      if (!pU || !pV) return false;
      for (const par of pU) {
        if (pV.has(par)) return par;
      }
      return false;
    };

    // 3. Saudara Ipar (pasangan dari saudara B, atau saudara dari pasangan B)
    for (const spA of spousesOfA) {
      const sharedPar = areSiblings(spA, idB);
      if (sharedPar) {
        return {
          title: 'Saudara Ipar',
          degree: 'Hubungan Semenda',
          desc: `${pA.name} adalah pasangan dari saudara kandung ${pB.name} (${personMap.get(spA)?.name || ''}).`,
          path: [idA, spA, sharedPar, idB]
        };
      }
    }
    for (const spB of spousesOfB) {
      const sharedPar = areSiblings(idA, spB);
      if (sharedPar) {
        return {
          title: 'Saudara Ipar',
          degree: 'Hubungan Semenda',
          desc: `${pA.name} adalah saudara kandung dari pasangan ${pB.name} (${personMap.get(spB)?.name || ''}).`,
          path: [idA, sharedPar, spB, idB]
        };
      }
    }

    // 4. Besan (anak A menikah dengan anak B)
    const kidsA = Array.from(childrenMap.get(idA) || []);
    const kidsB = Array.from(childrenMap.get(idB) || []);
    for (const kA of kidsA) {
      for (const kB of kidsB) {
        if (spouseMap.get(kA)?.has(kB)) {
          return {
            title: 'Besan',
            degree: 'Hubungan Semenda',
            desc: `Anak ${pA.name} (${personMap.get(kA)?.name || ''}) menikah dengan anak ${pB.name} (${personMap.get(kB)?.name || ''}).`,
            path: [idA, kA, kB, idB]
          };
        }
      }
    }

    return null;
  }

  function getKinshipTerm(dA, dB, personA, personB, lcaPerson) {
    if (dA === 0 && dB === 0) return { title: 'Diri Sendiri', degree: '0 Derajat', desc: 'Individu yang sama.' };

    const isMaleA = personA?.gender === 'L';

    if (dA === 0) {
      if (dB === 1) return { title: isMaleA ? 'Orang Tua (Ayah)' : 'Orang Tua (Ibu)', degree: '1 Derajat', desc: `${personA.name} adalah orang tua kandung dari ${personB.name}.` };
      if (dB === 2) return { title: isMaleA ? 'Kakek (Eyang Kakung)' : 'Nenek (Eyang Putri)', degree: '2 Derajat', desc: `${personA.name} adalah kakek/nenek dari ${personB.name}.` };
      if (dB === 3) return { title: 'Kakek/Nenek Buyut (Eyang Buyut)', degree: '3 Derajat', desc: `${personA.name} adalah buyut dari ${personB.name}.` };
      if (dB === 4) return { title: 'Eyang Canggah', degree: '4 Derajat', desc: `${personA.name} adalah eyang canggah dari ${personB.name}.` };
      if (dB === 5) return { title: 'Eyang Wareng', degree: '5 Derajat', desc: `${personA.name} adalah eyang wareng dari ${personB.name}.` };
      return { title: `Leluhur Generasi ke-${dB}`, degree: `${dB} Derajat`, desc: `${personA.name} adalah leluhur dari ${personB.name}.` };
    }

    if (dB === 0) {
      if (dA === 1) return { title: isMaleA ? 'Anak Kandung (Putra)' : 'Anak Kandung (Putri)', degree: '1 Derajat', desc: `${personA.name} adalah anak kandung dari ${personB.name}.` };
      if (dA === 2) return { title: isMaleA ? 'Cucu (Putra)' : 'Cucu (Putri)', degree: '2 Derajat', desc: `${personA.name} adalah cucu dari ${personB.name}.` };
      if (dA === 3) return { title: 'Cicit', degree: '3 Derajat', desc: `${personA.name} adalah cicit dari ${personB.name}.` };
      if (dA === 4) return { title: 'Canggah', degree: '4 Derajat', desc: `${personA.name} adalah canggah dari ${personB.name}.` };
      if (dA === 5) return { title: 'Wareng', degree: '5 Derajat', desc: `${personA.name} adalah wareng dari ${personB.name}.` };
      return { title: `Keturunan Generasi ke-${dA}`, degree: `${dA} Derajat`, desc: `${personA.name} adalah keturunan langsung dari ${personB.name}.` };
    }

    if (dA === 1 && dB === 1) {
      return { title: 'Saudara Kandung', degree: '2 Derajat', desc: `${personA.name} dan ${personB.name} adalah saudara kandung dengan orang tua ${lcaPerson?.name || ''}.` };
    }

    if (dA === 2 && dB === 2) {
      return { title: 'Sepupu Sekali (Misanan)', degree: '4 Derajat', desc: `${personA.name} dan ${personB.name} adalah sepupu satu kakek/nenek (${lcaPerson?.name || ''}).` };
    }
    if (dA === 3 && dB === 3) {
      return { title: 'Sepupu Dua Kali (Mindhoan)', degree: '6 Derajat', desc: `${personA.name} dan ${personB.name} adalah sepupu dua kali (buyut bersama: ${lcaPerson?.name || ''}).` };
    }
    if (dA === 4 && dB === 4) {
      return { title: 'Sepupu Tiga Kali', degree: '8 Derajat', desc: `${personA.name} dan ${personB.name} adalah sepupu tiga kali (canggah bersama: ${lcaPerson?.name || ''}).` };
    }

    if (dA === 1 && dB === 2) {
      return { title: isMaleA ? 'Paman (Pakde / Om)' : 'Bibi (Bude / Tante)', degree: '3 Derajat', desc: `${personA.name} adalah saudara dari orang tua ${personB.name}.` };
    }
    if (dA === 2 && dB === 1) {
      return { title: isMaleA ? 'Keponakan (Putra)' : 'Keponakan (Putri)', degree: '3 Derajat', desc: `${personA.name} adalah anak dari saudara kandung ${personB.name}.` };
    }

    if (dA === 1 && dB === 3) {
      return { title: isMaleA ? 'Kakek Paman (Grand Uncle)' : 'Nenek Bibi (Grand Aunt)', degree: '4 Derajat', desc: `${personA.name} adalah saudara dari kakek/nenek ${personB.name}.` };
    }
    if (dA === 3 && dB === 1) {
      return { title: 'Cucu Keponakan', degree: '4 Derajat', desc: `${personA.name} adalah cucu dari saudara kandung ${personB.name}.` };
    }

    if (dA === 2 && dB === 3) {
      return { title: isMaleA ? 'Paman Sepupu' : 'Bibi Sepupu', degree: '5 Derajat', desc: `${personA.name} adalah sepupu dari orang tua ${personB.name}.` };
    }
    if (dA === 3 && dB === 2) {
      return { title: 'Keponakan Sepupu', degree: '5 Derajat', desc: `${personA.name} adalah anak dari sepupu ${personB.name}.` };
    }

    const genDiff = Math.abs(dA - dB);
    return {
      title: `Kerabat Garis Keturunan (${dA + dB} Derajat)`,
      degree: `${dA + dB} Derajat`,
      desc: `Hubungan kekerabatan melalui leluhur bersama ${lcaPerson?.name || ''} dengan selisih generasi ${genDiff}.`
    };
  }

  window.openKinshipModal = function(defaultPersonAId = null, defaultPersonBId = null) {
    const modal = document.getElementById('kinship-modal');
    if (!modal) return;

    const selectA = document.getElementById('kinship-person-a');
    const selectB = document.getElementById('kinship-person-b');
    const rows = flattenPeople(treeData).sort((a, b) => (a.person.name || '').localeCompare(b.person.name || ''));

    selectA.innerHTML = '';
    selectB.innerHTML = '';

    rows.forEach(({ person, generation }) => {
      const optA = document.createElement('option');
      optA.value = person.id;
      optA.textContent = `${person.name} (Gen ${generation})`;
      selectA.appendChild(optA);

      const optB = document.createElement('option');
      optB.value = person.id;
      optB.textContent = `${person.name} (Gen ${generation})`;
      selectB.appendChild(optB);
    });

    if (defaultPersonAId && selectA.querySelector(`option[value="${defaultPersonAId}"]`)) {
      selectA.value = defaultPersonAId;
    } else if (rows.length > 0) {
      selectA.value = rows[0].person.id;
    }

    if (defaultPersonBId && selectB.querySelector(`option[value="${defaultPersonBId}"]`)) {
      selectB.value = defaultPersonBId;
    } else if (rows.length > 1) {
      selectB.value = rows[1].person.id;
    } else if (rows.length > 0) {
      selectB.value = rows[0].person.id;
    }

    modal.classList.add('open');
    calculateKinship();
  };

  window.closeKinshipModal = function() {
    const modal = document.getElementById('kinship-modal');
    if (modal) modal.classList.remove('open');
  };

  window.swapKinshipPersons = function() {
    const selectA = document.getElementById('kinship-person-a');
    const selectB = document.getElementById('kinship-person-b');
    const temp = selectA.value;
    selectA.value = selectB.value;
    selectB.value = temp;
    calculateKinship();
  };

  window.actionInspectKinship = function() {
    if (!activeInspectorPersonId) return;
    openKinshipModal(activeInspectorPersonId);
  };

  window.calculateKinship = function() {
    const idA = document.getElementById('kinship-person-a')?.value;
    const idB = document.getElementById('kinship-person-b')?.value;
    const container = document.getElementById('kinship-result-container');
    const highlightBtn = document.getElementById('btn-highlight-kinship');
    if (!container || !idA || !idB) return;

    const index = buildGenealogyIndex();
    const { personMap, parentMap, spouseMap } = index;
    const personA = personMap.get(idA);
    const personB = personMap.get(idB);
    if (!personA || !personB) return;

    if (idA === idB) {
      container.innerHTML = `
        <div class="kinship-title-badge">Diri Sendiri</div>
        <div class="kinship-degree-tag">0 Derajat</div>
        <p style="font-size: 13px; color: var(--ink-secondary);">Anda memilih individu yang sama.</p>
      `;
      if (highlightBtn) highlightBtn.classList.add('hidden');
      return;
    }

    if (spouseMap.get(idA)?.has(idB)) {
      const isMaleA = personA.gender === 'L';
      container.innerHTML = `
        <div class="kinship-title-badge">${isMaleA ? 'Suami' : 'Istri'} (Pasangan Hidup)</div>
        <div class="kinship-degree-tag">Tali Pernikahan</div>
        <p style="font-size: 13px; color: var(--ink-secondary);">${escapeHTML(personA.name)} adalah pasangan hidup sah dari ${escapeHTML(personB.name)}.</p>
      `;
      kinshipHighlightPath = [idA, idB];
      if (highlightBtn) highlightBtn.classList.remove('hidden');
      return;
    }

    const aA = getAncestorsWithDepth(idA, parentMap);
    const aB = getAncestorsWithDepth(idB, parentMap);

    let lca = null;
    let minSum = Infinity;

    for (const [ancId, infoA] of aA) {
      if (aB.has(ancId)) {
        const infoB = aB.get(ancId);
        const sum = infoA.depth + infoB.depth;
        if (sum < minSum) {
          minSum = sum;
          lca = { id: ancId, depthA: infoA.depth, depthB: infoB.depth, pathA: infoA.path, pathB: infoB.path };
        }
      }
    }

    if (!lca) {
      const inLaw = findInLawRelation(idA, idB, index);
      if (inLaw) {
        kinshipHighlightPath = inLaw.path;
        const pathHtml = inLaw.path.map((nodeId, idx) => {
          const p = personMap.get(nodeId);
          const isEdge = idx === 0 || idx === inLaw.path.length - 1;
          return `<span class="kinship-node-chip" style="${isEdge ? 'font-weight: 800; border: 1.5px solid var(--accent-cyan);' : ''}">${escapeHTML(p ? p.name.split(' ')[0] : nodeId)}</span>`;
        }).join(' <i class="fa-solid fa-arrow-right" style="font-size: 10px; color: #94a3b8;"></i> ');

        container.innerHTML = `
          <div class="kinship-title-badge">${escapeHTML(inLaw.title)}</div>
          <div class="kinship-degree-tag">${escapeHTML(inLaw.degree)}</div>
          <p style="font-size: 13px; color: var(--ink-secondary); max-width: 460px; margin: 0 auto 10px;">${escapeHTML(inLaw.desc)}</p>
          <div class="kinship-path-trail">${pathHtml}</div>
        `;
        if (highlightBtn) highlightBtn.classList.remove('hidden');
        return;
      }

      container.innerHTML = `
        <div class="kinship-title-badge">Belum Terhubung Langsung</div>
        <div class="kinship-degree-tag" style="background: #f1f5f9; color: #64748b;">Garis Terpisah</div>
        <p style="font-size: 13px; color: var(--ink-secondary);">Tidak ditemukan leluhur bersama atau ikatan semenda langsung dalam silsilah aktif.</p>
      `;
      if (highlightBtn) highlightBtn.classList.add('hidden');
      return;
    }

    const lcaPerson = personMap.get(lca.id);
    const result = getKinshipTerm(lca.depthA, lca.depthB, personA, personB, lcaPerson);

    const pathA = [...lca.pathA];
    const pathB = [...lca.pathB].reverse();
    const fullPath = [...pathA, ...pathB.slice(1)];
    kinshipHighlightPath = fullPath;

    const pathHtml = fullPath.map((nodeId, idx) => {
      const p = personMap.get(nodeId);
      const isLca = nodeId === lca.id;
      const isEdge = idx === 0 || idx === fullPath.length - 1;
      return `<span class="kinship-node-chip ${isLca ? 'lca' : ''}" style="${isEdge ? 'font-weight: 800; border: 1.5px solid var(--accent-cyan);' : ''}">${escapeHTML(p ? p.name.split(' ')[0] : nodeId)}</span>`;
    }).join(' <i class="fa-solid fa-arrow-right" style="font-size: 10px; color: #94a3b8;"></i> ');

    container.innerHTML = `
      <div class="kinship-title-badge">${escapeHTML(result.title)}</div>
      <div class="kinship-degree-tag">${escapeHTML(result.degree)} • Selisih ${Math.abs(lca.depthA - lca.depthB)} Generasi</div>
      <p style="font-size: 13px; color: var(--ink-secondary); max-width: 460px; margin: 0 auto 10px;">${escapeHTML(result.desc)}</p>
      <div style="font-size: 11px; font-weight: 700; color: var(--ink-muted); text-transform: uppercase; margin-top: 6px;">Jalur Nasab (Leluhur Bersama: ${escapeHTML(lcaPerson ? lcaPerson.name : '')})</div>
      <div class="kinship-path-trail">${pathHtml}</div>
    `;

    if (highlightBtn) highlightBtn.classList.remove('hidden');
  };

  window.highlightKinshipInTree = function() {
    closeKinshipModal();
    if (activePerspectiveMode !== 'full') {
      activePerspectiveMode = 'full';
      activePerspectiveRootId = null;
      activeHourglassDescendantTree = null;
      document.getElementById('tree-focus-banner')?.classList.add('hidden');
      ['full', 'pedigree', 'hourglass'].forEach(m => {
        document.getElementById(`persp-${m}`)?.classList.toggle('active', m === 'full');
      });
      renderTree();
    }
    if (currentActiveView !== 'tree') {
      switchWorkspaceView('tree');
    }
    if (kinshipHighlightPath && kinshipHighlightPath.length > 0) {
      setTimeout(() => {
        highlightedLineage = { ancestors: new Set(kinshipHighlightPath), descendants: new Set() };
        flyToPerson(kinshipHighlightPath[0], true);
        applyLineageStyles();
        scheduleTreeConnectorRender();
        setTimeout(() => {
          applyLineageStyles();
          drawTreeConnectors();
        }, 320);
      }, 60);
    }
  };

  // ==========================================================================
  // FITUR 3: INTERACTIVE FAN CHART (SUNBURST) ENGINE
  // ==========================================================================
  let fanChartRootId = null;
  let fanChartAngle = 180;
  let fanChartType = 'descendant';

  window.setFanRoot = function(personId) {
    fanChartRootId = personId || null;
    renderFanChart();
  };

  window.setFanAngle = function(angle) {
    fanChartAngle = angle;
    document.getElementById('fan-angle-180')?.classList.toggle('active', angle === 180);
    document.getElementById('fan-angle-360')?.classList.toggle('active', angle === 360);
    renderFanChart();
  };

  window.setFanType = function(type) {
    fanChartType = type;
    document.getElementById('fan-type-descendant')?.classList.toggle('active', type === 'descendant');
    document.getElementById('fan-type-ancestor')?.classList.toggle('active', type === 'ancestor');
    if (type === 'ancestor') {
      const index = buildGenealogyIndex();
      const curId = String(fanChartRootId || treeData?.id || '');
      if ((index.parentMap.get(curId)?.size || 0) === 0) {
        fanChartRootId = pickDefaultFocalPerson('pedigree', index);
      }
    }
    renderFanChart();
  };

  window.resetFanRoot = function() {
    fanChartRootId = null;
    renderFanChart();
  };

  window.actionOpenInFan = function() {
    if (!activeInspectorPersonId) return;
    fanChartRootId = activeInspectorPersonId;
    closeInspectorDrawer();
    switchWorkspaceView('fan');
  };

  function populateFanRootSelect(selectedId) {
    const sel = document.getElementById('fan-root-select');
    if (!sel || !treeData) return;

    const rows = flattenPeople(treeData).sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      return (a.person.name || '').localeCompare(b.person.name || '');
    });

    sel.innerHTML = '';
    rows.forEach(({ person, generation }) => {
      const opt = document.createElement('option');
      opt.value = person.id;
      opt.textContent = `${person.name} (Gen ${generation})`;
      sel.appendChild(opt);
    });

    if (selectedId && sel.querySelector(`option[value="${selectedId}"]`)) {
      sel.value = selectedId;
    }
  }

  function polarToCartesian(cx, cy, r, angleInDeg) {
    const rad = ((angleInDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function describeArc(cx, cy, rInner, rOuter, startAngle, endAngle) {
    const safeEnd = endAngle - startAngle >= 359.99 ? startAngle + 359.98 : endAngle;
    const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
    const p2 = polarToCartesian(cx, cy, rOuter, safeEnd);
    const p3 = polarToCartesian(cx, cy, rInner, safeEnd);
    const p4 = polarToCartesian(cx, cy, rInner, startAngle);

    const arcSweep = safeEnd - startAngle <= 180 ? '0' : '1';

    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${arcSweep} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${arcSweep} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  function bindFanWedgeEvents(g, person, genLabel) {
    const tooltip = document.getElementById('fan-tooltip');
    const wrapper = document.getElementById('fan-chart-wrapper');

    g.addEventListener('click', () => openInspectorDrawer(person.id));
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      setFanRoot(person.id);
    });

    if (tooltip && wrapper) {
      g.addEventListener('mouseenter', () => {
        const life = `${person.birthYear || (person.birthDate || '').slice(0, 4) || '?'} - ${person.deathYear || (person.deathDate || '').slice(0, 4) || 'Sekarang'}`;
        tooltip.innerHTML = `<strong>${escapeHTML(person.name || 'Tanpa Nama')}</strong><br><small>${escapeHTML(genLabel)} • ${escapeHTML(life)}</small><br><small style="color:#38bdf8;">Klik: Detail | Klik 2x: Jadikan Pusat</small>`;
        tooltip.classList.remove('hidden');
      });
      g.addEventListener('mousemove', (e) => {
        const wr = wrapper.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - wr.left + wrapper.scrollLeft}px`;
        tooltip.style.top = `${e.clientY - wr.top + wrapper.scrollTop}px`;
      });
      g.addEventListener('mouseleave', () => {
        tooltip.classList.add('hidden');
      });
    }
  }

  function renderFanWedgeLabel(g, cx, cy, rMid, midAngle, spanDeg, label, subLabel) {
    if (spanDeg < 6) return;
    const pos = polarToCartesian(cx, cy, rMid, midAngle);
    const normAngle = ((midAngle % 360) + 360) % 360;

    let rotDeg;
    if (spanDeg < 16) {
      // Radial alignment for narrow outer wedges so longer names fit along the spoke
      rotDeg = normAngle > 180 ? normAngle + 90 : normAngle - 90;
    } else {
      // Tangential alignment for wider inner wedges
      rotDeg = (normAngle > 90 && normAngle < 270) ? normAngle + 180 : normAngle;
    }

    const textGroup = createSvgEl('g', {
      transform: `translate(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}) rotate(${rotDeg.toFixed(1)})`
    });

    const maxChars = spanDeg > 45 ? 18 : spanDeg < 16 ? 11 : spanDeg > 20 ? 12 : 9;
    const shortName = (label || '').slice(0, maxChars);

    const text = createSvgEl('text', {
      x: 0,
      y: subLabel && spanDeg >= 16 ? -2 : 3.5,
      'text-anchor': 'middle',
      fill: '#ffffff',
      'font-size': spanDeg > 22 ? 10.5 : spanDeg < 10 ? 7.5 : 8.5,
      'font-weight': 700
    });
    text.textContent = shortName;
    textGroup.appendChild(text);

    if (subLabel && spanDeg >= 16) {
      const sub = createSvgEl('text', {
        x: 0,
        y: 10,
        'text-anchor': 'middle',
        fill: 'rgba(255,255,255,0.85)',
        'font-size': 8
      });
      sub.textContent = subLabel;
      textGroup.appendChild(sub);
    }

    g.appendChild(textGroup);
  }

  function renderFanChart() {
    const svg = document.getElementById('fan-chart-svg');
    if (!svg || !treeData) return;

    const index = buildGenealogyIndex();
    const { personMap, parentMap } = index;
    const rootId = String(fanChartRootId || treeData.id);
    const rootPerson = personMap.get(rootId) || treeData;

    populateFanRootSelect(String(rootPerson.id));

    const is180 = fanChartAngle === 180;
    const width = 960;
    const height = is180 ? 540 : 960;
    const cx = width / 2;
    const cy = is180 ? 468 : height / 2;
    const baseR = 66;
    const ringW = 72;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.replaceChildren();

    const startDeg = is180 ? 270 : 0;
    const totalDeg = is180 ? 180 : 360;

    // Center Root Circle
    const centerGroup = createSvgEl('g', { class: 'fan-chart-wedge', 'data-id': rootPerson.id });
    const centerCircle = createSvgEl('circle', {
      cx,
      cy,
      r: baseR,
      fill: '#0f172a',
      stroke: '#38bdf8',
      'stroke-width': 2.5
    });
    centerGroup.appendChild(centerCircle);

    const centerText = createSvgEl('text', {
      x: cx,
      y: is180 ? cy - 14 : cy - 6,
      'text-anchor': 'middle',
      fill: '#ffffff',
      'font-size': 11.5,
      'font-weight': 800
    });
    centerText.textContent = (rootPerson.name || '').slice(0, 17);
    centerGroup.appendChild(centerText);

    const centerSub = createSvgEl('text', {
      x: cx,
      y: is180 ? cy + 4 : cy + 12,
      'text-anchor': 'middle',
      fill: '#94a3b8',
      'font-size': 9.5
    });
    const yr = rootPerson.birthYear || (rootPerson.birthDate || '').slice(0, 4);
    centerSub.textContent = yr ? `Lahir ${yr}` : 'Pusat Bagan';
    centerGroup.appendChild(centerSub);

    bindFanWedgeEvents(centerGroup, rootPerson, fanChartType === 'ancestor' ? 'Pusat Leluhur' : 'Pusat Keturunan');
    svg.appendChild(centerGroup);

    if (fanChartType === 'ancestor') {
      const maxGen = 4;

      function renderAncestorArcs(personId, gen, angleStart, angleSpan, sideColorIdx = 0) {
        if (gen > maxGen) return;
        const rInner = baseR + (gen - 1) * ringW + 4;
        const rOuter = rInner + ringW - 4;
        const rMid = (rInner + rOuter) / 2;

        const parentIds = personId ? Array.from(parentMap.get(String(personId)) || []) : [];
        let fatherId = null;
        let motherId = null;
        parentIds.forEach(pid => {
          const p = personMap.get(String(pid));
          if (p?.gender === 'P' && !motherId) motherId = pid;
          else if (!fatherId) fatherId = pid;
          else if (!motherId) motherId = pid;
        });

        const slots = [
          { pid: fatherId, role: gen === 1 ? 'Ayah' : `Leluhur L`, colorIdx: sideColorIdx === 0 ? 0 : sideColorIdx },
          { pid: motherId, role: gen === 1 ? 'Ibu' : `Leluhur P`, colorIdx: sideColorIdx === 0 ? 4 : sideColorIdx }
        ];

        const slotSpan = angleSpan / 2;
        slots.forEach((slot, sIdx) => {
          const aStart = angleStart + sIdx * slotSpan;
          const aEnd = aStart + slotSpan;
          const midA = aStart + slotSpan / 2;
          const pathD = describeArc(cx, cy, rInner, rOuter, aStart, aEnd);

          if (slot.pid && personMap.has(String(slot.pid))) {
            const pObj = personMap.get(String(slot.pid));
            const color = branchColors[(gen - 1 + slot.colorIdx) % branchColors.length];
            const g = createSvgEl('g', { class: 'fan-chart-wedge', 'data-id': pObj.id });
            const path = createSvgEl('path', {
              d: pathD,
              fill: color,
              stroke: '#ffffff',
              'stroke-width': 1.6,
              opacity: Math.max(0.68, 0.96 - (gen - 1) * 0.08)
            });
            g.appendChild(path);

            const pYear = pObj.birthYear || (pObj.birthDate || '').slice(0, 4) || '';
            renderFanWedgeLabel(g, cx, cy, rMid, midA, slotSpan, (pObj.name || '').split(' ').slice(0, 2).join(' '), pYear);
            bindFanWedgeEvents(g, pObj, `${slot.role} (Lapisan ${gen})`);
            svg.appendChild(g);

            renderAncestorArcs(pObj.id, gen + 1, aStart, slotSpan, slot.colorIdx || (sIdx === 0 ? 0 : 4));
          } else if (gen <= 3) {
            const g = createSvgEl('g', { opacity: 0.55 });
            const path = createSvgEl('path', {
              d: pathD,
              fill: '#f1f5f9',
              stroke: '#cbd5e1',
              'stroke-width': 1.2,
              'stroke-dasharray': '4 3'
            });
            g.appendChild(path);
            const pos = polarToCartesian(cx, cy, rMid, midA);
            const qText = createSvgEl('text', {
              x: pos.x,
              y: pos.y + 4,
              'text-anchor': 'middle',
              fill: '#94a3b8',
              'font-size': 11,
              'font-weight': 700
            });
            qText.textContent = '?';
            g.appendChild(qText);
            svg.appendChild(g);
          }
        });
      }

      renderAncestorArcs(rootPerson.id, 1, startDeg, totalDeg, 0);
      return;
    }

    // Descendant Fan
    const descRoot = buildFocalDescendantTree(rootPerson.id, index) || rootPerson;

    function countLeaves(node) {
      if (!node.children || node.children.length === 0) return 1;
      return node.children.reduce((acc, c) => acc + countLeaves(c), 0);
    }

    const totalLeaves = countLeaves(descRoot);
    if (!descRoot.children || !descRoot.children.length) {
      const emptyNote = createSvgEl('text', {
        x: cx,
        y: is180 ? cy - 115 : cy - 115,
        'text-anchor': 'middle',
        fill: '#64748b',
        'font-size': 12
      });
      emptyNote.textContent = 'Belum ada keturunan tercatat untuk pusat ini. Coba ganti ke mode Leluhur.';
      svg.appendChild(emptyNote);
      return;
    }

    function renderDescendantArcs(node, currentGen, angleStart) {
      if (!node.children || node.children.length === 0 || currentGen > 5) return;

      const rInner = baseR + (currentGen - 1) * ringW + 4;
      const rOuter = rInner + ringW - 4;
      const rMid = (rInner + rOuter) / 2;
      let curAngle = angleStart;

      node.children.forEach((child, idx) => {
        const leaves = countLeaves(child);
        const childSpan = (leaves / totalLeaves) * totalDeg;
        const arcEnd = curAngle + childSpan;
        const color = branchColors[(currentGen - 1 + idx) % branchColors.length];

        const pathD = describeArc(cx, cy, rInner, rOuter, curAngle, arcEnd);
        const g = createSvgEl('g', { class: 'fan-chart-wedge', 'data-id': child.id });

        const path = createSvgEl('path', {
          d: pathD,
          fill: color,
          stroke: '#ffffff',
          'stroke-width': 1.6,
          opacity: 0.9
        });
        g.appendChild(path);

        const midAngle = curAngle + childSpan / 2;
        const cYear = child.birthYear || (child.birthDate || '').slice(0, 4) || '';
        renderFanWedgeLabel(g, cx, cy, rMid, midAngle, childSpan, (child.name || '').split(' ')[0], cYear);
        bindFanWedgeEvents(g, child, `Keturunan Lapisan ${currentGen}`);
        svg.appendChild(g);

        renderDescendantArcs(child, currentGen + 1, curAngle);
        curAngle = arcEnd;
      });
    }

    renderDescendantArcs(descRoot, 1, startDeg);
  }

  window.exportFanChart = function(format = 'png') {
    const svg = document.getElementById('fan-chart-svg');
    if (!svg) return;
    showToast('Menyiapkan gambar bagan kipas...');

    try {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 1920;
      canvas.height = fanChartAngle === 180 ? 1080 : 1920;

      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const a = document.createElement('a');
        a.download = `Bagan_Kipas_${fanChartType}_${new Date().toISOString().slice(0, 10)}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Bagan kipas berhasil diunduh!');
      };
      img.src = url;
    } catch (err) {
      showToast('Gagal mengekspor bagan kipas.', true);
    }
  };

  // ==========================================================================
  // FITUR 5: FULL GEDCOM 5.5.1 IMPORT & EXPORT ENGINE
  // ==========================================================================
  window.exportGEDCOM = function() {
    const rows = flattenPeople(treeData);
    const idMap = new Map(rows.map((r, i) => [String(r.person.id), `I${i + 1}`]));
    const personFams = new Map();
    const personFamc = new Map();
    const families = [];
    let famIndex = 1;

    function addFamsLink(gid, famId) {
      if (!gid) return;
      if (!personFams.has(gid)) personFams.set(gid, new Set());
      personFams.get(gid).add(famId);
    }

    function collectFamilies(node) {
      if (!node) return;
      const pGid = idMap.get(String(node.id));
      const spouses = node.spouses || [];
      const kids = node.children || [];

      if (spouses.length > 0) {
        spouses.forEach((sp, sIdx) => {
          const spGid = idMap.get(String(sp.id));
          const famId = `F${famIndex++}`;
          const matchedKids = kids.filter(c => {
            if (c.linkedSpouseId) return String(c.linkedSpouseId) === String(sp.id);
            return spouses.length === 1 && sIdx === 0;
          });
          const childGids = matchedKids.map(c => idMap.get(String(c.id))).filter(Boolean);

          addFamsLink(pGid, famId);
          addFamsLink(spGid, famId);
          childGids.forEach(cGid => personFamc.set(cGid, famId));

          families.push({
            famId,
            husb: node.gender === 'P' ? spGid : pGid,
            wife: node.gender === 'P' ? pGid : spGid,
            children: childGids,
            hasMarriage: true
          });
        });

        const unlinkedKids = kids.filter(c => !c.linkedSpouseId && spouses.length > 1);
        if (unlinkedKids.length > 0) {
          const famId = `F${famIndex++}`;
          const childGids = unlinkedKids.map(c => idMap.get(String(c.id))).filter(Boolean);
          addFamsLink(pGid, famId);
          childGids.forEach(cGid => personFamc.set(cGid, famId));
          families.push({
            famId,
            husb: node.gender === 'P' ? '' : pGid,
            wife: node.gender === 'P' ? pGid : '',
            children: childGids,
            hasMarriage: false
          });
        }
      } else if (kids.length > 0) {
        const famId = `F${famIndex++}`;
        const childGids = kids.map(c => idMap.get(String(c.id))).filter(Boolean);
        addFamsLink(pGid, famId);
        childGids.forEach(cGid => personFamc.set(cGid, famId));
        families.push({
          famId,
          husb: node.gender === 'P' ? '' : pGid,
          wife: node.gender === 'P' ? pGid : '',
          children: childGids,
          hasMarriage: false
        });
      }

      kids.forEach(collectFamilies);
    }

    collectFamilies(treeData);

    const lines = [
      '0 HEAD',
      '1 SOUR SILSILAH-PRO-MAX',
      '1 CHAR UTF-8',
      '1 GEDC',
      '2 VERS 5.5.1',
      '2 FORM LINEAGE-LINKED'
    ];

    rows.forEach(({ person }) => {
      const gid = idMap.get(String(person.id));
      const nameParts = (person.name || 'Tanpa Nama').trim().split(/\s+/);
      const givenName = nameParts[0] || '';
      const surname = person.surname || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

      lines.push(`0 @${gid}@ INDI`, `1 NAME ${givenName} /${surname}/`);
      if (surname) lines.push(`2 SURN ${surname}`);
      lines.push(`1 SEX ${person.gender === 'P' ? 'F' : 'M'}`);

      if (person.birthDate || person.birthYear || person.birthPlace) {
        lines.push('1 BIRT');
        if (person.birthDate || person.birthYear) lines.push(`2 DATE ${person.birthDate || person.birthYear}`);
        if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`);
      }
      if (person.deathDate || person.deathYear) {
        lines.push('1 DEAT', `2 DATE ${person.deathDate || person.deathYear}`);
      }
      if (person.occupation) lines.push(`1 OCCU ${person.occupation}`);
      if (person.biography) lines.push(`1 NOTE ${person.biography.replace(/\r?\n/g, ' ')}`);

      const famsSet = personFams.get(gid);
      if (famsSet) {
        famsSet.forEach(famId => lines.push(`1 FAMS @${famId}@`));
      }
      const famcId = personFamc.get(gid);
      if (famcId) {
        lines.push(`1 FAMC @${famcId}@`);
      }
    });

    families.forEach(f => {
      lines.push(`0 @${f.famId}@ FAM`);
      if (f.husb) lines.push(`1 HUSB @${f.husb}@`);
      if (f.wife) lines.push(`1 WIFE @${f.wife}@`);
      (f.children || []).forEach(chGid => lines.push(`1 CHIL @${chGid}@`));
      if (f.hasMarriage) lines.push('1 MARR');
    });

    lines.push('0 TRLR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silsilah_keluarga_${new Date().toISOString().slice(0, 10)}.ged`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File standar GEDCOM 5.5.1 berhasil diekspor.');
  };

  window.importGEDCOM = function(fileText) {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin untuk mengimpor file GEDCOM.', true);
      return;
    }
    if (!fileText || !fileText.includes('INDI')) {
      return showToast('Format file GEDCOM tidak valid.', true);
    }

    try {
      const lines = fileText.split(/\r?\n/);
      const indis = new Map();
      const fams = new Map();
      let curr = null;
      let currType = null;
      let currSubTag = '';

      lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        const m = line.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Za-z0-9_]+)?(.*)$/);
        if (!m) return;
        const level = parseInt(m[1], 10);
        const id = m[2];
        const tag = m[3];
        const rest = (m[4] || '').trim();

        if (level === 0) {
          currSubTag = '';
          if (rest === 'INDI' || tag === 'INDI') {
            currType = 'INDI';
            curr = { id: id || tag, name: '', surname: '', gender: 'L', birthDate: '', birthPlace: '', deathDate: '', occupation: '', biography: '', famc: new Set(), fams: new Set() };
            indis.set(curr.id, curr);
          } else if (rest === 'FAM' || tag === 'FAM') {
            currType = 'FAM';
            curr = { id: id || tag, husb: '', wife: '', children: [] };
            fams.set(curr.id, curr);
          } else {
            curr = null;
            currType = null;
          }
        } else if (curr && currType === 'INDI') {
          if (level === 1) {
            currSubTag = tag;
            if (tag === 'NAME') curr.name = rest.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
            else if (tag === 'SEX') curr.gender = rest.toUpperCase().startsWith('F') || rest.toUpperCase().startsWith('P') ? 'P' : 'L';
            else if (tag === 'OCCU') curr.occupation = rest;
            else if (tag === 'NOTE') curr.biography = rest;
            else if (tag === 'FAMC') curr.famc.add(rest);
            else if (tag === 'FAMS') curr.fams.add(rest);
          } else if (level >= 2) {
            if (tag === 'SURN') curr.surname = rest;
            else if (tag === 'DATE') {
              if (currSubTag === 'DEAT') curr.deathDate = rest;
              else if (currSubTag === 'BIRT' || !curr.birthDate) curr.birthDate = rest;
            } else if (tag === 'PLAC') {
              if (currSubTag === 'BIRT' || !curr.birthPlace) curr.birthPlace = rest;
            }
          }
        } else if (curr && currType === 'FAM') {
          if (tag === 'HUSB') curr.husb = rest;
          else if (tag === 'WIFE') curr.wife = rest;
          else if (tag === 'CHIL') curr.children.push(rest);
        }
      });

      // Symmetrically populate fams & famc from FAM records in case INDI omitted tags
      fams.forEach((fam, fId) => {
        if (fam.husb && indis.has(fam.husb)) indis.get(fam.husb).fams.add(fId);
        if (fam.wife && indis.has(fam.wife)) indis.get(fam.wife).fams.add(fId);
        fam.children.forEach(chId => {
          if (indis.has(chId)) indis.get(chId).famc.add(fId);
        });
      });

      if (indis.size === 0) {
        return showToast('Tidak ada data anggota individu ditemukan di GEDCOM.', true);
      }

      const rootCandidate = Array.from(indis.values()).find(i => i.famc.size === 0) || Array.from(indis.values())[0];
      const visited = new Set();

      function buildTreeNode(indi) {
        if (!indi || visited.has(indi.id)) return null;
        visited.add(indi.id);

        const extractYear = (dStr) => {
          const ym = String(dStr || '').match(/\b(1[6-9]\d{2}|20\d{2})\b/);
          return ym ? ym[1] : '';
        };

        const node = {
          id: `ged-${Math.random().toString(36).slice(2, 9)}`,
          name: indi.name || 'Tanpa Nama',
          surname: indi.surname || '',
          gender: indi.gender || 'L',
          birthDate: /^\d{4}-\d{2}-\d{2}$/.test(indi.birthDate) ? indi.birthDate : '',
          birthYear: extractYear(indi.birthDate),
          birthPlace: indi.birthPlace || '',
          deathDate: /^\d{4}-\d{2}-\d{2}$/.test(indi.deathDate) ? indi.deathDate : '',
          deathYear: extractYear(indi.deathDate),
          occupation: indi.occupation || '',
          biography: indi.biography || '',
          spouses: [],
          children: [],
          isCollapsed: false
        };

        indi.fams.forEach(fId => {
          const fam = fams.get(fId);
          if (!fam) return;
          const spouseGid = fam.husb === indi.id ? fam.wife : fam.husb;
          const spouseIndi = spouseGid ? indis.get(spouseGid) : null;
          let spouseNodeId = '';

          if (spouseIndi) {
            visited.add(spouseIndi.id);
            spouseNodeId = `ged-${Math.random().toString(36).slice(2, 9)}`;
            node.spouses.push({
              id: spouseNodeId,
              name: spouseIndi.name || 'Pasangan',
              surname: spouseIndi.surname || '',
              gender: spouseIndi.gender || 'P',
              birthDate: /^\d{4}-\d{2}-\d{2}$/.test(spouseIndi.birthDate) ? spouseIndi.birthDate : '',
              birthYear: extractYear(spouseIndi.birthDate),
              birthPlace: spouseIndi.birthPlace || '',
              deathDate: /^\d{4}-\d{2}-\d{2}$/.test(spouseIndi.deathDate) ? spouseIndi.deathDate : '',
              deathYear: extractYear(spouseIndi.deathDate),
              occupation: spouseIndi.occupation || ''
            });
          }

          fam.children.forEach(chGid => {
            const chIndi = indis.get(chGid);
            const chNode = buildTreeNode(chIndi);
            if (chNode) {
              if (spouseNodeId) chNode.linkedSpouseId = spouseNodeId;
              node.children.push(chNode);
            }
          });
        });

        return node;
      }

      const importedTree = buildTreeNode(rootCandidate);
      if (!importedTree) {
        return showToast('Gagal membangun struktur pohon dari GEDCOM.', true);
      }

      customConfirm(
        'Impor File GEDCOM',
        `Ditemukan ${indis.size} anggota dan ${fams.size} ikatan keluarga. Ganti pohon silsilah saat ini dengan data GEDCOM tersebut?`,
        () => {
          treeData = importedTree;
          cameraInitialized = false;
          ensureFamilyNumbers();
          resetTreePerspective();
          simpanKeFirebase(`Impor GEDCOM (${indis.size} anggota)`);
          closeExportModal();
          showToast(`Sukses mengimpor ${indis.size} anggota dari file GEDCOM!`);
        }
      );
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses file GEDCOM.', true);
    }
  };

  // ==========================================================================
  // FITUR 6: MULTI-PAGE HERITAGE PDF BOOK GENERATOR ENGINE
  // ==========================================================================
  window.exportFamilyBookPDF = async function() {
    if (!window.jspdf) return showToast('Library PDF tidak tersedia.', true);
    showToast('Menyusun buku silsilah keluarga lengkap...');

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const rows = flattenPeople(treeData);
      const stats = calculateStats(treeData);
      const W = 210, H = 297, M = 18;
      const valMaxW = W - M * 2 - 42;

      // PAGE 1: LUXURY OBSIDIAN COVER
      pdf.setFillColor(7, 13, 24);
      pdf.rect(0, 0, W, H, 'F');

      pdf.setDrawColor(217, 119, 6);
      pdf.setLineWidth(1.2);
      pdf.rect(12, 12, W - 24, H - 24);
      pdf.setLineWidth(0.4);
      pdf.rect(14, 14, W - 28, H - 28);

      pdf.setTextColor(245, 158, 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('DOKUMEN WARISAN DAN NASAB KELUARGA BESAR', W / 2, 60, { align: 'center' });

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(26);
      const coverTitleLines = pdf.splitTextToSize(appSettings?.appTitle || 'Silsilah Keluarga', W - 44);
      pdf.text(coverTitleLines, W / 2, 85, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(13);
      pdf.setTextColor(148, 163, 184);
      pdf.text(appSettings?.appSubtitle || 'Family Heritage Workspace', W / 2, 102, { align: 'center' });

      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(W / 2 - 60, 160, 120, 36, 6, 6, 'F');
      pdf.setTextColor(56, 189, 248);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(`${stats.total}`, W / 2 - 30, 178, { align: 'center' });
      pdf.text(`${stats.maxDepth}`, W / 2 + 30, 178, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('TOTAL ANGGOTA', W / 2 - 30, 185, { align: 'center' });
      pdf.text('RENTANG GENERASI', W / 2 + 30, 185, { align: 'center' });

      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Diterbitkan pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, W / 2, 260, { align: 'center' });

      // PAGE 2: KATA PENGANTAR & RINGKASAN DEMOGRAFI
      pdf.addPage();
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, W, 26, 'F');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('KATA PENGANTAR & RINGKASAN TRAH', M, 17);

      let p2Y = 42;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(51, 65, 85);
      const introText = 'Buku silsilah ini disusun sebagai ikhtiar menjaga tali silaturahmi, merawat ingatan sejarah leluhur, serta menjadi panduan bagi generasi penerus untuk saling mengenal sanak kerabat dan asal-usul keluarga besarnya.';
      pdf.text(pdf.splitTextToSize(introText, W - M * 2), M, p2Y);

      p2Y += 26;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('RINGKASAN DEMOGRAFI KELUARGA', M, p2Y);

      p2Y += 8;
      const demoRows = [
        ['Total Anggota Tercatat', `${stats.total} Jiwa`],
        ['Laki-laki', `${stats.male} Orang`],
        ['Perempuan', `${stats.female} Orang`],
        ['Anggota Masih Hidup', `${stats.living} Orang`],
        ['Telah Berpulang (Almarhum/ah)', `${stats.deceased} Orang`],
        ['Rentang Generasi', `${stats.maxDepth} Tingkat Generasi`]
      ];

      demoRows.forEach(([k, v]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(k, M, p2Y);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(v, M + 80, p2Y);
        p2Y += 8;
      });

      function drawProfileHeader(name, generation, familyNumber) {
        pdf.addPage();
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 0, W, 22, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text(name || 'Tanpa Nama', M, 14);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Generasi ${generation} | ${familyNumber || ''}`, W - M, 14, { align: 'right' });
      }

      // PROFILES PAGES
      rows.forEach(({ person, generation }) => {
        drawProfileHeader(person.name, generation, person.familyNumber);

        const astro = getAstrologyProfile(person);
        const astroText = [
          astro.sun ? `Zodiak ${astro.sun.name}` : '',
          astro.chinese ? `Shio ${astro.chinese.name} (${astro.chinese.element})` : ''
        ].filter(Boolean).join(', ');

        let y = 36;
        const meta = [
          ['Nama Lengkap', person.name],
          ['Marga / Trah', person.surname],
          ['Kelahiran', `${person.birthPlace || ''} ${person.birthDate || person.birthYear || ''}`.trim()],
          ['Status', person.deathDate || person.deathYear ? `Wafat (${person.deathDate || person.deathYear})` : 'Masih Hidup'],
          ['Astrologi & Shio', astroText],
          ['Profesi', person.occupation],
          ['Gol. Darah', person.bloodType],
          ['No. HP', person.phone],
          ['Alamat', person.address],
          ['Pasangan', (person.spouses || []).length ? person.spouses.map(s => s.name).join(', ') : '']
        ].filter(r => r[1]);

        meta.forEach(([k, v]) => {
          const valLines = pdf.splitTextToSize(String(v), valMaxW);
          if (y + valLines.length * 6 > H - 25) {
            drawProfileHeader(`${person.name} (Lanjutan)`, generation, person.familyNumber);
            y = 36;
          }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(k.toUpperCase(), M, y);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(15, 23, 42);
          pdf.text(valLines, M + 42, y);
          y += Math.max(9, valLines.length * 5.5 + 3.5);
        });

        if (person.children && person.children.length > 0) {
          const childNames = person.children.map((c, i) => `${i + 1}. ${c.name}`).join('   ');
          const childLines = pdf.splitTextToSize(childNames, valMaxW);
          if (y + childLines.length * 6 > H - 25) {
            drawProfileHeader(`${person.name} (Lanjutan)`, generation, person.familyNumber);
            y = 36;
          }
          y += 3;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text('DAFTAR ANAK', M, y);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9.5);
          pdf.setTextColor(15, 23, 42);
          pdf.text(childLines, M + 42, y);
          y += Math.max(9, childLines.length * 5.5 + 4);
        }

        if (person.biography) {
          y += 5;
          if (y > H - 35) {
            drawProfileHeader(`${person.name} (Biografi)`, generation, person.familyNumber);
            y = 36;
          }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(15, 23, 42);
          pdf.text('BIOGRAFI & KISAH HIDUP', M, y);
          y += 6;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);
          const bioLines = pdf.splitTextToSize(person.biography, W - M * 2);
          bioLines.forEach(line => {
            if (y > H - 22) {
              drawProfileHeader(`${person.name} (Biografi)`, generation, person.familyNumber);
              y = 36;
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              pdf.setTextColor(51, 65, 85);
            }
            pdf.text(line, M, y);
            y += 5.2;
          });
        }
      });

      // FINAL SECTION: INDEKS NAMA (Multi-page safe)
      function drawIndexHeader(isContinuation = false) {
        pdf.addPage();
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 0, W, 22, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text(isContinuation ? 'INDEKS ANGGOTA KELUARGA (LANJUTAN)' : 'INDEKS ANGGOTA KELUARGA', M, 14);
      }

      drawIndexHeader(false);
      let idxY = 34;
      let colX = M;
      const sortedNames = [...rows].sort((a, b) => (a.person.name || '').localeCompare(b.person.name || ''));

      sortedNames.forEach(({ person, generation }) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(15, 23, 42);
        const entryText = `${(person.name || '').slice(0, 24)} (G${generation})`;
        pdf.text(entryText, colX, idxY);
        idxY += 6;
        if (idxY > H - 22) {
          idxY = 34;
          colX += 60;
          if (colX > W - M - 40) {
            drawIndexHeader(true);
            colX = M;
            idxY = 34;
          }
        }
      });

      // Add subtle page numbering on pages 2..N
      const totalPages = pdf.getNumberOfPages();
      for (let p = 2; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Halaman ${p - 1} dari ${totalPages - 1}`, W / 2, H - 10, { align: 'center' });
      }

      pdf.save(`Buku_Silsilah_Keluarga_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Buku silsilah PDF berhasil dibuat!');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyusun buku silsilah PDF.', true);
    }
  };

  // ==========================================================================
  // FITUR 7: RBAC, GUEST READ-ONLY SHARE, JSON IMPORT & WHATSAPP ENGINE
  // ==========================================================================
  let isGuestMode = false;
  let shareQrInstance = null;
  let rbacInitialized = false;

  function initRbacAndShare() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const readonly = params.get('readonly');

    if (mode === 'view' || readonly === 'true') {
      isGuestMode = true;
      document.body.classList.add('guest-mode');
      const banner = document.getElementById('guest-readonly-banner');
      if (banner) banner.classList.remove('hidden');

      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.classList.add('hidden');
    }

    if (rbacInitialized) return;
    rbacInitialized = true;

    const gedcomInput = document.getElementById('gedcom-input');
    if (gedcomInput) {
      gedcomInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => importGEDCOM(evt.target.result);
        reader.readAsText(file);
        gedcomInput.value = '';
      });
    }

    const importJsonInput = document.getElementById('import-input');
    if (importJsonInput) {
      importJsonInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (isGuestMode) {
          showToast('Mode Baca Saja aktif. Buka kunci Admin untuk memuat JSON.', true);
          importJsonInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            const nextTree = parsed?.tree ? parsed.tree : (parsed?.id && parsed?.name ? parsed : null);
            if (!nextTree) {
              return showToast('Format file JSON silsilah tidak valid.', true);
            }
            const nextRows = flattenPeople(nextTree);
            customConfirm(
              'Muat Data JSON',
              `Ditemukan ${nextRows.length} anggota dalam file JSON. Ganti data silsilah saat ini dengan data dari file?`,
              () => {
                treeData = nextTree;
                if (parsed?.settings) appSettings = { ...initialAppSettings, ...parsed.settings };
                if (Array.isArray(parsed?.familyEvents)) familyEvents = parsed.familyEvents;
                cameraInitialized = false;
                ensureFamilyNumbers();
                document.getElementById('app-main-title').textContent = appSettings.appTitle;
                document.getElementById('app-sub-title').textContent = appSettings.appSubtitle;
                resetTreePerspective();
                simpanKeFirebase(`Muat JSON (${nextRows.length} anggota)`);
                closeExportModal();
                showToast(`Data JSON (${nextRows.length} anggota) berhasil dimuat!`);
              }
            );
          } catch (err) {
            console.error(err);
            showToast('Gagal membaca file JSON. Pastikan format JSON benar.', true);
          }
        };
        reader.readAsText(file);
        importJsonInput.value = '';
      });
    }
  }

  window.openShareLinkModal = function() {
    const modal = document.getElementById('share-link-modal');
    if (!modal) return;
    modal.classList.add('open');
    updateShareUrl();
  };

  window.closeShareLinkModal = function() {
    const modal = document.getElementById('share-link-modal');
    if (modal) modal.classList.remove('open');
  };

  window.updateShareUrl = function() {
    const roleRadio = document.querySelector('input[name="shareRole"]:checked');
    const role = roleRadio ? roleRadio.value : 'view';

    document.getElementById('label-role-view')?.classList.toggle('active', role === 'view');
    document.getElementById('label-role-admin')?.classList.toggle('active', role === 'admin');

    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const fullUrl = role === 'view' ? `${origin}${pathname}?mode=view` : `${origin}${pathname}`;

    const input = document.getElementById('share-url-input');
    if (input) input.value = fullUrl;

    const qrBox = document.getElementById('share-qr-box');
    if (qrBox && typeof QRCode !== 'undefined') {
      qrBox.innerHTML = '';
      shareQrInstance = new QRCode(qrBox, {
        text: fullUrl,
        width: 170,
        height: 170,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  };

  window.copyShareUrl = function() {
    const input = document.getElementById('share-url-input');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('Tautan berhasil disalin!');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('Tautan disalin ke clipboard!');
    });
  };

  window.shareViaWhatsApp = function() {
    const input = document.getElementById('share-url-input');
    const url = input ? input.value : window.location.href;
    const appTitle = appSettings?.appTitle || 'Silsilah Keluarga';
    const msg = `Halo keluarga besar! Silakan buka portal ${appTitle} kita secara interaktif di sini: ${url} (Dapat dibuka langsung dari smartphone, mode baca aman).`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  window.promptAdminUnlock = function() {
    const modal = document.getElementById('admin-unlock-modal');
    if (modal) {
      document.getElementById('admin-pin-input').value = '';
      document.getElementById('admin-unlock-error')?.classList.add('hidden');
      modal.classList.add('open');
    }
  };

  window.closeAdminUnlockModal = function() {
    const modal = document.getElementById('admin-unlock-modal');
    if (modal) modal.classList.remove('open');
  };

  window.verifyAdminUnlock = function() {
    const input = document.getElementById('admin-pin-input');
    const errorMsg = document.getElementById('admin-unlock-error');
    const entered = (input?.value || '').trim();
    const correctPin = String(appSettings?.accessCode || '12345').trim();

    if (entered === correctPin) {
      isGuestMode = false;
      document.body.classList.remove('guest-mode');
      document.getElementById('guest-readonly-banner')?.classList.add('hidden');
      closeAdminUnlockModal();
      showToast('Akses Admin aktif! Fitur sunting telah dibuka.');
    } else {
      if (errorMsg) errorMsg.classList.remove('hidden');
    }
  };

  window.printFamilyBook = function() {
    window.print();
  };

  window.exportJSON = function() {
    const dataObj = {
      version: '2.0',
      settings: appSettings,
      tree: treeData,
      familyEvents
    };
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silsilah_keluarga_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data JSON berhasil disimpan.');
  };

  window.exportWebProject = async function() {
    if (typeof JSZip === 'undefined') {
      showToast('JSZip tidak tersedia.', true);
      return;
    }
    showToast('Menyiapkan paket zip proyek...');
    try {
      const zip = new JSZip();
      const htmlText = document.documentElement.outerHTML;
      zip.file('index.html', htmlText);
      zip.file('data_backup.json', JSON.stringify({ tree: treeData, settings: appSettings, familyEvents }, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `silsilah_pro_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Cadangan zip proyek berhasil diunduh.');
    } catch (err) {
      showToast('Gagal membuat zip proyek.', true);
    }
  };

  // --- SETTINGS MODAL ---
  window.openSettingsModal = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin untuk mengubah pengaturan.', true);
      return;
    }
    document.getElementById('set-title').value = appSettings?.appTitle || 'Silsilah Keluarga';
    document.getElementById('set-subtitle').value = appSettings?.appSubtitle || 'Family Heritage Workspace';
    document.getElementById('set-password').value = appSettings?.accessCode || '';
    document.getElementById('set-cardstyle').value = appSettings?.cardStyle || 'default';
    document.getElementById('set-editmode').checked = Boolean(appSettings?.enableEdit);

    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('open');
  };

  window.closeSettingsModal = function() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('open');
  };

  window.saveSettings = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Pengaturan tidak dapat disimpan.', true);
      return;
    }
    appSettings.appTitle = document.getElementById('set-title').value.trim() || 'Silsilah Keluarga';
    appSettings.appSubtitle = document.getElementById('set-subtitle').value.trim() || 'Family Heritage Workspace';
    appSettings.accessCode = document.getElementById('set-password').value.trim();
    appSettings.cardStyle = document.getElementById('set-cardstyle').value;
    appSettings.enableEdit = document.getElementById('set-editmode').checked;

    document.getElementById('app-main-title').textContent = appSettings.appTitle;
    document.getElementById('app-sub-title').textContent = appSettings.appSubtitle;

    closeSettingsModal();
    renderTree();
    simpanKeFirebase('Pembaruan pengaturan aplikasi');
    showToast('Pengaturan ruang kerja berhasil disimpan.');
  };

  // --- FAMILY EVENTS MODAL ---
  window.openFamilyEventModal = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Buka kunci Admin terlebih dahulu.', true);
      return;
    }
    const personSel = document.getElementById('event-person');
    if (personSel) {
      personSel.innerHTML = '<option value="">- Tidak terkait person tertentu -</option>';
      flattenPeople(treeData).forEach(({ person }) => {
        const opt = document.createElement('option');
        opt.value = person.id;
        opt.textContent = person.name;
        personSel.appendChild(opt);
      });
    }
    const modal = document.getElementById('family-event-modal');
    if (modal) modal.classList.add('open');
  };

  window.closeFamilyEventModal = function() {
    const modal = document.getElementById('family-event-modal');
    if (modal) modal.classList.remove('open');
  };

  window.saveFamilyEvent = function() {
    if (isGuestMode) {
      showToast('Mode Baca Saja aktif. Acara tidak dapat disimpan.', true);
      return;
    }
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const type = document.getElementById('event-type').value;
    const personId = document.getElementById('event-person').value;
    const notes = document.getElementById('event-notes').value.trim();

    if (!title) {
      showToast('Judul acara wajib diisi.', true);
      return;
    }

    familyEvents.push({
      id: generateId(),
      title,
      date,
      type,
      personId,
      notes
    });

    closeFamilyEventModal();
    if (currentActiveView === 'calendar') renderCalendar();
    simpanKeFirebase(`Tambah acara keluarga ${title}`);
    showToast('Acara keluarga berhasil disimpan.');
  };

  // --- PROFILE SHARE & QR MODAL ---
  window.openProfileShare = function() {
    const targetId = selectedSpouseId || selectedNodeId || (treeData ? treeData.id : '');
    const person = findNodeById(treeData, targetId);
    if (!person) return;

    document.getElementById('profile-share-name').textContent = person.name || 'Anggota Keluarga';
    const shareUrl = `${window.location.origin}${window.location.pathname}?person=${targetId}`;
    document.getElementById('profile-share-url').value = shareUrl;

    const qrContainer = document.getElementById('profile-qr-code');
    if (qrContainer && typeof QRCode !== 'undefined') {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
        text: shareUrl,
        width: 180,
        height: 180,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    const modal = document.getElementById('profile-share-modal');
    if (modal) modal.classList.add('open');
  };

  window.closeProfileShare = function() {
    const modal = document.getElementById('profile-share-modal');
    if (modal) modal.classList.remove('open');
  };

  window.copyProfileShareLink = function() {
    const input = document.getElementById('profile-share-url');
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('Tautan berhasil disalin ke clipboard.');
    }).catch(() => {
      document.execCommand('copy');
      showToast('Tautan berhasil disalin.');
    });
  };

  // --- PRESENTATION MODE SLIDESHOW ---
  window.openPresentationMode = function() {
    presentationPeople = flattenPeople(treeData).map(r => r.person);
    if (!presentationPeople.length) return;
    presentationIndex = 0;
    document.getElementById('presentation-mode')?.classList.remove('hidden');
    renderPresentationSlide();
  };

  window.closePresentationMode = function() {
    document.getElementById('presentation-mode')?.classList.add('hidden');
  };

  window.presentationNext = function() {
    if (presentationIndex < presentationPeople.length - 1) {
      presentationIndex++;
      renderPresentationSlide();
    }
  };

  window.presentationPrevious = function() {
    if (presentationIndex > 0) {
      presentationIndex--;
      renderPresentationSlide();
    }
  };

  function renderPresentationSlide() {
    const p = presentationPeople[presentationIndex];
    if (!p) return;

    document.getElementById('presentation-counter').textContent = `${presentationIndex + 1} / ${presentationPeople.length}`;
    const c = document.getElementById('presentation-content');
    if (!c) return;

    c.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 48px; max-width: 900px; margin: auto; padding: 40px;">
        <div style="width: 280px; height: 350px; border-radius: 24px; overflow: hidden; background: #1e293b; display: grid; place-items: center; font-size: 64px; flex-shrink: 0; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          ${p.photoUrl ? `<img src="${sanitizeURL(p.photoUrl)}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fa-solid fa-user" style="color: #64748b;"></i>`}
        </div>
        <div style="min-width: 0;">
          <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #38bdf8;">${escapeHTML(p.familyNumber || 'Profil Anggota')}</span>
          <h2 style="font-size: 38px; font-weight: 800; color: #fff; margin-top: 6px; line-height: 1.15;">${escapeHTML(p.name)}</h2>
          <p style="font-size: 14px; color: #94a3b8; margin-top: 8px;">
            ${escapeHTML(p.birthPlace || '')} ${p.birthYear ? `• Lahir ${p.birthYear}` : ''} ${p.occupation ? `• ${p.occupation}` : ''}
          </p>
          <div style="margin-top: 20px; font-size: 14px; line-height: 1.7; color: #cbd5e1; max-height: 180px; overflow-y: auto;">
            ${escapeHTML(p.biography || p.notes || 'Belum ada catatan narasi riwayat hidup untuk anggota keluarga ini.')}
          </div>
        </div>
      </div>
    `;
  }

  // --- ACCESS CONTROL & SESSION VAULT ---
  function hasActiveSession() {
    return localStorage.getItem(SESSION_KEY) === 'active' || sessionStorage.getItem(SESSION_KEY) === 'active';
  }

  function setSession(active, persist = true) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (active) {
      (persist ? localStorage : sessionStorage).setItem(SESSION_KEY, 'active');
    }
  }

  function checkAppLock(force = false) {
    const hasPassword = Boolean(appSettings?.accessCode && String(appSettings.accessCode).trim() !== '');
    const screen = document.getElementById('login-screen');
    const btnLogout = document.getElementById('btn-logout');

    if (isGuestMode) {
      screen?.classList.add('hidden');
      if (btnLogout) btnLogout.style.display = 'none';
      return;
    }

    if (!force && (!hasPassword || hasActiveSession())) {
      screen?.classList.add('hidden');
      if (btnLogout) btnLogout.style.display = hasPassword ? 'flex' : 'none';
      return;
    }

    screen?.classList.remove('hidden');
    if (btnLogout) btnLogout.style.display = 'none';
  }

  window.attemptLogin = function() {
    const input = document.getElementById('login-input');
    const errEl = document.getElementById('login-error');
    const remember = document.getElementById('remember-session')?.checked;
    const val = (input?.value || '').trim();

    if (val === String(appSettings?.accessCode || '').trim()) {
      setSession(true, remember);
      document.getElementById('login-screen')?.classList.add('hidden');
      if (errEl) errEl.classList.add('hidden');
      if (input) input.value = '';
      showToast('Akses berhasil dibuka. Selamat datang.');
    } else {
      if (errEl) errEl.classList.remove('hidden');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  };

  window.togglePasswordVisibility = function() {
    const input = document.getElementById('login-input');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  };

  window.logout = function() {
    setSession(false);
    checkAppLock(true);
    showToast('Sesi telah diakhiri.');
  };

  window.toggleSidebar = function(force) {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;
    const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
  };

  // --- DATA LOADING & BOOT SEQUENCE ---
  function applyLoadedData(data, source = 'cloud') {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
    const usePendingLocal = source === 'cloud' && cached?.pending && cached?.cachedAt > Number(data?.meta?.updatedAt || 0);
    const chosen = usePendingLocal ? cached : data;

    if (chosen?.tree) treeData = chosen.tree;
    else if (!treeData) treeData = initialTreeData;

    if (chosen?.settings) appSettings = { ...initialAppSettings, ...chosen.settings };
    else if (!appSettings) appSettings = { ...initialAppSettings };

    if (Array.isArray(chosen?.familyEvents)) familyEvents = chosen.familyEvents;

    ensureFamilyNumbers();
    document.getElementById('app-main-title').textContent = appSettings.appTitle;
    document.getElementById('app-sub-title').textContent = appSettings.appSubtitle;

    renderTree();
    checkAppLock();
  }

  function bootApplication() {
    const bootScreen = document.getElementById('boot-screen');
    const bootMessage = document.getElementById('boot-message');

    // 1. Try Local Storage Cache First for Instant Rendering (0 CLS)
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
    if (cached?.tree) {
      applyLoadedData(cached, 'local');
      if (bootMessage) bootMessage.textContent = 'Memuat silsilah dari memori lokal...';
    } else {
      applyLoadedData({ tree: initialTreeData, settings: initialAppSettings }, 'fallback');
    }

    // 2. Connect to Firebase Realtime Database
    cloudRef.once('value').then(snap => {
      if (snap.exists()) {
        applyLoadedData(snap.val(), 'cloud');
        setSyncStatus('online', 'Tersinkron ke cloud', 'Data terbaru');
      } else {
        // Initialize default node in database
        cloudRef.set(getCloudPayload()).then(() => {
          setSyncStatus('online', 'Cloud diinisialisasi', 'Database baru siap');
        });
      }
      setTimeout(() => {
        if (bootScreen) {
          bootScreen.style.opacity = '0';
          bootScreen.style.pointerEvents = 'none';
          setTimeout(() => bootScreen.remove(), 400);
        }
      }, 350);
    }).catch(err => {
      console.warn('Cloud connection offline:', err);
      setSyncStatus('offline', 'Mode offline', 'Bekerja dengan cache lokal');
      setTimeout(() => {
        if (bootScreen) {
          bootScreen.style.opacity = '0';
          bootScreen.style.pointerEvents = 'none';
          setTimeout(() => bootScreen.remove(), 400);
        }
      }, 350);
    });

    // Handle deep-link '?person=xxx'
    const urlParams = new URLSearchParams(window.location.search);
    const targetPersonParam = urlParams.get('person');
    if (targetPersonParam) {
      setTimeout(() => {
        flyToPerson(targetPersonParam);
        openInspectorDrawer(targetPersonParam);
      }, 700);
    }
  }

  // --- INITIALIZATION ON DOM READY ---
  document.addEventListener('DOMContentLoaded', () => {
    initCanvasGestures();
    initGlobalSearch();
    initRbacAndShare();
    bootApplication();

    window.addEventListener('resize', () => {
      scheduleTreeConnectorRender();
      updateMinimap();
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '0' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        fitTreeToViewport(true);
      } else if (e.key === '1') {
        e.preventDefault();
        setZoom100();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustZoom(0.12);
      } else if (e.key === '-') {
        e.preventDefault();
        adjustZoom(-0.12);
      } else if (e.key === 'Escape') {
        closeInspectorDrawer();
        closeEditorModal();
        closeExportModal();
        closeSettingsModal();
        closePresentationMode();
        closeKinshipModal();
        closeShareLinkModal();
        closeAdminUnlockModal();
      }
    });
  });

})();
