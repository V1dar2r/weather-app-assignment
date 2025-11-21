/**
 * Weather & Air Quality App Logic (Real Data Only)
 * - 가짜 데이터(Mock Data) 로직 완전 삭제
 * - 한글 검색 지원 (encodeURIComponent)
 * - 5일 예보, 대기질 모두 실제 API 연동
 */

const API_KEY = "6a950f9bdecf3a972a3b835c09b8bde1"; 

const state = {
    city: 'Seoul',
    unit: 'metric',
    lang: 'kr',
    chartInstance: null
};
//번역 사전
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
        view: "보기",
        "New York": "뉴욕",
        "London": "런던",
        "Tokyo": "도쿄",
        "Paris": "파리",
        "Sydney": "시드니",
        "Dubai": "두바이",
        "Singapore": "싱가포르",
        "Berlin": "베를린",
        // 대기질 상태
        good: "좋음", normal: "보통", caution: "주의", bad: "나쁨", veryBad: "매우 나쁨",
        goodDesc: "공기가 맑아요!", normalDesc: "무난한 날씨예요.", cautionDesc: "마스크를 챙기세요.", badDesc: "외출을 자제하세요.", veryBadDesc: "위험! 나가지 마세요."
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
        view: "View",
        "New York": "New York",
        "London": "London",
        "Tokyo": "Tokyo",
        "Paris": "Paris",
        "Sydney": "Sydney",
        "Dubai": "Dubai",
        "Singapore": "Singapore",
        "Berlin": "Berlin",
        // Air Quality Status
        good: "Good", normal: "Fair", caution: "Moderate", bad: "Poor", veryBad: "Very Poor",
        goodDesc: "Air is clean!", normalDesc: "It's okay.", cautionDesc: "Wear a mask.", badDesc: "Avoid going out.", veryBadDesc: "Danger! Stay inside."
    }
};
// DOM 요소 선택
const els = {
    
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    recentSearchContainer: document.getElementById('recentSearchContainer'),
    unitC: document.getElementById('unitC'),
    unitF: document.getElementById('unitF'),
    langToggle: document.getElementById('langToggle'), 
    langEn: document.getElementById('langEn'),         
    langKo: document.getElementById('langKo'),        
    labelWorld: document.getElementById('labelWorld'),
    labelHumidity: document.getElementById('labelHumidity'),
    labelWind: document.getElementById('labelWind'),
    labelChart: document.getElementById('labelChart'),
    labelAir: document.getElementById('labelAir'),
    labelForecast: document.getElementById('labelForecast'),
    labelPm10: document.getElementById('labelPm10'),
    labelPm25: document.getElementById('labelPm25'),

    suggestionList: document.getElementById('suggestionList'),
    cityName: document.getElementById('cityName'),
    mainTemp: document.getElementById('mainTemp'),
    weatherDesc: document.getElementById('weatherDesc'),
    weatherIcon: document.getElementById('weatherIcon'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    forecastContainer: document.getElementById('forecastContainer'),
    worldCities: document.getElementById('worldCities'),
    aqiScore: document.getElementById('aqiScore'),
    aqiDesc: document.getElementById('aqiDesc'),
    aqiIndicator: document.getElementById('aqiIndicator'),
    pm10: document.getElementById('pm10'),
    pm25: document.getElementById('pm25')

};

function getCountryName(code) {
    if (!code) return '';
    try {
        // state.lang이 'kr'이면 한국어('ko'), 'en'이면 영어('en')로 변환기 생성
        const regionNames = new Intl.DisplayNames([state.lang === 'kr' ? 'ko' : 'en'], { type: 'region' });
        return regionNames.of(code);
    } catch (e) {
        return code; // 에러 나면 그냥 코드 반환
    }
}
function init() {
    renderRecentSearches();
    updateUnitUI();
    updateLanguageUI();
    fetchWeather('Seoul');  // 앱 시작 시 서울 날씨 로드
    renderWorldCities();
    setupEventListeners();
}

// --- 1. [핵심] 날씨 데이터 가져오기 (도시 이름) ---
async function fetchWeather(city) {
    try {
        // 한글 깨짐 방지
        const safeCity = encodeURIComponent(city);
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${safeCity}&appid=${API_KEY}&units=metric&lang=${state.lang}`;
        
        const response = await fetch(url);

        // API 호출 실패 시 에러 처리 (가짜 데이터 X)
        if (!response.ok) {
            throw new Error("도시를 찾을 수 없습니다.");
        }
        
        const data = await response.json();

        // 화면 표시
        renderWeather(data);
        
        // 성공했으므로 검색어 저장
        saveRecentSearch(data.name);

        // 연쇄 호출: 대기질 & 주간 예보
        const { lat, lon } = data.coord;
        fetchAirQuality(lat, lon);
        fetchForecast(lat, lon); 

    } catch (error) {
        console.error(error);
        alert("검색 실패: " + error.message); 
    }
}

// --- 2. 날씨 데이터 가져오기 (위도/경도 좌표) ---
async function fetchWeatherByCoords(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${state.lang}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error("위치 정보를 불러올 수 없습니다.");
        
        const data = await response.json();

        renderWeather(data);
        saveRecentSearch(data.name);
        
        fetchAirQuality(lat, lon);
        fetchForecast(lat, lon);

    } catch (error) {
        console.error(error);
        alert("위치 날씨 로드 실패: " + error.message);
    }
}

// --- 3. 대기질(미세먼지) API (Real Data) ---
async function fetchAirQuality(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        renderAirQuality(data.list[0]);
    } catch (error) {
        console.error("대기질 정보 없음");
        if(els.aqiDesc) els.aqiDesc.textContent = "대기질 정보 없음";
    }
}

// --- 4. 5일 예보 API (Real Data) ---
async function fetchForecast(lat, lon) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${state.lang}`;
        const response = await fetch(url);
        const data = await response.json();
        
        renderForecast(data.list);
        updateChart(data.list);
    } catch (error) {
        console.error("예보 로드 실패");
    }
}

// --- 5. 화면 렌더링 함수들 ---

function renderWeather(data) {
    state.city = data.name;
    
    const countryCode = data.sys.country;
    const countryName = countryCode ? `, ${getCountryName(countryCode)}` : '';

    els.cityName.textContent = `${data.name}${countryName}`;
    els.weatherDesc.textContent = data.weather[0].description;
    els.humidity.textContent = `${data.main.humidity}%`;
    
    // --- [수정] 풍속 및 온도 단위 변환 로직 시작 ---
    
    let temp = data.main.temp;       // 기본값: 섭씨
    let speed = data.wind.speed;     // 기본값: m/s
    let speedUnit = 'm/s';

    // 화씨(imperial) 모드일 때 변환
    if (state.unit === 'imperial') {
        temp = (temp * 9/5) + 32;    // 섭씨 -> 화씨 변환
        speed = speed * 2.23694;     // m/s -> mph 변환
        speedUnit = 'mph';
    }

    // 화면 표시 (소수점 처리)
    els.mainTemp.textContent = `${Math.round(temp)}°`;
    els.windSpeed.textContent = `${parseFloat(speed).toFixed(1)} ${speedUnit}`;

    // --- [수정] 끝 ---
    
    const iconClass = mapWeatherIcon(data.weather[0].main);
    els.weatherIcon.className = `ph-fill ${iconClass} text-6xl text-toss-blue`;
    
    // 차트 업데이트 (변환된 온도 전달)
    //updateChart(temp);
}

function renderAirQuality(data) {
    const t= translations[state.lang];
    const aqi = data.main.aqi; 
    const pm10 = data.components.pm10;
    const pm2_5 = data.components.pm2_5;

    let status = { text: '-', color: '', border: '', desc: '' };
    
    switch(aqi) {
        // [수정] 텍스트를 translations 객체에서 가져옴
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
    if(els.aqiDesc) els.aqiDesc.textContent = status.desc;
    if(els.pm10) els.pm10.textContent = `${Math.round(pm10)} µg/m³`;
    if(els.pm25) els.pm25.textContent = `${Math.round(pm2_5)} µg/m³`;
}

function renderForecast(list) {
    // 1. 데이터 가공: 3시간 간격 데이터를 날짜별로 그룹화하여 최저/최고 기온 계산
    const dailyMap = {};

    list.forEach(item => {
        const dateKey = item.dt_txt.split(' ')[0]; // YYYY-MM-DD 추출

        if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = {
                dt: item.dt,
                min: item.main.temp_min,
                max: item.main.temp_max,
                weather: item.weather[0].main
            };
        } else {
            dailyMap[dateKey].min = Math.min(dailyMap[dateKey].min, item.main.temp_min);
            dailyMap[dateKey].max = Math.max(dailyMap[dateKey].max, item.main.temp_max);

            // 아이콘은 낮 시간대(12시, 15시) 기준을 우선 사용
            if (item.dt_txt.includes('12:00') || item.dt_txt.includes('15:00')) {
                dailyMap[dateKey].weather = item.weather[0].main;
            }
        }
    });

    // 오늘 포함 최대 5일치 데이터 사용
    const dailyData = Object.values(dailyMap).slice(0, 5);

    els.forecastContainer.innerHTML = dailyData.map(item => {
        const date = new Date(item.dt * 1000);
        
        // [수정] 날짜 포맷: MM/DD 형식
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateText = `${month}/${day}`;

        // 온도 변환 로직
        let min = item.min;
        let max = item.max;

        if (state.unit === 'imperial') {
            min = (min * 9/5) + 32;
            max = (max * 9/5) + 32;
        }

        min = Math.round(min);
        max = Math.round(max);

        const icon = mapWeatherIcon(item.weather);
        
        return `
            <div class="bg-toss-bg p-4 rounded-2xl flex flex-col items-center justify-center gap-2 card-hover">
                <span class="text-gray-500 text-sm font-medium">${dateText}</span>
                <i class="ph-fill ${icon} text-3xl text-toss-blue my-2"></i>
                
                <span class="font-bold text-toss-text text-sm">
                    ${min}° / ${max}°
                </span>
            </div>
        `;
    }).join('');
}
// --- 6. 유틸리티 (최근 검색어, 위치 등) ---

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
    if (!navigator.geolocation) return alert("위치 정보 기능을 지원하지 않는 브라우저입니다.");
    
    els.cityInput.value = "정밀 위치 확인 중..."; // 문구 변경
    
    // [수정] 고정밀 위치 요청 옵션
    const options = {
        enableHighAccuracy: true, // 핵심: 배터리를 더 쓰더라도 가장 정확한 위치 요청 (GPS 등)
        timeout: 10000,           // 10초까지 대기 (정확도를 위해 시간을 좀 더 줌)
        maximumAge: 0             // 캐시된(저장된) 과거 위치를 쓰지 않고 지금 위치를 새로 잡음
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            els.cityInput.value = "";
            fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            console.error(error);
            alert("위치 정보를 가져오는데 실패했습니다. (설정에서 위치 권한을 확인해주세요)");
            els.cityInput.value = "";
        },
        options // [중요] 세 번째 인자로 옵션 전달
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

function toggleUnit() {
    state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
    updateUnitUI();
    fetchWeather(state.city); 
    renderWorldCities(); // [추가] 단위를 바꾸면 사이드바 온도도 새로고침
}


function updateUnitUI() {
    if (state.unit === 'metric') {
        // 섭씨(metric) 선택 시: C는 진하게, F는 흐리게
        els.unitC.className = "font-bold text-toss-text transition-colors";
        els.unitF.className = "text-gray-400 transition-colors";
    } else {
        // 화씨(imperial) 선택 시: C는 흐리게, F는 진하게
        els.unitC.className = "text-gray-400 transition-colors";
        els.unitF.className = "font-bold text-toss-text transition-colors";
    }
}



//  사이드바 목록 (세계 도시)
const worldCitiesList = [
    'New York', 'London', 'Tokyo', 'Paris', 
    'Sydney', 'Dubai', 'Singapore', 'Berlin'
];

// [수정] 사이드바 목록 렌더링 (보기 버튼 제거 -> 현재 온도 표시)
async function renderWorldCities() {
    const t = translations[state.lang]; // 현재 언어팩 가져오기
    
    // 로딩 중 표시
    els.worldCities.innerHTML = `<div class="text-center text-gray-400 py-4 text-sm">${t.loading}</div>`;

    const promises = worldCitiesList.map(async city => {
        try {
            // 각 도시의 날씨 데이터 조회 (항상 metric으로 받음)
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
            const response = await fetch(url);
            const data = await response.json();
            
            const icon = mapWeatherIcon(data.weather[0].main);
            const temp = data.main.temp; // 온도 데이터 확보

            return { city, icon, temp };
        } catch (error) {
            return { city, icon: 'ph-globe', temp: null };
        }
    });

    const results = await Promise.all(promises);

    els.worldCities.innerHTML = results.map(item => {
        // 1. 도시 이름 번역
        const displayName = translations[state.lang][item.city] || item.city;
        
        // 2. 온도 변환 로직 (메인 화면과 동일하게 적용)
        let displayTemp = '-';
        if (item.temp !== null) {
            let tVal = item.temp;
            if (state.unit === 'imperial') {
                tVal = (tVal * 9/5) + 32; // 화씨 변환
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
// 차트 업데이트 (현재 온도 기준 시각화)

// [수정] 차트 업데이트 (툴팁 디자인 개선: 흰 사각형 제거 -> 날씨 이모지 표시)
// [수정] 차트 업데이트 (툴팁 시간 표시 오류 해결 + 날씨 이모지 적용)
function updateChart(forecastList) {
    const ctx = document.getElementById('tempChart').getContext('2d');
    
    if (state.chartInstance) state.chartInstance.destroy();

    // 1. 데이터 가공 (8개)
    const nextData = forecastList.slice(0, 8);

    // 2. 라벨 생성 [이모지, 시간]
    const labels = nextData.map(item => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours(); 
        const weatherMain = item.weather[0].main;
        const emoji = getWeatherEmoji(weatherMain);
        return [emoji, `${hour}`]; 
    });

    const dataPoints = nextData.map(item => {
        let t = item.main.temp;
        if (state.unit === 'imperial') {
            t = (t * 9/5) + 32;
        }
        return Math.round(t);
    });

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
                fill: true,
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
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                // [툴팁 설정]
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#8b95a1',
                    bodyColor: '#191f28',
                    borderColor: 'rgba(0,0,0,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 12,
                    displayColors: false, // 색상 박스 제거
                    
                    callbacks: {
                        // [핵심 수정] 제목: 데이터에서 직접 시간을 가져와 "00시"로 표시
                        title: (context) => {
                            const index = context[0].dataIndex;
                            const item = nextData[index];
                            const date = new Date(item.dt * 1000);
                            return `${date.getHours()}시`;
                        },
                        // 내용: "☀️ 24° (맑음)"
                        label: (context) => {
                            const index = context.dataIndex;
                            const weatherDesc = nextData[index].weather[0].description;
                            const emoji = labels[index][0]; // 라벨 배열의 첫 번째 값(이모지)
                            const temp = context.raw;
                            return `${emoji} ${temp}° (${weatherDesc})`;
                        }
                    },
                    titleFont: { size: 12, family: 'Pretendard' },
                    bodyFont: { size: 14, weight: 'bold', family: 'Pretendard' }
                }
            },
            scales: {
                y: { display: false },
                x: { 
                    grid: { display: false },
                    ticks: {
                        font: { size: 14 },
                        color: '#191f28'
                    }
                }
            },
            layout: {
                padding: { top: 20, bottom: 10, left: 10, right: 10 }
            }
        }
    });
}
// --- [추가] 자동완성 기능 관련 함수들 ---

let timer; // 디바운싱 타이머

// 1. 입력 감지 및 API 호출 제어 (Debounce)
function handleInput() {
    const query = els.cityInput.value.trim();
    
    // 입력창이 비었으면 리스트 숨김
    if (query.length < 2) {
        els.suggestionList.classList.add('hidden');
        return;
    }

    // 이전 타이머 취소 (연속 입력 시 API 호출 방지)
    clearTimeout(timer);

    // 300ms 동안 입력이 없으면 API 호출
    timer = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
}

// 2. 도시 검색 API 호출 (Geocoding API)
async function fetchCitySuggestions(query) {
    try {
        // limit=5: 최대 5개 도시만 검색
        const safeQuery = encodeURIComponent(query);
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${safeQuery}&limit=5&appid=${API_KEY}`;
        const response = await fetch(url);
        const cities = await response.json();
        
        renderSuggestions(cities);
    } catch (error) {
        console.error("자동완성 로드 실패", error);
    }
}

// 3. 목록 렌더링

function renderSuggestions(cities) {
    // [수정] 결과가 없을 때 안내 메시지 표시
    if (cities.length === 0) {
        const noResultText = state.lang === 'kr' 
            ? '검색 결과가 없습니다.<br>영어로 검색해보세요.' 
            : 'No results found.<br>Try searching in English.';
            
        els.suggestionList.innerHTML = `
            <li class="px-6 py-4 text-center text-sm text-gray-400 cursor-default">
                ${noResultText}
            </li>
        `;
        els.suggestionList.classList.remove('hidden');
        return;
    }

    // 결과가 있으면 목록 생성
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
// 4. 리스트에서 도시 선택 시 실행
function selectCity(name, lat, lon) {
    els.cityInput.value = name;             // 검색창에 선택한 도시 이름 채우기
    els.suggestionList.classList.add('hidden'); // 목록 숨기기
    
    // [핵심 수정] 이름 검색(fetchWeather) 대신 좌표 검색(fetchWeatherByCoords) 실행
    fetchWeatherByCoords(lat, lon);
}

// 이벤트 리스너
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
    els.locationBtn.addEventListener('click', handleLocationClick);
    els.langToggle.addEventListener('click', toggleLanguage);
    window.fetchWeather = fetchWeather;
    window.selectCity = selectCity;
}

// [추가] 언어 토글 함수
function toggleLanguage() {
    state.lang = state.lang === 'kr' ? 'en' : 'kr';
    updateLanguageUI(); // 정적 텍스트 변경
    fetchWeather(state.city); // API 재호출 (날씨 설명 번역 위해)
    renderWorldCities(); // 세계 날씨 목록 갱신
}

// [추가] 날씨 상태를 이모지로 변환하는 함수 (차트용)
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
// [추가] 화면의 글자들을 현재 언어에 맞게 변경
function updateLanguageUI() {
    const t = translations[state.lang]; // 현재 언어 팩 선택

    // 1. 입력창 placeholder
    els.cityInput.placeholder = t.placeholder;

    // 2. 정적 텍스트들 교체
    els.labelWorld.textContent = t.world;
    els.labelHumidity.textContent = t.humidity;
    els.labelWind.textContent = t.wind;
    els.labelChart.textContent = t.chart;
    els.labelAir.textContent = t.air;
    els.labelForecast.textContent = t.forecast;
    els.labelPm10.textContent = t.pm10;
    els.labelPm25.textContent = t.pm25;

    // 3. 버튼 스타일 하이라이트
    if (state.lang === 'kr') {
        els.langKo.className = "font-bold text-toss-text transition-colors";
        els.langEn.className = "text-gray-400 transition-colors";
    } else {
        els.langKo.className = "text-gray-400 transition-colors";
        els.langEn.className = "font-bold text-toss-text transition-colors";
    }
}


init();