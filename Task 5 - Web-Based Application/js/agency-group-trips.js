const API_URL = 'api/api.php';
let currentUser = null;
let allTrips = [];
let activeStatus = 'active';

function tripIdOf(t) {
  return Number(t?.Group_Trip_ID ?? t?.group_trip_id ?? t?.groupTripId ?? 0);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function callAPI(payload) {
  const res = await fetch(API_URL, {
    method: 'POST', credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
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
    await callAPI({type:'Logout'}); window.location.href='login.html';
  });
}

function openModal() { document.getElementById('new-trip-modal')?.classList.add('show'); }
function closeModal() { document.getElementById('new-trip-modal')?.classList.remove('show'); }
function openParticipants() { document.getElementById('participants-modal')?.classList.add('show'); }
function closeParticipants() { document.getElementById('participants-modal')?.classList.remove('show'); }

async function loadTrips() {
  const res = await callAPI({ type: 'GetAgencyGroupTrips' });
  allTrips = res.status === 'success' ? (res.data || []) : [];
  const counts = { active: 0, upcoming: 0, completed: 0 };
  allTrips.forEach(t => { counts[classifyTrip(t)]++; });
  const p = document.querySelector('.agency-layout > div > div p.text-muted.text-sm');
  if (p) p.textContent = `${counts.active} active · ${counts.upcoming} upcoming · ${counts.completed} completed`;
  const tabs = document.querySelectorAll('.tabs .tab');
  if (tabs[0]) tabs[0].textContent = `Active (${counts.active})`;
  if (tabs[1]) tabs[1].textContent = `Upcoming (${counts.upcoming})`;
  if (tabs[2]) tabs[2].textContent = `Completed (${counts.completed})`;
  renderTrips();
}

function classifyTrip(t) {
  const s = String(t.Trip_Status || '').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'completed';
  const now = new Date();
  const start = new Date(t.Start_Date);
  if (start > now) return 'upcoming';
  return 'active';
}

function renderTrips() {
  const rows = Array.from(document.querySelectorAll('.gt-row'));
  rows.forEach(r => r.remove());
  const host = document.querySelector('.agency-layout > div');
  if (!host) return;

  const list = allTrips.filter(t => classifyTrip(t) === activeStatus);
  list.forEach(t => {
    const tid = tripIdOf(t);
    const row = document.createElement('div');
    row.className = 'gt-row';
    row.setAttribute('data-group-trip-id', String(tid > 0 ? tid : ''));
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.875rem;">
        <div>
          <div style="font-weight:600;font-size:1.0625rem;margin-bottom:0.25rem;">${escHtml(t.Trip_Name)}</div>
          <div class="text-sm text-muted">${escHtml(t.Start_Date)} to ${escHtml(t.End_Date)} | Join deadline: ${escHtml(t.Join_Deadline || '-')}</div>
        </div>
        <div style="display:flex;gap:0.375rem;"><span class="badge badge-green">${escHtml(t.Trip_Status)}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:0.875rem;">
        <div style="background:var(--bg-secondary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;"><div style="font-size:1.25rem;font-weight:700;">${Number(t.Participants_Current || 0)}/${Number(t.Participants_Max || 0)}</div><div class="text-xs text-muted">Participants</div></div>
        <div style="background:var(--bg-secondary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;"><div style="font-size:1.25rem;font-weight:700;">${Math.max(0, Number(t.Participants_Max || 0)-Number(t.Participants_Current || 0))}</div><div class="text-xs text-muted">Spots left</div></div>
        <div style="background:var(--bg-secondary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;"><div style="font-size:1.25rem;font-weight:700;">${escHtml(t.Start_Date)}</div><div class="text-xs text-muted">Start</div></div>
        <div style="background:var(--bg-secondary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;"><div style="font-size:1.25rem;font-weight:700;">${escHtml(t.End_Date)}</div><div class="text-xs text-muted">End</div></div>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-sm" onclick="openParticipants()">View participants</button>
        <button class="btn btn-sm" onclick="editTrip(this)">Edit trip</button>
        <button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="cancelTrip(this)">Cancel trip</button>
      </div>`;
    host.appendChild(row);
  });
}

async function createTrip() {
  const name = document.querySelector('#new-trip-modal input[type=text]')?.value.trim();
  const dates = document.querySelectorAll('#new-trip-modal input[type=date]');
  const start_date = dates[0]?.value;
  const end_date = dates[1]?.value;
  const join_deadline = dates[2]?.value || null;
  const nums = document.querySelectorAll('#new-trip-modal input[type=number]');
  const participants_min = parseInt(nums[0]?.value || '0', 10);
  const participants_max = parseInt(nums[1]?.value || '0', 10);

  const res = await callAPI({
    type: 'AddGroupTrip', trip_name: name, start_date, end_date, join_deadline,
    participants_min, participants_max
  });
  if (res.status !== 'success') return alert(res.message || 'Failed to create trip');
  closeModal();
  await loadTrips();
}

async function editTrip(group_trip_id) {
  let id = Number(group_trip_id);
  if (!Number.isInteger(id) || id <= 0) {
    const row = group_trip_id && typeof group_trip_id === 'object' && group_trip_id.closest
      ? group_trip_id.closest('.gt-row')
      : null;
    id = Number(row?.getAttribute('data-group-trip-id'));
  }
  if (!Number.isInteger(id) || id <= 0) return alert('Invalid trip selected.');

  const t = allTrips.find(x => tripIdOf(x) === id);
  if (!t) return;
  const next = prompt('Edit trip name:', t.Trip_Name || '');
  if (next === null || !next.trim()) return;
  const res = await callAPI({ type: 'UpdateGroupTrip', group_trip_id: id, trip_name: next.trim() });
  if (res.status !== 'success') return alert(res.message || 'Failed to update trip');
  await loadTrips();
}

async function cancelTrip(group_trip_id) {
  let id = Number(group_trip_id);
  if (!Number.isInteger(id) || id <= 0) {
    if (group_trip_id && typeof group_trip_id === 'object' && group_trip_id.closest) {
      const row = group_trip_id.closest('.gt-row');
      const fallback = row?.getAttribute('data-group-trip-id');
      id = Number(fallback);
    }
  }
  if (!Number.isInteger(id) || id <= 0) {
    alert('Trip list is still loading. Please try again in a moment.');
    return;
  }
  if (!confirm('Cancel this trip?')) return;
  const res = await callAPI({ type: 'CancelGroupTrip', group_trip_id: id, groupTripId: id });
  if (res.status !== 'success') return alert(res.message || 'Failed to cancel trip');
  await loadTrips();
}

function removeParticipant(btn) {
  const tr = btn.closest('tr');
  if (tr && confirm('Remove this participant?')) tr.remove();
}

function setTripTab(status, btn) {
  activeStatus = status;
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTrips();
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  updateNav(currentUser);

  const tabs = document.querySelectorAll('.tabs .tab');
  if (tabs[0]) tabs[0].onclick = () => setTripTab('active', tabs[0]);
  if (tabs[1]) tabs[1].onclick = () => setTripTab('upcoming', tabs[1]);
  if (tabs[2]) tabs[2].onclick = () => setTripTab('completed', tabs[2]);

  ['new-trip-modal', 'participants-modal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
  });

  await loadTrips();
});
