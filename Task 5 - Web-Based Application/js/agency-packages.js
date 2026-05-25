const API_URL = 'api/api.php';

let currentUser = null;
let deleteTargetId = null;
let allAgencyPackages = [];

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  const res = await callAPI({type: 'CheckAuthorisation'});
  if (res.status === 'success' && res.data.logged_in && res.data.user_type === 'agency_staff')
    return res.data;
  window.location.href = 'login.html';
  return null;
}

function updateNav(user) {
  const actions = document.querySelector('.nav-actions');
  if (!actions || !user) return;
  actions.innerHTML = `
    <span class="text-sm" style="color:var(--col-muted);">${escHtml(user.username)}</span>
    <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
  `;
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

async function handleLogout() {
  await callAPI({type: 'Logout'});
  window.location.href = 'login.html';
}

async function loadPackages() {
  const list = document.getElementById('pkg-list');
  if (!list) return;

  list.innerHTML = '<p class="text-muted">Loading packages...</p>';

  const data = await callAPI({type: 'GetPackages'});
  const mine = (data.data || []).filter(p => Number(p.Agency_ID) === Number(currentUser.type_id));
  allAgencyPackages = mine;
  const counts = {
    all: allAgencyPackages.length,
    active: allAgencyPackages.filter(p => String(p.Package_Status).toLowerCase() === 'active').length,
    draft: allAgencyPackages.filter(p => String(p.Package_Status).toLowerCase() === 'draft').length,
    archived: allAgencyPackages.filter(p => String(p.Package_Status).toLowerCase() === 'archived').length
  };
  const tabs = document.querySelectorAll('.tabs .tab');
  if (tabs[0]) tabs[0].textContent = `All (${counts.all})`;
  if (tabs[1]) tabs[1].textContent = `Active (${counts.active})`;
  if (tabs[2]) tabs[2].textContent = `Draft (${counts.draft})`;
  if (tabs[3]) tabs[3].textContent = `Archived (${counts.archived})`;
  if (data.status !== 'success' || !mine.length) {
    list.innerHTML = '<p class="text-muted">No packages found. <a href="agency-package-form.html">Create one.</a></p>';
    return;
  }

  renderPackagesByStatus('all');
}

function renderPackagesByStatus(status) {
  const list = document.getElementById('pkg-list');
  if (!list) return;
  const source = status === 'all' ? allAgencyPackages : allAgencyPackages.filter(p => String(p.Package_Status).toLowerCase() === status);
  list.innerHTML = source.map(pkg => {
    const rating  = pkg.Avg_Rating ? `${pkg.Avg_Rating} &#9733;` : 'No reviews';
    const price   = `R${parseFloat(pkg.Base_Price).toLocaleString('en-ZA')}`;
    const statusClass = pkg.Package_Status === 'active' ? 'badge-green' : 'badge-amber';

    return `
      <div class="pkg-row" data-id="${pkg.Package_ID}">
        <div class="pkg-thumb" style="background-image:${packageImage(pkg.Name)};background-size:cover;background-position:center;"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;">${escHtml(pkg.Name)}</div>
          <div class="text-xs text-muted">${escHtml(pkg.Duration)} &middot; ${price}</div>
          <div class="text-xs text-muted" style="margin-top:0.25rem;">${rating}</div>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0;">
          <span class="badge ${statusClass}">${cap(pkg.Package_Status)}</span>
          <a href="agency-package-form.html?id=${pkg.Package_ID}" class="btn btn-ghost btn-sm">Edit</a>
          ${pkg.Package_Status !== 'active'
            ? `<button class="btn btn-sm btn-primary" onclick="publishPkg(${pkg.Package_ID}, '${escHtml(pkg.Name).replace(/'/g,"\\'")}')">Publish</button>`
            : ''}
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);"
                  onclick="showDelete(${pkg.Package_ID}, '${escHtml(pkg.Name).replace(/'/g,"\\'")}')">Delete</button>
        </div>
      </div>
    `;
  }).join('') || '<p class="text-muted">No packages found for this status.</p>';
}

function setPackageTab(status, btn) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPackagesByStatus(status);
}

async function publishPkg(id, name) {
  const details = await callAPI({ type: 'GetPackageDetails', package_id: id });
  if (details.status !== 'success') {
    alert(`Failed to load package: ${details.message}`);
    return;
  }
  const p = details.data.package;
  const res = await callAPI({
    type: 'UpdatePackage',
    package_id: id,
    name: p.Name || name,
    description: p.Description || '',
    base_price: Number(p.Base_Price || 0),
    duration: Number(p.Duration || 1),
    status: 'active'
  });
  if (res.status === 'success') {
    loadPackages();
  } else {
    alert(`Failed to publish: ${res.message}`);
  }
}

function showDelete(id, name) {
  deleteTargetId = id;
  const nameEl = document.getElementById('delete-pkg-name');
  if (nameEl) nameEl.textContent = name;
  document.getElementById('delete-modal').classList.add('show');
}

function closeDelete() {
  deleteTargetId = null;
  document.getElementById('delete-modal').classList.remove('show');
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  const data = await callAPI({type: 'DeletePackage', package_id: deleteTargetId});

  if (data.status === 'success') {
    closeDelete();
    loadPackages();
  } else {
    alert(`Failed to delete: ${data.message}`);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  updateNav(currentUser);
  loadPackages();
  const tabs = document.querySelectorAll('.tabs .tab');
  if (tabs[0]) tabs[0].onclick = () => setPackageTab('all', tabs[0]);
  if (tabs[1]) tabs[1].onclick = () => setPackageTab('active', tabs[1]);
  if (tabs[2]) tabs[2].onclick = () => setPackageTab('draft', tabs[2]);
  if (tabs[3]) tabs[3].onclick = () => setPackageTab('archived', tabs[3]);

  document.getElementById('delete-modal').addEventListener('click', function(e) {
    if (e.target === this) closeDelete();
  });
});

