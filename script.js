/**
 * Weather & Air Quality App Logic (Final Complete Version)
 * - 이중 변환 방지 (units=metric 고정)
 * - 검색 자동완성 & 디바운싱 적용
 * - 다국어 지원 (KR/EN) 및 도시 이름 번역
 * - 고급 차트 (이모지 X축, 커스텀 툴팁, Y축 스케일 최적화)
 * - 모바일/PC 반응형 레이아웃 대응
 */

const API_KEY = "6a950f9bdecf3a972a3b835c09b8bde1"; 

const state = {
    city: 'Seoul',
    unit: 'metric', // metric: 섭씨, imperial: 화씨
    lang: 'kr',     // 기본 언어: 한국어
    chartInstance: null
};

// 번역 사전
const translations = {
    kr: {
        placeholder: "도시 검색 (예: Seoul)",
        world: "세계 날씨",
        humidity: "습도",
        wind: "풍속",
        chart: "시간별 기온",
        air: "대기질",
        forecast: "주간 예보",
        pm10: "미세먼지 (PM10)",
        pm25: "초미세먼지 (PM2.5)",
        loading: "세계 날씨 로딩 중...",
        view: "온도",
        // 대기질 상태
        good: "좋음", normal: "보통", caution: "주의", bad: "나쁨", veryBad: "매우 나쁨",
        goodDesc: "공기가 맑아요!<br>산책하기 좋은 날입니다.", 
        normalDesc: "무난한 날씨예요.", 
        cautionDesc: "마스크를 챙기세요.", 
        badDesc: "외출을 자제하세요.", 
        veryBadDesc: "위험! 나가지 마세요.",
        // 세계 도시 이름 (키: 영어이름, 값: 한국어이름)
        "New York": "뉴욕", "London": "런던", "Tokyo": "도쿄", "Paris": "파리",
        "Sydney": "시드니", "Dubai": "두바이", "Singapore": "싱가포르", "Berlin": "베를린"
    },
    en: {
        placeholder: "Search City (e.g., Seoul)",
        world: "World Weather",
        humidity: "Humidity",
        wind: "Wind Speed",
        chart: "Hourly Temperature",
        air: "Air Quality",
        forecast: "Weekly Forecast",
        pm10: "Fine Dust (PM10)",
        pm25: "Ultra-fine Dust (PM2.5)",
        loading: "Loading...",
        view: "Temp",
        // Air Quality Status
        good: "Good", normal: "Fair", caution: "Moderate", bad: "Poor", veryBad: "Very Poor",
        goodDesc: "Air is clean!<br>Good for a walk.", 
        normalDesc: "It's okay.", 
        cautionDesc: "Wear a mask.", 
        badDesc: "Avoid going out.", 
        veryBadDesc: "Danger! Stay inside.",
        // 영어는 그대로 둠
        "New York": "New York", "London": "London", "Tokyo": "Tokyo", "Paris": "Paris",
        "Sydney": "Sydney", "Dubai": "Dubai", "Singapore": "Singapore", "Berlin": "Berlin"
    }
};

// DOM 요소 선택
const els = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    langToggle: document.getElementById('langToggle'),
    recentSearchContainer: document.getElementById('recentSearchContainer'),
    suggestionList: document.getElementById('suggestionList'),
    
    // UI 텍스트 요소들
    cityName: document.getElementById('cityName'),
    mainTemp: document.getElementById('mainTemp'),
    weatherDesc: document.getElementById('weatherDesc'),
    weatherIcon: document.getElementById('weatherIcon'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    forecastContainer: document.getElementById('forecastContainer'),
    worldCities: document.getElementById('worldCities'),
    
    // 대기질 관련
    aqiScore: document.getElementById('aqiScore'),
    aqiDesc: document.getElementById('aqiDesc'),
    aqiIndicator: document.getElementById('aqiIndicator'),
    pm10: document.getElementById('pm10'),
    pm25: document.getElementById('pm25'),

    // 번역 대상 라벨들
    labelWorld: document.getElementById('labelWorld'),
    labelHumidity: document.getElementById('labelHumidity'),
    labelWind: document.getElementById('labelWind'),
    labelChart: document.getElementById('labelChart'),
    labelAir: document.getElementById('labelAir'),
    labelForecast: document.getElementById('labelForecast'),
    labelPm10: document.getElementById('labelPm10'),
    labelPm25: document.getElementById('labelPm25'),

    // 토글 버튼 텍스트
    unitC: document.getElementById('unitC'),
    unitF: document.getElementById('unitF'),
    langEn: document.getElementById('langEn'),
    langKo: document.getElementById('langKo'),
};

function init() {
    renderRecentSearches();
    updateUnitUI();
    updateLanguageUI();
    fetchWeather('Seoul');
    renderWorldCities();
    setupEventListeners();
}

// [유틸] 국가 코드 변환
function getCountryName(code) {
    if (!code) return '';
    try {
        const regionNames = new Intl.DisplayNames([state.lang === 'kr' ? 'ko' : 'en'], { type: 'region' });
        return regionNames.of(code);
    } catch (e) { return code; }
}

// --- 1. 날씨 데이터 가져오기 (도시 이름) ---
async function fetchWeather(city) {
    try {
        const safeCity = encodeURIComponent(city);
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${safeCity}&appid=${API_KEY}&units=metric&lang=${state.lang}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("도시를 찾을 수 없습니다.");
        
        const data = await response.json();
        renderWeather(data);
        saveRecentSearch(data.name);

        const { lat, lon } = data.coord;
        fetchAirQuality(lat, lon);
        fetchForecast(lat, lon); 

    } catch (error) {
        console.error(error);
        const msg = state.lang === 'kr' ? "도시를 찾을 수 없습니다." : "City not found.";
        alert(msg); 
    }
}

// --- 2. 날씨 데이터 가져오기 (좌표) ---
async function fetchWeatherByCoords(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${state.lang}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("위치 실패");
        
        const data = await response.json();
        renderWeather(data);
        saveRecentSearch(data.name);
        
        fetchAirQuality(lat, lon);
        fetchForecast(lat, lon);

    } catch (error) {
        console.error(error);
        alert("위치 정보를 불러올 수 없습니다.");
    }
}

// --- 3. 대기질 API ---
async function fetchAirQuality(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        renderAirQuality(data.list[0]);
    } catch (error) {
        if(els.aqiDesc) els.aqiDesc.textContent = "-";
    }
}

// --- 4. 예보 API ---
async function fetchForecast(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${state.lang}`;
        const response = await fetch(url);
        const data = await response.json();
        
        renderForecast(data.list);
        updateChart(data.list); // 차트 업데이트
    } catch (error) {
        console.error("예보 로드 실패");
    }
}

// --- 5. 렌더링 함수들 ---

function renderWeather(data) {
    state.city = data.name;
    
    // 국가 이름 번역
    const countryCode = data.sys.country;
    const countryName = countryCode ? `, ${getCountryName(countryCode)}` : '';
    els.cityName.textContent = `${data.name}${countryName}`;
    
    els.weatherDesc.textContent = data.weather[0].description;
    els.humidity.textContent = `${data.main.humidity}%`;
    
    // 온도 및 풍속 변환 로직
    let temp = data.main.temp;
    let speed = data.wind.speed;
    let speedUnit = 'm/s';

    if (state.unit === 'imperial') {
        temp = (temp * 9/5) + 32;
        speed = speed * 2.23694;
        speedUnit = 'mph';
    }

    els.mainTemp.textContent = `${Math.round(temp)}°`;
    els.windSpeed.textContent = `${parseFloat(speed).toFixed(1)} ${speedUnit}`;
    
    const iconClass = mapWeatherIcon(data.weather[0].main);
    els.weatherIcon.className = `ph-fill ${iconClass} text-6xl text-toss-blue`;
    
    // 배경색 변경
}

function renderAirQuality(data) {
    const t = translations[state.lang];
    const aqi = data.main.aqi; 
    const pm10 = data.components.pm10;
    const pm2_5 = data.components.pm2_5;

    let status = { text: '-', color: '', border: '', desc: '' };
    
    switch(aqi) {
        case 1: status = { text: t.good, color: 'text-toss-blue', border: 'border-toss-blue', desc: t.goodDesc }; break;
        case 2: status = { text: t.normal, color: 'text-green-500', border: 'border-green-500', desc: t.normalDesc }; break;
        case 3: status = { text: t.caution, color: 'text-yellow-500', border: 'border-yellow-500', desc: t.cautionDesc }; break;
        case 4: status = { text: t.bad, color: 'text-orange-500', border: 'border-orange-500', desc: t.badDesc }; break;
        case 5: status = { text: t.veryBad, color: 'text-red-500', border: 'border-red-500', desc: t.veryBadDesc }; break;
        default: status = { text: '-', color: 'text-gray-400', border: 'border-gray-300', desc: '-' };
    }

    if(els.aqiScore) {
        els.aqiScore.textContent = status.text;
        els.aqiScore.className = `text-4xl font-bold ${status.color}`;
    }
    if(els.aqiIndicator) {
        els.aqiIndicator.className = `w-32 h-32 rounded-full border-[8px] ${status.border} flex items-center justify-center mb-4 relative transition-colors duration-300`;
    }
    if(els.aqiDesc) els.aqiDesc.innerHTML = status.desc; 
    if(els.pm10) els.pm10.textContent = `${Math.round(pm10)} µg/m³`;
    if(els.pm25) els.pm25.textContent = `${Math.round(pm2_5)} µg/m³`;
}

function renderForecast(list) {
    const dailyMap = {};
    list.forEach(item => {
        const dateKey = item.dt_txt.split(' ')[0];
        if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = {
                dt: item.dt,
                min: item.main.temp_min,
                max: item.main.temp_max,
                weather: item.weather[0].main,
                txt: item.dt_txt
            };
        } else {
            dailyMap[dateKey].min = Math.min(dailyMap[dateKey].min, item.main.temp_min);
            dailyMap[dateKey].max = Math.max(dailyMap[dateKey].max, item.main.temp_max);
            if (item.dt_txt.includes('12:00') || item.dt_txt.includes('15:00')) {
                dailyMap[dateKey].weather = item.weather[0].main;
            }
        }
    });

    const dailyData = Object.values(dailyMap).slice(0, 5);

    els.forecastContainer.innerHTML = dailyData.map(item => {
        const date = new Date(item.dt * 1000);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateText = `${month}/${day}`;

        let min = item.min;
        let max = item.max;
        if (state.unit === 'imperial') {
            min = (min * 9/5) + 32;
            max = (max * 9/5) + 32;
        }

        const icon = mapWeatherIcon(item.weather);
        
        return `
            <div class="bg-toss-bg p-4 rounded-2xl flex flex-col items-center justify-center gap-2 card-hover">
                <span class="text-gray-500 text-sm font-medium">${dateText}</span>
                <i class="ph-fill ${icon} text-3xl text-toss-blue my-2"></i>
                <span class="font-bold text-toss-text text-sm">
                    ${Math.round(min)}° / ${Math.round(max)}°
                </span>
            </div>
        `;
    }).join('');
}

// --- 6. 자동완성 기능 ---
let timer;
function handleInput() {
    const query = els.cityInput.value.trim();
    if (query.length < 2) {
        els.suggestionList.classList.add('hidden');
        return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => { fetchCitySuggestions(query); }, 300);
}

async function fetchCitySuggestions(query) {
    try {
        const safeQuery = encodeURIComponent(query);
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${safeQuery}&limit=5&appid=${API_KEY}`;
        const response = await fetch(url);
        const cities = await response.json();
        renderSuggestions(cities);
    } catch (error) { console.error(error); }
}
//test
function renderSuggestions(cities) {
    if (cities.length === 0) {
        const noResultText = state.lang === 'kr' ? '검색 결과가 없습니다.<br>영어로 검색해보세요.' : 'No results found.<br>Try searching in English.';
        els.suggestionList.innerHTML = `<li class="px-6 py-4 text-center text-sm text-gray-400 cursor-default">${noResultText}</li>`;
        els.suggestionList.classList.remove('hidden');
        return;
    }

    els.suggestionList.innerHTML = cities.map(city => {
        const countryName = getCountryName(city.country);
        let displayName = city.name;
        if (state.lang === 'kr' && city.local_names && city.local_names.ko) {
            displayName = city.local_names.ko;
        }
        const stateInfo = city.state ? `, ${city.state}` : ''; 
        
        return `
            <li class="px-6 py-3 hover:bg-toss-bg cursor-pointer transition-colors flex justify-between items-center"
                onclick="selectCity('${displayName}', ${city.lat}, ${city.lon})">
                <span class="font-medium text-toss-text">${displayName}</span>
                <span class="text-sm text-gray-400">${countryName}${stateInfo}</span>
            </li>
        `;
    }).join('');
    els.suggestionList.classList.remove('hidden');
}

function selectCity(name, lat, lon) {
    els.cityInput.value = name;
    els.suggestionList.classList.add('hidden');
    fetchWeatherByCoords(lat, lon);
}

// --- 7. 유틸리티 및 기타 기능 ---

function saveRecentSearch(city) {
    let searches = JSON.parse(localStorage.getItem('recentCities')) || [];
    searches = searches.filter(item => item.toLowerCase() !== city.toLowerCase());
    searches.unshift(city);
    if (searches.length > 5) searches = searches.slice(0, 5);
    localStorage.setItem('recentCities', JSON.stringify(searches));
    renderRecentSearches();
}

function renderRecentSearches() {
    const searches = JSON.parse(localStorage.getItem('recentCities')) || [];
    els.recentSearchContainer.innerHTML = searches.map(city => `
        <button onclick="fetchWeather('${city}')" 
                class="px-3 py-1 bg-white rounded-full text-xs font-medium text-toss-gray border border-gray-200 hover:border-toss-blue hover:text-toss-blue transition-colors whitespace-nowrap">
            ${city}
        </button>
    `).join('');
}

function handleLocationClick() {
    if (!navigator.geolocation) return alert("위치 미지원 브라우저");
    els.cityInput.value = state.lang === 'kr' ? "정밀 위치 확인 중..." : "Locating...";
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            els.cityInput.value = "";
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        () => { alert("위치 권한이 필요합니다."); els.cityInput.value = ""; },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function mapWeatherIcon(weatherMain) {
    switch (weatherMain.toLowerCase()) {
        case 'clear': return 'ph-sun';
        case 'clouds': return 'ph-cloud';
        case 'rain': return 'ph-cloud-rain';
        case 'snow': return 'ph-snowflake';
        case 'thunderstorm': return 'ph-cloud-lightning';
        case 'drizzle': return 'ph-cloud-drizzle';
        case 'mist': case 'haze': case 'fog': return 'ph-cloud-fog';
        default: return 'ph-cloud-sun';
    }
}

function getWeatherEmoji(weatherMain) {
    switch (weatherMain.toLowerCase()) {
        case 'clear': return '☀️';
        case 'clouds': return '☁️';
        case 'rain': return '🌧️';
        case 'snow': return '❄️';
        case 'thunderstorm': return '⚡';
        case 'drizzle': return '🌦️';
        case 'mist': case 'haze': case 'fog': return '🌫️';
        default: return '🌡️';
    }
}

function toggleUnit() {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    updateUnitUI();
    fetchWeather(state.city); 
    renderWorldCities();
}

function updateUnitUI() {
    if (state.unit === 'metric') {
        els.unitC.className = "font-bold text-toss-text transition-colors";
        els.unitF.className = "text-gray-400 transition-colors";
    } else {
        els.unitC.className = "text-gray-400 transition-colors";
        els.unitF.className = "font-bold text-toss-text transition-colors";
    }
}

function toggleLanguage() {
    state.lang = state.lang === 'kr' ? 'en' : 'kr';
    updateLanguageUI();
    fetchWeather(state.city); 
    renderWorldCities();
}

function updateLanguageUI() {
    const t = translations[state.lang];
    els.cityInput.placeholder = t.placeholder;
    els.labelWorld.textContent = t.world;
    els.labelHumidity.textContent = t.humidity;
    els.labelWind.textContent = t.wind;
    els.labelChart.textContent = t.chart;
    els.labelAir.textContent = t.air;
    els.labelForecast.textContent = t.forecast;
    els.labelPm10.textContent = t.pm10;
    els.labelPm25.textContent = t.pm25;

    if (state.lang === 'kr') {
        els.langKo.className = "font-bold text-toss-text transition-colors";
        els.langEn.className = "text-gray-400 transition-colors";
    } else {
        els.langKo.className = "text-gray-400 transition-colors";
        els.langEn.className = "font-bold text-toss-text transition-colors";
    }
}

const worldCitiesList = [
    'New York', 'London', 'Tokyo', 'Paris', 
    'Sydney', 'Dubai', 'Singapore', 'Berlin'
];

async function renderWorldCities() {
    const t = translations[state.lang];
    els.worldCities.innerHTML = `<div class="text-center text-gray-400 py-4 text-sm">${t.loading}</div>`;

    const promises = worldCitiesList.map(async city => {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();
            const icon = mapWeatherIcon(data.weather[0].main);
            const temp = data.main.temp;
            return { city, icon, temp };
        } catch (error) {
            return { city, icon: 'ph-globe', temp: null };
        }
    });

    const results = await Promise.all(promises);

    els.worldCities.innerHTML = results.map(item => {
        const displayName = translations[state.lang][item.city] || item.city;
        let displayTemp = '-';
        if (item.temp !== null) {
            let tVal = item.temp;
            if (state.unit === 'imperial') {
                tVal = (tVal * 9/5) + 32;
            }
            displayTemp = Math.round(tVal) + '°';
        }
        
        return `
        <div class="flex justify-between items-center p-3 hover:bg-toss-bg rounded-xl cursor-pointer transition-colors" 
             onclick="fetchWeather('${item.city}')">
            <div class="flex items-center gap-3">
                <i class="ph-fill ${item.icon === 'ph-globe' ? 'text-gray-300' : 'text-toss-blue'} ${item.icon} text-xl"></i>
                <span class="font-medium text-toss-text">${displayName}</span>
            </div>
            <span class="font-bold text-toss-text text-lg">${displayTemp}</span>
        </div>
    `}).join('');
}

// [수정] 차트 업데이트 (Y축 스케일 최적화 및 'start' 채우기)
function updateChart(forecastList) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    if (state.chartInstance) state.chartInstance.destroy();

    const nextData = forecastList.slice(0, 8);
    const labels = nextData.map(item => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours(); 
        const weatherMain = item.weather[0].main;
        const emoji = getWeatherEmoji(weatherMain);
        return [emoji, `${hour}`]; 
    });

    const dataPoints = nextData.map(item => {
        let t = item.main.temp;
        if (state.unit === 'imperial') t = (t * 9/5) + 32;
        return Math.round(t);
    });

    // Y축 스케일 동적 계산 (그래프가 바닥에 붙지 않도록)
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const padding = 5; // 위아래 여백

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(49, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(49, 130, 246, 0.0)');

    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                borderColor: '#3182f6',
                backgroundColor: gradient,
                fill: 'start', // 바닥부터 채우기
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3182f6',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#3182f6',
                pointHoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#f7f9fbff',
                    bodyColor: '#191f28',
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 12,
                    displayColors: false,
                    callbacks: {
                        title: (context) => {
                            const index = context[0].dataIndex;
                            const item = nextData[index];
                            const date = new Date(item.dt * 1000);
                            return `${date.getHours()}시`;
                        },
                        label: (context) => {
                            const index = context.dataIndex;
                            const weatherDesc = nextData[index].weather[0].description;
                            const emoji = labels[index][0];
                            const temp = context.raw;
                            return `${emoji} ${temp}° (${weatherDesc})`;
                        }
                    },
                    titleFont: { size: 12, family: 'Pretendard' },
                    bodyFont: { size: 14, weight: 'bold', family: 'Pretendard' }
                }
            },
            scales: {
                y: { 
                    display: false,
                    min: minVal - padding, // 최소값보다 낮게 시작
                    max: maxVal + padding  // 최대값보다 높게 끝
                },
                x: { 
                    grid: { display: false },
                    ticks: { font: { size: 14 }, color: '#191f28' }
                }
            },
            layout: { padding: { top: 20, bottom: 10, left: 10, right: 10 } }
        }
    });
}



function setupEventListeners() {
    els.searchBtn.addEventListener('click', () => {
        if(els.cityInput.value) fetchWeather(els.cityInput.value);
    });
    els.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && els.cityInput.value) fetchWeather(els.cityInput.value);
    });
    els.cityInput.addEventListener('input', handleInput); 
    document.addEventListener('click', (e) => { 
        if (!els.cityInput.contains(e.target) && !els.suggestionList.contains(e.target)) {
            els.suggestionList.classList.add('hidden');
        }
    });
    els.unitToggle.addEventListener('click', toggleUnit);
    els.langToggle.addEventListener('click', toggleLanguage);
    els.locationBtn.addEventListener('click', handleLocationClick);
    window.fetchWeather = fetchWeather;
    window.selectCity = selectCity; 
}

init();