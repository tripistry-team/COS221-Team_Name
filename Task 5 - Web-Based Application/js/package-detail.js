const API_URL = 'pages/api/api.php';

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function checkAuth() {
  const data = await callAPI({type: 'CheckAuthorisation'});
  if (data.status !== 'success' || !data.data.logged_in) {
    window.location.href = 'login.html?redirect=index.html';
    return null;
  }
  return data.data;
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

function updateNav() {
  const user = getUser();
  const actions = document.querySelector('.nav-actions');
  if (!actions || !user) return;
  actions.innerHTML = `
    <span class="text-sm" style="color:var(--col-muted);">Hi, ${escHtml(user.username)}</span>
    <button class="btn btn-ghost btn-sm" id="logout-btn">Log out</button>
  `;
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

async function handleLogout() {
  await callAPI({type: 'Logout'});
  localStorage.removeItem('tripistry_user');
  window.location.href = 'login.html';
}

function getPackageId() {
  return parseInt(new URLSearchParams(window.location.search).get('id'));
}

async function loadPackageDetail() {
  const pid = getPackageId();
  if (!pid) {
    document.querySelector('main').innerHTML = `
      <div class="container" style="padding:3rem 0;">
        <p class="text-muted">No package specified.</p>
        <a href="browse.html" class="btn btn-primary" style="margin-top:1rem;">Browse packages</a>
      </div>`;
    return;
  }

  const data = await callAPI({type: 'GetPackageDetails', package_id: pid});

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

  renderHero(pkg, options, avg_rating, reviews.length);
  renderBreadcrumb(pkg, experiences);
  renderAgencyBar(pkg, avg_rating, reviews.length);
  renderOverview(pkg, options, flights);
  renderExperiences(experiences);
  renderFlights(flights);
  renderReviews(reviews, avg_rating);
  renderBookingPanel(pkg, options);
}

function renderHero(pkg, options, avg_rating, review_count) {
  const el = document.getElementById('detail-hero-content');
  if (!el) return;

  const types = options.map(o =>
    `<span class="badge badge-green">${cap(o.Package_Type)}</span>`
  ).join(' ');

  el.innerHTML = `
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
      ${types}
      <span class="badge" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.3);color:#fff;">
        ${cap(pkg.Package_Status)}
      </span>
    </div>
    <h1>${escHtml(pkg.Name)}</h1>
    <div style="display:flex;align-items:center;gap:1.25rem;margin-top:0.75rem;font-size:0.9rem;opacity:0.9;">
      <span>${escHtml(pkg.Duration)}</span>
      ${avg_rating ? `<span>${avg_rating} (${review_count} reviews)</span>` : ''}
    </div>
  `;
}

function renderBreadcrumb(pkg, experiences) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;

  const withDest = experiences.find(e => e.Country);
  const country = withDest ? withDest.Country : null;

  el.innerHTML = `
    <a href="browse.html" style="color:var(--col-muted);text-decoration:none;">Browse</a>
    <span style="margin:0 0.375rem;">></span>
    ${country ? `
      <a href="browse.html?destination=${encodeURIComponent(country)}"
         style="color:var(--col-muted);text-decoration:none;">${escHtml(country)}</a>
      <span style="margin:0 0.375rem;">></span>` : ''}
    ${escHtml(pkg.Name)}
  `;
}

function renderAgencyBar(pkg, avg_rating, review_count) {
  const el = document.getElementById('agency-bar');
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--accent-light);
                  display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:600;">
        ${escHtml(pkg.Company_Name.charAt(0))}
      </div>
      <div>
        <div style="font-weight:500;font-size:0.9rem;">${escHtml(pkg.Company_Name)}</div>
        <div class="text-xs text-muted">Verified agency</div>
      </div>
    </div>
    <div style="margin-left:auto;display:flex;align-items:center;gap:0.5rem;">
      ${avg_rating
        ? `<span style="font-weight:500;">${avg_rating}</span>
           <span class="text-muted text-sm">(${review_count} reviews)</span>`
        : `<span class="text-muted text-sm">No reviews yet</span>`}
    </div>
  `;
}

function renderOverview(pkg, options, flights) {
  const el = document.getElementById('tab-overview');
  if (!el) return;

  const hasFlight = flights.length > 0;
  const minPax = options.length ? Math.min(...options.map(o => o.Participants_Min)) : '-';
  const maxPax = options.length ? Math.max(...options.map(o => o.Participants_Max)) : '-';

  el.innerHTML = `
    <p style="line-height:1.75;color:var(--col-muted);margin-bottom:1.5rem;">
      ${escHtml(pkg.Description || 'No description available.')}
    </p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0;">
      <div style="text-align:center;padding:1rem;background:var(--bg-secondary);border-radius:var(--radius-md);">
        <div style="font-weight:500;font-size:0.9rem;">${escHtml(pkg.Duration)}</div>
        <div class="text-xs text-muted">Duration</div>
      </div>
      <div style="text-align:center;padding:1rem;background:var(--bg-secondary);border-radius:var(--radius-md);">
        <div style="font-weight:500;font-size:0.9rem;">${hasFlight ? 'Included' : 'Not included'}</div>
        <div class="text-xs text-muted">Flights</div>
      </div>
      <div style="text-align:center;padding:1rem;background:var(--bg-secondary);border-radius:var(--radius-md);">
        <div style="font-weight:500;font-size:0.9rem;">${minPax}-${maxPax} people</div>
        <div class="text-xs text-muted">Group size</div>
      </div>
    </div>
  `;
}

function renderExperiences(experiences) {
  const el = document.getElementById('tab-includes');
  if (!el || !experiences.length) return;

  const grouped = {};
  experiences.forEach(e => {
    const cat = e.Category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(e);
  });

  let html = '<h4 style="margin-bottom:0.75rem;">What\'s included</h4><div class="include-grid">';
  Object.entries(grouped).forEach(([cat, items]) => {
    items.forEach(exp => {
      html += `
        <div class="include-item">
          <span>${escHtml(exp.Name)}</span>
          <span class="text-xs text-muted">${escHtml(cat)}${exp.City ? ' · ' + escHtml(exp.City) : ''}</span>
        </div>
      `;
    });
  });
  html += '</div>';
  el.innerHTML = html;
}

function renderFlights(flights) {
  const el = document.getElementById('tab-itinerary');
  if (!el) return;

  if (!flights.length) {
    el.innerHTML = '<p class="text-muted">No flights included in this package.</p>';
    return;
  }

  el.innerHTML = flights.map(f => {
    const dep = new Date(f.Departure_DateTime).toLocaleString('en-ZA', {dateStyle:'medium', timeStyle:'short'});
    const arr = new Date(f.Arrival_DateTime).toLocaleString('en-ZA', {dateStyle:'medium', timeStyle:'short'});
    return `
      <div class="itinerary-day">
        <h4>${escHtml(f.Airline)} · ${escHtml(f.Flight_Number)} · ${cap(f.Package_Type)}</h4>
        <p>
          <strong>${escHtml(f.Departure_Airport)}</strong> to <strong>${escHtml(f.Arrival_Airport)}</strong><br>
          Departs: ${dep} &nbsp;|&nbsp; Arrives: ${arr}<br>
          Class: ${escHtml(f.Seat_Class)} &nbsp;|&nbsp; Seats allocated: ${f.Seats_Allocated}
        </p>
      </div>
    `;
  }).join('');
}

function renderReviews(reviews, avg_rating) {
  const el = document.getElementById('tab-reviews');
  if (!el) return;

  const tabBtn = document.querySelector('[onclick*="reviews"]');
  if (tabBtn) tabBtn.textContent = `Reviews (${reviews.length})`;

  const user = getUser();

  if (!reviews.length) {
    el.innerHTML = `
      <p class="text-muted">No reviews yet for this package.</p>
      ${user && user.user_type === 'traveller'
        ? '<button class="btn" style="margin-top:1rem;" onclick="openReviewForm()">Write a review</button>'
        : ''}
    `;
    return;
  }

  const counts = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.Rating === star).length
  }));

  let html = `
    <div style="display:flex;align-items:center;gap:2rem;padding:1.5rem;
                background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:1.5rem;">
      <div style="text-align:center;">
        <div style="font-size:3rem;font-weight:600;line-height:1;">${avg_rating ?? '-'}</div>
        <div class="text-xs text-muted" style="margin-top:0.25rem;">${reviews.length} reviews</div>
      </div>
      <div style="flex:1;">
        ${counts.map(({star, count}) => {
          const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
          return `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.375rem;">
              <span class="text-xs text-muted" style="width:30px;">${star}</span>
              <div style="flex:1;height:6px;background:var(--col-border);border-radius:999px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:999px;"></div>
              </div>
              <span class="text-xs text-muted">${count}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  html += reviews.map(r => {
    const initials = `${r.First_Name[0]}${r.Surname[0]}`.toUpperCase();
    const date = new Date(r.Last_Updated).toLocaleDateString('en-ZA', {dateStyle:'medium'});
    return `
      <div class="review-card">
        <div class="reviewer">
          <div class="reviewer-avatar">${escHtml(initials)}</div>
          <div>
            <div style="font-weight:500;font-size:0.9rem;">${escHtml(r.First_Name)} ${escHtml(r.Surname[0])}.</div>
            <div class="text-xs text-muted">${date} · ${cap(r.Package_Type)} package</div>
          </div>
          <div style="margin-left:auto;">
            ${'&#9733;'.repeat(r.Rating)}${'&#9734;'.repeat(5 - r.Rating)}
          </div>
        </div>
        <p class="text-sm" style="color:var(--col-muted);line-height:1.65;">${escHtml(r.Comment || '')}</p>
        ${r.Response ? `
          <div style="margin-top:0.625rem;padding:0.75rem;background:var(--accent-light);
                      border-radius:var(--radius-sm);border-left:2px solid var(--accent);">
            <div class="text-xs" style="color:var(--accent);font-weight:500;margin-bottom:0.25rem;">Agency response</div>
            <p class="text-xs text-muted">${escHtml(r.Response)}</p>
          </div>` : ''}
      </div>
    `;
  }).join('');

  if (user && user.user_type === 'traveller') {
    html += `
      <div style="text-align:center;margin-top:1.5rem;">
        <button class="btn" onclick="openReviewForm()">Write a review</button>
      </div>
    `;
  }

  el.innerHTML = html;
}

function renderBookingPanel(pkg, options) {
  const header = document.getElementById('booking-price');
  const body = document.getElementById('booking-options');
  const bookBtn = document.getElementById('book-btn');
  const user = getUser();

  if (header && options.length) {
    const minPrice = Math.min(...options.map(o => parseFloat(o.Final_Price)));
    header.innerHTML = `
      <div style="font-size:1.625rem;font-weight:600;">R${minPrice.toLocaleString('en-ZA')}</div>
      <div class="text-sm text-muted">per person · select a package type</div>
    `;
  }

  if (body && options.length) {
    body.innerHTML = options.map((o, i) => `
      <div class="option-card${i === 0 ? ' selected' : ''}"
           onclick="selectOption(this)"
           data-price="${o.Final_Price}"
           data-type="${o.Package_Type}">
        <div>
          <div class="option-label">${cap(o.Package_Type)}</div>
          <div class="option-desc">${o.Participants_Min}-${o.Participants_Max} travellers</div>
        </div>
        <div class="option-price">R${parseFloat(o.Final_Price).toLocaleString('en-ZA')}</div>
      </div>
    `).join('');
  }

  if (!bookBtn) return;

  if (user && user.user_type === 'traveller') {
    bookBtn.textContent = 'Book this package';
    bookBtn.onclick = () => handleBooking(pkg.Package_ID);
  } else if (user && user.user_type === 'agency_staff') {
    bookBtn.style.display = 'none';
  } else {
    bookBtn.textContent = 'Log in to book';
    bookBtn.onclick = () => {
      window.location.href = `login.html?redirect=package-detail.html?id=${pkg.Package_ID}`;
    };
  }
}

async function handleBooking(packageId) {
  const selected = document.querySelector('.option-card.selected');
  if (!selected) { alert('Please select a package type.'); return; }

  const pkg_type = selected.dataset.type;
  const num_people = parseInt(selected.dataset.minPax) || 1;

  const data = await callAPI({
    type: 'CreateBooking',
    package_id: packageId,
    package_type: pkg_type,
    number_of_people: num_people
  });

  if (data.status === 'success') {
    alert(`Booking confirmed! Total: R${parseFloat(data.total_price).toLocaleString('en-ZA')}`);
  } else {
    alert(`Booking failed: ${data.message}`);
  }
}

function openReviewForm() {
  const pid = getPackageId();
  const selected = document.querySelector('.option-card.selected');
  const pkg_type = selected ? selected.dataset.type : 'solo';

  const existing = document.getElementById('review-form-container');
  if (existing) { existing.remove(); return; }

  const form = document.createElement('div');
  form.id = 'review-form-container';
  form.style = 'margin-top:1.5rem;padding:1.5rem;background:var(--bg-secondary);border-radius:var(--radius-md);';
  form.innerHTML = `
    <h4 style="margin-bottom:1rem;">Write a review</h4>
    <div style="margin-bottom:0.75rem;">
      <label class="text-sm">Rating</label>
      <select id="review-rating" style="display:block;width:100%;margin-top:0.25rem;padding:0.5rem;border-radius:var(--radius-sm);border:1px solid var(--col-border);background:var(--bg-primary);">
        <option value="5">5 - Excellent</option>
        <option value="4">4 - Good</option>
        <option value="3">3 - Average</option>
        <option value="2">2 - Poor</option>
        <option value="1">1 - Terrible</option>
      </select>
    </div>
    <div style="margin-bottom:1rem;">
      <label class="text-sm">Comment (optional)</label>
      <textarea id="review-comment" rows="4"
        style="display:block;width:100%;margin-top:0.25rem;padding:0.5rem;border-radius:var(--radius-sm);border:1px solid var(--col-border);background:var(--bg-primary);resize:vertical;"></textarea>
    </div>
    <div style="display:flex;gap:0.5rem;">
      <button class="btn btn-primary" onclick="submitReview(${pid}, '${pkg_type}')">Submit</button>
      <button class="btn btn-ghost" onclick="document.getElementById('review-form-container').remove()">Cancel</button>
    </div>
  `;

  document.getElementById('tab-reviews').appendChild(form);
}

async function submitReview(packageId, pkg_type) {
  const rating = parseInt(document.getElementById('review-rating').value);
  const comment = document.getElementById('review-comment').value.trim();

  const data = await callAPI({
    type: 'AddFeedback',
    package_id: packageId,
    package_type: pkg_type,
    rating,
    comment: comment || null
  });

  if (data.status === 'success') {
    alert('Review submitted!');
    document.getElementById('review-form-container').remove();
    loadPackageDetail();
  } else {
    alert(`Failed: ${data.message}`);
  }
}

function selectOption(el) {
  document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function showTab(id, btn) {
  ['overview','itinerary','includes','reviews'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === id ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const authed = await checkAuth();
  if (!authed) return;
  updateNav();
  loadPackageDetail();
});