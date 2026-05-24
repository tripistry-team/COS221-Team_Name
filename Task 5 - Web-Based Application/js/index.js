const API_URL = 'pages/api/api.php';

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  const data = await callAPI({type: 'CheckAuthorisation'});
  if (data.status !== 'success' || !data.data.logged_in) {
    window.location.href = 'login.html?redirect=index.html';
    return null;
  }
  return data.data;
}

function updateNav(user) {
  const actions = document.querySelector('.nav-actions');
  if (!actions || !user) return;
  actions.innerHTML = `
    <span class="text-sm" style="color:var(--col-muted);">Hi, ${escHtml(user.username)}</span>
    <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
  `;
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

async function handleLogout() {
  await callAPI({type: 'Logout'});
  localStorage.removeItem('tripistry_user');
  window.location.href = 'login.html';
}

async function loadFeaturedPackages() {
  const container = document.getElementById('featured-packages');
  if (!container) return;

  const data = await callAPI({type: 'GetPackages', sort: 'rating_desc'});
  if (data.status !== 'success' || !data.data.length) {
    container.innerHTML = '<p class="text-muted">No packages available.</p>';
    return;
  }

  container.innerHTML = data.data.slice(0, 3).map(pkg => buildPackageCard(pkg)).join('');
}

async function loadDestinations() {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;

  const data = await callAPI({type: 'GetFeature', feature: 'destination'});
  if (data.status !== 'success' || !data.data.length) return;

  grid.innerHTML = data.data.slice(0, 5).map((d, i) => {
    const dest = d.City || d.Country;
    return `
      <a href="browse.html?destination=${encodeURIComponent(dest)}"
         class="dest-card${i === 0 ? ' dest-card-first' : ''}">
        <div class="dest-card-bg"></div>
        <div class="dest-card-overlay"></div>
        <div class="dest-card-info">
          <h3>${escHtml(d.City || d.Country)}</h3>
          <p>${escHtml(d.Country)}</p>
        </div>
      </a>
    `;
  }).join('');
}

function buildPackageCard(pkg) {
  const price = pkg.Min_Price
    ? `R${parseFloat(pkg.Min_Price).toLocaleString('en-ZA')}`
    : `R${parseFloat(pkg.Base_Price).toLocaleString('en-ZA')}`;
  const rating = pkg.Avg_Rating ? `${pkg.Avg_Rating} (${pkg.Review_Count} reviews)` : 'No reviews yet';
  const location = pkg.City ? `${pkg.City}, ${pkg.Country}` : (pkg.Country || '');

  return `
    <a href="package-detail.html?id=${pkg.Package_ID}" class="pkg-card">
      <div class="pkg-thumb"></div>
      <div class="pkg-body">
        <div class="pkg-agency">${escHtml(pkg.Company_Name)}</div>
        <div class="pkg-name">${escHtml(pkg.Name)}</div>
        <div class="pkg-meta">
          <span>${escHtml(pkg.Duration)}</span>
          ${location ? `<span>${escHtml(location)}</span>` : ''}
        </div>
        <div class="pkg-price">${price} <span>per person</span></div>
        <div style="margin-top:0.375rem;">
          <span class="text-sm text-muted">${rating}</span>
        </div>
      </div>
    </a>
  `;
}

function initSearch() {
  const input = document.getElementById('hero-search');
  const btn = document.querySelector('.search-box .btn-primary');
  if (!input || !btn) return;

  btn.addEventListener('click', () => {
    const q = input.value.trim();
    window.location.href = q ? `browse.html?destination=${encodeURIComponent(q)}` : 'browse.html';
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;

  // store for use across pages
  localStorage.setItem('tripistry_user', JSON.stringify(user));

  updateNav(user);
  loadFeaturedPackages();
  loadDestinations();
  initSearch();
});