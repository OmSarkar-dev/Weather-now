// OpenWeatherMap API Key (sign up at https://openweathermap.org to get your own free API key)
const apiKey = 'b1d13c7c8c8a5b26fca7028606be6bd2'; // Replace with your actual API key

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const loadingElement = document.getElementById('loading');
const weatherInfoElement = document.getElementById('weather-info');
const cityName = document.getElementById('city-name');
const locationBreakdown = document.getElementById('location-breakdown');
const dateElement = document.getElementById('date');
const currentTimeElement = document.getElementById('current-time');
const tempElement = document.getElementById('temp');
const weatherIconElement = document.getElementById('weather-icon');
const weatherDesc = document.getElementById('weather-desc');
const humidityElement = document.getElementById('humidity');
const windSpeedElement = document.getElementById('wind-speed');
const pressureElement = document.getElementById('pressure');
const uvIndexElement = document.getElementById('uv-index');
const visibilityElement = document.getElementById('visibility');
const sunriseElement = document.getElementById('sunrise');
const sunsetElement = document.getElementById('sunset');
const todayForecastContainer = document.getElementById('today-forecast-container');
const forecastContainer = document.getElementById('forecast-container');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');

// State
let currentUnit = 'celsius';
let currentWeatherData = null;
let forecastData = null;
let clockInterval = null;

// Initialize the app
function init() {
    updateDateTime();
    setupEventListeners();
    startClock();

    // Check if we have a city in localStorage
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        fetchWeatherByCity(lastCity);
    } else {
        getUserLocation();
    }
}

// Update Date and Time
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
    
    // Update time
    updateCurrentTime();
}

// Update current time
function updateCurrentTime() {
    const now = new Date();
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    currentTimeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Start clock
function startClock() {
    // Clear any existing interval
    if (clockInterval) clearInterval(clockInterval);
    
    // Update time immediately
    updateCurrentTime();
    
    // Set interval to update time every minute
    clockInterval = setInterval(updateCurrentTime, 60000);
}

// Show loading state
function showLoading() {
    loadingElement.style.display = 'block';
    weatherInfoElement.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Hide loading state
function hideLoading() {
    loadingElement.style.display = 'none';
    weatherInfoElement.style.display = 'block';
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    loadingElement.style.display = 'none';
    weatherInfoElement.style.display = 'none';
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

// Format hour from timestamp
function formatHour(timestamp, timezone) {
    const date = new Date((timestamp + timezone) * 1000);
    const hours = date.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours} ${ampm}`;
}

// Get Weather Icon URL (using OpenWeatherMap icons)
function getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Fetch location details using reverse geocoding
async function fetchLocationDetails(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
        );
        
        if (!response.ok) {
            throw new Error('Unable to fetch location details');
        }
        
        const data = await response.json();
        if (data && data.length > 0) {
            const location = data[0];
            return {
                country: location.country || '',
                state: location.state || '',
                city: location.name || ''
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching location details:', error);
        return null;
    }
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

        // Fetch location details
        const locationDetails = await fetchLocationDetails(currentData.coord.lat, currentData.coord.lon);

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

        displayWeather(currentData, forecastDataResponse, locationDetails);
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

        // Fetch location details
        const locationDetails = await fetchLocationDetails(lat, lon);

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

        displayWeather(currentData, forecastDataResponse, locationDetails);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Display Weather Data
function displayWeather(currentData, forecastData, locationDetails) {
    // Update current weather
    cityName.textContent = currentData.name;
    
    // Update location breakdown
    if (locationDetails) {
        const parts = [];
        if (locationDetails.country) parts.push(locationDetails.country);
        if (locationDetails.state) parts.push(locationDetails.state);
        if (locationDetails.city && locationDetails.city !== currentData.name) parts.push(locationDetails.city);
        
        locationBreakdown.textContent = parts.join(' - ');
    } else {
        locationBreakdown.textContent = currentData.sys.country || '';
    }
    
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

    // Update today's forecast
    updateTodayForecastDisplay(forecastData);

    // Update 5-day forecast
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

// Update today's forecast display
function updateTodayForecastDisplay(forecastData) {
    if (!forecastData) return;

    // Clear previous forecast
    todayForecastContainer.innerHTML = '';

    // Get today's date
    const today = new Date().setHours(0, 0, 0, 0);
    
    // Filter forecast items for today
    const todayItems = forecastData.list.filter(item => {
        const itemDate = new Date(item.dt * 1000).setHours(0, 0, 0, 0);
        return itemDate === today;
    });

    // If no items for today, get the earliest items from tomorrow
    const itemsToShow = todayItems.length > 0 ? todayItems : forecastData.list.slice(0, 8);

    // Display hourly forecast
    itemsToShow.forEach(item => {
        const forecastItem = document.createElement('div');
        forecastItem.className = 'today-forecast-item';

        const tempValue = currentUnit === 'celsius' 
            ? Math.round(kelvinToCelsius(item.main.temp)) 
            : Math.round(celsiusToFahrenheit(kelvinToCelsius(item.main.temp)));

        forecastItem.innerHTML = `
            <div class="today-forecast-time">
                <i class="fa-regular fa-clock"></i>
                ${formatHour(item.dt, forecastData.city.timezone)}
            </div>
            <div class="today-forecast-icon">
                <img src="${getWeatherIconUrl(item.weather[0].icon)}" alt="${item.weather[0].description}">
            </div>
            <div class="today-forecast-temp">${tempValue}°</div>
        `;

        todayForecastContainer.appendChild(forecastItem);
    });
}

// Update 5-day forecast display
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

        // Skip if it's today (we already show today's forecast separately)
        if (dateStr === today) return;

        const dayKey = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric' 
        });

        if (!dailyForecast[dayKey]) {
            // Initialize with the first entry for the day, and track min/max
            dailyForecast[dayKey] = {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                minTemp: kelvinToCelsius(item.main.temp),
                maxTemp: kelvinToCelsius(item.main.temp),
                icon: item.weather[0].icon,
                description: item.weather[0].description,
                timestamp: item.dt,
                items: [item]
            };
        } else {
            // Update min/max temperatures
            const tempC = kelvinToCelsius(item.main.temp);
            dailyForecast[dayKey].minTemp = Math.min(dailyForecast[dayKey].minTemp, tempC);
            dailyForecast[dayKey].maxTemp = Math.max(dailyForecast[dayKey].maxTemp, tempC);
            dailyForecast[dayKey].items.push(item);
        }
    });

    // Process to get one entry per day
    const processedDailyForecast = {};
    const dayKeys = Object.keys(dailyForecast);

    // Process the next 5 unique days
    const futureDayKeys = dayKeys.slice(0, 5);

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
                day: dayData.day,
                minTemp: dayData.minTemp,
                maxTemp: dayData.maxTemp,
                icon: bestItem.weather[0].icon,
                description: bestItem.weather[0].description
            };
        }
    });

    // Display forecast for the processed days
    Object.values(processedDailyForecast).forEach(dayData => {
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';

        const maxTemp = currentUnit === 'celsius' 
            ? Math.round(dayData.maxTemp) 
            : Math.round(celsiusToFahrenheit(dayData.maxTemp));
            
        const minTemp = currentUnit === 'celsius' 
            ? Math.round(dayData.minTemp) 
            : Math.round(celsiusToFahrenheit(dayData.minTemp));

        forecastItem.innerHTML = `
            <div class="forecast-day">
                <i class="fa-regular fa-calendar-day"></i>
                ${dayData.day}
            </div>
            <div class="forecast-icon">
                <img src="${getWeatherIconUrl(dayData.icon)}" alt="${dayData.description}">
            </div>
            <p class="forecast-desc">${dayData.description}</p>
            <div class="forecast-temp">
                <span class="max">${maxTemp}°</span>
                <span class="min">${minTemp}°</span>
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
                timeout: 10000,
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
        updateTodayForecastDisplay(forecastData);
        updateForecastDisplay(forecastData);
    }
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

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
    if (clockInterval) clearInterval(clockInterval);
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
