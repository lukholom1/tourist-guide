const API_URL='https://tourist-guide-api-hta5.onrender.com/api/destinations';
const WEATHER_API_URL='https://tourist-guide-api-hta5.onrender.com/api/weather';
const IMAGE_API_URL='https://tourist-guide-api-hta5.onrender.com/api/image';
const GEOAPIFY_API_URL='https://tourist-guide-api-hta5.onrender.com/api/geoapify/places';
const PIN_STORAGE_KEY = 'waypoint:pinned';
const VOTE_STORAGE_KEY = 'waypoint:voted';

let currentCategory = 'all';
let currentSearch = '';
let showPinnedOnly = false;
let latestDestinations = [];
let databaseDestinations = [];

// True after ENTER has been pressed and Geoapify
// is being used for the current search.
let apiSearchActive = false;
const destinationsContainer=document.getElementById('destinations');
const filterButtons=document.querySelectorAll(
    '.filter-btn[data-category]'
  );

const searchInput =
  document.getElementById('search-input');

const pinnedToggle =
  document.getElementById('pinned-toggle');

const pinnedCountEl =
  document.getElementById('pinned-count');

const toastEl =
  document.getElementById('toast');

const surpriseBtn =
  document.getElementById('surprise-btn');

const confettiLayer =
  document.getElementById('confetti-layer');

const statTotalEl =
  document.getElementById('stat-total');

const statPlacesEl =
  document.getElementById('stat-places');

const statRatingEl =
  document.getElementById('stat-rating');

const statPinnedEl =
  document.getElementById('stat-pinned');


// ============================================================
// PINNED DESTINATIONS
// ============================================================

function getPinnedIds() {
  try {
    const raw =
      localStorage.getItem(
        PIN_STORAGE_KEY
      );

    return new Set(
      raw ? JSON.parse(raw) : []
    );
  } catch {
    return new Set();
  }
}


function savePinnedIds(ids) {
  localStorage.setItem(
    PIN_STORAGE_KEY,
    JSON.stringify([...ids])
  );
}


function togglePinned(id) {
  const pinned =
    getPinnedIds();

  const wasPinned =
    pinned.has(id);

  if (wasPinned) {
    pinned.delete(id);
  } else {
    pinned.add(id);
  }

  savePinnedIds(pinned);

  updatePinnedCount();

  return !wasPinned;
}


function updatePinnedCount() {
  const count =
    getPinnedIds().size;

  if (pinnedCountEl) {
    pinnedCountEl.textContent =
      count;
  }

  if (statPinnedEl) {
    animateCount(
      statPinnedEl,
      count
    );
  }
}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {
  if (!toastEl) return;

  toastEl.textContent =
    message;

  toastEl.classList.add('show');

  clearTimeout(showToast._t);

  showToast._t =
    setTimeout(
      () =>
        toastEl.classList.remove(
          'show'
        ),
      1800
    );
}


// ============================================================
// VOTING
// ============================================================

function getVotedIds() {
  try {
    const raw =
      localStorage.getItem(
        VOTE_STORAGE_KEY
      );

    return new Set(
      raw ? JSON.parse(raw) : []
    );
  } catch {
    return new Set();
  }
}


function saveVotedIds(ids) {
  localStorage.setItem(
    VOTE_STORAGE_KEY,
    JSON.stringify([...ids])
  );
}


// ============================================================
// ANIMATED COUNTERS
// ============================================================

function animateCount(
  el,
  target,
  decimals = 0
) {
  if (!el) return;

  const start =
    Number(
      el.dataset.value || 0
    );

  const duration = 500;

  const startTime =
    performance.now();

  function tick(now) {
    const progress =
      Math.min(
        (now - startTime) /
          duration,
        1
      );

    const eased =
      1 -
      Math.pow(
        1 - progress,
        3
      );

    const value =
      start +
      (target - start) *
        eased;

    el.textContent =
      decimals
        ? value.toFixed(decimals)
        : Math.round(value);

    if (progress < 1) {
      requestAnimationFrame(
        tick
      );
    } else {
      el.dataset.value =
        target;
    }
  }

  requestAnimationFrame(
    tick
  );
}


function updateStats(
  destinations
) {
  if (!statTotalEl) return;

  const total =
    destinations.length;

  const uniquePlaces =
    new Set(
      destinations.map(
        (d) => d.location
      )
    ).size;

  const avgRating =
    total
      ? destinations.reduce(
          (sum, d) =>
            sum +
            (d.rating || 0),
          0
        ) / total
      : 0;

  animateCount(
    statTotalEl,
    total
  );

  animateCount(
    statPlacesEl,
    uniquePlaces
  );

  animateCount(
    statRatingEl,
    avgRating,
    1
  );

  updatePinnedCount();
}


// ============================================================
// CONFETTI
// ============================================================

const CONFETTI_COLORS = [
  '#e3663f',
  '#2e6fa8',
  '#4fa3e3',
  '#c1912e',
  '#564a8a'
];


function burstConfetti(
  originEl
) {
  if (
    !confettiLayer ||
    !originEl
  ) {
    return;
  }

  const rect =
    originEl.getBoundingClientRect();

  const originX =
    rect.left +
    rect.width / 2;

  const originY =
    rect.top +
    rect.height / 2;

  for (
    let i = 0;
    i < 14;
    i += 1
  ) {
    const piece =
      document.createElement(
        'span'
      );

    piece.className =
      'confetti-piece';

    piece.style.left =
      `${
        originX +
        (Math.random() *
          40 -
          20)
      }px`;

    piece.style.top =
      `${originY}px`;

    piece.style.background =
      CONFETTI_COLORS[
        i %
          CONFETTI_COLORS.length
      ];

    piece.style.transform =
      `rotate(${
        Math.random() * 360
      }deg)`;

    piece.style.animationDuration =
      `${
        0.7 +
        Math.random() * 0.5
      }s`;

    confettiLayer.appendChild(
      piece
    );

    setTimeout(
      () => piece.remove(),
      1300
    );
  }
}


// ============================================================
// WEATHER
// ============================================================

async function getWeather(
  location
) {
  try {
    const response =
      await fetch(
        `${WEATHER_API_URL}?location=${encodeURIComponent(
          location
        )}`
      );

    if (!response.ok) {
      throw new Error(
        'Weather unavailable'
      );
    }

    return await response.json();

  } catch (error) {

    console.error(
      `Weather error for ${location}:`,
      error
    );

    return null;
  }
}


function weatherIcon(
  iconCode
) {
  if (!iconCode) {
    return '🌤️';
  }

  const icons = {
    '01d': '☀️',
    '01n': '🌙',
    '02d': '🌤️',
    '02n': '🌙',
    '03d': '☁️',
    '03n': '☁️',
    '04d': '☁️',
    '04n': '☁️',
    '09d': '🌧️',
    '09n': '🌧️',
    '10d': '🌦️',
    '10n': '🌧️',
    '11d': '⛈️',
    '11n': '⛈️',
    '13d': '❄️',
    '13n': '❄️',
    '50d': '🌫️',
    '50n': '🌫️'
  };

  return (
    icons[iconCode] ||
    '🌤️'
  );
}


async function loadWeatherForCards(
  destinations
) {
  const weatherResults =
    await Promise.all(
      destinations.map(
        async (dest) => {

          const weather =
            await getWeather(
              dest.location
            );

          return {
            id: dest._id,
            weather
          };
        }
      )
    );

  weatherResults.forEach(
    ({ id, weather }) => {

      const card =
        destinationsContainer.querySelector(
          `.destination-card[data-id="${id}"]`
        );

      if (!card) return;

      const weatherElement =
        card.querySelector(
          '.weather'
        );

      if (!weatherElement) {
        return;
      }

      if (!weather) {

        weatherElement.innerHTML = `
          <span class="weather-unavailable">
            🌤️ Weather unavailable
          </span>
        `;

        return;
      }

      weatherElement.innerHTML = `
        <div class="weather-main">

          <span class="weather-icon">
            ${weatherIcon(
              weather.icon
            )}
          </span>

          <span class="weather-temperature">
            ${weather.temperature}°C
          </span>

          <span class="weather-description">
            ${weather.description}
          </span>

        </div>

        <div class="weather-details">

          <span>
            Feels like ${weather.feelsLike}°C
          </span>

          <span>
            💧 ${weather.humidity}%
          </span>

          <span>
            💨 ${weather.windSpeed} m/s
          </span>

        </div>
      `;
    }
  );
}


// ============================================================
// DESTINATION IMAGES
// ============================================================

async function getDestinationImage(
  query
) {
  try {

    const response =
      await fetch(
        `${IMAGE_API_URL}?query=${encodeURIComponent(
          query
        )}`
      );

    if (!response.ok) {
      return null;
    }

    return await response.json();

  } catch (error) {

    console.error(
      'Image error:',
      error
    );

    return null;
  }
}


async function loadImagesForCards(
  destinations
) {
  const results =
    await Promise.all(
      destinations.map(
        async (dest) => {

          const image =
            await getDestinationImage(
              `${dest.name} ${dest.location}`
            );

          return {
            id: dest._id,
            image
          };
        }
      )
    );

  results.forEach(
    ({ id, image }) => {

      const card =
        destinationsContainer.querySelector(
          `.destination-card[data-id="${id}"]`
        );

      if (!card) return;

      const img =
        card.querySelector(
          '.destination-image'
        );

      if (!img) return;

      if (
        image &&
        image.image
      ) {

        img.src =
          image.image;

        img.alt =
          image.photographer ||
          'Destination';

      } else {

        img.src =
          'https://via.placeholder.com/600x350?text=No+Image';

        img.alt =
          'No image available';
      }
    }
  );
}


// ============================================================
// GEOAPIFY
// ============================================================

async function searchGeoapifyPlaces(
  search,
  category = 'all'
) {
  try {

    destinationsContainer.innerHTML = `
      <div class="empty-state">
        <strong>Searching...</strong>

        <span>
          Looking for ${
            category !== 'all'
              ? category +
                ' places in '
              : ''
          }
          "${search}"
        </span>
      </div>
    `;

    const params =
      new URLSearchParams();

    params.set(
      'search',
      search
    );

    if (
      category &&
      category !== 'all'
    ) {
      params.set(
        'category',
        category
      );
    }

    const response =
      await fetch(
        `${GEOAPIFY_API_URL}?${params.toString()}`
      );

    if (!response.ok) {
      throw new Error(
        `Geoapify returned ${response.status}`
      );
    }

    const data =
      await response.json();

    const places =
      data.features || [];

    if (
      places.length === 0
    ) {

      destinationsContainer.innerHTML = `
        <div class="empty-state">

          <strong>
            No places found
          </strong>

          <span>
            No ${
              category !== 'all'
                ? category + ' '
                : ''
            }places were found
            for "${search}".
          </span>

        </div>
      `;

      return;
    }

    const geoDestinations =
      places.map(
        convertGeoapifyPlace
      );

    latestDestinations =
      geoDestinations;

    // This is important.
    // We are now displaying API results.
    apiSearchActive = true;

    renderDestinations();

  } catch (error) {

    console.error(
      'Geoapify search error:',
      error
    );

    destinationsContainer.innerHTML = `
      <div class="empty-state">

        <strong>
          Search failed
        </strong>

        <span>
          ${error.message}
        </span>

      </div>
    `;
  }
}


// ============================================================
// CONVERT GEOAPIFY RESULT
// ============================================================

function convertGeoapifyPlace(
  feature
) {
  const properties =
    feature.properties || {};

  return {

    _id:
      `geo-${
        properties.place_id ||
        `${properties.lat}-${properties.lon}`
      }`,

    name:
      properties.name ||
      properties.address_line1 ||
      'Unknown place',

    description:
      properties.formatted ||
      'A place found through Geoapify.',

    category:
      properties.category ===
      'tourism.attraction'
        ? 'sightseeing'
        : 'sightseeing',

    location:
      properties.city &&
      properties.country
        ? `${properties.city}, ${properties.country}`
        : properties.formatted ||
          'Unknown location',

    rating: 0,

    votes: 0,

    lat:
      properties.lat,

    lon:
      properties.lon
  };
}


// ============================================================
// DATABASE LOADING
// ============================================================

async function loadDestinations() {
  try {

    // IMPORTANT:
    // This function is only used for the initial
    // database load and normal database filtering.
    //
    // Once the user presses ENTER, Geoapify becomes
    // responsible for the search.

    const params =
      new URLSearchParams();

    if (
      currentCategory &&
      currentCategory !== 'all'
    ) {
      params.set(
        'category',
        currentCategory
      );
    }

    const query =
      params.toString();

    const url =
      query
        ? `${API_URL}?${query}`
        : API_URL;

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    databaseDestinations =
      await response.json();

    latestDestinations =
      databaseDestinations;

    renderDestinations();

    if (
      currentCategory === 'all'
    ) {
      updateStats(
        databaseDestinations
      );
    }

  } catch (error) {

    console.error(
      'Database load error:',
      error
    );

    destinationsContainer.innerHTML = `
      <div class="empty-state">

        <strong>
          Couldn't load destinations
        </strong>

        <span>
          ${error.message}
        </span>

      </div>
    `;
  }
}


// ============================================================
// RENDER DESTINATIONS
// ============================================================

function renderDestinations() {

  const pinned =
    getPinnedIds();

  const voted =
    getVotedIds();

  const list =
    showPinnedOnly
      ? latestDestinations.filter(
          (dest) =>
            pinned.has(dest._id)
        )
      : latestDestinations;

  if (
    list.length === 0
  ) {

    destinationsContainer.innerHTML =
      showPinnedOnly
        ? `
          <div class="empty-state">

            <strong>
              No pinned destinations yet
            </strong>

            <span>
              Tap the pin icon on a card
              to save it here.
            </span>

          </div>
        `
        : `
          <div class="empty-state">

            <strong>
              No destinations found
            </strong>

            <span>
              Try a different search.
            </span>

          </div>
        `;

    return;
  }

  destinationsContainer.innerHTML =
    list
      .map((dest) => {

        const rating =
          Math.max(
            0,
            Math.min(
              5,
              Number(
                dest.rating || 0
              )
            )
          );

        const stars =
          '★'.repeat(
            Math.round(rating)
          ) +
          '☆'.repeat(
            5 -
              Math.round(
                rating
              )
          );

        const isPinned =
          pinned.has(
            dest._id
          );

        const hasVoted =
          voted.has(
            dest._id
          );

        const voteCount =
          dest.votes || 0;

        const mapQuery =
          encodeURIComponent(
            `${dest.name}, ${dest.location}`
          );

        const mapUrl =
          `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

        return `

          <div
            class="destination-card${
              isPinned
                ? ' is-pinned'
                : ''
            }"
            data-id="${dest._id}"
          >

            <div class="image-container">

              <img
                class="destination-image"
                src=""
                alt="Loading..."
                loading="lazy"
              >

            </div>

            <div class="card-top">

              <div>

                <h3>
                  ${dest.name}
                </h3>

                <span
                  class="category ${dest.category}"
                >
                  ${dest.category}
                </span>

              </div>

              <button
                class="pin-btn${
                  isPinned
                    ? ' pinned'
                    : ''
                }"
                type="button"
                data-id="${dest._id}"
                aria-pressed="${isPinned}"
                aria-label="${
                  isPinned
                    ? 'Unpin'
                    : 'Pin'
                } ${dest.name}"
                title="${
                  isPinned
                    ? 'Unpin this destination'
                    : 'Pin this destination'
                }"
              >
                📍
              </button>

            </div>

            <p class="location">
              📌 ${dest.location}
            </p>

            <p class="description">
              ${dest.description}
            </p>

            <div class="weather">

              <span class="weather-loading">
                🌤️ Loading weather...
              </span>

            </div>

            <div class="card-bottom">

              <div class="card-actions">

                <p class="rating">
                  ${stars}
                </p>

                <button
                  class="vote-btn${
                    hasVoted
                      ? ' voted'
                      : ''
                  }"
                  type="button"
                  data-id="${dest._id}"
                  ${
                    hasVoted
                      ? 'disabled'
                      : ''
                  }
                  aria-label="${
                    hasVoted
                      ? 'You already voted'
                      : 'Vote for ' +
                        dest.name
                  }"
                  title="${
                    hasVoted
                      ? 'You already voted'
                      : 'Vote for this destination'
                  }"
                >

                  👍

                  <span class="vote-count">
                    ${voteCount}
                  </span>

                </button>

              </div>

              <a
                class="map-link"
                href="${mapUrl}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on map ↗
              </a>

            </div>

          </div>

        `;
      })
      .join('');

  // Load weather and images after rendering.
  loadWeatherForCards(
    list
  );

  loadImagesForCards(
    list
  );
}


// ============================================================
// CARD CLICK EVENTS
// ============================================================

destinationsContainer.addEventListener(
  'click',
  async (event) => {

    // --------------------------------------------------------
    // VOTE
    // --------------------------------------------------------

    const voteBtn =
      event.target.closest(
        '.vote-btn'
      );

    if (
      voteBtn &&
      !voteBtn.disabled
    ) {

      const id =
        voteBtn.dataset.id;

      const voted =
        getVotedIds();

      try {

        voteBtn.disabled =
          true;

        voteBtn.classList.add(
          'voting'
        );

        // Geoapify results cannot be voted on
        // because they don't exist in MongoDB.
        if (
          id.startsWith('geo-')
        ) {

          showToast(
            'Votes are available for saved destinations only.'
          );

          voteBtn.disabled =
            false;

          voteBtn.classList.remove(
            'voting'
          );

          return;
        }

        const response =
          await fetch(
            `${API_URL}/${id}/vote`,
            {
              method: 'POST'
            }
          );

        if (!response.ok) {
          throw new Error(
            'Failed to vote'
          );
        }

        const data =
          await response.json();

        voted.add(id);

        saveVotedIds(
          voted
        );

        const countEl =
          voteBtn.querySelector(
            '.vote-count'
          );

        if (countEl) {
          countEl.textContent =
            data.votes;
        }

        voteBtn.classList.remove(
          'voting'
        );

        voteBtn.classList.add(
          'voted'
        );

        showToast(
          'Vote recorded! 👍'
        );

      } catch (error) {

        console.error(
          'Vote error:',
          error
        );

        voteBtn.disabled =
          false;

        voteBtn.classList.remove(
          'voting'
        );

        showToast(
          'Could not record your vote'
        );
      }

      return;
    }


    // --------------------------------------------------------
    // PIN
    // --------------------------------------------------------

    const btn =
      event.target.closest(
        '.pin-btn'
      );

    if (!btn) return;

    const id =
      btn.dataset.id;

    const isNowPinned =
      togglePinned(id);

    const dest =
      latestDestinations.find(
        (d) =>
          d._id === id
      );

    btn.classList.toggle(
      'pinned',
      isNowPinned
    );

    btn.classList.add(
      'pop'
    );

    btn.setAttribute(
      'aria-pressed',
      String(
        isNowPinned
      )
    );

    setTimeout(
      () =>
        btn.classList.remove(
          'pop'
        ),
      400
    );

    if (dest) {

      showToast(
        isNowPinned
          ? `Pinned ${dest.name}`
          : `Removed ${dest.name} from pins`
      );
    }

    if (isNowPinned) {
      burstConfetti(btn);
    }

    btn
      .closest(
        '.destination-card'
      )
      ?.classList.toggle(
        'is-pinned',
        isNowPinned
      );

    if (
      showPinnedOnly &&
      !isNowPinned
    ) {
      renderDestinations();
    }
  }
);


// ============================================================
// PINNED TOGGLE
// ============================================================

pinnedToggle?.addEventListener(
  'click',
  () => {

    showPinnedOnly =
      !showPinnedOnly;

    pinnedToggle.classList.toggle(
      'active',
      showPinnedOnly
    );

    pinnedToggle.setAttribute(
      'aria-pressed',
      String(
        showPinnedOnly
      )
    );

    renderDestinations();
  }
);


// ============================================================
// SURPRISE ME
// ============================================================

surpriseBtn?.addEventListener(
  'click',
  () => {

    const pool =
      showPinnedOnly
        ? latestDestinations.filter(
            (d) =>
              getPinnedIds().has(
                d._id
              )
          )
        : latestDestinations;

    if (
      pool.length === 0
    ) {

      showToast(
        'Nothing to surprise you with yet!'
      );

      return;
    }

    surpriseBtn.classList.add(
      'rolling'
    );

    setTimeout(
      () =>
        surpriseBtn.classList.remove(
          'rolling'
        ),
      500
    );

    const pick =
      pool[
        Math.floor(
          Math.random() *
            pool.length
        )
      ];

    const card =
      destinationsContainer.querySelector(
        `.destination-card[data-id="${pick._id}"]`
      );

    if (card) {

      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      card.classList.remove(
        'is-highlighted'
      );

      void card.offsetWidth;

      card.classList.add(
        'is-highlighted'
      );

      setTimeout(
        () =>
          card.classList.remove(
            'is-highlighted'
          ),
        1500
      );
    }

    showToast(
      `How about ${pick.name}?`
    );
  }
);


// ============================================================
// SEARCH WHILE TYPING
// ============================================================
//
// IMPORTANT:
//
// Typing does NOT call Geoapify.
//
// It searches the destinations that are already
// loaded from MongoDB.
//
// Geoapify is only called when ENTER is pressed.
//

searchInput?.addEventListener(
  'input',
  (event) => {

    currentSearch =
      event.target.value.trim();

    const searchTerm =
      currentSearch.toLowerCase();

    // If the user clears the search,
    // return to the database results.
    if (!searchTerm) {

      apiSearchActive =
        false;

      latestDestinations =
        databaseDestinations;

      renderDestinations();

      return;
    }

    // If we're currently looking at Geoapify
    // results, typing should NOT immediately
    // destroy those results.
    //
    // Instead, the user can press ENTER again
    // to perform a new API search.

    if (apiSearchActive) {
      return;
    }

    const filteredDestinations =
      databaseDestinations.filter(
        (dest) => {

          const name =
            (
              dest.name ||
              ''
            ).toLowerCase();

          const location =
            (
              dest.location ||
              ''
            ).toLowerCase();

          const description =
            (
              dest.description ||
              ''
            ).toLowerCase();

          return (
            name.includes(
              searchTerm
            ) ||
            location.includes(
              searchTerm
            ) ||
            description.includes(
              searchTerm
            )
          );
        }
      );

    latestDestinations =
      filteredDestinations;

    renderDestinations();
  }
);


// ============================================================
// ENTER = GEOAPIFY SEARCH
// ============================================================

searchInput?.addEventListener(
  'keydown',
  (event) => {

    if (
      event.key !== 'Enter'
    ) {
      return;
    }

    event.preventDefault();

    const search =
      searchInput.value.trim();

    if (!search) {
      return;
    }

    currentSearch =
      search;

    searchGeoapifyPlaces(
      search,
      currentCategory
    );
  }
);


// ============================================================
// CATEGORY FILTERS
// ============================================================

filterButtons.forEach(
  (button) => {

    button.addEventListener(
      'click',
      () => {

        currentCategory =
          button.dataset.category ||
          'all';

        filterButtons.forEach(
          (btn) =>
            btn.classList.remove(
              'active'
            )
        );

        button.classList.add(
          'active'
        );
        // IF API SEARCH IS ACTIVE
        if (
          apiSearchActive &&
          currentSearch.trim()
        ) {
          searchGeoapifyPlaces(
            currentSearch.trim(),
            currentCategory
          );
          return;
        }
        // OTHERWISE DATABASE FILTER
        // When the user hasn't pressed ENTER,
        // filtering applies to the database.

        if (
          currentSearch.trim()
        ) {
          const searchTerm =
            currentSearch
              .trim()
              .toLowerCase();
          latestDestinations =
            databaseDestinations.filter(
              (dest) => {

                const matchesSearch =
                  (
                    dest.name ||
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      searchTerm
                    ) ||
                  (
                    dest.location ||
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      searchTerm
                    ) ||
                  (
                    dest.description ||
                    ''
                  )
                    .toLowerCase()
                    .includes(
                      searchTerm
                    );
                const matchesCategory =
                  currentCategory ===
                    'all' ||
                  dest.category ===
                    currentCategory;
                return (
                  matchesSearch &&
                  matchesCategory
                );
              }
            );
          renderDestinations();
          return;
        }
        // Normal database category filter.
        loadDestinations();
      }
    );
  }
);
// ADD DESTINATION
document
  .getElementById(
    'add-destination-form'
  )
  ?.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      const form =
        event.target;
      const formData =
        new FormData(form);
      const payload =
        Object.fromEntries(
          formData.entries()
        );
      payload.rating =
        Number(
          payload.rating
        );
      try {
        const response =
          await fetch(
            API_URL,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body:
                JSON.stringify(
                  payload
                )
            }
          );
        if (!response.ok) {
          throw new Error(
            'Failed to save destination'
          );
        }
        form.reset();
        showToast(
          `Added ${payload.name} to the guide`
        );
        // Reload MongoDB data.
        apiSearchActive =
          false;
        await loadDestinations();
      } catch (error) {
        console.error(
          'Add destination error:',
          error
        );
        showToast(
          error.message
        );
      }
    }
  );
// INITIAL LOAD
updatePinnedCount();
loadDestinations();
