// ============================================================
//  DATA LAYER (localStorage)
// ============================================================
const STORAGE_ATTENDANCE = 'church_attendance_data';
const STORAGE_USERS = 'church_users';

// ---------- Attendance ----------
function loadRecords() {
    try {
        const raw = localStorage.getItem(STORAGE_ATTENDANCE);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveRecords(records) {
    localStorage.setItem(STORAGE_ATTENDANCE, JSON.stringify(records));
}

function getRecords() { return loadRecords(); }

function addRecord(rec) {
    const records = loadRecords();
    if (records.some(r => r.date === rec.date)) {
        throw new Error(`A record for ${rec.date} already exists.`);
    }
    records.push(rec);
    records.sort((a, b) => a.date.localeCompare(b.date));
    saveRecords(records);
}

function deleteRecord(date) {
    let records = loadRecords();
    records = records.filter(r => r.date !== date);
    saveRecords(records);
}

function deleteAllRecords() {
    saveRecords([]);
}

// ---------- Users ----------
function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_USERS)) || []; } catch { return []; }
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

// ============================================================
//  GET SESSION
// ============================================================
function getSession() {
    try {
        const raw = localStorage.getItem('church_session');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

// ============================================================
//  COMPUTED HELPERS
// ============================================================
function computeDerived(r) {
    const adult = (r.men || 0) + (r.women || 0);
    const youth = (r.gentlemen || 0) + (r.ladies || 0);
    const children = (r.boys || 0) + (r.girls || 0);
    const total = adult + youth + children;
    const tithe = r.tithe || 0;
    const offering = r.offering || 0;
    const income = tithe + offering;
    return { adult, youth, children, total, tithe, offering, income };
}

function enrichRecord(r) {
    const d = computeDerived(r);
    return { ...r, ...d };
}

function getEnrichedRecords() {
    return getRecords().map(enrichRecord);
}

// ============================================================
//  DATE HELPERS
// ============================================================
function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

function getWeekId(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toISOString().slice(0, 10);
}

function getMonthId(dateStr) {
    return dateStr.slice(0, 7);
}

// ============================================================
//  UI UPDATES
// ============================================================
let charts = {};

function renderAll() {
    renderSummary();
    renderComparisons();
    renderCharts();
    renderInsights();
    renderTable();
    renderUsersTable();
}

// --- SUMMARY ---
function renderSummary() {
    const records = getEnrichedRecords();
    const totalAttend = records.reduce((s, r) => s + r.total, 0);
    const totalTithe = records.reduce((s, r) => s + r.tithe, 0);
    const totalOffering = records.reduce((s, r) => s + r.offering, 0);
    const totalIncome = totalTithe + totalOffering;

    document.getElementById('sumTotalAttend').textContent = totalAttend.toLocaleString();
    document.getElementById('sumTotalTithe').textContent = 'GH₵' + totalTithe.toLocaleString();
    document.getElementById('sumTotalOffering').textContent = 'GH₵' + totalOffering.toLocaleString();
    document.getElementById('sumTotalIncome').textContent = 'GH₵' + totalIncome.toLocaleString();
}

// --- COMPARISONS ---
function renderComparisons() {
    const records = getEnrichedRecords();
    if (records.length === 0) {
        document.getElementById('compToday').innerHTML = '<span class="no-data-msg">No records yet.</span>';
        document.getElementById('compWeek').innerHTML = '<span class="no-data-msg">No records yet.</span>';
        document.getElementById('compMonth').innerHTML = '<span class="no-data-msg">No records yet.</span>';
        return;
    }

    const today = todayStr();
    const yesterday = yesterdayStr();
    const recToday = records.find(r => r.date === today);
    const recYest = records.find(r => r.date === yesterday);
    document.getElementById('compToday').innerHTML = buildComparisonHTML(
        recToday, recYest, 'today', 'yesterday'
    );

    const thisWeekId = getWeekId(today);
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekId = getWeekId(lastWeekDate.toISOString().slice(0, 10));

    const thisWeekRecs = records.filter(r => getWeekId(r.date) === thisWeekId);
    const lastWeekRecs = records.filter(r => getWeekId(r.date) === lastWeekId);

    const sumWeek = (arr) => ({
        total: arr.reduce((s, r) => s + r.total, 0),
        tithe: arr.reduce((s, r) => s + r.tithe, 0),
        offering: arr.reduce((s, r) => s + r.offering, 0),
        income: arr.reduce((s, r) => s + r.tithe + r.offering, 0)
    });
    const aggThis = sumWeek(thisWeekRecs);
    const aggLast = sumWeek(lastWeekRecs);
    document.getElementById('compWeek').innerHTML = buildComparisonAgg(
        aggThis, aggLast, 'this week', 'last week'
    );

    const thisMonthId = getMonthId(today);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthId = getMonthId(lastMonthDate.toISOString().slice(0, 10));

    const thisMonthRecs = records.filter(r => getMonthId(r.date) === thisMonthId);
    const lastMonthRecs = records.filter(r => getMonthId(r.date) === lastMonthId);

    const sumMonth = (arr) => ({
        total: arr.reduce((s, r) => s + r.total, 0),
        tithe: arr.reduce((s, r) => s + r.tithe, 0),
        offering: arr.reduce((s, r) => s + r.offering, 0),
        income: arr.reduce((s, r) => s + r.tithe + r.offering, 0)
    });
    const aggThisMonth = sumMonth(thisMonthRecs);
    const aggLastMonth = sumMonth(lastMonthRecs);
    document.getElementById('compMonth').innerHTML = buildComparisonAgg(
        aggThisMonth, aggLastMonth, 'this month', 'last month'
    );
}

function buildComparisonHTML(recCurrent, recPast, labelCurrent, labelPast) {
    if (!recCurrent && !recPast) return '<span class="no-data-msg">No data for either period.</span>';
    const cTotal = recCurrent ? recCurrent.total : 0;
    const pTotal = recPast ? recPast.total : 0;
    const cTithe = recCurrent ? (recCurrent.tithe || 0) : 0;
    const pTithe = recPast ? (recPast.tithe || 0) : 0;
    const cOff = recCurrent ? (recCurrent.offering || 0) : 0;
    const pOff = recPast ? (recPast.offering || 0) : 0;
    const cIncome = cTithe + cOff;
    const pIncome = pTithe + pOff;

    const delta = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    const dAtt = delta(cTotal, pTotal);
    const dTit = delta(cTithe, pTithe);
    const dOff = delta(cOff, pOff);
    const dInc = delta(cIncome, pIncome);

    return `
    <div class="comparison-row"><span class="metric">👥 Attendance</span><span class="delta ${dAtt > 0 ? 'up' : dAtt < 0 ? 'down' : 'flat'}">${dAtt >= 0 ? '↑' : '↓'} ${Math.abs(dAtt)}%</span></div>
    <div class="comparison-row"><span class="metric">💵 Tithe</span><span class="delta ${dTit > 0 ? 'up' : dTit < 0 ? 'down' : 'flat'}">${dTit >= 0 ? '↑' : '↓'} ${Math.abs(dTit)}%</span></div>
    <div class="comparison-row"><span class="metric">💲 Offering</span><span class="delta ${dOff > 0 ? 'up' : dOff < 0 ? 'down' : 'flat'}">${dOff >= 0 ? '↑' : '↓'} ${Math.abs(dOff)}%</span></div>
    <div class="comparison-row"><span class="metric">📊 Income</span><span class="delta ${dInc > 0 ? 'up' : dInc < 0 ? 'down' : 'flat'}">${dInc >= 0 ? '↑' : '↓'} ${Math.abs(dInc)}%</span></div>
    <div class="comparison-row" style="font-size:13px;color:#5a6a8a;"><span>${labelCurrent}: ${cTotal} · ${labelPast}: ${pTotal}</span></div>
  `;
}

function buildComparisonAgg(aggCurrent, aggPast, labelCurrent, labelPast) {
    const cTotal = aggCurrent.total || 0;
    const pTotal = aggPast.total || 0;
    const cTithe = aggCurrent.tithe || 0;
    const pTithe = aggPast.tithe || 0;
    const cOff = aggCurrent.offering || 0;
    const pOff = aggPast.offering || 0;
    const cIncome = cTithe + cOff;
    const pIncome = pTithe + pOff;

    const delta = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    const dAtt = delta(cTotal, pTotal);
    const dTit = delta(cTithe, pTithe);
    const dOff = delta(cOff, pOff);
    const dInc = delta(cIncome, pIncome);

    return `
    <div class="comparison-row"><span class="metric">👥 Attendance</span><span class="delta ${dAtt > 0 ? 'up' : dAtt < 0 ? 'down' : 'flat'}">${dAtt >= 0 ? '↑' : '↓'} ${Math.abs(dAtt)}%</span></div>
    <div class="comparison-row"><span class="metric">💵 Tithe</span><span class="delta ${dTit > 0 ? 'up' : dTit < 0 ? 'down' : 'flat'}">${dTit >= 0 ? '↑' : '↓'} ${Math.abs(dTit)}%</span></div>
    <div class="comparison-row"><span class="metric">💲 Offering</span><span class="delta ${dOff > 0 ? 'up' : dOff < 0 ? 'down' : 'flat'}">${dOff >= 0 ? '↑' : '↓'} ${Math.abs(dOff)}%</span></div>
    <div class="comparison-row"><span class="metric">📊 Income</span><span class="delta ${dInc > 0 ? 'up' : dInc < 0 ? 'down' : 'flat'}">${dInc >= 0 ? '↑' : '↓'} ${Math.abs(dInc)}%</span></div>
    <div class="comparison-row" style="font-size:13px;color:#5a6a8a;"><span>${labelCurrent}: ${cTotal} · ${labelPast}: ${pTotal}</span></div>
  `;
}

// --- CHARTS ---
function renderCharts() {
    const records = getEnrichedRecords();
    Object.values(charts).forEach(c => { try { c.destroy(); } catch {} });
    charts = {};

    if (records.length === 0) {
        ['chartAttendance', 'chartFinance', 'chartSections'].forEach(id => {
            const canvas = document.getElementById(id);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px Segoe UI';
            ctx.fillStyle = '#5a6a8a';
            ctx.textAlign = 'center';
            ctx.fillText('No data yet', canvas.width / 2, canvas.height / 2);
        });
        return;
    }

    const labels = records.map(r => r.date.slice(5));
    const totals = records.map(r => r.total);
    const tithes = records.map(r => r.tithe || 0);
    const offerings = records.map(r => r.offering || 0);

    // Attendance line
    const ctx1 = document.getElementById('chartAttendance').getContext('2d');
    charts.attendance = new Chart(ctx1, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Total Attendance',
                data: totals,
                borderColor: '#2a5a9a',
                backgroundColor: 'rgba(42,90,154,0.08)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#1a3a6a',
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    // Finance (Tithe + Offering) - two lines
    const ctx2 = document.getElementById('chartFinance').getContext('2d');
    charts.finance = new Chart(ctx2, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Tithe',
                    data: tithes,
                    borderColor: '#d4a843',
                    backgroundColor: 'rgba(212,168,67,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#d4a843',
                    pointRadius: 3,
                },
                {
                    label: 'Offering',
                    data: offerings,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39,174,96,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#27ae60',
                    pointRadius: 3,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 8 } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'GH₵' + v } } }
        }
    });

    // Sections bar (last 10)
    const last10 = records.slice(-10);
    const barLabels = last10.map(r => r.date.slice(5));
    const adultData = last10.map(r => r.adult);
    const youthData = last10.map(r => r.youth);
    const childData = last10.map(r => r.children);
    const ctx3 = document.getElementById('chartSections').getContext('2d');
    charts.sections = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [
                { label: 'Adult', data: adultData, backgroundColor: '#2a5a9a' },
                { label: 'Youth', data: youthData, backgroundColor: '#5a8ac4' },
                { label: 'Children', data: childData, backgroundColor: '#a0b8d8' },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 8 } } },
            scales: { y: { beginAtZero: true, stacked: false, ticks: { precision: 0 } }, x: { stacked: false } }
        }
    });
}

// --- INSIGHTS ---
function renderInsights() {
    const records = getEnrichedRecords();
    const list = document.getElementById('insightsList');
    if (records.length === 0) {
        list.innerHTML = '<li>📌 Add some records to see powerful insights for decision making.</li>';
        return;
    }

    const insights = [];

    const maxAttend = Math.max(...records.map(r => r.total));
    const maxAttendRec = records.find(r => r.total === maxAttend);
    insights.push(`📈 <strong>Highest attendance:</strong> <span class="highlight">${maxAttend}</span> on ${maxAttendRec.date}`);

    const maxTithe = Math.max(...records.map(r => r.tithe || 0));
    const maxTitheRec = records.find(r => (r.tithe || 0) === maxTithe);
    insights.push(`💵 <strong>Highest tithe:</strong> <span class="highlight">GH₵${maxTithe.toLocaleString()}</span> on ${maxTitheRec.date}`);

    const maxOff = Math.max(...records.map(r => r.offering || 0));
    const maxOffRec = records.find(r => (r.offering || 0) === maxOff);
    insights.push(`💲 <strong>Highest offering:</strong> <span class="highlight">GH₵${maxOff.toLocaleString()}</span> on ${maxOffRec.date}`);

    const totalAttend = records.reduce((s, r) => s + r.total, 0);
    const totalIncome = records.reduce((s, r) => s + r.tithe + r.offering, 0);
    const avgPerPerson = totalAttend > 0 ? (totalIncome / totalAttend) : 0;
    insights.push(`🧮 <strong>Avg income per person:</strong> <span class="highlight">GH₵${avgPerPerson.toFixed(1)}</span>`);

    const dayMap = {};
    records.forEach(r => {
        const d = new Date(r.date + 'T12:00:00');
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        dayMap[dayName] = (dayMap[dayName] || 0) + r.total;
    });
    const bestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
    if (bestDay) insights.push(
        `📅 <strong>Best attended day:</strong> <span class="highlight">${bestDay[0]}</span> (total ${bestDay[1]})`
    );

    const avgAttend = totalAttend / records.length;
    const avgIncome = totalIncome / records.length;
    const anomalies = records.filter(r =>
        r.total < avgAttend * 0.7 &&
        (r.tithe + r.offering) > avgIncome * 1.3
    );
    if (anomalies.length > 0) {
        const a = anomalies[0];
        insights.push(
            `⚡ <strong>Anomaly:</strong> ${a.date} — low attendance (${a.total}) but high income (GH₵${(a.tithe + a.offering).toLocaleString()})`
        );
    } else {
        const highAttendLowIncome = records.filter(r =>
            r.total > avgAttend * 1.3 &&
            (r.tithe + r.offering) < avgIncome * 0.7
        );
        if (highAttendLowIncome.length > 0) {
            const a = highAttendLowIncome[0];
            insights.push(
                `🔍 <strong>Pattern:</strong> ${a.date} — high attendance (${a.total}) but lower income (GH₵${(a.tithe + a.offering).toLocaleString()})`
            );
        } else {
            insights.push(`📊 <strong>Steady pattern:</strong> Attendance and income move together consistently.`);
        }
    }

    const weekendRecs = records.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getDay() === 0 || d.getDay() === 6;
    });
    const weekdayRecs = records.filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getDay() > 0 && d.getDay() < 6;
    });
    if (weekendRecs.length > 0 && weekdayRecs.length > 0) {
        const avgWeekend = weekendRecs.reduce((s, r) => s + r.total, 0) / weekendRecs.length;
        const avgWeekday = weekdayRecs.reduce((s, r) => s + r.total, 0) / weekdayRecs.length;
        const stronger = avgWeekend > avgWeekday ? 'Weekends' : 'Weekdays';
        insights.push(
            `📆 <strong>${stronger} are stronger:</strong> Avg weekend ${Math.round(avgWeekend)} vs weekday ${Math.round(avgWeekday)}`
        );
    }

    list.innerHTML = insights.map(text => `<li>${text}</li>`).join('');
}

// --- TABLE ---
function renderTable() {
    const records = getEnrichedRecords();
    const tbody = document.getElementById('recordsBody');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="table-empty">No records yet. Start adding!</td></tr>';
        return;
    }
    let html = '';
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach(r => {
        const income = (r.tithe || 0) + (r.offering || 0);
        html += `<tr>
            <td><strong>${r.date}</strong></td>
            <td>${r.men}</td><td>${r.women}</td><td>${r.adult}</td>
            <td>${r.gentlemen}</td><td>${r.ladies}</td><td>${r.youth}</td>
            <td>${r.boys}</td><td>${r.girls}</td><td>${r.children}</td>
            <td><strong>${r.total}</strong></td>
            <td>GH₵${(r.tithe||0).toLocaleString()}</td>
            <td>GH₵${(r.offering||0).toLocaleString()}</td>
            <td>GH₵${income.toLocaleString()}</td>
            <td><button class="delete-btn" data-date="${r.date}" title="Delete">✕</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const date = this.dataset.date;
            if (confirm(`Delete record for ${date}?`)) {
                deleteRecord(date);
                renderAll();
                showToast('Record deleted', 'error');
            }
        });
    });
}

// --- USERS TABLE ---
function renderUsersTable() {
    const session = getSession();
    if (!session || session.role !== 'superadmin') {
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
        const isSelf = u.username === session.username;
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
//  FORM AUTO-SUM
// ============================================================
function setupAutoSum() {
    const attendanceInputs = {
        men: document.getElementById('inputMen'),
        women: document.getElementById('inputWomen'),
        gentlemen: document.getElementById('inputGentlemen'),
        ladies: document.getElementById('inputLadies'),
        boys: document.getElementById('inputBoys'),
        girls: document.getElementById('inputGirls'),
    };
    const outAdult = document.getElementById('inputAdult');
    const outYouth = document.getElementById('inputYouth');
    const outChildren = document.getElementById('inputChildren');
    const outGrand = document.getElementById('inputGrandTotal');

    const tithe = document.getElementById('inputTithe');
    const offering = document.getElementById('inputOffering');
    const outIncome = document.getElementById('inputTotalIncome');

    function updateAttendance() {
        const men = parseInt(attendanceInputs.men.value) || 0;
        const women = parseInt(attendanceInputs.women.value) || 0;
        const gentlemen = parseInt(attendanceInputs.gentlemen.value) || 0;
        const ladies = parseInt(attendanceInputs.ladies.value) || 0;
        const boys = parseInt(attendanceInputs.boys.value) || 0;
        const girls = parseInt(attendanceInputs.girls.value) || 0;

        const adult = men + women;
        const youth = gentlemen + ladies;
        const children = boys + girls;
        const grand = adult + youth + children;

        outAdult.value = adult;
        outYouth.value = youth;
        outChildren.value = children;
        outGrand.value = grand;
    }

    function updateFinance() {
        const t = parseFloat(tithe.value) || 0;
        const o = parseFloat(offering.value) || 0;
        outIncome.value = t + o;
    }

    Object.values(attendanceInputs).forEach(inp => {
        inp.addEventListener('input', updateAttendance);
    });
    tithe.addEventListener('input', updateFinance);
    offering.addEventListener('input', updateFinance);

    updateAttendance();
    updateFinance();
}

// ============================================================
//  FORM SUBMIT
// ============================================================
function setupFormSubmit() {
    const form = document.getElementById('recordForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = document.getElementById('recordDate').value;
        if (!date) { showToast('Please select a date.', 'error'); return; }

        const men = parseInt(document.getElementById('inputMen').value) || 0;
        const women = parseInt(document.getElementById('inputWomen').value) || 0;
        const gentlemen = parseInt(document.getElementById('inputGentlemen').value) || 0;
        const ladies = parseInt(document.getElementById('inputLadies').value) || 0;
        const boys = parseInt(document.getElementById('inputBoys').value) || 0;
        const girls = parseInt(document.getElementById('inputGirls').value) || 0;
        const tithe = parseFloat(document.getElementById('inputTithe').value) || 0;
        const offering = parseFloat(document.getElementById('inputOffering').value) || 0;

        const record = { date, men, women, gentlemen, ladies, boys, girls, tithe, offering };

        try {
            addRecord(record);
            showToast(`✅ Record for ${date} saved!`, 'success');
            form.reset();
            document.getElementById('inputAdult').value = '0';
            document.getElementById('inputYouth').value = '0';
            document.getElementById('inputChildren').value = '0';
            document.getElementById('inputGrandTotal').value = '0';
            document.getElementById('inputTotalIncome').value = '0';
            document.getElementById('recordDate').value = todayStr();
            renderAll();
            switchTab('dashboard');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ============================================================
//  TAB SWITCHING
// ============================================================
function setupTabs() {
    const buttons = document.querySelectorAll('.tabs button');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const btn = document.querySelector(`.tabs button[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.add('active');
    if (tab === 'dashboard') renderAll();
    if (tab === 'users') renderUsersTable();
}

// ============================================================
//  DELETE ALL
// ============================================================
function setupDeleteAll() {
    document.getElementById('deleteAllBtn').addEventListener('click', function() {
        if (getRecords().length === 0) {
            showToast('No records to delete.', 'error');
            return;
        }
        if (confirm('⚠️ Delete ALL records? This cannot be undone.')) {
            deleteAllRecords();
            renderAll();
            showToast('All records deleted.', 'error');
        }
    });
}

// ============================================================
//  ADD USER (Super Admin only)
// ============================================================
function setupAddUser() {
    document.getElementById('addUserBtn').addEventListener('click', function() {
        const session = getSession();
        if (!session || session.role !== 'superadmin') {
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
//  EXPORT / IMPORT DATA
// ============================================================
function setupDataTools() {
    document.getElementById('exportDataBtn').addEventListener('click', function() {
        const records = getRecords();
        if (records.length === 0) {
            showToast('No data to export.', 'error');
            return;
        }
        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `church_data_${todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully!', 'success');
    });

    const importInput = document.getElementById('importInput');
    document.getElementById('importDataBtn').addEventListener('click', function() {
        importInput.click();
    });

    importInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) {
                    throw new Error('Invalid data format.');
                }
                const valid = data.every(r => r.date && typeof r.date === 'string');
                if (!valid) {
                    throw new Error('Some records are missing a date.');
                }
                data.forEach(r => { if (r.tithe === undefined) r.tithe = 0; });
                if (confirm(`This will replace all current records with ${data.length} records from the file. Continue?`)) {
                    saveRecords(data);
                    renderAll();
                    showToast(`Imported ${data.length} records successfully!`, 'success');
                }
            } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        importInput.value = '';
    });
}

// ============================================================
//  LOGOUT
// ============================================================
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('church_session');
            window.location.href = 'login.html';
        }
    });
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
//  INIT – called after session check in dashboard.html
// ============================================================
function initDashboard() {
    const session = getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    console.log('✅ Dashboard initializing for:', session.username);

    // Update user badges
    document.getElementById('currentUserBadge').textContent = '👤 ' + session.username;
    const roleBadge = document.getElementById('currentRoleBadge');
    if (session.role === 'superadmin') {
        roleBadge.textContent = '⭐ Super Admin';
        roleBadge.className = 'role-badge superadmin';
    } else {
        roleBadge.textContent = '👤 Admin';
        roleBadge.className = 'role-badge admin';
    }

    // Update welcome banner
    document.getElementById('welcomeName').textContent = session.username;
    const welcomeMsg = document.getElementById('welcomeMessage');
    if (session.role === 'superadmin') {
        welcomeMsg.innerHTML = 'You have <span class="highlight">full administrative privileges</span> – including user management.';
    } else {
        welcomeMsg.innerHTML = 'You have <span class="highlight">access to all church data</span> – attendance, finance, reports, and analytics.';
    }

    // Show/hide Users tab
    const usersTab = document.getElementById('usersTabBtn');
    if (session.role === 'superadmin') {
        usersTab.style.display = 'block';
    } else {
        usersTab.style.display = 'none';
        if (document.getElementById('panel-users').classList.contains('active')) {
            switchTab('dashboard');
        }
    }

    // Show the app
    document.getElementById('appContainer').classList.remove('hidden');

    // Setup all features
    document.getElementById('recordDate').value = todayStr();
    setupAutoSum();
    setupFormSubmit();
    setupTabs();
    setupDeleteAll();
    setupDataTools();
    setupAddUser();
    setupLogout();

    renderAll();
}

// Wait for DOM to load, then init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}