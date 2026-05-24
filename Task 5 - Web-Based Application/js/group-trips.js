const API_URL = 'api/api.php';
let currentUser = null;
let allTrips = [];

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function callAPI(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function checkAuth() {
  const res = await callAPI({ type: 'CheckAuthorisation' });
  return res.status === 'success' && res.data.logged_in ? res.data : null;
}

function updateNav(user) {
  const actions = document.querySelector('.nav-actions');
  if (!actions) return;
  if (!user) return;
  actions.innerHTML = `
    <span class="text-sm text-muted">Hi, ${escHtml(user.username)}</span>
    ${user.user_type === 'traveller' ? '<a href="traveller-dashboard.html#bookings" class="btn btn-sm">My bookings</a>' : ''}
    <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
  `;
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      await callAPI({ type: 'Logout' });
      window.location.href = 'login.html';
    });
  }
}

function countryFromName(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('tokyo') || n.includes('kyoto') || n.includes('japan')) return 'Japan';
  if (n.includes('greece') || n.includes('santorini')) return 'Greece';
  if (n.includes('cape') || n.includes('south africa')) return 'South Africa';
  if (n.includes('bali') || n.includes('indonesia')) return 'Indonesia';
  return 'Destination';
}

function renderTrips() {
  const grid = document.querySelector('.grid-3');
  if (!grid) return;

  const destFilter = (document.getElementById('gt-destination-filter')?.value || 'All destinations').toLowerCase();
  const dateFilter = (document.getElementById('gt-date-filter')?.value || 'Any date').toLowerCase();
  const sortFilter = (document.getElementById('gt-sort-filter')?.value || 'Sort: Soonest first').toLowerCase();

  let rows = allTrips.filter(t => {
    const country = countryFromName(t.Trip_Name).toLowerCase();
    const d = new Date(t.Start_Date);
    const monthLabel = d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }).toLowerCase();
    const matchDest = destFilter === 'all destinations' || country === destFilter;
    const matchDate = dateFilter === 'any date' || monthLabel === dateFilter;
    return matchDest && matchDate;
  });

  if (sortFilter.includes('spots')) {
    rows = rows.sort((a, b) => (Number(a.Participants_Max) - Number(a.Participants_Current)) - (Number(b.Participants_Max) - Number(b.Participants_Current)));
  } else if (sortFilter.includes('price')) {
    rows = rows.sort((a, b) => Number(a.Participants_Current) - Number(b.Participants_Current));
  } else {
    rows = rows.sort((a, b) => new Date(a.Start_Date) - new Date(b.Start_Date));
  }

  if (!rows.length) {
    grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1;">No trips match the selected filters.</p>';
    return;
  }

  grid.innerHTML = rows.map(t => {
    const current = Number(t.Participants_Current || 0);
    const max = Number(t.Participants_Max || 0);
    const spotsLeft = Math.max(0, max - current);
    const fillPct = max > 0 ? Math.round((current / max) * 100) : 0;
    const start = new Date(t.Start_Date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
    const end = new Date(t.End_Date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
    const deadline = t.Join_Deadline ? new Date(t.Join_Deadline).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }) : '-';
    const joinBtn = !currentUser
      ? `<a href="login.html?redirect=group-trips.html" class="btn btn-primary btn-sm">Log in to join</a>`
      : (currentUser.user_type !== 'traveller'
        ? `<button class="btn btn-sm" disabled>Traveller account required</button>`
        : `<button class="btn btn-primary btn-sm" onclick="joinTrip(${Number(t.Group_Trip_ID)})">Join trip</button>`);
    return `
      <div class="gt-card">
        <div class="gt-thumb"><span class="gt-spots">${spotsLeft} spots left</span></div>
        <div class="gt-body">
          <div class="gt-agency">${escHtml(t.Company_Name || 'Agency')}</div>
          <div class="gt-name">${escHtml(t.Trip_Name)}</div>
          <div class="gt-meta">
            <span>${escHtml(start)}-${escHtml(end)}</span>
            <span>${escHtml(countryFromName(t.Trip_Name))}</span>
            <span>${current}/${max} joined</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${fillPct}%;"></div></div>
          <div class="text-xs text-muted" style="margin-bottom:0.75rem;">${current} of ${max} spots filled · Join deadline: ${escHtml(deadline)}</div>
          <div style="margin-top:auto;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <span class="badge ${spotsLeft <= 2 ? 'badge-red' : 'badge-green'}">${spotsLeft <= 2 ? 'Limited spots' : 'Open'}</span>
          </div>
        </div>
        <div class="gt-footer">
          <div><div style="font-size:0.9rem;font-weight:500;">Group trip</div><div class="text-xs text-muted">Join with travellers</div></div>
          ${joinBtn}
        </div>
      </div>
    `;
  }).join('');
}

async function joinTrip(groupTripId) {
  const res = await callAPI({ type: 'JoinGroupTrip', group_trip_id: groupTripId });
  if (res.status !== 'success') {
    alert(res.message || 'Unable to join this trip.');
    return;
  }
  alert('Joined trip successfully.');
  await loadTrips();
}

async function loadTrips() {
  const res = await callAPI({ type: 'GetPublicGroupTrips' });
  allTrips = res.status === 'success' ? (res.data || []) : [];
  renderTrips();
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  updateNav(currentUser);
  await loadTrips();
  ['gt-destination-filter', 'gt-date-filter', 'gt-sort-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderTrips);
  });
});
