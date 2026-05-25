<<<<<<< HEAD
function setRole(role) {
  document.getElementById('role-traveller').classList.toggle('active', role==='traveller');
  document.getElementById('role-agency').classList.toggle('active', role==='agency');

   if (role === 'agency') {
    sessionStorage.setItem(userType, "agency");

  } else {
    sessionStorage.setItem(userType, "traveller");
  }
}
function handleLogin() {
  const username = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  if (!username || !pass) {
    document.getElementById('login-error').style.display='block';
    document.getElementById('login-error').textContent='Please enter your username and password.';
    return;
  }

  const remember = document.getElementById('cbxRemember');
  sendToAPI(username, pass, remember);

//   const role = document.getElementById('role-agency').classList.contains('active') ? 'agency' : 'traveller';
//   window.location.href = role === 'agency' ? 'agency-dashboard.html' : 'traveller-dashboard.html';
}

function sendToAPI(username, password, remember) {
    let body = {
        "type": "Login",
        "username": username,
        "password": password
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://wheatley.cs.up.ac.za/u25011503/PA5/COS221Practical5/Task 5 - Web-Based Application/pages/api/api.php", true); 
    xhr.setRequestHeader("Content-Type", "application/json");


    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {   
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                console.log("API RESPONSE:", data);
                if (remember === true) {
                    
                }
                document.cookie = "username=" + username + "; logged_in=true; path=/";
        
            } else {
              //  const data = JSON.parse(xhr.responseText);
                console.log("XHR ERROR:", xhr.status);
            }
        } 
    };

    const type = getCookie('user_type');

    xhr.send(JSON.stringify(body));

    if (type === 'traveller') {
        window.location.href = 'traveller-dashboard.html';
    } else {
        window.location.href = 'agency-dashboard.html';
    }
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
=======
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
>>>>>>> 70616848d52818f49cc3219a454e2a519fd2327f
