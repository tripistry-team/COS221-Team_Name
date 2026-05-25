const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function destinationImage(city, country) {
  const a = slugify(city);
  const b = slugify(country);
  return `url('../assets/images/destinations/${a || b}.jpg'), url('../assets/images/travel-placeholder.svg')`;
}

function packageImage(name) {
  return `url('../assets/images/packages/${slugify(name)}.jpg'), url('../assets/images/travel-placeholder.svg')`;
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
  if (data.status === 'success' && data.data.logged_in) return data.data;
  return null;  // guests can view the homepage
}

function updateNav(user) {
  const actions = document.querySelector('.nav-actions');
  if (!actions) return;
  if (user) {
    actions.innerHTML = `
      <span class="text-sm" style="color:var(--col-muted);">Hi, ${escHtml(user.username)}</span>
      ${user.user_type === 'traveller' ? '<a href="traveller-dashboard.html#bookings" class="btn btn-sm">My bookings</a>' : ''}
      <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
  } else {
    actions.innerHTML = `
      <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
      <a href="register.html" class="btn btn-primary btn-sm">Sign up</a>
    `;
  }
}

async function handleLogout() {
  await callAPI({type: 'Logout'});
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

  let destinations = [];
  const data = await callAPI({type: 'GetFeature', feature: 'destination'});
  if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
    destinations = data.data;
  } else {
    // Fallback: derive top destinations from active packages if destination feature is empty.
    const pkg = await callAPI({type: 'GetPackages', sort: 'rating_desc'});
    if (pkg.status === 'success' && Array.isArray(pkg.data) && pkg.data.length) {
      const seen = new Set();
      destinations = pkg.data
        .filter(p => p.City || p.Country)
        .map(p => ({ City: p.City || p.Country, Country: p.Country || '' }))
        .filter(d => {
          const key = `${d.City}|${d.Country}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }
  }

  if (!destinations.length) return;

  grid.innerHTML = destinations.slice(0, 5).map((d, i) => {
    const dest = d.City || d.Country;
    return `
      <a href="browse.html?destination=${encodeURIComponent(dest)}" class="dest-card">
        <div class="dest-card-bg" style="background-image:${destinationImage(d.City || '', d.Country || '')};background-size:cover;background-position:center;"></div>
        <div class="dest-card-overlay"></div>
        <div class="dest-card-info">
          <h3>${escHtml(d.City || d.Country)}</h3>
          <p>${escHtml(d.Country || '')}</p>
        </div>
      </a>
    `;
  }).join('');
}

function buildPackageCard(pkg) {
  const price    = pkg.Min_Price
    ? `R${parseFloat(pkg.Min_Price).toLocaleString('en-ZA')}`
    : `R${parseFloat(pkg.Base_Price).toLocaleString('en-ZA')}`;
  const rating   = pkg.Avg_Rating ? `${pkg.Avg_Rating} &#9733; (${pkg.Review_Count} reviews)` : 'No reviews yet';
  const location = pkg.City ? `${pkg.City}, ${pkg.Country}` : (pkg.Country || '');
  const agencies = pkg.Agencies || '';

  return `
    <a href="package-detail.html?id=${pkg.Package_ID}" class="pkg-card">
      <div class="pkg-thumb" style="background-image:${packageImage(pkg.Name)};background-size:cover;background-position:center;"></div>
      <div class="pkg-body">
        <div class="pkg-agency">${escHtml(agencies)}</div>
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
  const user = await checkAuth();  // null if guest — that's fine

  updateNav(user);
  loadFeaturedPackages();
  loadDestinations();
  initSearch();
});
