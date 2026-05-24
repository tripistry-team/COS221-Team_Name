const API_URL = 'api/api.php';

let currentUser = null;
let editPackageId = null;

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

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function collectFormData(status) {
  const name        = document.getElementById('pkg-name')?.value.trim();
  const description = document.querySelector('textarea')?.value.trim();
  const basePrice   = document.querySelector('input[type=number]')?.value;
  const duration    = document.querySelectorAll('input[type=number]')[1]?.value;

  if (!name || !description || !basePrice || !duration) {
    alert('Please fill in all required fields.');
    return null;
  }

  return {name, description, base_price: parseFloat(basePrice), duration: parseInt(duration), status};
}

async function saveDraft() {
  const formData = collectFormData('draft');
  if (!formData) return;
  await submitPackage(formData);
}

async function publishPkg() {
  const formData = collectFormData('active');
  if (!formData) return;
  await submitPackage(formData);
}

async function submitPackage(formData) {
  let res;

  if (editPackageId) {
    res = await callAPI({type: 'UpdatePackage', package_id: editPackageId, ...formData});
  } else {
    res = await callAPI({type: 'AddPackage', agency_id: currentUser.type_id, ...formData});
  }

  if (res.status === 'success') {
    const pid = editPackageId || res.data?.package_id;

    // add package options
    const optionRows = document.querySelectorAll('#options-list .option-row');
    for (const row of optionRows) {
      const selects = row.querySelectorAll('select');
      const inputs  = row.querySelectorAll('input[type=number]');
      const pkg_type       = selects[0]?.value;
      const final_price    = parseFloat(inputs[0]?.value);
      const participants_min = parseInt(inputs[1]?.value);
      const participants_max = parseInt(inputs[2]?.value);
      if (!pkg_type || !final_price) continue;
      await callAPI({
        type: 'AddPackageOption',
        package_id: pid,
        package_type: pkg_type,
        participants_min,
        participants_max,
        final_price,
        description: ''
      });
    }

    showToast(editPackageId ? 'Package updated!' : 'Package created!');
    setTimeout(() => { window.location.href = 'agency-packages.html'; }, 1500);
  } else {
    alert(`Failed: ${res.message}`);
  }
}

// add/remove dynamic rows
function addOption() {
  const list = document.getElementById('options-list');
  const div  = document.createElement('div');
  div.className = 'option-row';
  div.innerHTML = `
    <div class="form-group"><label>Type</label><select><option>solo</option><option>couple</option><option>group</option><option>family</option></select></div>
    <div class="form-group"><label>Price per person (R)</label><input type="number" placeholder="18500"></div>
    <div class="form-group"><label>Min participants</label><input type="number" placeholder="1" min="1"></div>
    <div class="form-group"><label>Max participants</label><input type="number" placeholder="1" min="1"></div>
    <div style="padding-bottom:2px;"><button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="removeOption(this)">x</button></div>
  `;
  list.appendChild(div);
}

function removeOption(btn) {
  btn.closest('.option-row').remove();
}

function addFlight() {
  const list = document.getElementById('flights-list');
  const div  = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <div class="item-row-icon"></div>
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.5rem;">
      <div class="form-group"><label>Flight number</label><input type="text" placeholder="SA286"></div>
      <div class="form-group"><label>Airline</label><input type="text" placeholder="South African Airways"></div>
      <div class="form-group"><label>From</label><input type="text" placeholder="JNB"></div>
      <div class="form-group"><label>To</label><input type="text" placeholder="NRT"></div>
    </div>
    <button class="btn btn-ghost btn-sm" style="color:var(--danger);align-self:flex-end;" onclick="removeRow(this)">x</button>
  `;
  list.appendChild(div);
}

function addExperience() {
  const list = document.getElementById('experiences-list');
  const div  = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <div class="item-row-icon"></div>
    <div style="flex:1;display:grid;grid-template-columns:140px 1fr 1fr;gap:0.5rem;">
      <div class="form-group"><label>Type</label>
        <select>
          <option value="accommodation">Accommodation</option>
          <option value="restaurant">Restaurant</option>
          <option value="activity">Activity</option>
          <option value="attraction">Attraction</option>
        </select>
      </div>
      <div class="form-group"><label>Name</label><input type="text" placeholder="e.g. Shinjuku Granbell Hotel"></div>
      <div class="form-group"><label>Category / notes</label><input type="text" placeholder="e.g. 4 star Central Tokyo"></div>
    </div>
    <button class="btn btn-ghost btn-sm" style="color:var(--danger);align-self:flex-end;" onclick="removeRow(this)">x</button>
  `;
  list.appendChild(div);
}

function addService() {
  const list = document.getElementById('services-list');
  const div  = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <div class="item-row-icon"></div>
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
      <div class="form-group"><label>Service name</label><input type="text" placeholder="e.g. Travel insurance"></div>
      <div class="form-group"><label>Price (R)</label><input type="number" placeholder="500"></div>
    </div>
    <button class="btn btn-ghost btn-sm" style="color:var(--danger);align-self:flex-end;" onclick="removeRow(this)">x</button>
  `;
  list.appendChild(div);
}

function removeRow(btn) {
  btn.closest('.item-row').remove();
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  updateNav(currentUser);

  // check if editing existing package
  const params = new URLSearchParams(window.location.search);
  editPackageId = params.get('id') ? parseInt(params.get('id')) : null;

  if (editPackageId) {
    document.querySelector('h2') && (document.querySelector('h2').textContent = 'Edit package');
    const res = await callAPI({type: 'GetPackageDetails', package_id: editPackageId});
    if (res.status === 'success') {
      const pkg = res.data.package;
      if (document.getElementById('pkg-name')) document.getElementById('pkg-name').value = pkg.Name || '';
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.value = pkg.Description || '';
      const numInputs = document.querySelectorAll('input[type=number]');
      if (numInputs[0]) numInputs[0].value = pkg.Base_Price || '';
      if (numInputs[1]) numInputs[1].value = pkg.Duration || '';
      if (document.getElementById('pkg-status')) document.getElementById('pkg-status').value = pkg.Package_Status || 'draft';
    }
  }
});

