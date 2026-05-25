const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

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

function updateSidebar(user) {
  const header = document.querySelector('.agency-sidebar-header');
  if (!header || !user) return;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);
                  display:flex;align-items:center;justify-content:center;font-weight:500;font-size:0.9rem;">
        ${escHtml(user.username.charAt(0).toUpperCase())}
      </div>
      <div>
        <div style="font-weight:500;">${escHtml(user.username)}</div>
        <div style="font-size:0.8rem;opacity:0.75;">Travel Agency</div>
      </div>
    </div>
  `;
}

async function handleLogout() {
  await callAPI({type: 'Logout'});
  window.location.href = 'login.html';
}

async function loadDashboard() {
  // CHANGED: scope dashboard data to logged-in agency only.
  const data = await callAPI({type: 'GetAgencyPackages'});
  if (data.status !== 'success') return;

  const packages = data.data || [];
  const totalBookings = packages.reduce((sum, p) => sum + (parseInt(p.Total_Bookings) || 0), 0);
  const activeCount   = packages.filter(p => p.Package_Status === 'active').length;
  const ratings       = packages.filter(p => p.Avg_Rating).map(p => parseFloat(p.Avg_Rating));
  const avgRating     = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : '-';

  const statVals = document.querySelectorAll('.stat-val');
  if (statVals[0]) statVals[0].textContent = totalBookings;
  const revenue = packages.reduce((sum, p) => sum + ((Number(p.Min_Price || p.Base_Price || 0) * Number(p.Total_Bookings || 0)) || 0), 0);
  if (statVals[1]) statVals[1].textContent = `R${Math.round(revenue).toLocaleString('en-ZA')}`;
  if (statVals[2]) statVals[2].textContent = activeCount;
  if (statVals[3]) statVals[3].textContent = avgRating;

  // recent packages in the recent bookings card
  const recentContainer = document.querySelector('.card .booking-row')?.parentElement;
  if (recentContainer) {
    const recent = packages.slice(0, 4);
    recentContainer.innerHTML = recent.length ? recent.map(p => `
      <div class="booking-row">
        <div class="booking-thumb-sm"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:500;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escHtml(p.Name)}
          </div>
          <div class="text-xs text-muted">${escHtml(p.Duration)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-weight:500;font-size:0.875rem;">
            R${parseFloat(p.Base_Price).toLocaleString('en-ZA')}
          </div>
          <div class="text-xs text-muted">${escHtml(p.Package_Status)}</div>
        </div>
      </div>
    `).join('') : '<p class="text-muted text-sm" style="padding:1rem;">No packages yet.</p>';
  }

  const topCardBody = document.querySelectorAll('.card .card-body')[1];
  if (topCardBody) {
    const top = [...packages].sort((a,b) => Number(b.Total_Bookings || 0) - Number(a.Total_Bookings || 0)).slice(0,4);
    topCardBody.innerHTML = top.length ? top.map(p => `
      <div class="booking-row">
        <div class="booking-thumb-sm"></div>
        <div style="flex:1;">
          <div style="font-size:0.9rem;font-weight:500;">${escHtml(p.Name)}</div>
          <div class="text-xs text-muted">${Number(p.Total_Bookings || 0)} bookings · ${p.Avg_Rating ? escHtml(String(p.Avg_Rating)) : '-'}</div>
        </div>
        <span class="badge ${String(p.Package_Status).toLowerCase() === 'active' ? 'badge-green' : 'badge-amber'}">${escHtml(p.Package_Status)}</span>
      </div>
    `).join('') : '<p class="text-muted text-sm">No package activity yet.</p>';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;
  updateNav(user);
  updateSidebar(user);
  loadDashboard();
});

