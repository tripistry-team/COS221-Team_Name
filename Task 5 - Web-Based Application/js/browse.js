const API_URL = 'api/api.php';
const PAGE_SIZE = 6;
const COMPARE_KEY = 'tripistry_compare_ids';

let allPackages = [];
let currentPage = 1;
let currentUser = null;
let activeFiltersState = {};
const detailCache = {};

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
  return null;  // guests can still browse
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

function collectFilters() {
  const filters = {};

  const destInput = document.getElementById('dest-search');
  if (destInput && destInput.value.trim()) filters.destination = destInput.value.trim();

  const priceRange = document.getElementById('price-range');
  if (priceRange && parseFloat(priceRange.value) < parseFloat(priceRange.max))
    filters.max_price = parseFloat(priceRange.value);

  const typeChecks = document.querySelectorAll('.pkg-type-check:checked');
  if (typeChecks.length === 1) filters.package_type = typeChecks[0].value;

  const ratingChecks = document.querySelectorAll('.rating-check:checked');
  if (ratingChecks.length) {
    const vals = Array.from(ratingChecks).map(c => parseFloat(c.value));
    filters.min_rating = Math.max(...vals);
  }

  const sortMap = {
    'Most popular'       : 'rating_desc',
    'Price: low to high' : 'price_asc',
    'Price: high to low' : 'price_desc',
    'Highest rated'      : 'rating_desc',
    'Duration: shortest' : 'duration_asc',
    'Name'               : 'name_asc'
  };
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) filters.sort = sortMap[sortSelect.value] ?? 'name_asc';

  return filters;
}

async function fetchAndRender() {
  const list = document.getElementById('pkg-list');
  if (list) list.innerHTML = '<p class="text-muted" style="grid-column:1/-1;">Loading packages...</p>';

  const filters = collectFilters();
  activeFiltersState = { ...filters };
  const data = await callAPI({type: 'GetPackages', ...filters});

  if (data.status !== 'success') {
    if (list) list.innerHTML = '<p class="text-muted" style="grid-column:1/-1;">Failed to load packages.</p>';
    return;
  }

  const raw = data.data || [];
  allPackages = await applyClientFilters(raw);
  applyClientSort(allPackages, filters.sort || 'name_asc');
  currentPage = 1;
  renderPage();
  renderPagination();
  updateResultsCount();
  updateActiveFilterTags(filters);
}

function buildPackageCard(pkg) {
  const price    = pkg.Min_Price
    ? `R${parseFloat(pkg.Min_Price).toLocaleString('en-ZA')}`
    : `R${parseFloat(pkg.Base_Price).toLocaleString('en-ZA')}`;
  const rating   = pkg.Avg_Rating ? `${pkg.Avg_Rating} &#9733; (${pkg.Review_Count})` : 'No reviews yet';
  const location = pkg.City ? `${pkg.City}, ${pkg.Country}` : (pkg.Country || '');
  // Agencies is the comma-separated string from GROUP_CONCAT in getPackages
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.375rem;">
          <span class="text-sm text-muted">${rating}</span>
          <button class="btn btn-primary btn-sm"
                  onclick="event.preventDefault(); goToPackage(${pkg.Package_ID})">View</button>
          <button class="btn btn-ghost btn-sm"
                  onclick="event.preventDefault(); addToCompare(${pkg.Package_ID})">Compare</button>
        </div>
      </div>
    </a>
  `;
}

function durationDays(text) {
  const m = String(text || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

async function getPackageDetailCached(packageId) {
  if (detailCache[packageId]) return detailCache[packageId];
  const res = await callAPI({ type: 'GetPackageDetails', package_id: packageId });
  detailCache[packageId] = (res.status === 'success') ? (res.data || {}) : { flights: [], experiences: [] };
  return detailCache[packageId];
}

async function applyClientFilters(packages) {
  let out = [...packages];

  const durs = [];
  if (document.getElementById('dur1')?.checked) durs.push([1, 3]);
  if (document.getElementById('dur2')?.checked) durs.push([4, 7]);
  if (document.getElementById('dur3')?.checked) durs.push([8, 14]);
  if (document.getElementById('dur4')?.checked) durs.push([15, 9999]);
  if (durs.length) {
    out = out.filter(p => {
      const d = durationDays(p.Duration);
      return durs.some(([min, max]) => d >= min && d <= max);
    });
  }

  const needIncludes = ['inc1', 'inc2', 'inc3', 'inc4', 'inc5'].some(id => document.getElementById(id)?.checked);
  if (needIncludes) {
    const checks = {
      flights: !!document.getElementById('inc1')?.checked,
      accommodation: !!document.getElementById('inc2')?.checked,
      transfers: !!document.getElementById('inc3')?.checked,
      tours: !!document.getElementById('inc4')?.checked,
      meals: !!document.getElementById('inc5')?.checked
    };
    const filtered = [];
    for (const p of out) {
      const detail = await getPackageDetailCached(p.Package_ID);
      const experiences = detail.experiences || [];
      const hasFlights = (detail.flights || []).length > 0;
      const hasAccommodation = experiences.some(e => String(e.Category || '').toLowerCase() === 'accommodation');
      const hasTours = experiences.some(e => ['activity', 'attraction'].includes(String(e.Category || '').toLowerCase()));
      const hasMeals = experiences.some(e => String(e.Category || '').toLowerCase() === 'restaurant');
      const hasTransfers = hasFlights || hasTours;
      const ok =
        (!checks.flights || hasFlights) &&
        (!checks.accommodation || hasAccommodation) &&
        (!checks.transfers || hasTransfers) &&
        (!checks.tours || hasTours) &&
        (!checks.meals || hasMeals);
      if (ok) filtered.push(p);
    }
    out = filtered;
  }
  return out;
}

function applyClientSort(packages, sort) {
  if (sort === 'duration_asc') {
    packages.sort((a, b) => durationDays(a.Duration) - durationDays(b.Duration));
  } else if (sort === 'duration_desc') {
    packages.sort((a, b) => durationDays(b.Duration) - durationDays(a.Duration));
  }
}

function renderPage() {
  const list = document.getElementById('pkg-list');
  if (!list) return;

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = allPackages.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    list.innerHTML = '<p class="text-muted" style="grid-column:1/-1;">No packages found. Try adjusting your filters.</p>';
    return;
  }
  list.innerHTML = slice.map(pkg => buildPackageCard(pkg)).join('');
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(allPackages.length / PAGE_SIZE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<a class="page-btn" onclick="changePage(${currentPage - 1})">&#8249;</a>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<a class="page-btn${i === currentPage ? ' active' : ''}" onclick="changePage(${i})">${i}</a>`;
  }
  html += `<a class="page-btn" onclick="changePage(${currentPage + 1})">&#8250;</a>`;
  container.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(allPackages.length / PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderPage();
  renderPagination();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function updateResultsCount() {
  const el = document.getElementById('results-count');
  if (el) el.textContent = allPackages.length;
}

function updateActiveFilterTags(filters) {
  const container = document.getElementById('active-filters');
  if (!container) return;

  const tags = [];
  if (filters.destination)  tags.push({ key: 'destination', label: `Destination: ${filters.destination}` });
  if (filters.max_price)    tags.push({ key: 'max_price', label: `Up to R${parseFloat(filters.max_price).toLocaleString('en-ZA')}` });
  if (filters.package_type) tags.push({ key: 'package_type', label: filters.package_type.charAt(0).toUpperCase() + filters.package_type.slice(1) });
  if (filters.min_rating)   tags.push({ key: 'min_rating', label: `${filters.min_rating}+ stars` });

  container.innerHTML = tags.map(t =>
    `<span class="filter-tag" onclick="removeFilterTag('${t.key}')">${escHtml(t.label)} x</span>`
  ).join('');
}

function removeFilterTag(key) {
  if (key === 'destination') {
    const destInput = document.getElementById('dest-search');
    if (destInput) destInput.value = '';
  }

  if (key === 'max_price') {
    const priceRange = document.getElementById('price-range');
    const priceLabel = document.getElementById('price-label');
    if (priceRange) {
      priceRange.value = priceRange.max;
      if (priceLabel) priceLabel.textContent = `up to R${parseInt(priceRange.max).toLocaleString('en-ZA')}`;
    }
  }

  if (key === 'package_type') {
    document.querySelectorAll('.pkg-type-check').forEach(cb => { cb.checked = false; });
  }

  if (key === 'min_rating') {
    document.querySelectorAll('.rating-check').forEach(cb => { cb.checked = false; });
  }

  fetchAndRender();
}

function goToPackage(packageId) {
  window.location.href = `package-detail.html?id=${packageId}`;
}

function addToCompare(packageId) {
  let ids = [];
  try {
    ids = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
  } catch (_e) {
    ids = [];
  }
  ids = ids.filter(n => Number.isInteger(n));
  if (!ids.includes(packageId)) ids.push(packageId);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 3)));
  window.location.href = 'compare.html';
}

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get('destination');
  const destInput = document.getElementById('dest-search');
  if (dest && destInput) {
    destInput.value = dest;
    document.querySelectorAll('.pkg-type-check,.rating-check,.filter-panel input[type=checkbox]').forEach(cb => {
      cb.checked = false;
    });
    const priceRange = document.getElementById('price-range');
    const priceLabel = document.getElementById('price-label');
    if (priceRange) {
      priceRange.value = priceRange.max;
      if (priceLabel) priceLabel.textContent = `up to R${parseInt(priceRange.max).toLocaleString('en-ZA')}`;
    }
  }
}

function wireDestinationChecks() {
  const map = {
    d1: 'South Africa, Morocco, Kenya, Nigeria, Egypt, Botswana, Zimbabwe',
    d2: 'Japan, Indonesia, Thailand, China, India, UAE, Qatar, Saudi Arabia',
    d3: 'France, Greece, Italy, Spain, Germany, United Kingdom',
    d4: 'United States, Canada, Mexico',
    d5: 'Peru, Brazil, Argentina, Chile, Colombia',
    d6: 'Australia, New Zealand'
  };
  Object.entries(map).forEach(([id, name]) => {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.addEventListener('change', () => {
      const input = document.getElementById('dest-search');
      if (!input) return;
      const selected = Object.entries(map)
        .filter(([key]) => document.getElementById(key)?.checked)
        .map(([,label]) => label);
      input.value = selected.join(', ');
      fetchAndRender();
    });
  });
}

function continentOf(pkg) {
  const c = String(pkg.Country || '').toLowerCase();
  if (['south africa','morocco','kenya','nigeria','egypt','botswana','zimbabwe'].includes(c)) return 'd1';
  if (['japan','indonesia','thailand','china','india','uae','united arab emirates','qatar','saudi arabia'].includes(c)) return 'd2';
  if (['france','greece','italy','spain','germany','united kingdom'].includes(c)) return 'd3';
  if (['united states','usa','canada','mexico'].includes(c)) return 'd4';
  if (['peru','brazil','argentina','chile','colombia'].includes(c)) return 'd5';
  if (['australia','new zealand'].includes(c)) return 'd6';
  return null;
}

async function renderDestinationCounts() {
  const data = await callAPI({ type: 'GetPackages' });
  if (data.status !== 'success') return;
  const counts = { d1:0,d2:0,d3:0,d4:0,d5:0,d6:0 };
  (data.data || []).forEach(p => {
    const key = continentOf(p);
    if (key) counts[key]++;
  });
  Object.keys(counts).forEach(id => {
    const row = document.getElementById(id)?.closest('.check-item');
    const countEl = row?.querySelector('.count');
    if (countEl) countEl.textContent = String(counts[id]);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();  // null if guest — that's fine

  updateNav(currentUser);
  prefillFromUrl();
  wireDestinationChecks();
  renderDestinationCounts();

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.addEventListener('change', fetchAndRender);

  const priceRange = document.getElementById('price-range');
  const priceLabel = document.getElementById('price-label');
  if (priceRange) {
    priceRange.addEventListener('input', () => {
      const v = parseInt(priceRange.value).toLocaleString('en-ZA');
      if (priceLabel) priceLabel.textContent = `up to R${v}`;
    });
    priceRange.addEventListener('change', fetchAndRender);
  }

  const destInput = document.getElementById('dest-search');
  if (destInput) destInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchAndRender(); });

  document.querySelectorAll('.pkg-type-check').forEach(cb => cb.addEventListener('change', fetchAndRender));
  document.querySelectorAll('.rating-check').forEach(cb => cb.addEventListener('change', fetchAndRender));
  ['dur1', 'dur2', 'dur3', 'dur4', 'inc1', 'inc2', 'inc3', 'inc4', 'inc5'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', fetchAndRender);
  });

  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.querySelectorAll('.filter-panel input[type=checkbox]').forEach(cb => cb.checked = false);
      document.querySelectorAll('.filter-tag').forEach(t => t.remove());
      if (destInput) destInput.value = '';
      if (priceRange) {
        priceRange.value = priceRange.max;
        if (priceLabel) priceLabel.textContent = `up to R${parseInt(priceRange.max).toLocaleString('en-ZA')}`;
      }
      fetchAndRender();
    });
  }

  fetchAndRender();
});
