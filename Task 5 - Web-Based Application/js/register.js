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
  document.getElementById('traveller-fields').style.display = role === 'traveller' ? 'block' : 'none';
  document.getElementById('agency-fields').style.display = role === 'agency' ? 'block' : 'none';
}

async function handleRegister() {
  const isAgency = document.getElementById('role-agency').classList.contains('active');

  const firstName = document.getElementById('reg-first-name')?.value.trim() || '';
  const surname = document.getElementById('reg-surname')?.value.trim() || '';
  const midInit = document.getElementById('reg-mid-init')?.value.trim() || 'X';
  const country = document.getElementById('reg-country')?.value.trim() || '';

  const agencyName = document.getElementById('reg-agency-name')?.value.trim() || '';
  const agencyDescription = document.getElementById('reg-agency-description')?.value.trim() || 'No description';

  const username = document.getElementById('reg-username')?.value.trim() || '';
  const email = document.getElementById('reg-email')?.value.trim() || '';
  const password = document.getElementById('reg-password')?.value || '';
  const confirm = document.getElementById('reg-confirm-password')?.value || '';

  if (!username || !email || !password || !confirm) return alert('Please complete all required account fields.');
  if (password !== confirm) return alert('Passwords do not match.');

  let r1;
  if (isAgency) {
    if (!agencyName) return alert('Please enter agency name.');
    r1 = await callAPI({ type: 'RegisterAgency', name: agencyName, email, description: agencyDescription });
  } else {
    if (!firstName || !surname || !country) return alert('Please complete traveller details.');
    r1 = await callAPI({
      type: 'RegisterTraveller',
      f_name: firstName,
      mid_init: midInit,
      s_name: surname,
      email,
      country
    });
  }

  if (r1.status !== 'success') return alert(r1.message || 'Registration failed at profile step.');

  const r2 = await callAPI({
    type: 'RegisterUser',
    username,
    email,
    password,
    user_type: isAgency ? 'agency_staff' : 'traveller'
  });
  if (r2.status !== 'success') return alert(r2.message || 'Registration failed at account step.');

  const loginRes = await callAPI({ type: 'Login', username, password });
  if (loginRes.status !== 'success') return alert('Account created. Please log in.');

  window.location.href = isAgency ? 'agency-dashboard.html' : 'traveller-dashboard.html';
}

