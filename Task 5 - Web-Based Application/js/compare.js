const API = "../api/api.php";

// State
let comparedPackages = []; // array of package objects currently in the table
let currentType = "solo";  // package_type filter

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchPackages(params = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "GetPackages", ...params }),
  });
  const json = await res.json();
  if (json.status !== "success") return [];
  return json.data;
}

function bestValueIndex(packages) {
  // Lowest Min_Price wins; if tied, higher Avg_Rating wins
  let best = 0;
  packages.forEach((p, i) => {
    const priceA = parseFloat(packages[best].Min_Price) || parseFloat(packages[best].Base_Price) || Infinity;
    const priceB = parseFloat(p.Min_Price) || parseFloat(p.Base_Price) || Infinity;
    if (priceB < priceA) best = i;
    else if (priceB === priceA && (parseFloat(p.Avg_Rating) || 0) > (parseFloat(packages[best].Avg_Rating) || 0)) best = i;
  });
  return best;
}

function stars(rating) {
  if (!rating) return "—";
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function fmt(val) { return val != null ? val : "—"; }

// ── Render ───────────────────────────────────────────────────────────────────

function renderTable() {
  const pkgs = comparedPackages;
  if (pkgs.length === 0) {
    document.getElementById("compare-wrap").innerHTML =
      `<p class="text-muted" style="padding:2rem 0;">No packages selected. Use the search below to add packages.</p>`;
    updateSubtitle();
    return;
  }

  const best = bestValueIndex(pkgs);

  // Header cells
  const headCells = pkgs.map((p, i) => {
    const featured = i === best;
    return `
      <th class="compare-col" style="padding:0 0.75rem 1.25rem;">
        <div class="compare-head${featured ? " featured" : ""}">
          ${featured ? `<div class="best-badge">Best value</div>` : ""}
          <div style="font-size:0.8rem;color:${featured ? "var(--accent)" : "var(--col-muted)"};margin-bottom:0.25rem;">${fmt(p.Company_Name)}</div>
          <div style="font-weight:500;line-height:1.35;margin-bottom:0.5rem;">${fmt(p.Name)}</div>
          <div style="display:flex;align-items:center;gap:0.375rem;">
            <span style="color:#f59e0b;font-size:0.875rem;">${stars(p.Avg_Rating)}</span>
            <span class="text-xs text-muted">${p.Avg_Rating || "No ratings"} (${p.Review_Count || 0})</span>
          </div>
          <button onclick="removePackage(${p.Package_ID})" style="position:absolute;top:0.5rem;right:0.75rem;background:none;border:none;cursor:pointer;font-size:1rem;color:var(--col-faint);">✕</button>
        </div>
      </th>`;
  }).join("");

  // Row builder
  function row(label, cells) {
    const tds = cells.map((val, i) => {
      const featured = i === best;
      return `<td style="padding:0 0.75rem;"><div class="compare-cell${featured ? " featured" : ""}">${val}</div></td>`;
    }).join("");
    return `<tr><td class="row-label">${label}</td>${tds}</tr>`;
  }

  const rows = [
    row("Agency",        pkgs.map(p => fmt(p.Company_Name))),
    row("Destination",   pkgs.map(p => p.City && p.Country ? `${p.City}, ${p.Country}` : "—")),
    row("Base price",    pkgs.map(p => p.Base_Price != null ? `R${Number(p.Base_Price).toLocaleString()}` : "—")),
    row("Price range",   pkgs.map(p => {
      const lo = p.Min_Price != null ? `R${Number(p.Min_Price).toLocaleString()}` : null;
      const hi = p.Max_Price != null ? `R${Number(p.Max_Price).toLocaleString()}` : null;
      return lo && hi ? `${lo} – ${hi}` : lo || "—";
    })),
    row("Duration",      pkgs.map(p => p.Duration != null ? `${p.Duration} days` : "—")),
    row("Rating",        pkgs.map(p => p.Avg_Rating ? `${p.Avg_Rating} / 5 (${p.Review_Count} reviews)` : "No ratings yet")),
    row("Status",        pkgs.map(p => fmt(p.Package_Status))),
    row("Description",   pkgs.map(p => `<span style="font-size:0.8125rem;color:var(--col-muted);">${p.Description ? p.Description.slice(0, 100) + (p.Description.length > 100 ? "…" : "") : "—"}</span>`)),
  ];

  // Footer cells
  const footCells = pkgs.map((p, i) => {
    const featured = i === best;
    return `
      <td style="padding:0 0.75rem 0;">
        <div class="compare-foot${featured ? " featured" : ""}">
          <a href="package-detail.html?id=${p.Package_ID}" class="btn${featured ? " btn-primary" : ""}" style="width:100%;justify-content:center;">
            ${featured ? "Book now" : "View package"}
          </a>
        </div>
      </td>`;
  }).join("");

  document.getElementById("compare-wrap").innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th class="row-label"></th>
            ${headCells}
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
        <tfoot>
          <tr>
            <td class="row-label"></td>
            ${footCells}
          </tr>
        </tfoot>
      </table>
    </div>`;

  updateSubtitle();
}

function updateSubtitle() {
  const locations = [...new Set(comparedPackages.map(p => p.Country).filter(Boolean))];
  const el = document.getElementById("compare-subtitle");
  if (!el) return;
  el.textContent = locations.length
    ? `Comparing packages in: ${locations.join(", ")}`
    : "Search below to add packages to compare";
}

// ── Search ───────────────────────────────────────────────────────────────────

let searchResults = [];

async function runSearch() {
  const q = document.getElementById("pkg-search").value.trim();
  const resultsEl = document.getElementById("search-results");

  if (!q) { resultsEl.innerHTML = ""; return; }

  resultsEl.innerHTML = `<p class="text-muted" style="padding:0.5rem 0;">Searching…</p>`;

  const params = { destination: q, package_type: currentType };
  const data = await fetchPackages(params);
  searchResults = data;

  if (data.length === 0) {
    resultsEl.innerHTML = `<p class="text-muted" style="padding:0.5rem 0;">No packages found.</p>`;
    return;
  }

  resultsEl.innerHTML = data.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid var(--col-border);">
      <div>
        <div style="font-weight:500;font-size:0.9rem;">${p.Name}</div>
        <div style="font-size:0.8rem;color:var(--col-muted);">${p.Company_Name} · ${p.City || ""}${p.Country ? ", " + p.Country : ""} · ${p.Duration ? p.Duration + " days" : ""}</div>
      </div>
      <button class="btn btn-sm" onclick="addPackage(${p.Package_ID})">Add</button>
    </div>
  `).join("");
}

function addPackage(id) {
  const pkg = searchResults.find(p => p.Package_ID === id);
  if (!pkg) return;
  if (comparedPackages.find(p => p.Package_ID === id)) {
    alert("That package is already in the comparison.");
    return;
  }
  if (comparedPackages.length >= 4) {
    alert("You can compare up to 4 packages at a time.");
    return;
  }
  comparedPackages.push(pkg);
  renderTable();
}

function removePackage(id) {
  comparedPackages = comparedPackages.filter(p => p.Package_ID !== id);
  renderTable();
}

// ── Type filter ───────────────────────────────────────────────────────────────

function setType(type) {
  currentType = type;
  document.querySelectorAll(".type-btn").forEach(b => b.classList.toggle("active", b.dataset.type === type));
  // Re-fetch current packages with new type to refresh pricing
  if (comparedPackages.length > 0) {
    const ids = comparedPackages.map(p => p.Package_ID);
    comparedPackages = comparedPackages.map(p => ({ ...p })); // keep displayed, note: re-fetch not possible by ID alone
    renderTable(); // table still shows, type affects new searches
  }
  // Re-run search if there's a query
  const q = document.getElementById("pkg-search").value.trim();
  if (q) runSearch();
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Load some default packages to show on arrival
  const defaults = await fetchPackages({ sort: "rating_desc", package_type: currentType });
  comparedPackages = defaults.slice(0, 3);
  renderTable();
}

init();
