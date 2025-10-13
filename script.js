/* WeatherPro - Professional Weather Dashboard JavaScript */

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://api.weatherapi.com/v1',
    apiKey: '0474de8f1d5641bca6d152215251310',
    endpoints: {
        current: '/current.json',
        forecast: '/forecast.json',
        search: '/search.json',
        astronomy: '/astronomy.json',
        marine: '/marine.json',
        ip: '/ip.json'
    }
};

// Global State
let currentLocation = null;
let weatherData = null;
let forecastData = null;

// DOM Elements
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    searchInput: document.getElementById('locationSearch'),
    searchBtn: document.getElementById('searchBtn'),
    currentLocationBtn: document.getElementById('currentLocationBtn'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    hamburger: document.getElementById('hamburger'),
    navMenu: document.getElementById('navMenu'),
    errorModal: document.getElementById('errorModal'),
    alertsSection: document.getElementById('alerts')
};

// Utility Functions
function showLoading() {
    elements.loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingScreen.classList.add('hidden');
}

function showError(message) {
    const modal = elements.errorModal;
    document.getElementById('errorMessage').textContent = message;
    modal.classList.add('active');
}

function closeErrorModal() {
    elements.errorModal.classList.remove('active');
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function getAQICategory(aqi) {
    if (aqi <= 50) return { name: 'Good', class: 'aqi-good' };
    if (aqi <= 100) return { name: 'Moderate', class: 'aqi-moderate' };
    if (aqi <= 150) return { name: 'Unhealthy for Sensitive', class: 'aqi-unhealthy-sensitive' };
    if (aqi <= 200) return { name: 'Unhealthy', class: 'aqi-unhealthy' };
    if (aqi <= 300) return { name: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
    return { name: 'Hazardous', class: 'aqi-hazardous' };
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// API Functions
function buildApiUrl(endpoint, params) {
    const url = new URL(API_CONFIG.baseUrl + endpoint);
    url.searchParams.append('key', API_CONFIG.apiKey);
    Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
    });
    return url.toString();
}

async function fetchFromApi(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
}

async function getForecast(location, days = 3) {
    return await fetchFromApi(buildApiUrl(API_CONFIG.endpoints.forecast, {
        q: location, days, aqi: 'yes', alerts: 'yes'
    }));
}

async function searchLocations(query) {
    return await fetchFromApi(buildApiUrl(API_CONFIG.endpoints.search, { q: query }));
}

async function getAstronomy(location, date) {
    return await fetchFromApi(buildApiUrl(API_CONFIG.endpoints.astronomy, { q: location, dt: date }));
}

async function getMarineWeather(location, days = 3) {
    return await fetchFromApi(buildApiUrl(API_CONFIG.endpoints.marine, { q: location, days }));
}

async function getIpLocation() {
    return await fetchFromApi(buildApiUrl(API_CONFIG.endpoints.ip, { q: 'auto:ip' }));
}

// Display Functions
function displayCurrentWeather(data) {
    const { location, current } = data;
    
    document.getElementById('locationName').innerHTML = `
        <span class="material-icons">location_on</span>
        <span>${location.name}, ${location.country}</span>
    `;
    document.getElementById('localTime').textContent = formatDateTime(location.localtime);
    document.getElementById('currentTemp').textContent = Math.round(current.temp_c);
    document.getElementById('feelsLike').textContent = Math.round(current.feelslike_c);
    document.getElementById('weatherCondition').textContent = current.condition.text;
    
    const weatherIcon = document.getElementById('weatherIcon');
    weatherIcon.src = `https:${current.condition.icon}`;
    weatherIcon.alt = current.condition.text;
    
    document.getElementById('humidity').textContent = `${current.humidity}%`;
    document.getElementById('windSpeed').textContent = `${current.wind_kph} km/h`;
    document.getElementById('pressure').textContent = `${current.pressure_mb} mb`;
    document.getElementById('visibility').textContent = `${current.vis_km} km`;
    document.getElementById('uvIndex').textContent = current.uv;
    document.getElementById('cloudCover').textContent = `${current.cloud}%`;
    
    if (current.air_quality) displayAirQuality(current.air_quality);
}

function displayAirQuality(airQuality) {
    const aqiValue = Math.round(airQuality['us-epa-index'] * 50 || airQuality.pm2_5 || 0);
    const aqiCategory = getAQICategory(aqiValue);
    
    document.getElementById('aqiValue').textContent = aqiValue;
    document.getElementById('aqiValue').className = `aqi-value ${aqiCategory.class}`;
    document.getElementById('aqiCategory').textContent = aqiCategory.name;
    document.getElementById('aqiCategory').className = `aqi-category ${aqiCategory.class}`;
    
    document.getElementById('co').textContent = airQuality.co?.toFixed(1) || '--';
    document.getElementById('o3').textContent = airQuality.o3?.toFixed(1) || '--';
    document.getElementById('no2').textContent = airQuality.no2?.toFixed(1) || '--';
    document.getElementById('so2').textContent = airQuality.so2?.toFixed(1) || '--';
    document.getElementById('pm2_5').textContent = airQuality.pm2_5?.toFixed(1) || '--';
    document.getElementById('pm10').textContent = airQuality.pm10?.toFixed(1) || '--';
}

function displayHourlyForecast(data) {
    const container = document.getElementById('hourlyForecast');
    container.innerHTML = '';
    
    const hours = data.forecast.forecastday[0].hour;
    const currentHour = new Date().getHours();
    const upcomingHours = [...hours.slice(currentHour), ...(data.forecast.forecastday[1]?.hour || [])].slice(0, 24);
    
    upcomingHours.forEach(hour => {
        const time = new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        container.innerHTML += `
            <div class="hourly-card">
                <div class="hourly-time">${time}</div>
                <img src="https:${hour.condition.icon}" alt="${hour.condition.text}" class="hourly-icon">
                <div class="hourly-temp">${Math.round(hour.temp_c)}°</div>
                <div class="hourly-condition">${hour.condition.text}</div>
            </div>
        `;
    });
}

function displayForecast(data) {
    const container = document.getElementById('threeDayForecast');
    container.innerHTML = '';
    
    data.forecast.forecastday.forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        container.innerHTML += `
            <div class="forecast-card">
                <div class="forecast-date">${dateString}</div>
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-main">
                    <div class="forecast-temps">
                        <div class="forecast-temp-max">${Math.round(day.day.maxtemp_c)}°C</div>
                        <div class="forecast-temp-min">${Math.round(day.day.mintemp_c)}°C</div>
                    </div>
                    <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" class="forecast-icon">
                </div>
                <div class="forecast-condition">${day.day.condition.text}</div>
                <div class="forecast-details">
                    <div class="forecast-detail-item">
                        <span class="forecast-detail-label">Rain Chance</span>
                        <span class="forecast-detail-value">${day.day.daily_chance_of_rain}%</span>
                    </div>
                    <div class="forecast-detail-item">
                        <span class="forecast-detail-label">Humidity</span>
                        <span class="forecast-detail-value">${day.day.avghumidity}%</span>
                    </div>
                    <div class="forecast-detail-item">
                        <span class="forecast-detail-label">Max Wind</span>
                        <span class="forecast-detail-value">${day.day.maxwind_kph} km/h</span>
                    </div>
                    <div class="forecast-detail-item">
                        <span class="forecast-detail-label">UV Index</span>
                        <span class="forecast-detail-value">${day.day.uv}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

function displayAlerts(data) {
    const container = elements.alertsSection;
    container.innerHTML = '';
    
    if (data.alerts?.alert?.length > 0) {
        data.alerts.alert.forEach(alert => {
            container.innerHTML += `
                <div class="alert-card" role="alert">
                    <div class="alert-header">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3 class="alert-title">${alert.headline}</h3>
                    </div>
                    <p class="alert-description">${alert.desc}</p>
                </div>
            `;
        });
    }
}

async function displayAstronomy(location) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const data = await getAstronomy(location, today);
        const astro = data.astronomy.astro;
        
        document.getElementById('sunrise').textContent = astro.sunrise;
        document.getElementById('sunset').textContent = astro.sunset;
        document.getElementById('moonrise').textContent = astro.moonrise;
        document.getElementById('moonset').textContent = astro.moonset;
        document.getElementById('moonPhase').textContent = astro.moon_phase;
        document.getElementById('moonIllumination').textContent = `${astro.moon_illumination}%`;
    } catch (error) {
        console.error('Astronomy error:', error);
    }
}

async function displayMarineWeather(location) {
    try {
        const data = await getMarineWeather(location);
        const container = document.getElementById('marineWeather');
        container.innerHTML = '';
        
        data.forecast.forecastday.forEach(day => {
            const dateString = new Date(day.date).toLocaleDateString('en-US', { 
                weekday: 'short', month: 'short', day: 'numeric' 
            });
            
            container.innerHTML += `
                <div class="marine-card">
                    <div class="marine-date">${dateString}</div>
                    <div class="marine-details">
                        <div class="marine-item">
                            <span class="marine-label">Max Temp</span>
                            <span class="marine-value">${Math.round(day.day.maxtemp_c)}°C</span>
                        </div>
                        <div class="marine-item">
                            <span class="marine-label">Min Temp</span>
                            <span class="marine-value">${Math.round(day.day.mintemp_c)}°C</span>
                        </div>
                        <div class="marine-item">
                            <span class="marine-label">Max Wind</span>
                            <span class="marine-value">${day.day.maxwind_kph} km/h</span>
                        </div>
                        <div class="marine-item">
                            <span class="marine-label">Visibility</span>
                            <span class="marine-value">${day.day.avgvis_km} km</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        document.getElementById('marineWeather').innerHTML = 
            '<p style="color: var(--text-muted); text-align: center;">Marine weather data not available for this location.</p>';
    }
}

async function loadWeatherData(location) {
    try {
        showLoading();
        const data = await getForecast(location, 3);
        
        displayCurrentWeather(data);
        displayHourlyForecast(data);
        displayForecast(data);
        displayAlerts(data);
        await displayAstronomy(location);
        await displayMarineWeather(`${data.location.lat},${data.location.lon}`);
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Failed to load weather data. Please try again.');
        console.error(error);
    }
}

// Search Functions
async function handleLocationSearch(query) {
    if (query.length < 2) {
        elements.searchSuggestions.innerHTML = '';
        elements.searchSuggestions.classList.remove('active');
        return;
    }
    
    try {
        const results = await searchLocations(query);
        displaySearchSuggestions(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displaySearchSuggestions(results) {
    const container = elements.searchSuggestions;
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="suggestion-item">No results found</div>';
        container.classList.add('active');
        return;
    }
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = `${result.name}, ${result.region}, ${result.country}`;
        item.onclick = () => selectLocation(result);
        container.appendChild(item);
    });
    
    container.classList.add('active');
}

function selectLocation(location) {
    elements.searchInput.value = `${location.name}, ${location.country}`;
    elements.searchSuggestions.classList.remove('active');
    loadWeatherData(`${location.lat},${location.lon}`);
}

async function getCurrentLocation() {
    if ('geolocation' in navigator) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await loadWeatherData(`${pos.coords.latitude},${pos.coords.longitude}`);
            },
            async () => {
                try {
                    const ipLoc = await getIpLocation();
                    await loadWeatherData(`${ipLoc.lat},${ipLoc.lon}`);
                } catch {
                    hideLoading();
                    showError('Unable to get your location. Please search manually.');
                }
            }
        );
    } else {
        try {
            showLoading();
            const ipLoc = await getIpLocation();
            await loadWeatherData(`${ipLoc.lat},${ipLoc.lon}`);
        } catch {
            hideLoading();
            showError('Geolocation not supported. Please search manually.');
        }
    }
}

// Event Listeners
function initEventListeners() {
    elements.searchInput.addEventListener('input', debounce((e) => {
        handleLocationSearch(e.target.value);
    }, 300));
    
    elements.searchBtn.addEventListener('click', () => {
        const query = elements.searchInput.value.trim();
        if (query) {
            elements.searchSuggestions.classList.remove('active');
            loadWeatherData(query);
        }
    });
    
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && elements.searchInput.value.trim()) {
            elements.searchSuggestions.classList.remove('active');
            loadWeatherData(elements.searchInput.value.trim());
        }
    });
    
    elements.currentLocationBtn.addEventListener('click', getCurrentLocation);
    
    elements.hamburger.addEventListener('click', () => {
        elements.navMenu.classList.toggle('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                elements.navMenu.classList.remove('active');
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
    
    document.querySelector('.close')?.addEventListener('click', closeErrorModal);
    elements.errorModal.addEventListener('click', (e) => {
        if (e.target === elements.errorModal) closeErrorModal();
    });
    
    document.addEventListener('click', (e) => {
        if (!elements.searchInput.contains(e.target) && !elements.searchSuggestions.contains(e.target)) {
            elements.searchSuggestions.classList.remove('active');
        }
    });
}

// Initialize App
async function initApp() {
    initEventListeners();
    await getCurrentLocation();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}