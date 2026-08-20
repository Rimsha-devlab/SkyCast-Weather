/* ==========================================================================
   SkyCast Weather Dashboard - Dynamic Animated Weather Backgrounds & Night Detection
   API Key: [REMOVED FOR SECURITY]
   Features:
     - Dynamic Weather & Day/Night Backgrounds (Clear, Rain, Clouds, Night, Snow, Thunderstorm)
     - Animated CSS Gradient Canvas Transitions
     - LocalStorage Recent Searches History Persistence
     - HTML5 GPS Geolocation Weather Lookup
     - OpenWeatherMap Async/Await API Integration
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. API Configuration & Constants
// --------------------------------------------------------------------------
const WEATHER_API_ENDPOINT = "/api/weather";
const LOCAL_STORAGE_KEY = "skycast_recent_searches";
const LAST_CITY_KEY = "skycast_last_city";
const MAX_RECENT_SEARCHES = 5;
const CARD_EXIT_MS = 380;
const STATUS_FADE_MS = 320;

// Global State Variables
let currentWeatherData = null;
let currentUnit = "C"; // Default unit: Celsius (°C)
let currentCityName = "";
let isFetching = false;

// --------------------------------------------------------------------------
// 2. DOM Elements Selection
// --------------------------------------------------------------------------
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const clearBtn = document.getElementById("clear-btn");
const locationBtn = document.getElementById("location-btn");

const recentSearchesContainer = document.getElementById("recent-searches-container");
const recentPillsContainer = document.getElementById("recent-pills");
const clearHistoryBtn = document.getElementById("clear-history-btn");

const statusContainer = document.getElementById("status-container");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");

const weatherCard = document.getElementById("weather-card");
const cityNameElem = document.getElementById("city-name");
const dateTimeElem = document.getElementById("date-time");
const temperatureElem = document.getElementById("temperature");
const tempUnitSymbol = document.getElementById("temp-unit-symbol");
const weatherConditionElem = document.getElementById("weather-condition");
const weatherIconElem = document.getElementById("weather-icon");
const weatherIconWrapper = document.getElementById("weather-icon-wrapper");
const rainLayer = document.getElementById("rain-layer");
const iconRainRing = document.getElementById("icon-rain-ring");
const tempMaxElem = document.getElementById("temp-max");
const tempMinElem = document.getElementById("temp-min");

const feelsLikeElem = document.getElementById("feels-like");
const humidityElem = document.getElementById("humidity");
const windSpeedElem = document.getElementById("wind-speed");
const pressureElem = document.getElementById("pressure");

const unitBtnC = document.getElementById("unit-c");
const unitBtnF = document.getElementById("unit-f");
const searchBtn = document.getElementById("search-btn");
const recentTitle = document.getElementById("recent-title");
const recentEmptyHint = document.getElementById("recent-empty-hint");
const dayNightBadge = document.getElementById("day-night-badge");

// --------------------------------------------------------------------------
// Animation Helpers
// --------------------------------------------------------------------------

/**
 * Retriggers a CSS animation on an element by forcing reflow
 * @param {HTMLElement} element 
 * @param {string} className 
 */
function retriggerAnimation(element, className) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

/**
 * Adds a one-shot click pulse animation to interactive buttons
 * @param {HTMLElement} button 
 */
function bindButtonClickAnimation(button) {
  if (!button) return;

  button.addEventListener("click", () => {
    retriggerAnimation(button, "btn-clicked");
  });
}

/**
 * Triggers the temperature scale pop animation
 */
function animateTemperature() {
  retriggerAnimation(temperatureElem, "temp-scale");
}

/**
 * Restarts staggered fade-in animations for weather card content
 */
function animateWeatherContent() {
  weatherCard.classList.remove("is-visible");
  void weatherCard.offsetWidth;
  weatherCard.classList.add("is-visible");
}

/**
 * Builds ambient rain drops for full-screen and icon ring effects
 */
function initWeatherVisualEffects() {
  if (rainLayer && rainLayer.childElementCount === 0) {
    for (let i = 0; i < 90; i++) {
      const drop = document.createElement("span");
      drop.className = "rain-drop";
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDuration = `${0.55 + Math.random() * 0.75}s`;
      drop.style.animationDelay = `${Math.random() * 2.5}s`;
      drop.style.opacity = `${0.25 + Math.random() * 0.55}`;
      rainLayer.appendChild(drop);
    }
  }

  if (iconRainRing && iconRainRing.childElementCount === 0) {
    const center = 75;
    for (let i = 0; i < 14; i++) {
      const drop = document.createElement("span");
      drop.className = "icon-rain-drop";
      const angle = (i / 14) * Math.PI * 2;
      const radius = 52 + (i % 3) * 8;
      drop.style.left = `${center + Math.cos(angle) * radius}px`;
      drop.style.top = `${center + Math.sin(angle) * radius}px`;
      drop.style.animationDelay = `${(i * 0.12) % 1.2}s`;
      drop.style.animationDuration = `${0.7 + (i % 4) * 0.15}s`;
      iconRainRing.appendChild(drop);
    }
  }
}

/**
 * Syncs icon wrapper animation type with current weather theme
 * @param {string} theme 
 */
function updateWeatherIconAnimation(theme) {
  if (!weatherIconWrapper) return;
  weatherIconWrapper.dataset.iconType = theme || "default";

  if (weatherIconElem) {
    weatherIconElem.classList.remove("icon-updated");
    void weatherIconElem.offsetWidth;
    weatherIconElem.classList.add("icon-updated");
  }
}

/**
 * Waits for a CSS animation/transition to finish or times out
 * @param {HTMLElement} element 
 * @param {number} fallbackMs 
 */
function waitForAnimation(element, fallbackMs) {
  return new Promise((resolve) => {
    if (!element) {
      setTimeout(resolve, fallbackMs);
      return;
    }

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      element.removeEventListener("animationend", done);
      resolve();
    };

    element.addEventListener("animationend", done);
    setTimeout(done, fallbackMs);
  });
}

/**
 * Smoothly hides the weather card before loading a new search
 */
async function hideWeatherCardWithTransition() {
  if (weatherCard.classList.contains("hidden")) return;

  weatherCard.classList.remove("is-visible", "is-entering");
  weatherCard.classList.add("is-exiting");
  await waitForAnimation(weatherCard, CARD_EXIT_MS);
  weatherCard.classList.remove("is-exiting");
  weatherCard.classList.add("hidden");
}

/**
 * Smoothly reveals the weather card after data loads
 */
async function showWeatherCardWithTransition() {
  weatherCard.classList.remove("hidden", "is-exiting");
  weatherCard.classList.add("is-entering");
  await waitForAnimation(weatherCard, 560);
  weatherCard.classList.remove("is-entering");
  weatherCard.classList.add("is-visible");
  animateWeatherContent();
}

/**
 * Updates visible day/night badge and body time period
 * @param {boolean} isNight 
 * @param {number|null} sunrise 
 * @param {number|null} sunset 
 */
function updateDayNightUI(isNight, sunrise = null, sunset = null) {
  document.body.dataset.time = isNight ? "night" : "day";

  if (!dayNightBadge) return;

  dayNightBadge.dataset.period = isNight ? "night" : "day";
  dayNightBadge.querySelector(".badge-icon").className = isNight
    ? "fa-solid fa-moon badge-icon"
    : "fa-solid fa-sun badge-icon";
  dayNightBadge.querySelector(".badge-text").textContent = isNight ? "Nighttime" : "Daytime";

  if (dateTimeElem) {
    const baseDate = getCurrentFormattedDateTime();
    if (sunrise && sunset) {
      const rise = formatUnixTime(sunrise);
      const set = formatUnixTime(sunset);
      dateTimeElem.textContent = `${baseDate} · ↑ ${rise} · ↓ ${set}`;
    } else {
      dateTimeElem.textContent = baseDate;
    }
  }
}

function formatUnixTime(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function setLocationButtonLoading(isLoading) {
  if (!locationBtn) return;
  locationBtn.disabled = isLoading;
  locationBtn.classList.toggle("is-locating", isLoading);
}

function saveLastCity(city) {
  if (!city) return;
  try {
    localStorage.setItem(LAST_CITY_KEY, city);
  } catch (e) {
    /* ignore storage errors */
  }
}

function getLastCity() {
  try {
    return localStorage.getItem(LAST_CITY_KEY) || "";
  } catch (e) {
    return "";
  }
}

// --------------------------------------------------------------------------
// 3. Event Listeners Initialization
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initWeatherVisualEffects();

  // Render search history from localStorage
  renderRecentSearches();

  // Restore last viewed city or load a sensible default
  const lastCity = getLastCity();
  if (lastCity) {
    cityInput.value = lastCity;
    toggleClearButton();
    fetchWeatherByCity(lastCity);
  } else {
    fetchWeatherByCity("London");
  }

  // Search Form Submit Handler
  searchForm.addEventListener("submit", handleSearchSubmit);

  // Clear Input Controls
  cityInput.addEventListener("input", toggleClearButton);
  if (clearBtn) clearBtn.addEventListener("click", clearInput);

  // GPS Geolocation Handler
  if (locationBtn) locationBtn.addEventListener("click", handleGeolocation);

  // Clear Recent Search History Handler
  if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearRecentSearches);

  // Temperature Unit Switcher (°C / °F)
  if (unitBtnC && unitBtnF) {
    unitBtnC.addEventListener("click", () => setUnit("C"));
    unitBtnF.addEventListener("click", () => setUnit("F"));
  }

  // Button click pulse animations
  bindButtonClickAnimation(searchBtn);
  bindButtonClickAnimation(locationBtn);
  bindButtonClickAnimation(clearBtn);
  bindButtonClickAnimation(clearHistoryBtn);
  bindButtonClickAnimation(unitBtnC);
  bindButtonClickAnimation(unitBtnF);

  // Real-time Offline Event Listener
  window.addEventListener("offline", () => {
    showError("No internet connection. Please check your network connection.");
  });
});

// --------------------------------------------------------------------------
// 4. Search & LocalStorage Recent Searches Management
// --------------------------------------------------------------------------

function handleSearchSubmit(e) {
  e.preventDefault();

  const query = cityInput.value.trim();

  if (!query) {
    void showError("Please enter a city name to search.");
    cityInput.focus();
    return;
  }

  fetchWeatherByCity(query);
}

function toggleClearButton() {
  if (!clearBtn) return;
  clearBtn.classList.toggle("hidden", cityInput.value.trim().length === 0);
}

function clearInput() {
  cityInput.value = "";
  if (clearBtn) clearBtn.classList.add("hidden");
  cityInput.focus();
}

/**
 * Saves searched city into LocalStorage history array
 * @param {string} city 
 */
function saveRecentSearch(city) {
  if (!city) return;

  let recent = getRecentSearches();
  const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);

  // Remove duplicate if already exists
  recent = recent.filter(item => item.toLowerCase() !== formattedCity.toLowerCase());

  // Push new city to front
  recent.unshift(formattedCity);

  // Cap at MAX_RECENT_SEARCHES
  if (recent.length > MAX_RECENT_SEARCHES) {
    recent = recent.slice(0, MAX_RECENT_SEARCHES);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recent));
  renderRecentSearches();
}

function getRecentSearches() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function renderRecentSearches() {
  const searches = getRecentSearches();

  if (!recentPillsContainer || !recentSearchesContainer) return;

  const hasHistory = searches.length > 0;

  if (recentTitle) {
    recentTitle.innerHTML = hasHistory
      ? `<i class="fa-solid fa-clock-rotate-left"></i> Recent Searches:`
      : `<i class="fa-solid fa-compass"></i> Quick Picks:`;
  }

  if (recentEmptyHint) {
    recentEmptyHint.classList.toggle("hidden", hasHistory);
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.classList.toggle("hidden", !hasHistory);
  }

  const cities = hasHistory ? searches : ["London", "New York", "Tokyo", "Paris"];

  recentPillsContainer.innerHTML = cities.map(city => {
    const isActive = currentCityName && city.toLowerCase() === currentCityName.toLowerCase();
    return `<button type="button" class="city-pill${isActive ? " active" : ""}" data-city="${city}">${city}</button>`;
  }).join("");

  const pills = recentPillsContainer.querySelectorAll(".city-pill");
  pills.forEach(pill => {
    bindButtonClickAnimation(pill);
    pill.addEventListener("click", () => {
      const selectedCity = pill.getAttribute("data-city");
      cityInput.value = selectedCity;
      toggleClearButton();
      fetchWeatherByCity(selectedCity);
    });
  });
}

function clearRecentSearches() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  renderRecentSearches();
}

// --------------------------------------------------------------------------
// 5. Weather Data Fetching (City Search & GPS Location)
// --------------------------------------------------------------------------

/**
 * Fetches weather by City Name
 * @param {string} city 
 */
async function fetchWeatherByCity(city) {
  if (isFetching) return;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await showError("Network error. Please check your internet connection.");
    return;
  }

  isFetching = true;

  try {
    await showLoading();
    // Construct a relative API URL to work both when served via HTTP server or opened directly as a file.
    const apiUrl = `${WEATHER_API_ENDPOINT}?city=${encodeURIComponent(city)}`;
    await executeWeatherFetch(apiUrl, city);
  } finally {
    isFetching = false;
  }
}

/**
 * HTML5 Geolocation API Handler (Fetch weather using device GPS position)
 */
async function handleGeolocation() {
  if (isFetching) return;

  if (!navigator.geolocation) {
    await showError("Geolocation is not supported by your browser.");
    return;
  }

  isFetching = true;
  setLocationButtonLoading(true);
  await showLoading();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      // Construct a relative API URL for geolocation queries.
      const apiUrl = `${WEATHER_API_ENDPOINT}?lat=${lat}&lon=${lon}`;
      await executeWeatherFetch(apiUrl, "", { fromGeolocation: true });
      setLocationButtonLoading(false);
      isFetching = false;
    },
    async (err) => {
      console.warn("Geolocation Error:", err);
      setLocationButtonLoading(false);
      isFetching = false;

      let message = "Unable to retrieve GPS location. Please search by city name.";
      if (err.code === 1) {
        message = "Location access denied. Enable location permissions to use this feature.";
      } else if (err.code === 3) {
        message = "Location request timed out. Please try again.";
      }

      await showError(message);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
  );
}

/**
 * Executes OpenWeatherMap API fetch request
 * @param {string} url 
 * @param {string} searchedCity 
 */
async function executeWeatherFetch(url, searchedCity = "", options = {}) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message = errorPayload.message || "Unable to retrieve weather data right now.";
      throw new Error(message);
    }

    const payload = await response.json();

    if (!payload.success || !payload.weatherData) {
      throw new Error(payload.message || "Unable to retrieve weather data right now.");
    }

    const data = payload.weatherData;

    const weatherData = {
      city: data.city,
      country: data.country || "",
      temp: data.temp,
      feelsLike: data.feelsLike,
      tempMin: data.tempMin,
      tempMax: data.tempMax,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
      pressure: data.pressure,
      condition: data.condition,
      conditionMain: data.conditionMain,
      iconCode: data.iconCode,
      dt: data.dt,
      sunrise: data.sunrise,
      sunset: data.sunset,
      iconUrl: data.iconUrl
    };

    saveRecentSearch(data.city);
    saveLastCity(data.city);

    if (options.fromGeolocation) {
      cityInput.value = data.city;
      toggleClearButton();
    } else if (searchedCity) {
      cityInput.value = data.city;
      toggleClearButton();
    }

    await displayWeatherUI(weatherData);

  } catch (error) {
    console.error("Fetch Error:", error);
    if (error.name === "TypeError" || error.message.includes("Failed to fetch")) {
      await showError("Network error. Could not connect to weather server.");
    } else {
      await showError(error.message || "City not found. Please check spelling.");
    }
  }
}

// --------------------------------------------------------------------------
// 6. Dynamic Background Theme & Night Detection Logic
// --------------------------------------------------------------------------

/**
 * Dynamically updates document background theme based on Weather Condition & Day/Night Status
 * @param {string} conditionMain 
 * @param {string} iconCode - OpenWeatherMap icon code (ends with 'n' for night)
 * @param {number} dt 
 * @param {number} sunrise 
 * @param {number} sunset 
 */
function updateDynamicTheme(conditionMain, iconCode, dt, sunrise, sunset) {
  const isNight = iconCode
    ? iconCode.endsWith("n")
    : (dt && sunrise && sunset ? (dt < sunrise || dt > sunset) : false);

  let theme = "default";

  if (isNight) {
    theme = "night";
  } else {
    const condition = (conditionMain || "").toLowerCase();

    if (condition.includes("clear")) {
      theme = "clear";
    } else if (condition.includes("rain") || condition.includes("drizzle")) {
      theme = "rain";
    } else if (condition.includes("cloud")) {
      theme = "clouds";
    } else if (condition.includes("snow")) {
      theme = "snow";
    } else if (condition.includes("thunderstorm") || condition.includes("lightning")) {
      theme = "thunderstorm";
    }
  }

  document.body.dataset.weather = theme;
  updateWeatherIconAnimation(theme);
  updateDayNightUI(isNight, sunrise, sunset);

  return { theme, isNight };
}

/**
 * Renders extracted weather data & triggers dynamic theme + smooth entrance animation
 * @param {Object} data 
 */
async function displayWeatherUI(data) {
  currentWeatherData = data;
  currentCityName = data.city;

  updateDynamicTheme(data.conditionMain, data.iconCode, data.dt, data.sunrise, data.sunset);

  cityNameElem.textContent = `${data.city}${data.country ? ", " + data.country : ""}`;

  updateDisplayedTemperatures(false);

  weatherConditionElem.textContent = data.condition;
  weatherIconElem.src = data.iconUrl;
  weatherIconElem.alt = data.condition;

  humidityElem.textContent = `${data.humidity}%`;
  windSpeedElem.textContent = `${data.windSpeed} km/h`;
  pressureElem.textContent = `${data.pressure} hPa`;

  await hideStatus();
  await showWeatherCardWithTransition();
  animateTemperature();
  renderRecentSearches();
}

function updateDisplayedTemperatures(animate = true) {
  if (!currentWeatherData) return;

  const isF = currentUnit === "F";
  const tempVal = isF ? cToF(currentWeatherData.temp) : currentWeatherData.temp;
  const feelsLikeVal = isF ? cToF(currentWeatherData.feelsLike) : currentWeatherData.feelsLike;
  const maxVal = isF ? cToF(currentWeatherData.tempMax) : currentWeatherData.tempMax;
  const minVal = isF ? cToF(currentWeatherData.tempMin) : currentWeatherData.tempMin;
  const symbol = isF ? "°F" : "°C";

  temperatureElem.textContent = tempVal;
  tempUnitSymbol.textContent = symbol;
  feelsLikeElem.textContent = `${feelsLikeVal}${symbol}`;
  tempMaxElem.textContent = `${maxVal}${symbol}`;
  tempMinElem.textContent = `${minVal}${symbol}`;

  if (animate) animateTemperature();
}

function cToF(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

function setUnit(unit) {
  if (currentUnit === unit) return;
  currentUnit = unit;

  if (unitBtnC && unitBtnF) {
    unitBtnC.classList.toggle("active", unit === "C");
    unitBtnF.classList.toggle("active", unit === "F");
  }

  updateDisplayedTemperatures();
}

// --------------------------------------------------------------------------
// 7. Status Helpers & Utilities
// --------------------------------------------------------------------------

async function showLoading() {
  await hideWeatherCardWithTransition();

  statusContainer.classList.remove("hidden");
  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");

  await new Promise((resolve) => requestAnimationFrame(() => {
    statusContainer.classList.add("is-visible");
    resolve();
  }));
}

async function showError(msg) {
  await hideWeatherCardWithTransition();

  statusContainer.classList.remove("hidden");
  loadingState.classList.add("hidden");
  errorState.classList.remove("hidden");
  errorMessage.textContent = msg;

  statusContainer.classList.add("is-visible");

  errorState.style.animation = "none";
  errorState.offsetHeight;
  errorState.style.animation = "shakeAlert 0.45s ease-in-out forwards";
}

async function hideStatus() {
  statusContainer.classList.remove("is-visible");
  await new Promise((resolve) => setTimeout(resolve, STATUS_FADE_MS));

  statusContainer.classList.add("hidden");
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
}

function getCurrentFormattedDateTime() {
  const now = new Date();
  const options = { weekday: "long", hour: "numeric", minute: "numeric", hour12: true };
  return now.toLocaleDateString("en-US", options);
}
