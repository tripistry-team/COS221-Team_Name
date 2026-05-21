const API_URL = 'api/api.php';

function getUser() {
  const u = localStorage.getItem('tripistry_user');
  return u ? JSON.parse(u) : null;
}
 
function escHtml(str) {//Prevents XSS attacks by escaping special HTML characters.
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateNav() {
  const user = getUser();
  const actions = document.querySelector('.nav-actions');
  if (!actions || !user) return;
  actions.innerHTML = `
    <span class="text-sm" style="color:var(--col-muted);">Hi, ${user.username}</span>
    <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
  `;
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}
async function handleLogout() {
  await fetch(API_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'Logout'})
  });
  localStorage.removeItem('tripistry_user');
  window.location.reload();
}

function getPackageId() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get('id'));
}
async function loadPackageDetail() { //INCOMPLETE
  const pid = getPackageId();
  if (!pid) {
    document.querySelector('main').innerHTML = `
      <div class="container" style="padding:3rem 0;">
        <p class="text-muted">No package specified.</p>
        <a href="browse.html" class="btn btn-primary" style="margin-top:1rem;">Browse packages</a>
      </div>`;
    return;
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'GetPackageDetail', package_id: pid})
  });
  const data = await res.json();
 
  if (data.status !== 'success') {
    document.querySelector('main').innerHTML = `
      <div class="container" style="padding:3rem 0;">
        <p class="text-muted">Package not found.</p>
        <a href="browse.html" class="btn btn-primary" style="margin-top:1rem;">Browse packages</a>
      </div>`;
    return;
  }
 
  const { package: pkg, options, experiences, flights, reviews, avg_rating } = data.data;
 
  document.title = `${pkg.Name} - Tripistry`;

}

//more functions...