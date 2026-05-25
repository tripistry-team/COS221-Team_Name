const API_URL = 'api/api.php';
let allBookings = [];

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function callAPI(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function checkAuth() {
  const res = await callAPI({type: 'CheckAuthorisation'});
  if (res.status === 'success' && res.data.logged_in && res.data.user_type === 'agency_staff') return res.data;
  window.location.href = 'login.html';
  return null;
}

function updateNav(user) {
  const actions = document.querySelector('.nav-actions');
  if (!actions || !user) return;
  actions.innerHTML = `<span class="text-sm" style="color:var(--col-muted);">${escHtml(user.username)}</span><button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>`;
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await callAPI({type: 'Logout'});
    window.location.href = 'login.html';
  });
}

function updateHeaderStats(rows) {
  const total = rows.length;
  const confirmed = rows.filter(r => String(r.Booking_Status || '').toLowerCase() === 'confirmed').length;
  const pending = rows.filter(r => String(r.Booking_Status || '').toLowerCase() === 'pending').length;
  const cancelled = rows.filter(r => String(r.Booking_Status || '').toLowerCase() === 'cancelled').length;
  const p = document.querySelector('h2 + p.text-muted.text-sm');
  if (p) p.textContent = `${total} total bookings`;
  const statVals = document.querySelectorAll('.stat-val');
  if (statVals[0]) statVals[0].textContent = String(total);
  if (statVals[1]) statVals[1].textContent = String(confirmed);
  if (statVals[2]) statVals[2].textContent = String(pending);
  if (statVals[3]) statVals[3].textContent = String(cancelled);
}

async function loadBookings() {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;
  const data = await callAPI({ type: 'GetAgencyBookings' });
  if (data.status !== 'success') {
    tbody.innerHTML = '<tr><td colspan="8" class="text-sm text-muted">No bookings yet.</td></tr>';
    return;
  }

  allBookings = data.data || [];
  updateHeaderStats(allBookings);
  renderBookings(allBookings);
}

function renderBookings(rows) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(b => `
    <tr>
      <td class="text-xs text-muted">#BK-${Number(b.Booking_ID)}</td>
      <td><div style="font-weight:500;font-size:0.9rem;">${escHtml(`${b.First_Name || ''} ${b.Surname || ''}`.trim())}</div></td>
      <td class="text-sm">${escHtml(b.Package_Name || '-')}</td>
      <td class="text-sm">${escHtml(cap(b.Package_Type || '-'))}</td>
      <td class="text-sm">${Number(b.Number_Of_People || 0)}</td>
      <td class="text-sm" style="font-weight:500;">R${Number(b.Total_Price || 0).toLocaleString('en-ZA')}</td>
      <td class="text-xs text-muted">${escHtml(b.Booking_Date || '')}</td>
      <td><span class="badge">${escHtml(cap(b.Booking_Status || 'pending'))}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="text-sm text-muted">No bookings yet.</td></tr>';
}

function applyFilters() {
  const controls = document.querySelectorAll('main input, main select');
  const q = (controls[0]?.value || '').toLowerCase();
  const status = (controls[1]?.value || 'All statuses').toLowerCase();
  const pkg = (controls[2]?.value || 'All packages').toLowerCase();
  const date = controls[3]?.value || '';
  const filtered = allBookings.filter(b => {
    const name = `${b.First_Name || ''} ${b.Surname || ''}`.toLowerCase();
    const packageName = String(b.Package_Name || '').toLowerCase();
    const statusText = String(b.Booking_Status || '').toLowerCase();
    const matchQ = !q || name.includes(q) || packageName.includes(q);
    const normalizedStatus = status.replace(/\(.+\)/, '').trim();
    const matchStatus = normalizedStatus === 'all statuses' || statusText === normalizedStatus;
    const matchPkg = pkg === 'all packages' || packageName.includes(pkg.replace(/\s+/g, ' '));
    const matchDate = !date || String(b.Booking_Date || '').startsWith(date);
    return matchQ && matchStatus && matchPkg && matchDate;
  });
  renderBookings(filtered);
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;
  updateNav(user);
  await loadBookings();
  const statusSelect = document.querySelectorAll('main select')[0];
  if (statusSelect) {
    statusSelect.innerHTML = '<option>All statuses</option><option>Confirmed</option><option>Pending</option><option>Cancelled</option><option>Completed</option>';
  }
  const pkgSelect = document.querySelectorAll('main select')[1];
  if (pkgSelect) {
    const uniq = [...new Set(allBookings.map(b => b.Package_Name).filter(Boolean))];
    pkgSelect.innerHTML = '<option>All packages</option>' + uniq.map(n => `<option>${escHtml(n)}</option>`).join('');
  }
  document.querySelectorAll('main input, main select').forEach(el => {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });
});
