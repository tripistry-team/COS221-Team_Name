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

async function handleLogout() {
  await callAPI({type: 'Logout'});
  window.location.href = 'login.html';
}

async function loadReviews() {
  const content = document.querySelector('.agency-layout > div');
  if (!content) return;

  // CHANGED: only fetch current agency packages.
  const data = await callAPI({type: 'GetAgencyPackages'});
  if (data.status !== 'success' || !data.data.length) return;

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
    const reviewSection = document.querySelector('.reviews-list') || content;
    reviewSection.innerHTML = '<p class="text-muted">No reviews yet.</p>';
    return;
  }

  const reviewSection = document.querySelector('.reviews-list') || content;
  reviewSection.innerHTML = allReviews.map(r => {
    const initials = `${r.First_Name[0]}${r.Surname[0]}`.toUpperCase();
    const date = new Date(r.Last_Updated).toLocaleDateString('en-ZA', {dateStyle: 'medium'});
    const stars = '&#9733;'.repeat(Number(r.Rating)) + '&#9734;'.repeat(5 - Number(r.Rating));

    return `
      <div class="review-card" data-feedback-id="${r.Feedback_ID}">
        <div class="reviewer">
          <div class="reviewer-avatar">${escHtml(initials)}</div>
          <div>
            <div style="font-weight:500;font-size:0.9rem;">${escHtml(r.First_Name)} ${escHtml(r.Surname[0])}.</div>
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
  loadReviews();
});

