const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html
const COMPARE_KEY = 'tripistry_compare_ids';

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
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await callAPI({ type: 'Logout' });
    window.location.href = 'login.html';
  });
}

function getCompareIds() {
  try {
    return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]').filter(n => Number.isInteger(n));
  } catch (_e) {
    return [];
  }
}

function destinationLabel(p) {
  if (p.City || p.Country) {
    return p.City ? `${p.City}, ${p.Country || ''}` : (p.Country || '-');
  }
  const name = String(p.Name || '').toLowerCase();
  const known = ['tokyo', 'kyoto', 'cape town', 'santorini', 'bali', 'paris', 'bangkok', 'cusco', 'rome', 'dubai'];
  const hit = known.find(k => name.includes(k));
  return hit ? hit.replace(/\b\w/g, c => c.toUpperCase()) : '-';
}

function clearCompare() {
  localStorage.removeItem(COMPARE_KEY);
  renderCompare([]);
}

function renderCompare(packages) {
  const container = document.querySelector('main .container');
  if (!container) return;

  if (!packages.length) {
    container.innerHTML = `
      <div class="page-header">
        <h1 style="font-size:2rem;">Compare packages</h1>
        <p class="text-muted mt-1">No packages selected yet.</p>
      </div>
      <a href="browse.html" class="btn btn-primary">Browse packages</a>
    `;
    return;
  }

  const rows = [
    ['Price per person', p => `R${Number(p.Min_Price || p.Base_Price || 0).toLocaleString('en-ZA')}`],
    ['Duration', p => escHtml(p.Duration || '-')],
    ['Destination', p => escHtml(destinationLabel(p))],
    ['Rating', p => p.Avg_Rating ? `${p.Avg_Rating} (${p.Review_Count || 0})` : 'No reviews']
  ];

  let html = `
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div>
          <h1 style="font-size:2rem;">Compare packages</h1>
          <p class="text-muted mt-1">Live package comparison</p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="clearCompare()">Clear compare</button>
      </div>
    </div>
    <div class="compare-table-wrap"><table class="compare-table"><thead><tr><th class="row-label"></th>
  `;

  html += packages.map(p => `
    <th class="compare-col" style="padding:0 0.75rem 1.25rem;">
      <div class="compare-head">
        <div style="font-size:0.8rem;color:var(--col-muted);margin-bottom:0.25rem;">${escHtml(p.Company_Name || '')}</div>
        <div style="font-weight:500;line-height:1.35;margin-bottom:0.5rem;">${escHtml(p.Name)}</div>
        <div class="text-xs text-muted">${p.Avg_Rating ? `${p.Avg_Rating} (${p.Review_Count || 0})` : 'No reviews'}</div>
      </div>
    </th>
  `).join('');
  html += '</tr></thead><tbody>';

  rows.forEach(([label, fn]) => {
    html += `<tr><td class="row-label">${label}</td>`;
    html += packages.map(p => `<td style="padding:0 0.75rem;"><div class="compare-cell">${fn(p)}</div></td>`).join('');
    html += '</tr>';
  });
  html += '</tbody><tfoot><tr><td class="row-label"></td>';
  html += packages.map(p => `
    <td style="padding:0 0.75rem 0;">
      <div class="compare-foot">
        <a href="package-detail.html?id=${p.Package_ID}" class="btn btn-primary" style="width:100%;justify-content:center;">View package</a>
      </div>
    </td>
  `).join('');
  html += '</tr></tfoot></table></div>';
  container.innerHTML = html;
}

async function loadCompare() {
  const ids = getCompareIds();
  if (!ids.length) {
    renderCompare([]);
    return;
  }
  const res = await callAPI({ type: 'GetPackages' });
  if (res.status !== 'success') {
    renderCompare([]);
    return;
  }
  const map = new Map((res.data || []).map(p => [Number(p.Package_ID), p]));
  renderCompare(ids.map(id => map.get(id)).filter(Boolean));
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  updateNav(user);
  loadCompare();
});
