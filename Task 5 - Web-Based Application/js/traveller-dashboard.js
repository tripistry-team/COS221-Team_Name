const API_URL = '../api/api.php'; // CHANGED: fixed API path from /pages/*.html

let allBookings = [];
let allReviews = [];

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function callAPI(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function checkAuth() {
  const res = await callAPI({ type: 'CheckAuthorisation' });
  if (res.status === 'success' && res.data.logged_in && res.data.user_type === 'traveller') return res.data;
  window.location.href = 'login.html';
  return null;
}

function showSection(id, el) {
  ['bookings', 'reviews', 'profile', 'security'].forEach(s => {
    const sec = document.getElementById('section-' + s);
    if (sec) sec.style.display = s === id ? 'block' : 'none';
  });
  document.querySelectorAll('.dash-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  window.location.hash = id;
}

function updateProfileUI(user) {
  const actions = document.querySelector('.nav-actions');
  if (actions) actions.innerHTML = `<span class="text-sm text-muted">${escHtml(user.username)}</span><a href="#" id="logout-btn" class="btn btn-ghost btn-sm">Log out</a>`;
  const av = document.querySelector('.avatar');
  if (av) av.textContent = (user.username || 'U').slice(0, 2).toUpperCase();
  const sideName = document.querySelector('.dash-sidebar-profile div[style*="font-weight:500"]');
  if (sideName) sideName.textContent = user.username || 'Traveller';
  const sideEmail = document.querySelector('.dash-sidebar-profile .text-xs.text-muted');
  if (sideEmail) sideEmail.textContent = '';

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', async e => {
    e.preventDefault();
    await callAPI({ type: 'Logout' });
    window.location.href = 'login.html';
  });
}

function statusBucket(b) {
  const s = String(b.Booking_Status || '').toLowerCase();
  if (s === 'cancelled') return 'cancelled';
  if (s === 'completed') return 'past';
  return 'upcoming';
}

function canCancelBooking(b) {
  const s = String(b.Booking_Status || '').toLowerCase();
  const bookingId = String(b.Booking_ID ?? '');
  const isNumericBooking = /^\d+$/.test(bookingId);
  return isNumericBooking && s !== 'cancelled' && s !== 'completed';
}

function isGroupTripBooking(b) {
  return String(b.Booking_ID ?? '').startsWith('GT-');
}

function renderBookings(filter = 'all') {
  const section = document.getElementById('section-bookings');
  if (!section) return;
  section.querySelectorAll('.booking-card').forEach(n => n.remove());
  const list = filter === 'all' ? allBookings : allBookings.filter(b => statusBucket(b) === filter);
  if (!list.length) return;

  const html = list.map(b => `
    <div class="booking-card">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
          <div>
            <div style="font-weight:500;margin-bottom:0.25rem;">${escHtml(b.Name || 'Package')}</div>
            <div class="text-sm text-muted">${escHtml(b.Company_Name || '')}</div>
          </div>
          <span class="badge">${escHtml(b.Booking_Status || 'pending')}</span>
        </div>
        <div style="display:flex;gap:1rem;margin-top:0.625rem;font-size:0.875rem;color:var(--col-muted);flex-wrap:wrap;">
          <span>Date: ${escHtml(b.Booking_Date || '')}</span>
          <span>${Number(b.Number_Of_People || 0)} travellers</span>
          <span>R${Number(b.Total_Price || 0).toLocaleString('en-ZA')} total</span>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
          ${b.Package_ID ? `<a href="package-detail.html?id=${b.Package_ID}" class="btn btn-sm">View details</a>` : ''}
          ${isGroupTripBooking(b)
            ? `<button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick='leaveGroupTrip(${JSON.stringify(String(b.Booking_ID ?? ""))})'>Leave group trip</button>`
            : ''}
          ${canCancelBooking(b)
            ? `<button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick='cancelBooking(${JSON.stringify(String(b.Booking_ID ?? ""))})'>Cancel booking</button>`
            : `<button class="btn btn-sm" disabled>${statusBucket(b) === 'past' ? 'Past booking' : 'Cancelled'}</button>`}
        </div>
      </div>
    </div>
  `).join('');
  section.insertAdjacentHTML('beforeend', html);
}

function filterBookings(filter, btn) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBookings(filter);
}

async function loadBookings() {
  const res = await callAPI({ type: 'GetTravellerBookings' });
  allBookings = res.status === 'success' ? (res.data || []) : [];
  renderBookings('all');
}

async function cancelBooking(bookingId) {
  const idStr = String(bookingId ?? '').trim();
  if (!/^\d+$/.test(idStr)) {
    alert('This item is not a standard package booking and cannot be cancelled from this button.');
    return;
  }
  const res = await callAPI({ type: 'CancelBooking', booking_id: Number(idStr) });
  if (res.status !== 'success') return alert(res.message || 'Failed to cancel booking.');
  await loadBookings();
  alert('Booking cancelled.');
}

async function leaveGroupTrip(groupTripBookingId) {
  const idStr = String(groupTripBookingId ?? '').trim();
  if (!idStr.startsWith('GT-')) return;
  if (!confirm('Leave this group trip?')) return;
  const groupTripId = idStr.substring(3);
  const res = await callAPI({ type: 'LeaveGroupTrip', group_trip_id: groupTripId });
  if (res.status !== 'success') return alert(res.message || 'Failed to leave group trip.');
  await loadBookings();
  alert('You left the group trip.');
}

function openReviewsSection() {
  const link = document.querySelector('.dash-nav a[href="#reviews"]');
  showSection('reviews', link);
}

function renderReviews() {
  const section = document.getElementById('section-reviews');
  if (!section) return;
  const existing = section.querySelector('.reviews-dynamic');
  if (existing) existing.remove();

  const html = allReviews.length ? allReviews.map(r => `
    <div class="review-card" data-feedback-id="${r.Feedback_ID}" style="border:1px solid var(--col-border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:1rem;">
      <div style="padding:1rem 1.25rem;background:var(--bg-secondary);border-bottom:1px solid var(--col-border);">
        <div style="font-weight:500;">${escHtml(r.Package_Name || 'Package')}</div>
        <div class="text-xs text-muted">${escHtml(r.Package_Type || '')} package</div>
      </div>
      <div style="padding:1.25rem;">
        <p class="text-sm text-muted" style="line-height:1.65;">${escHtml(r.Comment || '')}</p>
        <div style="display:flex;gap:0.5rem;margin-top:0.875rem;">
          <button class="btn btn-sm" onclick="editReview(${r.Feedback_ID})">Edit review</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger);" onclick="deleteReview(${r.Feedback_ID})">Delete</button>
        </div>
      </div>
    </div>
  `).join('') : '<p class="text-muted">No reviews yet.</p>';

  const wrap = document.createElement('div');
  wrap.className = 'reviews-dynamic';
  wrap.innerHTML = html;
  section.prepend(wrap);
}

async function loadReviews() {
  const res = await callAPI({ type: 'GetTravellerFeedback' });
  allReviews = res.status === 'success' ? (res.data || []) : [];
  renderReviews();
}

async function editReview(feedbackId) {
  const current = allReviews.find(r => Number(r.Feedback_ID) === Number(feedbackId));
  if (!current) return;
  const next = prompt('Edit your review:', current.Comment || '');
  if (next === null) return;
  const res = await callAPI({ type: 'UpdateFeedback', feedback_id: feedbackId, comment: next.trim() });
  if (res.status !== 'success') return alert(res.message || 'Failed to update review.');
  await loadReviews();
}

async function deleteReview(feedbackId) {
  if (!confirm('Delete this review?')) return;
  const res = await callAPI({ type: 'DeleteFeedback', feedback_id: feedbackId });
  if (res.status !== 'success') return alert(res.message || 'Failed to delete review.');
  await loadReviews();
}

async function saveProfileChanges() {
  const payload = {
    type: 'UpdateTravellerProfile',
    first_name: document.getElementById('profile-first-name')?.value.trim() || '',
    surname: document.getElementById('profile-surname')?.value.trim() || '',
    mid_initial: document.getElementById('profile-middle-initial')?.value.trim() || '',
    email: document.getElementById('profile-email')?.value.trim() || '',
    country: document.getElementById('profile-country')?.value || '',
    username: (document.querySelector('.nav-actions .text-sm')?.textContent || '').trim() || 'traveller'
  };
  const res = await callAPI(payload);
  if (res.status !== 'success') return alert(res.message || 'Failed to save profile.');
  alert('Profile updated.');
}

async function updateSecuritySettings() {
  const current = document.getElementById('sec-current-password')?.value || '';
  const next = document.getElementById('sec-new-password')?.value || '';
  const confirmNext = document.getElementById('sec-confirm-password')?.value || '';
  if (!current || !next || !confirmNext) return alert('Please complete all password fields.');
  if (next !== confirmNext) return alert('New passwords do not match.');
  if (next.length < 8) return alert('New password must be at least 8 characters.');
  const res = await callAPI({ type: 'UpdateTravellerPassword', current_password: current, new_password: next });
  if (res.status !== 'success') return alert(res.message || 'Failed to update password.');
  alert('Password updated.');
  document.getElementById('sec-current-password').value = '';
  document.getElementById('sec-new-password').value = '';
  document.getElementById('sec-confirm-password').value = '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const reviewsSection = document.getElementById('section-reviews');
  if (reviewsSection) {
    reviewsSection.innerHTML = `
      <h2 style="margin-bottom:1.5rem;">My reviews</h2>
      <div style="border:2px dashed var(--col-border);border-radius:var(--radius-lg);padding:2rem;text-align:center;">
        <div style="font-weight:500;margin-bottom:0.375rem;">Write a review for a past trip</div>
        <p class="text-sm text-muted" style="margin-bottom:1rem;">Share your experience to help other travellers.</p>
        <a href="browse.html" class="btn btn-primary btn-sm">Browse past bookings</a>
      </div>
    `;
  }

  const user = await checkAuth();
  if (!user) return;
  updateProfileUI(user);
  await loadBookings();
  await loadReviews();
  const profile = await callAPI({ type: 'GetTravellerProfile' });
  if (profile.status === 'success') {
    const p = profile.data || {};
    if (document.getElementById('profile-first-name')) document.getElementById('profile-first-name').value = p.First_Name || '';
    if (document.getElementById('profile-surname')) document.getElementById('profile-surname').value = p.Surname || '';
    if (document.getElementById('profile-middle-initial')) document.getElementById('profile-middle-initial').value = p.Mid_Initial || '';
    if (document.getElementById('profile-email')) document.getElementById('profile-email').value = p.Email || '';
    if (document.getElementById('profile-country')) document.getElementById('profile-country').value = p.Country_Of_Residence || 'South Africa';
    const sideName = document.querySelector('.dash-sidebar-profile div[style*="font-weight:500"]');
    if (sideName) sideName.textContent = `${p.First_Name || ''} ${p.Surname || ''}`.trim() || user.username;
    const sideEmail = document.querySelector('.dash-sidebar-profile .text-xs.text-muted');
    if (sideEmail) sideEmail.textContent = p.Email || '';
    const mid = document.getElementById('profile-middle-initial');
    if (mid) mid.value = p.Mid_Initial || '';
    const phone = document.getElementById('profile-contact');
    if (phone) phone.value = '';
  }

  const hash = (window.location.hash || '').replace('#', '');
  if (hash) {
    const link = document.querySelector(`.dash-nav a[href="#${hash}"]`);
    if (link) showSection(hash, link);
  }
});
