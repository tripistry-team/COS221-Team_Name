const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

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
  actions.innerHTML = `<span class="text-sm" style="color:var(--col-muted);">${user.username}</span><button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>`;
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await callAPI({type: 'Logout'}); window.location.href = 'login.html';
  });
}

function updateSidebar(profile, user) {
  const header = document.querySelector('.agency-sidebar-header');
  if (!header) return;
  const name = profile?.Company_Name || user?.username || 'Agency';
  const initial = String(name).charAt(0).toUpperCase();
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.9rem;">${initial}</div>
      <div><div style="font-weight:500;">${name}</div><div style="font-size:0.8rem;opacity:0.75;">Travel Agency</div></div>
    </div>
  `;
}

function values() {
  const textInputs = document.querySelectorAll('input[type=text]');
  return {
    company_name: textInputs[0]?.value.trim() || '',
    description: document.querySelector('textarea')?.value.trim() || '',
    email: document.querySelector('input[type=email]')?.value.trim() || '',
    username: textInputs[1]?.value.trim() || '',
    current_password: document.querySelectorAll('input[type=password]')[0]?.value || '',
    new_password: document.querySelectorAll('input[type=password]')[1]?.value || '',
    confirm_password: document.querySelectorAll('input[type=password]')[2]?.value || ''
  };
}

async function saveProfile() {
  const v = values();
  const r = await callAPI({
    type: 'UpdateAgencyProfile',
    company_name: v.company_name,
    description: v.description,
    email: v.email,
    username: v.username
  });
  if (r.status !== 'success') return alert(r.message || 'Failed to save profile');

  if (v.new_password || v.confirm_password || v.current_password) {
    if (v.new_password !== v.confirm_password) return alert('New passwords do not match.');
    const rp = await callAPI({ type: 'UpdateAgencyPassword', current_password: v.current_password, new_password: v.new_password });
    if (rp.status !== 'success') return alert(rp.message || 'Failed to update password');
  }

  const alertEl = document.getElementById('save-alert');
  if (alertEl) {
    alertEl.style.display = 'block';
    setTimeout(() => { alertEl.style.display = 'none'; }, 2500);
  }
  updateNav({ username: v.username });
}

async function loadProfile() {
  const r = await callAPI({ type: 'GetAgencyProfile' });
  if (r.status !== 'success') return;
  const p = r.data || {};
  const textInputs = document.querySelectorAll('input[type=text]');
  if (textInputs[0]) textInputs[0].value = p.Company_Name || '';
  const ta = document.querySelector('textarea');
  if (ta) ta.value = p.Description || '';
  const email = document.querySelector('input[type=email]');
  if (email) email.value = p.Email || '';
  if (textInputs[1]) textInputs[1].value = p.Username || '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;
  updateNav(user);
  await loadProfile();
  const profile = await callAPI({ type: 'GetAgencyProfile' });
  if (profile.status === 'success') updateSidebar(profile.data, user);
});
