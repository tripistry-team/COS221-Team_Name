const API = "api.php";

let allTrips = [];
let activeMonth = "";
let activeSort = "soonest";

async function loadTrips() {
  const grid = document.getElementById("trips-grid");
  grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;padding:2rem 0;">Loading trips…</p>`;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "GetGroupTrips", month: activeMonth, sort: activeSort }),
    });
    const json = await res.json();
    if (json.status !== "success") {
      grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">Failed to load trips.</p>`;
      return;
    }
    allTrips = json.data;
    renderTrips();
  } catch (e) {
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">Error connecting to server.</p>`;
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function spotsLabel(trip) {
  const left = trip.Spots_Left;
  if (left <= 0) return { text: "Full", cls: "badge-red" };
  if (left === 1) return { text: "Last spot", cls: "badge-red" };
  if (left <= 3) return { text: "Filling fast", cls: "badge-amber" };
  return { text: "Open", cls: "badge-green" };
}

function progressColor(trip) {
  const pct = trip.Participants_Current / trip.Participants_Max;
  if (pct >= 0.9) return "#e67e22";
  return "var(--accent)";
}

function renderTrips() {
  const grid = document.getElementById("trips-grid");

  if (allTrips.length === 0) {
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;padding:2rem 0;">No group trips found.</p>`;
    return;
  }

  grid.innerHTML = allTrips.map(trip => {
    const pct = Math.round((trip.Participants_Current / trip.Participants_Max) * 100);
    const left = trip.Spots_Left;
    const label = spotsLabel(trip);
    const color = progressColor(trip);

    return `
      <div class="gt-card">
        <div class="gt-thumb">
          <span class="gt-spots">${left > 0 ? left + " spot" + (left === 1 ? "" : "s") + " left" : "Full"}</span>
        </div>
        <div class="gt-body">
          <div class="gt-agency">${trip.Company_Name}</div>
          <div class="gt-name">${trip.Trip_Name}</div>
          <div class="gt-meta">
            <span>📅 ${formatDate(trip.Start_Date)} – ${formatDate(trip.End_Date)}</span>
            <span>👥 ${trip.Participants_Current}/${trip.Participants_Max} joined</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${color};"></div>
          </div>
          <div class="text-xs text-muted" style="margin-bottom:0.75rem;">
            ${trip.Participants_Current} of ${trip.Participants_Max} spots filled · Join deadline: ${formatDate(trip.Join_Deadline)}
          </div>
          <div style="margin-top:auto;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <span class="badge ${label.cls}">${label.text}</span>
          </div>
        </div>
        <div class="gt-footer">
          <div><div class="text-xs text-muted">Min. ${trip.Participants_Min} people</div></div>
          <a href="login.html" class="btn btn-primary btn-sm">Join trip</a>
        </div>
      </div>`;
  }).join("");
}

function setMonth(val) {
  activeMonth = val;
  loadTrips();
}

function setSort(val) {
  activeSort = val;
  loadTrips();
}

loadTrips();
