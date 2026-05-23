const countryRegionMap = {
  
  "south africa": "africa", "morocco": "africa", "egypt": "africa",
  "kenya": "africa", "tanzania": "africa", "nigeria": "africa",
  "ghana": "africa", "ethiopia": "africa", "tunisia": "africa",
  "zimbabwe": "africa", "botswana": "africa", "namibia": "africa",

  "japan": "asia", "indonesia": "asia", "thailand": "asia",
  "china": "asia", "india": "asia", "vietnam": "asia",
  "singapore": "asia", "malaysia": "asia", "philippines": "asia",
  "south korea": "asia", "cambodia": "asia", "nepal": "asia",
  "sri lanka": "asia", "maldives": "asia",

  "greece": "europe", "france": "europe", "italy": "europe",
  "spain": "europe", "germany": "europe", "portugal": "europe",
  "netherlands": "europe", "switzerland": "europe", "austria": "europe",
  "uk": "europe", "united kingdom": "europe", "croatia": "europe",
  "czechia": "europe", "hungary": "europe", "norway": "europe",
  "sweden": "europe", "denmark": "europe", "iceland": "europe",

  "usa": "americas", "united states": "americas", "canada": "americas",
  "mexico": "americas", "brazil": "americas", "argentina": "americas",
  "peru": "americas", "colombia": "americas", "chile": "americas",
  "cuba": "americas", "costa rica": "americas",

  "australia": "oceania", "new zealand": "oceania", "fiji": "oceania",
  "papua new guinea": "oceania",

  "uae": "middleeast", "united arab emirates": "middleeast",
  "qatar": "middleeast", "saudi arabia": "middleeast",
  "jordan": "middleeast", "israel": "middleeast", "oman": "middleeast",
  "bahrain": "middleeast", "kuwait": "middleeast",
};

function getRegion(country) {
  return countryRegionMap[country.toLowerCase()] || "other";
}

let allDestinations = [];
let activeRegion = "all";

async function loadDestinations() {
  const grid = document.getElementById("dest-grid");
  grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;padding:2rem 0;">Loading destinations…</p>`;

  try {
    const res = await fetch("api.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "GetDestinations" }),
    });

    const json = await res.json();

    if (json.status !== "success") {
      grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;padding:2rem 0;">Failed to load destinations.</p>`;
      return;
    }

    allDestinations = json.data;
    renderDestinations();

  } catch (e) {
    grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;padding:2rem 0;">Error connecting to server.</p>`;
  }
}

function renderDestinations() {
  const q = document.getElementById("dest-search").value.toLowerCase().trim();
  const grid = document.getElementById("dest-grid");
  const noResults = document.getElementById("no-results");

  const filtered = allDestinations.filter(d => {
    const region = getRegion(d.Country);
    const searchStr = `${d.City} ${d.Country}`.toLowerCase();
    const regionMatch = activeRegion === "all" || region === activeRegion;
    const nameMatch = !q || searchStr.includes(q);
    return regionMatch && nameMatch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";
  grid.innerHTML = filtered.map(d => `
    <a href="browse.html?destination=${encodeURIComponent(d.City)}" class="dest-card" data-region="${getRegion(d.Country)}">
      <div class="dest-thumb"></div>
      <div class="dest-body">
        <div class="dest-country">${d.Country}</div>
        <div class="dest-name">${d.City}</div>
      </div>
    </a>
  `).join("");
}

function setRegion(r, btn) {
  activeRegion = r;
  document.querySelectorAll(".region-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderDestinations();
}

function filterDests() {
  renderDestinations();
}

loadDestinations();
