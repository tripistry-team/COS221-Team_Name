const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html
let activeRegion = 'all';

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
    <span class="text-sm text-muted">Hi, ${user.username}</span>
    ${user.user_type === 'traveller' ? '<a href="traveller-dashboard.html#bookings" class="btn btn-sm">My bookings</a>' : ''}
    <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
  `;
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await callAPI({ type: 'Logout' });
    window.location.href = 'login.html';
  });
}

function regionForCountry(country) {
  const c = (country || '').toLowerCase();
  if (['south africa', 'morocco', 'kenya', 'nigeria', 'egypt', 'botswana', 'zimbabwe'].includes(c)) return 'africa';
  if (['japan', 'indonesia', 'thailand', 'china', 'india', 'uae', 'united arab emirates', 'qatar', 'saudi arabia'].includes(c)) return 'asia';
  if (['france', 'greece', 'italy', 'spain', 'germany', 'united kingdom'].includes(c)) return 'europe';
  if (['united states', 'usa', 'canada', 'mexico'].includes(c)) return 'north-america';
  if (['peru', 'brazil', 'argentina', 'chile', 'colombia'].includes(c)) return 'south-america';
  if (['australia', 'new zealand'].includes(c)) return 'oceania';
  return 'all';
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function destinationImage(imageUrl, city, country) {
  const s = slugify(city || country || 'destination');
  const fallback = `url('../assets/images/destinations/${s}.jpg'), url('../assets/images/travel-placeholder.svg')`;
  const u = String(imageUrl || '').trim();
  if (!u) return fallback;
  const safe = u.replace(/'/g, "\\'");
  return `url('${safe}'), ${fallback}`;
}

function setRegion(r, btn) {
  activeRegion = r;
  document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterDests();
}

function filterDests() {
  const q = (document.getElementById('dest-search').value || '').toLowerCase();
  const cards = document.querySelectorAll('.dest-card');
  let visible = 0;
  cards.forEach(c => {
    const regionMatch = activeRegion === 'all' || c.dataset.region === activeRegion;
    const nameMatch = !q || (c.dataset.name || '').includes(q);
    const show = regionMatch && nameMatch;
    c.style.display = show ? 'block' : 'none';
    if (show) visible++;
  });
  const noRes = document.getElementById('no-results');
  if (noRes) noRes.style.display = visible === 0 ? 'block' : 'none';
}

async function loadDestinations() {
  const grid = document.getElementById('dest-grid');
  if (!grid) return;
  const data = await callAPI({ type: 'GetFeature', feature: 'destination' });
  if (data.status !== 'success' || !Array.isArray(data.data) || !data.data.length) {
    grid.innerHTML = '<p class="text-muted">No destinations available right now.</p>';
    return;
  }

  grid.innerHTML = data.data.map((d, i) => {
    const city = d.City || d.Country || 'Destination';
    const country = d.Country || '';
    const region = regionForCountry(country);
    const nameData = `${city} ${country}`.toLowerCase();
    return `
      <a href="browse.html?destination=${encodeURIComponent(city)}" class="dest-card" data-region="${region}" data-name="${nameData}">
        <div class="dest-thumb" style="background-image:${destinationImage(d.Image_url, city, country)};background-size:cover;background-position:center;"></div>
        <div class="dest-body">
          <div class="dest-country">${country}</div>
          <div class="dest-name">${city}</div>
          <div class="dest-meta"><span>View packages</span></div>
        </div>
      </a>`;
  }).join('');
  filterDests();
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  updateNav(user);
  loadDestinations();
});
