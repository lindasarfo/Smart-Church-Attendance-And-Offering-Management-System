// ============================================================
//  DATA LAYER (localStorage)
// ============================================================
const STORAGE_ATTENDANCE = 'church_attendance_records';
const STORAGE_FINANCE = 'church_finance_records';
const STORAGE_USERS = 'church_users';

// ---------- Attendance ----------
function getAttendance() {
    try { return JSON.parse(localStorage.getItem(STORAGE_ATTENDANCE)) || []; } catch { return []; }
}
function saveAttendance(data) {
    localStorage.setItem(STORAGE_ATTENDANCE, JSON.stringify(data));
}

// ---------- Finance ----------
function getFinance() {
    try { return JSON.parse(localStorage.getItem(STORAGE_FINANCE)) || []; } catch { return []; }
}
function saveFinance(data) {
    localStorage.setItem(STORAGE_FINANCE, JSON.stringify(data));
}

// ---------- Users ----------
function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_USERS)) || []; } catch { return []; }
}
function saveUsers(data) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(data));
}

// ============================================================
//  DEFAULT USERS (if empty)
// ============================================================
function seedUsers() {
    let users = getUsers();
    if (users.length === 0) {
        users = [
            { username: 'admin', password: 'admin123', role: 'superadmin' },
            { username: 'user', password: 'user123', role: 'admin' }
        ];
        saveUsers(users);
    }
    return users;
}
seedUsers();

// ============================================================
//  GLOBALS
// ============================================================
let currentUser = null; // { username, role }
let charts = {};

// ============================================================
//  LOGIN / LOGOUT
// ============================================================
function login(username, password) {
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === password);
    if (found) {
        currentUser = { username: found.username, role: found.role };
        return true;
    }
    return false;
}

function logout() {
    currentUser = null;
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('loginError').textContent = '';
}

function showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    // Show/hide Users nav link
    const usersNav = document.getElementById('usersNavLink');
    if (currentUser && currentUser.role === 'superadmin') {
        usersNav.style.display = 'flex';
    } else {
        usersNav.style.display = 'none';
        if (document.getElementById('page-users').classList.contains('active')) {
            navigateTo('dashboard');
        }
    }
    document.getElementById('currentUserDisplay').textContent = currentUser.username;
    renderAll();
}

// ============================================================
//  NAVIGATION
// ============================================================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('#sidebarNav a[data-page]').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`#sidebarNav a[data-page="${page}"]`);
    if (link) link.classList.add('active');
    if (page === 'analytics') renderCharts();
    if (page === 'reports') renderReports();
    if (page === 'dashboard') renderDashboard();
}

// ============================================================
//  RENDER FUNCTIONS
// ============================================================
function renderAll() {
    renderDashboard();
    renderAttendanceTable();
    renderFinanceTable();
    renderUsersTable();
}

// ---------- DASHBOARD ----------
function renderDashboard() {
    const att = getAttendance();
    const fin = getFinance();
    const totalAtt = att.reduce((s, r) => s + (r.total || 0), 0);
    const totalTithe = fin.reduce((s, r) => s + (r.tithe || 0), 0);
    const totalOffering = fin.reduce((s, r) => s + (r.offering || 0), 0);
    const totalIncome = totalTithe + totalOffering;

    document.getElementById('dashAttend').textContent = totalAtt.toLocaleString();
    document.getElementById('dashTithe').textContent = 'GH₵' + totalTithe.toLocaleString();
    document.getElementById('dashOffering').textContent = 'GH₵' + totalOffering.toLocaleString();
    document.getElementById('dashIncome').textContent = 'GH₵' + totalIncome.toLocaleString();
}

// ---------- ATTENDANCE TABLE ----------
function renderAttendanceTable() {
    const records = getAttendance();
    const tbody = document.getElementById('attendanceTableBody');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="table-empty">No attendance records.</td></tr>';
        return;
    }
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    let html = '';
    sorted.forEach(r => {
        html += `<tr>
            <td>${r.date}</td>
            <td>${r.men}</td><td>${r.women}</td><td>${r.adult}</td>
            <td>${r.gentlemen}</td><td>${r.ladies}</td><td>${r.youth}</td>
            <td>${r.boys}</td><td>${r.girls}</td><td>${r.children}</td>
            <td><strong>${r.total}</strong></td>
            <td><button class="btn btn-danger btn-sm delete-att" data-date="${r.date}">✕</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('.delete-att').forEach(btn => {
        btn.addEventListener('click', function() {
            const date = this.dataset.date;
            if (confirm(`Delete attendance for ${date}?`)) {
                let records = getAttendance();
                records = records.filter(r => r.date !== date);
                saveAttendance(records);
                renderAll();
                showToast('Attendance record deleted', 'error');
            }
        });
    });
}

// ---------- FINANCE TABLE ----------
function renderFinanceTable() {
    const records = getFinance();
    const tbody = document.getElementById('financeTableBody');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No finance records.</td></tr>';
        return;
    }
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    let html = '';
    sorted.forEach(r => {
        const total = (r.tithe || 0) + (r.offering || 0);
        html += `<tr>
            <td>${r.date}</td>
            <td>GH₵${(r.tithe||0).toLocaleString()}</td>
            <td>GH₵${(r.offering||0).toLocaleString()}</td>
            <td>GH₵${total.toLocaleString()}</td>
            <td><button class="btn btn-danger btn-sm delete-fin" data-date="${r.date}">✕</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('.delete-fin').forEach(btn => {
        btn.addEventListener('click', function() {
            const date = this.dataset.date;
            if (confirm(`Delete finance record for ${date}?`)) {
                let records = getFinance();
                records = records.filter(r => r.date !== date);
                saveFinance(records);
                renderAll();
                showToast('Finance record deleted', 'error');
            }
        });
    });
}

// ---------- REPORTS ----------
function renderReports() {
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    const att = getAttendance();
    const fin = getFinance();
    const combined = {};
    att.forEach(r => { combined[r.date] = { ...combined[r.date], date: r.date, attendance: r.total || 0 }; });
    fin.forEach(r => {
        if (!combined[r.date]) combined[r.date] = { date: r.date, attendance: 0 };
        combined[r.date].tithe = r.tithe || 0;
        combined[r.date].offering = r.offering || 0;
        combined[r.date].income = (r.tithe || 0) + (r.offering || 0);
    });
    let data = Object.values(combined);
    if (from) data = data.filter(r => r.date >= from);
    if (to) data = data.filter(r => r.date <= to);
    data.sort((a, b) => a.date.localeCompare(b.date));

    const tbody = document.getElementById('reportBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No records in this range.</td></tr>';
        return;
    }
    let html = '';
    data.forEach(r => {
        html += `<tr>
            <td>${r.date}</td>
            <td>${r.attendance || 0}</td>
            <td>${r.tithe ? 'GH₵'+r.tithe.toLocaleString() : 'GH₵0'}</td>
            <td>${r.offering ? 'GH₵'+r.offering.toLocaleString() : 'GH₵0'}</td>
            <td>${r.income ? 'GH₵'+r.income.toLocaleString() : 'GH₵0'}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ---------- CHARTS ----------
function renderCharts() {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
    charts = {};

    const att = getAttendance();
    const fin = getFinance();
    const combined = {};
    att.forEach(r => { combined[r.date] = { ...combined[r.date], date: r.date, attendance: r.total || 0 }; });
    fin.forEach(r => {
        if (!combined[r.date]) combined[r.date] = { date: r.date, attendance: 0 };
        combined[r.date].tithe = r.tithe || 0;
        combined[r.date].offering = r.offering || 0;
        combined[r.date].income = (r.tithe || 0) + (r.offering || 0);
    });
    const data = Object.values(combined).sort((a, b) => a.date.localeCompare(b.date));
    if (data.length === 0) {
        ['chartAttendTrend', 'chartTitheTrend', 'chartOfferingTrend', 'chartIncomeTrend'].forEach(id => {
            const canvas = document.getElementById(id);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px Segoe UI';
            ctx.fillStyle = '#a99bc2';
            ctx.textAlign = 'center';
            ctx.fillText('No data', canvas.width/2, canvas.height/2);
        });
        return;
    }

    const labels = data.map(r => r.date.slice(5));
    const attendanceData = data.map(r => r.attendance || 0);
    const titheData = data.map(r => r.tithe || 0);
    const offeringData = data.map(r => r.offering || 0);
    const incomeData = data.map(r => r.income || 0);

    function createChart(id, label, color, dataArr) {
        const ctx = document.getElementById(id).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: dataArr,
                    borderColor: color,
                    backgroundColor: color + '22',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: color,
                    pointRadius: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    charts.attend = createChart('chartAttendTrend', 'Attendance', '#6b3fa0', attendanceData);
    charts.tithe = createChart('chartTitheTrend', 'Tithe', '#f39c12', titheData);
    charts.offering = createChart('chartOfferingTrend', 'Offering', '#27ae60', offeringData);
    charts.income = createChart('chartIncomeTrend', 'Income', '#e74c3c', incomeData);
}

// ---------- USERS TABLE ----------
function renderUsersTable() {
    if (currentUser && currentUser.role !== 'superadmin') {
        document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="4" class="table-empty">Access restricted.</td></tr>';
        return;
    }
    const users = getUsers();
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No users.</td></tr>';
        return;
    }
    let html = '';
    users.forEach((u, index) => {
        const isSelf = u.username === currentUser.username;
        html += `<tr>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>Active</td>
            <td>
                ${!isSelf ? `<button class="btn btn-danger btn-sm delete-user" data-index="${index}">✕</button>` : '—'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            if (confirm('Delete this user?')) {
                let users = getUsers();
                users.splice(idx, 1);
                saveUsers(users);
                renderUsersTable();
                showToast('User deleted', 'error');
            }
        });
    });
}

// ============================================================
//  ATTENDANCE FORM AUTO-SUM
// ============================================================
function setupAttendanceAutoSum() {
    const fields = ['men','women','gentlemen','ladies','boys','girls'];
    const outAdult = document.getElementById('attAdult');
    const outYouth = document.getElementById('attYouth');
    const outChildren = document.getElementById('attChildren');
    const outGrand = document.getElementById('attGrand');

    function update() {
        const men = parseInt(document.getElementById('attMen').value) || 0;
        const women = parseInt(document.getElementById('attWomen').value) || 0;
        const gentlemen = parseInt(document.getElementById('attGentlemen').value) || 0;
        const ladies = parseInt(document.getElementById('attLadies').value) || 0;
        const boys = parseInt(document.getElementById('attBoys').value) || 0;
        const girls = parseInt(document.getElementById('attGirls').value) || 0;

        const adult = men + women;
        const youth = gentlemen + ladies;
        const children = boys + girls;
        const grand = adult + youth + children;

        outAdult.value = adult;
        outYouth.value = youth;
        outChildren.value = children;
        outGrand.value = grand;
    }

    fields.forEach(id => {
        document.getElementById('att' + id.charAt(0).toUpperCase() + id.slice(1)).addEventListener('input', update);
    });
    update();
}

// ============================================================
//  FINANCE FORM AUTO-SUM
// ============================================================
function setupFinanceAutoSum() {
    const tithe = document.getElementById('finTithe');
    const offering = document.getElementById('finOffering');
    const total = document.getElementById('finTotal');

    function update() {
        const t = parseFloat(tithe.value) || 0;
        const o = parseFloat(offering.value) || 0;
        total.value = t + o;
    }
    tithe.addEventListener('input', update);
    offering.addEventListener('input', update);
    update();
}

// ============================================================
//  FORM SUBMITS
// ============================================================
function setupAttendanceSubmit() {
    document.getElementById('attendanceForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const date = document.getElementById('attDate').value;
        if (!date) { showToast('Please select a date.', 'error'); return; }

        const men = parseInt(document.getElementById('attMen').value) || 0;
        const women = parseInt(document.getElementById('attWomen').value) || 0;
        const gentlemen = parseInt(document.getElementById('attGentlemen').value) || 0;
        const ladies = parseInt(document.getElementById('attLadies').value) || 0;
        const boys = parseInt(document.getElementById('attBoys').value) || 0;
        const girls = parseInt(document.getElementById('attGirls').value) || 0;
        const adult = men + women;
        const youth = gentlemen + ladies;
        const children = boys + girls;
        const total = adult + youth + children;

        let records = getAttendance();
        if (records.some(r => r.date === date)) {
            showToast('Attendance for this date already exists.', 'error');
            return;
        }
        records.push({ date, men, women, gentlemen, ladies, boys, girls, adult, youth, children, total });
        saveAttendance(records);
        showToast('Attendance saved!', 'success');
        this.reset();
        document.getElementById('attAdult').value = '0';
        document.getElementById('attYouth').value = '0';
        document.getElementById('attChildren').value = '0';
        document.getElementById('attGrand').value = '0';
        document.getElementById('attDate').value = todayStr();
        renderAll();
        navigateTo('attendance');
    });
}

function setupFinanceSubmit() {
    document.getElementById('financeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const date = document.getElementById('finDate').value;
        if (!date) { showToast('Please select a date.', 'error'); return; }

        const tithe = parseFloat(document.getElementById('finTithe').value) || 0;
        const offering = parseFloat(document.getElementById('finOffering').value) || 0;

        let records = getFinance();
        if (records.some(r => r.date === date)) {
            showToast('Finance record for this date already exists.', 'error');
            return;
        }
        records.push({ date, tithe, offering });
        saveFinance(records);
        showToast('Finance record saved!', 'success');
        this.reset();
        document.getElementById('finTotal').value = '0';
        document.getElementById('finDate').value = todayStr();
        renderAll();
        navigateTo('finance');
    });
}

// ============================================================
//  ADD USER (Super Admin only)
// ============================================================
function setupAddUser() {
    document.getElementById('addUserBtn').addEventListener('click', function() {
        if (!currentUser || currentUser.role !== 'superadmin') {
            showToast('Only Super Admin can add users.', 'error');
            return;
        }
        const username = prompt('Enter new admin username:');
        if (!username) return;
        const password = prompt('Enter password:');
        if (!password) return;
        let users = getUsers();
        if (users.some(u => u.username === username)) {
            showToast('Username already exists.', 'error');
            return;
        }
        users.push({ username, password, role: 'admin' });
        saveUsers(users);
        renderUsersTable();
        showToast('Admin added successfully!', 'success');
    });
}

// ============================================================
//  DATE HELPER
// ============================================================
function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

// ============================================================
//  TOAST
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
// Login
document.getElementById('loginBtn').addEventListener('click', function() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const error = document.getElementById('loginError');
    if (!username || !password) {
        error.textContent = 'Please enter username and password.';
        return;
    }
    if (login(username, password)) {
        error.textContent = '';
        showApp();
        showToast('Welcome, ' + username + '!', 'success');
    } else {
        error.textContent = 'Invalid username or password.';
    }
});

document.getElementById('loginPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('loginUsername').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('forgotLink').addEventListener('click', function(e) {
    e.preventDefault();
    showToast('Contact your Super Admin to reset password.', 'warning');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        logout();
        showToast('Logged out.', 'warning');
    }
});

// Sidebar navigation
document.querySelectorAll('#sidebarNav a[data-page]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const page = this.dataset.page;
        if (page === 'users' && (!currentUser || currentUser.role !== 'superadmin')) {
            showToast('Access restricted to Super Admin.', 'error');
            return;
        }
        navigateTo(page);
    });
});

// Generate report
document.getElementById('generateReportBtn').addEventListener('click', function() {
    renderReports();
    showToast('Report generated.', 'success');
});

// ============================================================
//  INIT
// ============================================================
function init() {
    document.getElementById('attDate').value = todayStr();
    document.getElementById('finDate').value = todayStr();

    setupAttendanceAutoSum();
    setupFinanceAutoSum();
    setupAttendanceSubmit();
    setupFinanceSubmit();
    setupAddUser();

    // Start with login page (show logout state)
    logout();
}

document.addEventListener('DOMContentLoaded', init);