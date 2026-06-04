const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city-input");
const statusMessage = document.getElementById("status-message");
const weatherResult = document.getElementById("weather-result");

const cityName = document.getElementById("city-name");
const regionName = document.getElementById("region-name");
const conditionBadge = document.getElementById("condition-badge");
const conditionText = document.getElementById("condition-text");

const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");

const latitudeText = document.getElementById("latitude");
const longitudeText = document.getElementById("longitude");
const timezoneText = document.getElementById("timezone");
const updatedTime = document.getElementById("updated-time");

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

async function fetchCoordinates(city) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}` +
    `&count=1&language=en&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch location data.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please enter a valid city name.");
  }

  return data.results[0];
}

async function fetchWeather(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
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

function renderWeather(locationData, weatherData) {
  const current = weatherData.current;

  cityName.textContent = locationData.name;
  regionName.textContent =
    `${locationData.admin1 || ""}${locationData.admin1 ? ", " : ""}${locationData.country || ""}`;

  const condition = getWeatherDescription(current.weather_code);
  conditionBadge.textContent = condition;
  conditionText.textContent = condition;

  temperature.textContent = `${current.temperature_2m} °C`;
  humidity.textContent = `${current.relative_humidity_2m} %`;
  windSpeed.textContent = `${current.wind_speed_10m} km/h`;

  latitudeText.textContent = locationData.latitude.toFixed(2);
  longitudeText.textContent = locationData.longitude.toFixed(2);
  timezoneText.textContent = weatherData.timezone;
  updatedTime.textContent = current.time;

  weatherResult.classList.remove("hidden");
}

async function handleSearch(city) {
  try {
    statusMessage.style.color = "#2563eb";
    statusMessage.textContent = "Loading weather data...";
    weatherResult.classList.add("hidden");

    const locationData = await fetchCoordinates(city);
    const weatherData = await fetchWeather(locationData.latitude, locationData.longitude);

    renderWeather(locationData, weatherData);

    statusMessage.style.color = "#16a34a";
    statusMessage.textContent = "Weather data loaded successfully.";
  } catch (error) {
    weatherResult.classList.add("hidden");
    statusMessage.style.color = "#dc2626";
    statusMessage.textContent = error.message;
  }
}

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    statusMessage.style.color = "#dc2626";
    statusMessage.textContent = "Please enter a city name.";
    weatherResult.classList.add("hidden");
    return;
  }

  await handleSearch(city);
});

window.addEventListener("load", () => {
  handleSearch("Nagpur");
});