const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

let currentUser = null;

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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

function updateSidebar(profile, user) {
  const header = document.querySelector('.agency-sidebar-header');
  if (!header) return;
  const name = profile?.Company_Name || user?.username || 'Agency';
  const initial = String(name).charAt(0).toUpperCase();
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.9rem;">${escHtml(initial)}</div>
      <div><div style="font-weight:500;">${escHtml(name)}</div><div style="font-size:0.8rem;opacity:0.75;">Travel Agency</div></div>
    </div>
  `;
}

async function handleLogout() {
  await callAPI({type: 'Logout'});
  window.location.href = 'login.html';
}

async function loadReviews() {
  const content = document.querySelector('.agency-layout > div');
  if (!content) return;

  // CHANGED: only fetch current agency packages.
  const data = await callAPI({type: 'GetAgencyPackages'});
  const reviewSection = document.querySelector('.reviews-list') || content;
  if (data.status !== 'success' || !data.data.length) {
    reviewSection.innerHTML = '<p class="text-muted">No reviews yet.</p>';
    return;
  }

  // load detail for each package to get reviews
  let allReviews = [];
  for (const pkg of data.data) {
    const detail = await callAPI({type: 'GetPackageDetails', package_id: pkg.Package_ID});
    if (detail.status === 'success') {
      detail.data.reviews.forEach(r => {
        allReviews.push({...r, Package_Name: pkg.Name, Package_ID: pkg.Package_ID});
      });
    }
  }

  if (!allReviews.length) {
    reviewSection.innerHTML = '<p class="text-muted">No reviews yet.</p>';
    return;
  }
  reviewSection.innerHTML = allReviews.map(r => {
    const firstName = String(r.First_Name || '').trim();
    const surname = String(r.Surname || '').trim();
    const initials = `${(firstName[0] || 'U')}${(surname[0] || 'U')}`.toUpperCase();
    const date = new Date(r.Last_Updated).toLocaleDateString('en-ZA', {dateStyle: 'medium'});
    const stars = '&#9733;'.repeat(Number(r.Rating)) + '&#9734;'.repeat(5 - Number(r.Rating));

    return `
      <div class="review-card" data-feedback-id="${r.Feedback_ID}">
        <div class="reviewer">
          <div class="reviewer-avatar">${escHtml(initials)}</div>
          <div>
            <div style="font-weight:500;font-size:0.9rem;">${escHtml(firstName || 'Anonymous')} ${escHtml((surname[0] || '').toUpperCase())}${surname ? '.' : ''}</div>
            <div class="text-xs text-muted">${date} &middot; ${escHtml(r.Package_Name)} &middot; ${cap(r.Package_Type)} package</div>
          </div>
          <div style="margin-left:auto;color:var(--accent);">${stars}</div>
        </div>
        <p class="text-sm" style="color:var(--col-muted);line-height:1.65;margin-top:0.5rem;">
          ${escHtml(r.Comment || '')}
        </p>
        ${r.Response
          ? `<div style="margin-top:0.625rem;padding:0.75rem;background:var(--accent-light);
                         border-radius:var(--radius-sm);border-left:2px solid var(--accent);">
               <div class="text-xs" style="color:var(--accent);font-weight:500;margin-bottom:0.25rem;">Your response</div>
               <p class="text-xs text-muted">${escHtml(r.Response)}</p>
             </div>`
          : `<div style="margin-top:0.75rem;">
               <textarea id="response-${r.Feedback_ID}" rows="2" placeholder="Write a response..."
                 style="width:100%;padding:0.5rem;border-radius:var(--radius-sm);border:1px solid var(--col-border);
                        background:var(--bg-primary);resize:vertical;font-size:0.875rem;"></textarea>
               <button class="btn btn-primary btn-sm" style="margin-top:0.375rem;"
                       onclick="submitResponse(${r.Feedback_ID})">Post response</button>
             </div>`}
      </div>
    `;
  }).join('');
}

async function submitResponse(feedbackId) {
  const textarea = document.getElementById(`response-${feedbackId}`);
  if (!textarea) return;
  const response = textarea.value.trim();
  if (!response) { alert('Please write a response.'); return; }

  const res = await callAPI({
    type: 'AddResponse',
    feedback_id: feedbackId,
    response: response
  });

  if (res.status === 'success') {
    const card = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
    if (card) {
      const responseDiv = card.querySelector('div:last-child');
      if (responseDiv) responseDiv.innerHTML = `
        <div style="margin-top:0.625rem;padding:0.75rem;background:var(--accent-light);
                    border-radius:var(--radius-sm);border-left:2px solid var(--accent);">
          <div class="text-xs" style="color:var(--accent);font-weight:500;margin-bottom:0.25rem;">Your response</div>
          <p class="text-xs text-muted">${escHtml(response)}</p>
        </div>
      `;
    }
  } else {
    alert(`Failed: ${res.message}`);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  updateNav(currentUser);
  const profile = await callAPI({ type: 'GetAgencyProfile' });
  if (profile.status === 'success') updateSidebar(profile.data, currentUser);
  loadReviews();
});

