const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html
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

function packageImageFromDestination(imageUrl, name) {
  const fallback = packageImage(name);
  const u = String(imageUrl || '').trim();
  if (!u) return fallback;
  const safe = u.replace(/'/g, "\\'");
  return `url('${safe}'), ${fallback}`;
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

  // CHANGED: destination filtering handled client-side for reliable continent/multi-select support.

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

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) filters.sort = (sortSelect.value || 'rating_desc');

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
  const location = pkg.City ? `${pkg.City}, ${pkg.Country}` : (pkg.Country || 'Destination');
  // Agencies is the comma-separated string from GROUP_CONCAT in getPackages
  const agencies = pkg.Agencies || '';

  return `
    <a href="package-detail.html?id=${pkg.Package_ID}" class="pkg-card">
      <div class="pkg-thumb" style="background-image:${packageImageFromDestination(pkg.Image_url, pkg.Name)};background-size:cover;background-position:center;"></div>
      <div class="pkg-body">
        <div class="pkg-agency">${escHtml(agencies)}</div>
        <div class="pkg-name">${escHtml(location)}</div>
        <div class="pkg-meta">
          <span>${escHtml(formatDuration(pkg.Duration))}</span>
          <span>${escHtml(pkg.Name || '')}</span>
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

function formatDuration(duration) {
  const d = String(duration || '').trim();
  if (!d) return '-';
  if (/day/i.test(d)) return d;
  return `${d} days`;
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

  const priceRange = document.getElementById('price-range');
  if (priceRange) {
    const maxPrice = parseFloat(priceRange.value);
    const sliderMax = parseFloat(priceRange.max);
    if (!Number.isNaN(maxPrice) && maxPrice < sliderMax) {
      out = out.filter(p => {
        const candidate = (p.Min_Price != null && p.Min_Price !== '')
          ? parseFloat(p.Min_Price)
          : parseFloat(p.Base_Price);
        return !Number.isNaN(candidate) && candidate <= maxPrice;
      });
    }
  }

  // CHANGED: destination search + continent checkbox filtering moved client-side.
  const destInput = (document.getElementById('dest-search')?.value || '').trim().toLowerCase();
  const selectedContinents = ['d1','d2','d3','d4','d5','d6'].filter(id => document.getElementById(id)?.checked);
  if (destInput || selectedContinents.length) {
    out = out.filter(p => {
      const country = String(p.Country || '').toLowerCase();
      const city = String(p.City || '').toLowerCase();
      const name = String(p.Name || '').toLowerCase();
      const cKey = continentOf(p);
      const continentMatch = !selectedContinents.length || (cKey && selectedContinents.includes(cKey));
      const textMatch = !destInput || country.includes(destInput) || city.includes(destInput) || name.includes(destInput);
      return continentMatch && textMatch;
    });
  }

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
      // CHANGED: tolerate category naming/casing variants.
      const cats = experiences.map(e => String(e.Category || '').trim().toLowerCase());
      const hasAccommodation = cats.some(c => ['accommodation', 'hotel', 'lodging'].includes(c));
      const hasTours = cats.some(c => ['activity', 'attraction', 'tour'].includes(c));
      const hasMeals = cats.some(c => ['restaurant', 'meal', 'dining'].includes(c));
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
  } else if (sort === 'price_asc') {
    packages.sort((a, b) => Number(a.Min_Price ?? a.Base_Price ?? 0) - Number(b.Min_Price ?? b.Base_Price ?? 0));
  } else if (sort === 'price_desc') {
    packages.sort((a, b) => Number(b.Min_Price ?? b.Base_Price ?? 0) - Number(a.Min_Price ?? a.Base_Price ?? 0));
  } else if (sort === 'rating_desc') {
    packages.sort((a, b) => Number(b.Avg_Rating ?? 0) - Number(a.Avg_Rating ?? 0));
  } else if (sort === 'name_desc') {
    packages.sort((a, b) => String(b.Name || '').localeCompare(String(a.Name || '')));
  } else {
    packages.sort((a, b) => String(a.Name || '').localeCompare(String(b.Name || '')));
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

  const pages = [];
  const pushPage = (n) => {
    if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n);
  };

  pushPage(1);
  pushPage(currentPage - 1);
  pushPage(currentPage);
  pushPage(currentPage + 1);
  pushPage(totalPages);
  pages.sort((a, b) => a - b);

  const prevDisabled = currentPage === 1 ? ' disabled' : '';
  const nextDisabled = currentPage === totalPages ? ' disabled' : '';
  let html = `<button class="page-btn${prevDisabled}" type="button" onclick="changePage(${currentPage - 1})" aria-label="Previous page">&#8249;</button>`;

  for (let i = 0; i < pages.length; i++) {
    const n = pages[i];
    const prev = pages[i - 1];
    if (i > 0 && n - prev > 1) {
      html += `<span class="page-btn" style="border:none;cursor:default;" aria-hidden="true">...</span>`;
    }
    html += `<button class="page-btn${n === currentPage ? ' active' : ''}" type="button" onclick="changePage(${n})">${n}</button>`;
  }

  html += `<button class="page-btn${nextDisabled}" type="button" onclick="changePage(${currentPage + 1})" aria-label="Next page">&#8250;</button>`;
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
  // CHANGED: do not overwrite destination search with huge continent strings.
  ['d1','d2','d3','d4','d5','d6'].forEach((id) => {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.addEventListener('change', fetchAndRender);
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
