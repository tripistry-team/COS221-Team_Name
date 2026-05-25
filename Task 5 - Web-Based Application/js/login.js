const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

async function callAPI(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function setRole(role) {
  document.getElementById('role-traveller').classList.toggle('active', role === 'traveller');
  document.getElementById('role-agency').classList.toggle('active', role === 'agency');
}

async function handleLogin() {
  const username = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const err = document.getElementById('login-error');

  if (!username || !password) {
    err.style.display = 'block';
    err.textContent = 'Please enter your username and password.';
    return;
  }

  const res = await callAPI({ type: 'Login', username, password });
  if (res.status !== 'success') {
    err.style.display = 'block';
    err.textContent = res.message || 'Invalid username or password.';
    return;
  }

  err.style.display = 'none';
  const user = res.data || {};
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (user.user_type === 'agency_staff') window.location.href = 'agency-dashboard.html';
  else if (user.user_type === 'traveller' && redirect) window.location.href = redirect;
  else if (user.user_type === 'traveller') window.location.href = 'traveller-dashboard.html#bookings';
  else window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const pass = document.getElementById('password');
  if (pass) pass.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});
