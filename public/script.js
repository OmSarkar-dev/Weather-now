// OpenWeatherMap API Key (sign up at https://openweathermap.org to get your own free API key)
const apiKey = 'b1d13c7c8c8a5b26fca7028606be6bd2'; // Replace with your actual API key

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const loadingElement = document.getElementById('loading');
const weatherInfoElement = document.getElementById('weather-info');
const cityName = document.getElementById('city-name');
const dateElement = document.getElementById('date');
const tempElement = document.getElementById('temp');
const weatherIconElement = document.getElementById('weather-icon'); // Changed variable name
const weatherDesc = document.getElementById('weather-desc');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const pressureElement = document.getElementById('pressure');
const uvIndexElement = document.getElementById('uv-index');
const visibilityElement = document.getElementById('visibility');
const sunriseElement = document.getElementById('sunrise');
const sunsetElement = document.getElementById('sunset'); // Added sunset element
const forecastContainer = document.getElementById('forecast-container');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

// State
let currentUnit = 'celsius';
let currentWeatherData = null;
let forecastData = null;

// Initialize the app
function init() {
    updateDate();
    setupEventListeners();

    // Check if we have a city in localStorage
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        fetchWeatherByCity(lastCity);
    } else {
        getUserLocation();
    }
}

// Current Date
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

// Show loading state
function showLoading() {
    loadingElement.style.display = 'flex'; // Use flex to center spinner and text
    weatherInfoElement.style.display = 'none';
}

// Hide loading state
function hideLoading() {
    loadingElement.style.display = 'none';
    weatherInfoElement.style.display = 'block';
}

// Convert Kelvin to Celsius
function kelvinToCelsius(kelvin) {
    return kelvin - 273.15;
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

// Convert meters to kilometers
function metersToKm(meters) {
    return (meters / 1000).toFixed(1);
}

// Convert seconds to time string (accounting for timezone offset)
function formatTime(timestamp, timezone) {
     const date = new Date((timestamp + timezone) * 1000);
    // Use UTC methods to apply the timezone offset correctly
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 hour (midnight) to 12 AM
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}


// Get Weather Icon URL (using OpenWeatherMap icons)
function getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Fetch Weather Data by City Name
async function fetchWeatherByCity(city) {
    showLoading();
    try {
        // Save the city to localStorage
        localStorage.setItem('lastCity', city);

        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
        );

        if (!currentResponse.ok) {
            throw new Error('City not found. Please try another location.');
        }

        const currentData = await currentResponse.json();
        currentWeatherData = currentData;

        // Fetch forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`
        );

        if (!forecastResponse.ok) {
            throw new Error('Forecast data not available for this location.');
        }

        const forecastDataResponse = await forecastResponse.json();
        forecastData = forecastDataResponse;

        // Fetch UV index (requires separate call with lat/lon)
        const uvResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/uvi?lat=${currentData.coord.lat}&lon=${currentData.coord.lon}&appid=${apiKey}`
        );

        if (uvResponse.ok) {
            const uvData = await uvResponse.json();
            currentData.uvi = uvData.value;
        } else {
             currentData.uvi = null; // Set to null if UV data is not available
        }


        displayWeather(currentData, forecastDataResponse);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fetch Weather Data by Coordinates
async function fetchWeatherByCoords(lat, lon) {
    showLoading();
    try {
        const currentResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );

        if (!currentResponse.ok) {
            throw new Error('Unable to get weather for your location. Please try searching for a city instead.');
        }

        const currentData = await currentResponse.json();
        currentWeatherData = currentData;

        // Save the city to localStorage
        localStorage.setItem('lastCity', currentData.name);


        // Fetch forecast data
        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );

        if (!forecastResponse.ok) {
            throw new Error('Forecast data not available for your location.');
        }

        const forecastDataResponse = await forecastResponse.json();
        forecastData = forecastDataResponse;

        // Fetch UV index
        const uvResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );

         if (uvResponse.ok) {
            const uvData = await uvResponse.json();
            currentData.uvi = uvData.value;
        } else {
             currentData.uvi = null; // Set to null if UV data is not available
        }

        displayWeather(currentData, forecastDataResponse);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display Weather Data
function displayWeather(currentData, forecastData) {
    // Update current weather
    cityName.textContent = currentData.name;
    weatherDesc.textContent = currentData.weather[0].description;

    // Set temperature based on current unit
    updateTemperatureDisplay();

    humidityElement.textContent = `${currentData.main.humidity}%`;
    // OpenWeatherMap wind speed is in m/s, convert to km/h
    windSpeedElement.textContent = `${(currentData.wind.speed * 3.6).toFixed(1)} km/h`;
    pressureElement.textContent = `${currentData.main.pressure} hPa`;
    uvIndexElement.textContent = currentData.uvi !== null ? currentData.uvi.toFixed(1) : 'N/A'; // Handle null UV
    visibilityElement.textContent = `${metersToKm(currentData.visibility)} km`;
    sunriseElement.textContent = formatTime(currentData.sys.sunrise, currentData.timezone);
    sunsetElement.textContent = formatTime(currentData.sys.sunset, currentData.timezone); // Display sunset

    // Weather icon
    weatherIconElement.src = getWeatherIconUrl(currentData.weather[0].icon);
    weatherIconElement.alt = currentData.weather[0].description; // Set alt text

    // Update forecast
    updateForecastDisplay(forecastData);
}

// Update temperature display based on current unit
function updateTemperatureDisplay() {
    if (!currentWeatherData) return;

    if (currentUnit === 'celsius') {
        const tempC = kelvinToCelsius(currentWeatherData.main.temp);
        tempElement.textContent = Math.round(tempC);
        document.querySelector('.degree').textContent = '°C'; // Update degree symbol
    } else {
        const tempC = kelvinToCelsius(currentWeatherData.main.temp);
        const tempF = celsiusToFahrenheit(tempC);
        tempElement.textContent = Math.round(tempF);
        document.querySelector('.degree').textContent = '°F'; // Update degree symbol
    }
}

// Update forecast display
function updateForecastDisplay(forecastData) {
    if (!forecastData) return;

    // Clear previous forecast
    forecastContainer.innerHTML = '';

    // Group forecast by day
    const dailyForecast = {};
    const today = new Date().toLocaleDateString();

    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateStr = date.toLocaleDateString();

        // Skip if it's today or before the current time (to get future 5 days)
        // Find the entry closest to noon (12:00 PM) for a good daily representation
         const hours = date.getHours();
         if (dateStr === today && hours < new Date().getHours()) return;

         const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' }); // Use full date as key to distinguish days

        if (!dailyForecast[dayKey]) {
             // Initialize with the first entry for the day, and track min/max
            dailyForecast[dayKey] = {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                minTemp: kelvinToCelsius(item.main.temp),
                maxTemp: kelvinToCelsius(item.main.temp),
                icon: item.weather[0].icon,
                description: item.weather[0].description,
                // Add a timestamp or hour to help pick the "main" forecast for the day later
                timestamp: item.dt,
                items: [item] // Store all items for the day to potentially pick the closest to noon
            };
        } else {
            // Update min/max temperatures
            const tempC = kelvinToCelsius(item.main.temp);
            dailyForecast[dayKey].minTemp = Math.min(dailyForecast[dayKey].minTemp, tempC);
            dailyForecast[dayKey].maxTemp = Math.max(dailyForecast[dayKey].maxTemp, tempC);
             dailyForecast[dayKey].items.push(item); // Add item to list
        }
    });

     // Filter to get only one entry per day, preferring the one closest to noon
     const processedDailyForecast = {};
     const dayKeys = Object.keys(dailyForecast);

     // Find the index of the first day that is not today
     let firstFutureDayIndex = -1;
     for (let i = 0; i < dayKeys.length; i++) {
         if (new Date(dailyForecast[dayKeys[i]].timestamp * 1000).toLocaleDateString() !== today) {
             firstFutureDayIndex = i;
             break;
         }
     }

     // Process the next 5 unique future days
     const futureDayKeys = dayKeys.slice(firstFutureDayIndex, firstFutureDayIndex + 5);

     futureDayKeys.forEach(dayKey => {
         const dayData = dailyForecast[dayKey];
         let bestItem = null;
         let minTimeDiff = Infinity;

         // Find the forecast item closest to noon (12:00 UTC) for this day
         dayData.items.forEach(item => {
             const itemDate = new Date(item.dt * 1000);
             const itemUTCHours = itemDate.getUTCHours();
             const timeDiff = Math.abs(itemUTCHours - 12); // Difference from 12 UTC

             if (timeDiff < minTimeDiff) {
                 minTimeDiff = timeDiff;
                 bestItem = item;
             }
         });

         if (bestItem) {
              processedDailyForecast[dayKey] = {
                day: dayData.day, // Short day name
                minTemp: dayData.minTemp,
                maxTemp: dayData.maxTemp,
                icon: bestItem.weather[0].icon, // Icon from the best item
                description: bestItem.weather[0].description // Description from the best item
             };
         }
     });


    // Display forecast for the processed 5 days
    Object.values(processedDailyForecast).forEach(dayData => {
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';

        forecastItem.innerHTML = `
            <div class="forecast-day">${dayData.day}</div>
            <img src="${getWeatherIconUrl(dayData.icon)}" alt="${dayData.description}" class="forecast-icon">
            <p class="forecast-desc">${dayData.description}</p>
            <div class="forecast-temp">
                <span class="max">${currentUnit === 'celsius' ? Math.round(dayData.maxTemp) : Math.round(celsiusToFahrenheit(dayData.maxTemp))}°</span>
                <span class="min">${currentUnit === 'celsius' ? Math.round(dayData.minTemp) : Math.round(celsiusToFahrenheit(dayData.minTemp))}°</span>
            </div>
        `;

        forecastContainer.appendChild(forecastItem);
    });
}


// Get User Location
function getUserLocation() {
    showLoading();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                console.log("Geolocation error:", error);
                // Fallback to IP-based location
                fetchIPBasedLocation();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000, // Increased timeout
                maximumAge: 0
            }
        );
    } else {
        // Geolocation not supported, use IP-based location
        fetchIPBasedLocation();
    }
}

// Fallback to IP-based location
async function fetchIPBasedLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('IP location service unavailable');

        const data = await response.json();
        if (data.latitude && data.longitude) {
            fetchWeatherByCoords(data.latitude, data.longitude);
        } else {
            throw new Error('Could not determine your location from IP');
        }
    } catch (error) {
        console.log("IP location error:", error);
        showError("Could not determine your location. Defaulting to London.");
        fetchWeatherByCity('London');
    }
}

// Toggle Temperature Unit
function toggleTemperatureUnit(unit) {
    if (currentUnit === unit) return; // Prevent unnecessary updates

    currentUnit = unit;

    // Update button states
    celsiusBtn.classList.toggle('active', unit === 'celsius');
    fahrenheitBtn.classList.toggle('active', unit === 'fahrenheit');

    // Update displays
    updateTemperatureDisplay();
    if (forecastData) {
        updateForecastDisplay(forecastData);
    }
}

// Show error message
function showError(message) {
    alert(message);
    cityInput.value = ''; // Clear the input on error
    hideLoading(); // Hide loading if it's still showing after an error
}

// Set up event listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherByCity(city);
        } else {
            showError('Please enter a city name');
        }
    });

    locationBtn.addEventListener('click', () => {
        getUserLocation();
    });

    cityInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                fetchWeatherByCity(city);
            }
        }
    });

    celsiusBtn.addEventListener('click', () => toggleTemperatureUnit('celsius'));
    fahrenheitBtn.addEventListener('click', () => toggleTemperatureUnit('fahrenheit'));
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);