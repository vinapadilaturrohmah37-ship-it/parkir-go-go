// ========== STATE ==========
let currentUser = null;
let settings = JSON.parse(localStorage.getItem('parkir_settings')) || {
  maxSlots: 100,
  rates: { Motor: 2000, Mobil: 5000, 'Box / Truk': 8000 }
};
let parked = JSON.parse(localStorage.getItem('parkir_parked')) || [];
let history = JSON.parse(localStorage.getItem('parkir_history')) || [];

// ========== USERS ==========
function getUsers() {
  return JSON.parse(localStorage.getItem('parkir_users')) || [];
}

function saveUsers(users) {
  localStorage.setItem('parkir_users', JSON.stringify(users));
}

async function hashPassword(password) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'parkir_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return btoa(password + 'parkir_salt_2024');
  }
}

async function initDefaultAdmin() {
  const users = getUsers();
  const adminExists = users.some(u => u.email === 'luqman@parkir.com');
  if (!adminExists) {
    const hash = await hashPassword('luqman123');
    users.push({
      id: 'admin-001',
      name: 'Luqman',
      email: 'luqman@parkir.com',
      passwordHash: hash,
      role: 'admin',
      createdAt: Date.now()
    });
    saveUsers(users);
  }
}

// ========== AUTH UI ==========
function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('auth-subtitle').textContent = 'Masuk ke Sistem Manajemen Parkir';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('register-error').style.display = 'none';
  document.getElementById('register-success').style.display = 'none';
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
  document.getElementById('auth-subtitle').textContent = 'Buat Akun Baru';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('register-error').style.display = 'none';
  document.getElementById('register-success').style.display = 'none';
}

// ========== REGISTER ==========
async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('reg-password').value;
  const pass2 = document.getElementById('reg-password2').value;
  const err = document.getElementById('register-error');
  const success = document.getElementById('register-success');

  err.style.display = 'none';
  success.style.display = 'none';

  if (!name || name.length < 2) {
    err.style.display = 'block';
    err.textContent = 'Nama minimal 2 karakter';
    return;
  }
  if (!email || !email.includes('@')) {
    err.style.display = 'block';
    err.textContent = 'Email tidak valid';
    return;
  }
  if (pass.length < 6) {
    err.style.display = 'block';
    err.textContent = 'Password minimal 6 karakter';
    return;
  }
  if (pass !== pass2) {
    err.style.display = 'block';
    err.textContent = 'Konfirmasi password tidak cocok';
    return;
  }

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    err.style.display = 'block';
    err.textContent = 'Email sudah terdaftar. Silakan login.';
    return;
  }

  const hash = await hashPassword(pass);
  users.push({
    id: 'user-' + Date.now(),
    name,
    email,
    passwordHash: hash,
    role: 'user',
    createdAt: Date.now()
  });
  saveUsers(users);

  success.style.display = 'block';
  success.textContent = 'Akun berhasil dibuat! Silakan login.';

  document.getElementById('reg-name').value = '';
  document.getElementById('reg-email').value = '';
  document.getElementById('reg-password').value = '';
  document.getElementById('reg-password2').value = '';

  setTimeout(() => {
    showLogin();
    document.getElementById('login-email').value = email;
  }, 1500);
}

// ========== LOGIN ==========
async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  const remember = document.getElementById('remember-me').checked;

  err.style.display = 'none';

  if (!email || !pass) {
    err.style.display = 'block';
    err.textContent = 'Email dan password wajib diisi';
    return;
  }
  if (pass.length < 6) {
    err.style.display = 'block';
    err.textContent = 'Password minimal 6 karakter';
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    err.style.display = 'block';
    err.textContent = 'Email belum terdaftar. Silakan daftar dulu.';
    return;
  }

  const hash = await hashPassword(pass);
  if (hash !== user.passwordHash) {
    err.style.display = 'block';
    err.textContent = 'Password salah';
    return;
  }

  currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  if (remember) {
    localStorage.setItem('parkir_session', JSON.stringify(currentUser));
  } else {
    sessionStorage.setItem('parkir_session', JSON.stringify(currentUser));
  }

  startApp();
}

function doLoginGoogle() {
  currentUser = {
    id: 'google-' + Date.now(),
    name: 'Pengguna Google',
    email: 'google.user@gmail.com',
    role: 'user'
  };
  localStorage.setItem('parkir_session', JSON.stringify(currentUser));
  startApp();
}

function startApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-name-display').textContent =
    currentUser.name + (currentUser.role === 'admin' ? ' (Admin)' : '');

  // Isi profil
  document.getElementById('profile-name').value = currentUser.name;
  document.getElementById('profile-email').value = currentUser.email;
  document.getElementById('profile-role').value = currentUser.role === 'admin' ? 'Administrator' : 'Pengguna';

  updateDateTime();
  setInterval(updateDateTime, 1000);
  setInterval(renderParked, 20000);

  loadSettingsToForm();
  updateStats();
  renderParked();
  renderHistory();
  applyRoleRestriction();
  renderUsers();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('parkir_session');
  sessionStorage.removeItem('parkir_session');

  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
  showLogin();
}

// ========== UBAH PASSWORD ==========
async function changePassword() {
  const oldPass = document.getElementById('old-password').value;
  const newPass = document.getElementById('new-password').value;
  const newPass2 = document.getElementById('new-password2').value;
  const err = document.getElementById('password-error');
  const success = document.getElementById('password-success');

  err.style.display = 'none';
  success.style.display = 'none';

  if (!oldPass || !newPass || !newPass2) {
    err.style.display = 'block';
    err.textContent = 'Semua field wajib diisi';
    return;
  }
  if (newPass.length < 6) {
    err.style.display = 'block';
    err.textContent = 'Password baru minimal 6 karakter';
    return;
  }
  if (newPass !== newPass2) {
    err.style.display = 'block';
    err.textContent = 'Konfirmasi password baru tidak cocok';
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);
  if (!user) {
    err.style.display = 'block';
    err.textContent = 'User tidak ditemukan';
    return;
  }

  const oldHash = await hashPassword(oldPass);
  if (oldHash !== user.passwordHash) {
    err.style.display = 'block';
    err.textContent = 'Password lama salah';
    return;
  }

  user.passwordHash = await hashPassword(newPass);
  saveUsers(users);

  success.style.display = 'block';
  success.textContent = 'Password berhasil diubah!';

  document.getElementById('old-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('new-password2').value = '';
}

// ========== ROLE ==========
function applyRoleRestriction() {
  const isAdmin = currentUser && currentUser.role === 'admin';

  const tabSettings = document.getElementById('tab-settings');
  if (tabSettings) tabSettings.style.display = isAdmin ? 'inline-block' : 'none';

  const tabUsers = document.getElementById('tab-users');
  if (tabUsers) tabUsers.style.display = isAdmin ? 'inline-block' : 'none';

  const btnHapus = document.getElementById('btn-hapus-riwayat');
  if (btnHapus) btnHapus.style.display = isAdmin ? 'inline-block' : 'none';

  if (!isAdmin) {
    const panelSettings = document.getElementById('panel-settings');
    const panelUsers = document.getElementById('panel-users');
    if (panelSettings && panelSettings.classList.contains('active')) switchTab('ops');
    if (panelUsers && panelUsers.classList.contains('active')) switchTab('ops');
  }
}

// ========== KELOLA PENGGUNA ==========
function renderUsers() {
  if (!currentUser || currentUser.role !== 'admin') return;

  const users = getUsers();
  const tbody = document.getElementById('users-tbody');
  document.getElementById('user-count').textContent = users.length + ' pengguna';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Belum ada pengguna.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const date = new Date(u.createdAt).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const canDelete = u.email !== 'luqman@parkir.com' && u.id !== currentUser.id;
    const canReset = u.id !== currentUser.id;
    return `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="role-badge role-${u.role}">${u.role === 'admin' ? 'Admin' : 'User'}</span></td>
        <td>${date}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          ${canReset ? `<button class="btn-sm btn-outline" onclick="resetUserPassword('${u.id}')">Reset Pass</button>` : ''}
          ${canDelete ? `<button class="btn-sm btn-red" onclick="deleteUser('${u.id}')">Hapus</button>` : '<span style="color:#999;font-size:12px">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

async function resetUserPassword(id) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!confirm('Reset password user ini menjadi: 123456 ?')) return;

  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (!user) return;

  user.passwordHash = await hashPassword('123456');
  saveUsers(users);
  alert('Password berhasil direset menjadi: 123456');
  renderUsers();
}

function deleteUser(id) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!confirm('Yakin ingin menghapus pengguna ini?')) return;

  let users = getUsers();
  users = users.filter(u => u.id !== id);
  saveUsers(users);
  renderUsers();
}

// ========== UTILS ==========
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  };
  document.getElementById('current-datetime').textContent =
    now.toLocaleDateString('id-ID', options);
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return m + ' menit';
  return h + ' jam ' + m + ' menit';
}

function calcFee(type, entryTime, exitTime) {
  const ms = exitTime - entryTime;
  const hours = Math.max(1, Math.ceil(ms / 3600000));
  const rate = settings.rates[type] || 2000;
  return hours * rate;
}

function generateTicket() {
  const num = String(parked.length + history.length + 1).padStart(4, '0');
  return 'TKT-' + num;
}

function saveData() {
  localStorage.setItem('parkir_parked', JSON.stringify(parked));
  localStorage.setItem('parkir_history', JSON.stringify(history));
  localStorage.setItem('parkir_settings', JSON.stringify(settings));
}

// ========== STATS ==========
function updateStats() {
  const today = new Date().toDateString();
  const exitedToday = history.filter(h => new Date(h.exitTime).toDateString() === today);
  const revenueToday = exitedToday.reduce((sum, h) => sum + h.fee, 0);

  document.getElementById('stat-parked').textContent = parked.length;
  document.getElementById('stat-available').textContent = settings.maxSlots - parked.length;
  document.getElementById('stat-exited').textContent = exitedToday.length;
  document.getElementById('stat-revenue').textContent =
    'Rp ' + revenueToday.toLocaleString('id-ID');
}

// ========== TABS ==========
function switchTab(tab) {
  if (tab === 'settings' && currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat mengakses Pengaturan');
    return;
  }
  if (tab === 'users' && currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat mengakses Kelola Pengguna');
    return;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'users') renderUsers();
}

// ========== OPERASIONAL ==========
function addVehicle() {
  const plate = document.getElementById('input-plate').value.trim().toUpperCase();
  const type = document.getElementById('input-type').value;
  const note = document.getElementById('input-note').value.trim();

  if (!plate) {
    alert('Plat nomor wajib diisi!');
    return;
  }
  if (parked.some(p => p.plate === plate)) {
    alert('Kendaraan dengan plat ini sudah parkir!');
    return;
  }
  if (parked.length >= settings.maxSlots) {
    alert('Slot parkir sudah penuh!');
    return;
  }

  parked.push({
    ticket: generateTicket(),
    plate,
    type,
    note,
    entryTime: Date.now()
  });
  saveData();
  updateStats();
  renderParked();

  document.getElementById('input-plate').value = '';
  document.getElementById('input-note').value = '';
}

function exitVehicle(ticket) {
  const idx = parked.findIndex(p => p.ticket === ticket);
  if (idx === -1) return;

  const vehicle = parked[idx];
  const exitTime = Date.now();
  const fee = calcFee(vehicle.type, vehicle.entryTime, exitTime);
  const duration = formatDuration(exitTime - vehicle.entryTime);

  history.unshift({ ...vehicle, exitTime, duration, fee });
  parked.splice(idx, 1);
  saveData();
  updateStats();
  renderParked();
  renderHistory();
  showStruk({ ...vehicle, exitTime, duration, fee });
}

function renderParked() {
  const keyword = (document.getElementById('search-parked')?.value || '').toLowerCase();
  const tbody = document.getElementById('parked-tbody');
  const filtered = parked.filter(p =>
    p.plate.toLowerCase().includes(keyword) ||
    p.ticket.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Tidak ada kendaraan sedang parkir.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>${p.ticket}</td>
      <td><strong>${p.plate}</strong></td>
      <td>${p.type}</td>
      <td>${formatTime(p.entryTime)}</td>
      <td>${formatDuration(Date.now() - p.entryTime)}</td>
      <td>
        <button class="btn-sm btn-green" onclick="exitVehicle('${p.ticket}')">Keluar</button>
      </td>
    </tr>
  `).join('');
}

// ========== RIWAYAT ==========
function renderHistory() {
  const keyword = (document.getElementById('search-history')?.value || '').toLowerCase();
  const tbody = document.getElementById('history-tbody');
  const filtered = history.filter(h =>
    h.plate.toLowerCase().includes(keyword) ||
    h.ticket.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Belum ada riwayat transaksi.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(h => `
    <tr>
      <td>${h.ticket}</td>
      <td><strong>${h.plate}</strong></td>
      <td>${h.type}</td>
      <td>${formatTime(h.entryTime)}</td>
      <td>${formatTime(h.exitTime)}</td>
      <td>${h.duration}</td>
      <td>Rp ${h.fee.toLocaleString('id-ID')}</td>
      <td>
        <button class="btn-sm btn-outline" onclick="printStruk('${h.ticket}')">Cetak</button>
      </td>
    </tr>
  `).join('');
}

function printStruk(ticket) {
  const h = history.find(x => x.ticket === ticket);
  if (h) showStruk(h);
}

function exportCSV() {
  if (history.length === 0) {
    alert('Belum ada data untuk diexport');
    return;
  }
  let csv = 'Tiket,Plat,Jenis,Masuk,Keluar,Durasi,Biaya\n';
  history.forEach(h => {
    csv += `${h.ticket},${h.plate},${h.type},"${formatTime(h.entryTime)}","${formatTime(h.exitTime)}",${h.duration},${h.fee}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riwayat_parkir.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  if (currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat menghapus riwayat');
    return;
  }
  if (!confirm('Yakin ingin menghapus semua riwayat transaksi?')) return;
  history = [];
  saveData();
  updateStats();
  renderHistory();
}

// ========== PENGATURAN ==========
function loadSettingsToForm() {
  document.getElementById('set-max').value = settings.maxSlots;
  document.getElementById('set-motor').value = settings.rates.Motor;
  document.getElementById('set-mobil').value = settings.rates.Mobil;
  document.getElementById('set-truk').value = settings.rates['Box / Truk'];
}

function saveSettings() {
  if (currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat mengubah pengaturan');
    return;
  }

  settings = {
    maxSlots: parseInt(document.getElementById('set-max').value) || 100,
    rates: {
      Motor: parseInt(document.getElementById('set-motor').value) || 2000,
      Mobil: parseInt(document.getElementById('set-mobil').value) || 5000,
      'Box / Truk': parseInt(document.getElementById('set-truk').value) || 8000
    }
  };
  saveData();
  updateStats();
  alert('Pengaturan berhasil disimpan!');
}

// ========== STRUK ==========
function showStruk(data) {
  document.getElementById('struk-content').innerHTML = `
    <div class="row"><span class="label">No. Tiket</span><span class="value">${data.ticket}</span></div>
    <div class="row"><span class="label">Plat Nomor</span><span class="value">${data.plate}</span></div>
    <div class="row"><span class="label">Jenis</span><span class="value">${data.type}</span></div>
    <div class="row"><span class="label">Waktu Masuk</span><span class="value">${formatTime(data.entryTime)}</span></div>
    <div class="row"><span class="label">Waktu Keluar</span><span class="value">${formatTime(data.exitTime)}</span></div>
    <div class="row"><span class="label">Durasi</span><span class="value">${data.duration}</span></div>
    <div class="row total"><span class="label">Total Biaya</span><span class="value">Rp ${data.fee.toLocaleString('id-ID')}</span></div>
  `;
  document.getElementById('struk-modal').classList.add('show');
}

function closeStruk() {
  document.getElementById('struk-modal').classList.remove('show');
}

document.getElementById('struk-modal').addEventListener('click', function(e) {
  if (e.target === this) closeStruk();
});

// ========== INIT ==========
(async function init() {
  await initDefaultAdmin();

  const session =
    JSON.parse(localStorage.getItem('parkir_session')) ||
    JSON.parse(sessionStorage.getItem('parkir_session'));

  if (session) {
    currentUser = session;
    startApp();
  } else {
    document.getElementById('login-email').focus();
  }
})();