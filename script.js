const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const SAVED_KEY = "task3-saved-places";

const searchForm = document.getElementById("search-form");
const locationInput = document.getElementById("location-input");
const suggestionsBox = document.getElementById("suggestions");
const statusMessage = document.getElementById("status-message");

const savedTrack = document.getElementById("saved-track");
const savedEmpty = document.getElementById("saved-empty");
const scrollLeftBtn = document.getElementById("scroll-left");
const scrollRightBtn = document.getElementById("scroll-right");

const weatherDashboard = document.getElementById("weather-dashboard");

const locationName = document.getElementById("location-name");
const locationSubtitle = document.getElementById("location-subtitle");
const conditionIcon = document.getElementById("condition-icon");
const conditionBadge = document.getElementById("condition-badge");
const updatedTime = document.getElementById("updated-time");

const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const conditionText = document.getElementById("condition-text");

const latitudeText = document.getElementById("latitude");
const longitudeText = document.getElementById("longitude");
const timezoneText = document.getElementById("timezone");
const weatherCodeText = document.getElementById("weather-code");

const savePlaceBtn = document.getElementById("save-place-btn");
const refreshBtn = document.getElementById("refresh-btn");

const state = {
  suggestions: [],
  selectedPlace: null,
  currentPlace: null,
  currentWeather: null,
  savedPlaces: [],
  autocompleteTimer: null,
  autocompleteController: null,
};

function loadSavedPlaces() {
  try {
    const saved = localStorage.getItem(SAVED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveSavedPlaces() {
  localStorage.setItem(SAVED_KEY, JSON.stringify(state.savedPlaces));
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function showStatus(message, color = "#dc2626") {
  statusMessage.style.color = color;
  statusMessage.textContent = message;
}

function getWeatherDescription(code) {
  const weatherMap = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    81: "Moderate Showers",
    82: "Violent Showers",
    95: "Thunderstorm"
  };

  return weatherMap[code] || "Unknown Condition";
}

function getConditionInfo(weatherCode, wind) {
  const label = getWeatherDescription(weatherCode);

  if (weatherCode === 95) {
    return { label, icon: "⛈️", theme: "thunder" };
  }

  if ([71, 73, 75].includes(weatherCode)) {
    return { label, icon: "❄️", theme: "snowy" };
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    return { label, icon: "🌧️", theme: "rainy" };
  }

  if (wind >= 30) {
    return { label, icon: "💨", theme: "windy" };
  }

  if ([0, 1].includes(weatherCode)) {
    return { label, icon: "☀️", theme: "sunny" };
  }

  return { label, icon: "☁️", theme: "cloudy" };
}

function applyWeatherTheme(theme) {
  document.body.className = `weather-${theme}`;
}

function mapPlace(result) {
  const regionParts = [
    result.admin4,
    result.admin3,
    result.admin2,
    result.admin1,
    result.country,
  ].filter(Boolean);

  return {
    id: `${result.latitude},${result.longitude}`,
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country || "",
    region: regionParts.join(", "),
    label: [result.name, ...regionParts].filter(Boolean).join(", "),
  };
}

async function fetchSuggestions(query, signal) {
  const url =
    `${GEO_API}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error("Failed to fetch location suggestions.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results.map(mapPlace);
}

async function fetchWeather(place) {
  const url =
    `${WEATHER_API}?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
    `&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch weather data.");
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error("Weather data is unavailable.");
  }

  return data;
}

function renderSuggestions() {
  if (!state.suggestions.length) {
    suggestionsBox.classList.add("hidden");
    suggestionsBox.innerHTML = "";
    return;
  }

  suggestionsBox.innerHTML = "";

  state.suggestions.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-item";
    button.dataset.placeId = place.id;

    button.innerHTML = `
      <strong>${place.name}</strong>
      <span>${place.region || place.country || place.label}</span>
    `;

    suggestionsBox.appendChild(button);
  });

  suggestionsBox.classList.remove("hidden");
}

function clearSuggestions() {
  state.suggestions = [];
  suggestionsBox.innerHTML = "";
  suggestionsBox.classList.add("hidden");
}

async function loadAutocomplete(query) {
  if (state.autocompleteController) {
    state.autocompleteController.abort();
  }

  state.autocompleteController = new AbortController();

  try {
    const suggestions = await fetchSuggestions(query, state.autocompleteController.signal);
    state.suggestions = suggestions;
    renderSuggestions();
  } catch (error) {
    if (error.name !== "AbortError") {
      clearSuggestions();
    }
  }
}

locationInput.addEventListener("input", () => {
  const value = locationInput.value.trim();
  state.selectedPlace = null;

  clearTimeout(state.autocompleteTimer);

  if (value.length < 2) {
    clearSuggestions();
    return;
  }

  state.autocompleteTimer = setTimeout(() => {
    loadAutocomplete(value);
  }, 300);
});

suggestionsBox.addEventListener("click", async (event) => {
  const button = event.target.closest(".suggestion-item");
  if (!button) return;

  const place = state.suggestions.find((item) => item.id === button.dataset.placeId);
  if (!place) return;

  state.selectedPlace = place;
  locationInput.value = place.name;
  clearSuggestions();

  await loadWeatherForPlace(place);
});

async function loadWeatherForPlace(place) {
  try {
    showStatus("Loading weather data...", "#2563eb");
    weatherDashboard.classList.add("hidden");

    const weatherData = await fetchWeather(place);
    const current = weatherData.current;
    const condition = getConditionInfo(current.weather_code, current.wind_speed_10m);

    state.currentPlace = place;
    state.currentWeather = weatherData;

    locationName.textContent = place.name;
    locationSubtitle.textContent = place.region || place.country || place.label;
    conditionIcon.textContent = condition.icon;
    conditionBadge.textContent = condition.label;
    updatedTime.textContent = `Updated: ${current.time}`;

    temperature.textContent = `${current.temperature_2m} °C`;
    humidity.textContent = `${current.relative_humidity_2m} %`;
    windSpeed.textContent = `${current.wind_speed_10m} km/h`;
    conditionText.textContent = condition.label;

    latitudeText.textContent = Number(place.latitude).toFixed(2);
    longitudeText.textContent = Number(place.longitude).toFixed(2);
    timezoneText.textContent = weatherData.timezone;
    weatherCodeText.textContent = current.weather_code;

    applyWeatherTheme(condition.theme);
    weatherDashboard.classList.remove("hidden");
    showStatus("Weather loaded successfully.", "#16a34a");

    syncSavedPlaceWeather(place, current, condition);
  } catch (error) {
    weatherDashboard.classList.add("hidden");
    showStatus(error.message, "#dc2626");
  }
}

function syncSavedPlaceWeather(place, current, condition) {
  const index = state.savedPlaces.findIndex((item) => item.id === place.id);

  if (index !== -1) {
    state.savedPlaces[index] = {
      ...state.savedPlaces[index],
      temperature: `${current.temperature_2m} °C`,
      condition: condition.label,
      icon: condition.icon,
    };

    saveSavedPlaces();
    renderSavedPlaces();
  }
}

function renderSavedPlaces() {
  savedTrack.innerHTML = "";

  if (!state.savedPlaces.length) {
    savedEmpty.style.display = "block";
    return;
  }

  savedEmpty.style.display = "none";

  state.savedPlaces.forEach((place) => {
    const card = document.createElement("article");
    card.className = `saved-place-card ${state.currentPlace?.id === place.id ? "active" : ""}`;
    card.dataset.placeId = place.id;

    card.innerHTML = `
      <button class="saved-remove" data-action="remove" type="button" title="Remove place">×</button>
      <h4>${place.name}</h4>
      <p>${place.region || place.country || ""}</p>
      <div class="saved-summary">
        <span>${place.icon || "📍"} ${place.condition || "Saved"}</span>
        <strong>${place.temperature || "--"}</strong>
      </div>
    `;

    savedTrack.appendChild(card);
  });
}

function addCurrentPlaceToSaved() {
  if (!state.currentPlace || !state.currentWeather) {
    showStatus("Search a valid location first.", "#dc2626");
    return;
  }

  const exists = state.savedPlaces.some((place) => place.id === state.currentPlace.id);

  if (exists) {
    showStatus("This place is already saved.", "#dc2626");
    return;
  }

  const current = state.currentWeather.current;
  const condition = getConditionInfo(current.weather_code, current.wind_speed_10m);

  state.savedPlaces.push({
    ...state.currentPlace,
    temperature: `${current.temperature_2m} °C`,
    condition: condition.label,
    icon: condition.icon,
  });

  saveSavedPlaces();
  renderSavedPlaces();
  showStatus("Place saved successfully.", "#16a34a");
}

function removeSavedPlace(id) {
  state.savedPlaces = state.savedPlaces.filter((place) => place.id !== id);
  saveSavedPlaces();
  renderSavedPlaces();
}

savedTrack.addEventListener("click", async (event) => {
  const removeBtn = event.target.closest("[data-action='remove']");
  const card = event.target.closest(".saved-place-card");

  if (!card) return;

  const placeId = card.dataset.placeId;
  const place = state.savedPlaces.find((item) => item.id === placeId);
  if (!place) return;

  if (removeBtn) {
    removeSavedPlace(placeId);
    return;
  }

  locationInput.value = place.name;
  await loadWeatherForPlace(place);
});

scrollLeftBtn.addEventListener("click", () => {
  savedTrack.scrollBy({ left: -320, behavior: "smooth" });
});

scrollRightBtn.addEventListener("click", () => {
  savedTrack.scrollBy({ left: 320, behavior: "smooth" });
});

savePlaceBtn.addEventListener("click", () => {
  addCurrentPlaceToSaved();
});

refreshBtn.addEventListener("click", async () => {
  if (!state.currentPlace) {
    showStatus("Search a location first.", "#dc2626");
    return;
  }

  await loadWeatherForPlace(state.currentPlace);
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = locationInput.value.trim();

  if (!query) {
    showStatus("Please enter a city or place name.", "#dc2626");
    weatherDashboard.classList.add("hidden");
    return;
  }

  try {
    showStatus("Validating location...", "#2563eb");

    const suggestions = await fetchSuggestions(query);
    state.suggestions = suggestions;
    renderSuggestions();

    const exactMatches = suggestions.filter((place) => {
      const nameMatch = normalizeText(place.name) === normalizeText(query);
      const labelMatch = normalizeText(place.label) === normalizeText(query);
      return nameMatch || labelMatch;
    });

    if (
      state.selectedPlace &&
      (
        normalizeText(state.selectedPlace.name) === normalizeText(query) ||
        normalizeText(state.selectedPlace.label) === normalizeText(query)
      )
    ) {
      clearSuggestions();
      await loadWeatherForPlace(state.selectedPlace);
      return;
    }

    if (exactMatches.length === 1) {
      state.selectedPlace = exactMatches[0];
      clearSuggestions();
      await loadWeatherForPlace(exactMatches[0]);
      return;
    }

    if (suggestions.length === 0) {
      throw new Error("Location not found. Please try a valid city or place name.");
    }

    throw new Error("Please select the correct place from the suggestions to avoid wrong results.");
  } catch (error) {
    weatherDashboard.classList.add("hidden");
    showStatus(error.message, "#dc2626");
  }
});

async function refreshSavedPlacesWeather() {
  if (!state.savedPlaces.length) return;

  const updates = await Promise.allSettled(
    state.savedPlaces.map(async (place) => {
      const weatherData = await fetchWeather(place);
      const current = weatherData.current;
      const condition = getConditionInfo(current.weather_code, current.wind_speed_10m);

      return {
        ...place,
        temperature: `${current.temperature_2m} °C`,
        condition: condition.label,
        icon: condition.icon,
      };
    })
  );

  state.savedPlaces = updates.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return state.savedPlaces[index];
  });

  saveSavedPlaces();
  renderSavedPlaces();
}

async function init() {
  state.savedPlaces = loadSavedPlaces();
  renderSavedPlaces();
  await refreshSavedPlacesWeather();

  locationInput.value = "Nagpur";
  try {
    const suggestions = await fetchSuggestions("Nagpur");
    if (suggestions.length > 0) {
      state.selectedPlace = suggestions[0];
      await loadWeatherForPlace(suggestions[0]);
    }
  } catch (error) {
    showStatus("Unable to load default weather.", "#dc2626");
  }
}

init();