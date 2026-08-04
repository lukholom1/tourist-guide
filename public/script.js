const API_URL = '/api/destinations';
const PIN_STORAGE_KEY = 'waypoint:pinned';

let currentCategory = 'all';
let currentSearch = '';
let showPinnedOnly = false;
let latestDestinations = [];

const destinationsContainer = document.getElementById('destinations');
const filterButtons = document.querySelectorAll('.filter-btn[data-category]');
const searchInput = document.getElementById('search-input');
const pinnedToggle = document.getElementById('pinned-toggle');
const pinnedCountEl = document.getElementById('pinned-count');
const toastEl = document.getElementById('toast');
const surpriseBtn = document.getElementById('surprise-btn');
const confettiLayer = document.getElementById('confetti-layer');
const statTotalEl = document.getElementById('stat-total');
const statPlacesEl = document.getElementById('stat-places');
const statRatingEl = document.getElementById('stat-rating');
const statPinnedEl = document.getElementById('stat-pinned');

// ---------- Pinned destinations (saved locally on this device) ----------

function getPinnedIds() {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids) {
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify([...ids]));
}

function togglePinned(id) {
  const pinned = getPinnedIds();
  const wasPinned = pinned.has(id);
  wasPinned ? pinned.delete(id) : pinned.add(id);
  savePinnedIds(pinned);
  updatePinnedCount();
  return !wasPinned;
}

function updatePinnedCount() {
  const count = getPinnedIds().size;
  pinnedCountEl.textContent = count;
  if (statPinnedEl) animateCount(statPinnedEl, count);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

// ---------- Fun bits: count-up numbers & confetti ----------

function animateCount(el, target, decimals = 0) {
  const start = Number(el.dataset.value || 0);
  const duration = 500;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (target - start) * eased;
    el.textContent = decimals ? value.toFixed(decimals) : Math.round(value);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.dataset.value = target;
    }
  }
  requestAnimationFrame(tick);
}

function updateStats(destinations) {
  if (!statTotalEl) return;
  const total = destinations.length;
  const uniquePlaces = new Set(destinations.map((d) => d.location)).size;
  const avgRating = total
    ? destinations.reduce((sum, d) => sum + (d.rating || 0), 0) / total
    : 0;

  animateCount(statTotalEl, total);
  animateCount(statPlacesEl, uniquePlaces);
  animateCount(statRatingEl, avgRating, 1);
  updatePinnedCount();
}

const CONFETTI_COLORS = ['#e3663f', '#2e6fa8', '#4fa3e3', '#c1912e', '#564a8a'];

function burstConfetti(originEl) {
  if (!confettiLayer || !originEl) return;
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let i = 0; i < 14; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${originX + (Math.random() * 40 - 20)}px`;
    piece.style.top = `${originY}px`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.animationDuration = `${0.7 + Math.random() * 0.5}s`;
    confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), 1300);
  }
}

// ---------- Data loading ----------

function buildQueryString() {
  const params = new URLSearchParams();
  if (currentCategory && currentCategory !== 'all') {
    params.set('category', currentCategory);
  }
  if (currentSearch.trim()) {
    params.set('search', currentSearch.trim());
  }
  return params.toString();
}

async function loadDestinations() {
  try {
    const query = buildQueryString();
    const url = query ? `${API_URL}?${query}` : API_URL;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    latestDestinations = await response.json();
    renderDestinations();
    if (currentCategory === 'all' && !currentSearch.trim()) {
      updateStats(latestDestinations);
    }
  } catch (error) {
    destinationsContainer.innerHTML = `
      <div class="empty-state">
        <strong>Couldn't load destinations</strong>
        <span>${error.message}</span>
      </div>`;
  }
}

function renderDestinations() {
  const pinned = getPinnedIds();
  const list = showPinnedOnly
    ? latestDestinations.filter((dest) => pinned.has(dest._id))
    : latestDestinations;

  if (list.length === 0) {
    destinationsContainer.innerHTML = showPinnedOnly
      ? `<div class="empty-state"><strong>No pinned destinations yet</strong><span>Tap the pin icon on a card to save it here.</span></div>`
      : `<div class="empty-state"><strong>No destinations found</strong><span>Try a different search or add one below.</span></div>`;
    return;
  }

  destinationsContainer.innerHTML = list.map((dest) => {
    const stars = '★'.repeat(dest.rating) + '☆'.repeat(5 - dest.rating);
    const isPinned = pinned.has(dest._id);
    const mapQuery = encodeURIComponent(`${dest.name}, ${dest.location}`);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

    return `
      <div class="destination-card${isPinned ? ' is-pinned' : ''}" data-id="${dest._id}">
        <div class="card-top">
          <div>
            <h3>${dest.name}</h3>
            <span class="category ${dest.category}">${dest.category}</span>
          </div>
          <button
            class="pin-btn${isPinned ? ' pinned' : ''}"
            type="button"
            data-id="${dest._id}"
            aria-pressed="${isPinned}"
            aria-label="${isPinned ? 'Unpin' : 'Pin'} ${dest.name}"
            title="${isPinned ? 'Unpin this destination' : 'Pin this destination'}"
          >📍</button>
        </div>
        <p class="location">📌 ${dest.location}</p>
        <p class="description">${dest.description}</p>
        <div class="card-bottom">
          <p class="rating">${stars}</p>
          <a class="map-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer">View on map ↗</a>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Event wiring ----------

destinationsContainer.addEventListener('click', (event) => {
  const btn = event.target.closest('.pin-btn');
  if (!btn) return;

  const id = btn.dataset.id;
  const isNowPinned = togglePinned(id);
  const dest = latestDestinations.find((d) => d._id === id);

  btn.classList.toggle('pinned', isNowPinned);
  btn.classList.add('pop');
  btn.setAttribute('aria-pressed', String(isNowPinned));
  setTimeout(() => btn.classList.remove('pop'), 400);

  if (dest) {
    showToast(isNowPinned ? `Pinned ${dest.name}` : `Removed ${dest.name} from pins`);
  }

  if (isNowPinned) {
    burstConfetti(btn);
  }

  btn.closest('.destination-card')?.classList.toggle('is-pinned', isNowPinned);

  if (showPinnedOnly && !isNowPinned) {
    renderDestinations();
  }
});

pinnedToggle.addEventListener('click', () => {
  showPinnedOnly = !showPinnedOnly;
  pinnedToggle.classList.toggle('active', showPinnedOnly);
  pinnedToggle.setAttribute('aria-pressed', String(showPinnedOnly));
  renderDestinations();
});

surpriseBtn?.addEventListener('click', () => {
  const pool = showPinnedOnly
    ? latestDestinations.filter((d) => getPinnedIds().has(d._id))
    : latestDestinations;

  if (pool.length === 0) {
    showToast('Nothing to surprise you with yet!');
    return;
  }

  surpriseBtn.classList.add('rolling');
  setTimeout(() => surpriseBtn.classList.remove('rolling'), 500);

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const card = destinationsContainer.querySelector(`.destination-card[data-id="${pick._id}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('is-highlighted');
    // Restart the animation even if it was just played
    void card.offsetWidth;
    card.classList.add('is-highlighted');
    setTimeout(() => card.classList.remove('is-highlighted'), 1500);
  }
  showToast(`How about ${pick.name}?`);
});

// Fire a search request on every keystroke
searchInput?.addEventListener('input', (event) => {
  currentSearch = event.target.value;
  loadDestinations();
});

// Category filter buttons
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentCategory = button.dataset.category || 'all';
    filterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    loadDestinations();
  });
});

// Add-destination form
document.getElementById('add-destination-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.rating = Number(payload.rating);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to save destination');
    form.reset();
    showToast(`Added ${payload.name} to the guide`);
    await loadDestinations();
  } catch (error) {
    showToast(error.message);
  }
});

// Initial load when the page opens
updatePinnedCount();
loadDestinations();
