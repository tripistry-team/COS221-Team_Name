const API_URL = 'api.php';
const PAGE_SIZE = 6;

let allPackages = [];
let currentPage = 1;
let currentUser = null;

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
    window.location.href = 'login.html?redirect=browse.html';
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
  const data = await callAPI({type: 'GetPackages', ...filters});

  if (data.status !== 'success') {
    if (list) list.innerHTML = '<p class="text-muted" style="grid-column:1/-1;">Failed to load packages.</p>';
    return;
  }

  allPackages = data.data || [];
  currentPage = 1;
  renderPage();
  renderPagination();
  updateResultsCount();
  updateActiveFilterTags(filters);
}

function buildPackageCard(pkg) {
  const price = pkg.Min_Price
    ? `R${parseFloat(pkg.Min_Price).toLocaleString('en-ZA')}`
    : `R${parseFloat(pkg.Base_Price).toLocaleString('en-ZA')}`;
  const rating = pkg.Avg_Rating ? `${pkg.Avg_Rating} (${pkg.Review_Count})` : 'No reviews yet';
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.375rem;">
          <span class="text-sm text-muted">${rating}</span>
          <button class="btn btn-primary btn-sm"
                  onclick="event.preventDefault(); goToPackage(${pkg.Package_ID})">Book</button>
        </div>
      </div>
    </a>
  `;
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
  if (filters.destination)  tags.push(`Destination: ${filters.destination}`);
  if (filters.max_price)    tags.push(`Up to R${parseFloat(filters.max_price).toLocaleString('en-ZA')}`);
  if (filters.package_type) tags.push(filters.package_type.charAt(0).toUpperCase() + filters.package_type.slice(1));
  if (filters.min_rating)   tags.push(`${filters.min_rating}+ stars`);

  container.innerHTML = tags.map(t =>
    `<span class="filter-tag" onclick="this.remove(); fetchAndRender();">${escHtml(t)} x</span>`
  ).join('');
}

function goToPackage(packageId) {
  window.location.href = `package-detail.html?id=${packageId}`;
}

function prefillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dest = params.get('destination');
  const destInput = document.getElementById('dest-search');
  if (dest && destInput) destInput.value = dest;
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;

  localStorage.setItem('tripistry_user', JSON.stringify(currentUser));

  updateNav(currentUser);
  prefillFromUrl();

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