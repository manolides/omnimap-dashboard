import { CONFIG } from './config.js';

// Parse URL hash for deep linking (e.g., #zoom/lat/lng)
const hash = window.location.hash.substring(1);
const hashParts = hash.split('/');
if (hashParts.length === 3) {
    const [z, lat, lng] = hashParts.map(Number);
    if (!isNaN(z) && !isNaN(lat) && !isNaN(lng)) {
        CONFIG.zoom = z;
        CONFIG.center.lat = lat;
        CONFIG.center.lng = lng;
    }
}

let activeMap = null;
let syncTimeout = null;
const globalMaps = {};
let currentMapType = CONFIG.defaultType; // 'street', 'hybrid', 'satellite'

function showMissingKeyWarning(mapName, containerId) {
    const el = document.getElementById(containerId);
    el.innerHTML = `
        <div class="missing-key-overlay">
            <h3>${mapName} API Key Missing</h3>
            <p>Please add your key in config.js to view this map.</p>
        </div>
    `;
}

function handleSyncEvent(sourceMap, centerStr, zoomStr) {
    if (activeMap && activeMap !== sourceMap) return;
    activeMap = sourceMap;
    
    // Auto-release the source lock after settling
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => { activeMap = null; }, 800);
    
    const center = JSON.parse(centerStr);
    const zoom = parseFloat(zoomStr);

    if (globalMaps.osm && sourceMap !== 'osm') {
        globalMaps.osm.setView([center.lat, center.lng], zoom, { animate: false });
    }
    if (globalMaps.mapbox && sourceMap !== 'mapbox') {
        globalMaps.mapbox.jumpTo({ center: [center.lng, center.lat], zoom: zoom - 1 }); 
    }
    if (globalMaps.google && sourceMap !== 'google') {
        globalMaps.google.setOptions({ center: {lat: center.lat, lng: center.lng}, zoom: zoom });
    }
    if (globalMaps.apple && sourceMap !== 'apple') {
        const coord = new mapkit.Coordinate(center.lat, center.lng);
        const mapEl = document.getElementById('map-apple');
        const widthModifier = mapEl ? (mapEl.clientWidth / 256) : 2;
        const spanVal = (360 / Math.pow(2, zoom)) * widthModifier;
        const span = new mapkit.CoordinateSpan(spanVal, spanVal);
        globalMaps.apple.region = new mapkit.CoordinateRegion(coord, span);
    }
    if (globalMaps.azure && sourceMap !== 'azure') {
        globalMaps.azure.setCamera({ center: [center.lng, center.lat], zoom: zoom - 1, type: 'jump' });
    }
    if (globalMaps.yandex && sourceMap !== 'yandex') {
        globalMaps.yandex.setCenter([center.lat, center.lng], zoom, { checkZoomRange: false, duration: 0 });
    }

    // Update the URL hash for deep linking
    const hashStr = `#${zoom.toFixed(2)}/${center.lat.toFixed(6)}/${center.lng.toFixed(6)}`;
    if (window.location.hash !== hashStr) {
        window.history.replaceState(null, '', hashStr);
    }
}

// 1. Initialize OpenStreetMap (Leaflet)
function initOSM() {
    const streetTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    const labelsOnly = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png';

    const map = L.map('map-osm', {
        center: [CONFIG.center.lat, CONFIG.center.lng],
        zoom: CONFIG.zoom,
        zoomControl: false,
        attributionControl: false
    });

    const baseLayer = L.tileLayer(satelliteTiles).addTo(map);
    const labelLayer = L.tileLayer(labelsOnly).addTo(map);

    globalMaps.osm = map;
    globalMaps.osm_layers = { base: baseLayer, labels: labelLayer, street: streetTiles, sat: satelliteTiles, label: labelsOnly };

    map.on('move', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        handleSyncEvent('osm', JSON.stringify({ lat: center.lat, lng: center.lng }), zoom);
    });
}

// 2. Initialize Mapbox
function initMapbox() {
    if (!CONFIG.keys.mapbox) {
        showMissingKeyWarning('Mapbox', 'map-mapbox');
        return;
    }
    mapboxgl.accessToken = CONFIG.keys.mapbox;
    const map = new mapboxgl.Map({
        container: 'map-mapbox',
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [CONFIG.center.lng, CONFIG.center.lat],
        zoom: CONFIG.zoom - 1
    });

    globalMaps.mapbox = map;
    map.on('move', () => {
        const center = map.getCenter();
        const zoom = map.getZoom() + 1;
        handleSyncEvent('mapbox', JSON.stringify({ lat: center.lat, lng: center.lng }), zoom);
    });
}

// 3. Initialize Apple Maps
function initApple() {
    if (!CONFIG.keys.appleJwtToken) {
        showMissingKeyWarning('Apple Maps', 'map-apple');
        return;
    }
    mapkit.init({
        authorizationCallback: function(done) {
            done(CONFIG.keys.appleJwtToken);
        }
    });

    const map = new mapkit.Map("map-apple", {
        mapType: mapkit.Map.MapTypes.Hybrid
    });
    
    const coord = new mapkit.Coordinate(CONFIG.center.lat, CONFIG.center.lng);
    const spanVal = 360 / Math.pow(2, CONFIG.zoom);
    const span = new mapkit.CoordinateSpan(spanVal, spanVal);
    map.region = new mapkit.CoordinateRegion(coord, span);

    globalMaps.apple = map;

    map.addEventListener('region-change-end', () => {
        const center = map.center;
        const mapEl = document.getElementById('map-apple');
        const widthModifier = mapEl ? (mapEl.clientWidth / 256) : 2;
        const zoom = Math.log2(360 / (map.region.span.longitudeDelta / widthModifier));
        handleSyncEvent('apple', JSON.stringify({ lat: center.latitude, lng: center.longitude }), zoom);
    });
}

// 4. Initialize Google Maps
window.initGoogle = function() {
    if (!CONFIG.keys.googleMaps) return;
    const map = new google.maps.Map(document.getElementById('map-google'), {
        center: { lat: CONFIG.center.lat, lng: CONFIG.center.lng },
        zoom: CONFIG.zoom,
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        tilt: 0
    });

    globalMaps.google = map;

    map.addListener('center_changed', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        handleSyncEvent('google', JSON.stringify({ lat: center.lat(), lng: center.lng() }), zoom);
    });
    map.addListener('zoom_changed', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        handleSyncEvent('google', JSON.stringify({ lat: center.lat(), lng: center.lng() }), zoom);
    });
};

function loadGoogle() {
    if (!CONFIG.keys.googleMaps) {
        showMissingKeyWarning('Google Maps', 'map-google');
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.keys.googleMaps}&callback=initGoogle`;
    script.async = true;
    document.head.appendChild(script);
}

// 5. Initialize Azure Maps
window.initAzure = function() {
    if (!CONFIG.keys.azureMaps) return;
    const map = new atlas.Map('map-azure', {
        center: [CONFIG.center.lng, CONFIG.center.lat],
        zoom: CONFIG.zoom - 1,
        style: 'satellite_road_labels',
        authOptions: {
            authType: 'subscriptionKey',
            subscriptionKey: CONFIG.keys.azureMaps
        }
    });

    globalMaps.azure = map;

    map.events.add('zoom', () => {
        const center = map.getCamera().center;
        const zoom = map.getCamera().zoom + 1;
        handleSyncEvent('azure', JSON.stringify({ lat: center[1], lng: center[0] }), zoom);
    });
    map.events.add('drag', () => {
        const center = map.getCamera().center;
        const zoom = map.getCamera().zoom + 1;
        handleSyncEvent('azure', JSON.stringify({ lat: center[1], lng: center[0] }), zoom);
    });
};

function loadAzure() {
    if (!CONFIG.keys.azureMaps) {
        showMissingKeyWarning('Azure Maps', 'map-azure');
        return;
    }
    const script = document.createElement('script');
    script.src = "https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js";
    script.onload = window.initAzure;
    document.head.appendChild(script);
}

// 6. Initialize Yandex Maps
window.initYandex = function() {
    if (!CONFIG.keys.yandexMaps) return;
    
    ymaps.ready(() => {
        const map = new ymaps.Map('map-yandex', {
            center: [CONFIG.center.lat, CONFIG.center.lng],
            zoom: CONFIG.zoom,
            type: 'yandex#hybrid',
            controls: []
        });

        globalMaps.yandex = map;

        map.events.add(['boundschange'], (e) => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            handleSyncEvent('yandex', JSON.stringify({ lat: center[0], lng: center[1] }), zoom);
        });
    });
};

function loadYandex() {
    if (!CONFIG.keys.yandexMaps) {
        showMissingKeyWarning('Yandex Maps', 'map-yandex');
        return;
    }
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${CONFIG.keys.yandexMaps}&lang=en_US&onload=initYandex`;
    script.async = true;
    document.head.appendChild(script);
}

// UI LOGIC FOR LAYOUT TOGGLE
function initLayoutToggle() {
    const btn = document.getElementById('layout-toggle-btn');
    const grid = document.querySelector('.map-grid');
    
    btn.addEventListener('click', () => {
        grid.classList.toggle('vertical-layout');
        
        // Wait for CSS transition, then dispatch a resize event 
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            if (globalMaps.osm) globalMaps.osm.invalidateSize();
        }, 320); // allow css transition to finish
    });
}

// UI LOGIC FOR GLOBAL SEARCH
function initSearch() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('global-search');

    async function performSearch() {
        const query = searchInput.value;
        if (!query) return;

        searchBtn.innerText = '...';
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                handleSyncEvent('search', JSON.stringify({ lat: lat, lng: lng }), CONFIG.zoom);
            } else {
                alert('Location not found. Try a broader search term.');
            }
        } catch (error) {
            console.error('Search failed', error);
        }
        searchBtn.innerText = 'Search';
    }

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

// UI LOGIC FOR MAP TYPE SYNC
function initMapTypeControl() {
    const select = document.getElementById('map-type-select');
    select.value = CONFIG.defaultType;
    updateAllMapTypes(CONFIG.defaultType);

    select.addEventListener('change', (e) => {
        updateAllMapTypes(e.target.value);
    });
}

function updateAllMapTypes(type) {
    currentMapType = type;
    
    // OSM
    if (globalMaps.osm && globalMaps.osm_layers) {
        const layers = globalMaps.osm_layers;
        if (type === 'street') {
            layers.base.setUrl(layers.street);
            if (globalMaps.osm.hasLayer(layers.labels)) globalMaps.osm.removeLayer(layers.labels);
        } else if (type === 'satellite') {
            layers.base.setUrl(layers.sat);
            if (globalMaps.osm.hasLayer(layers.labels)) globalMaps.osm.removeLayer(layers.labels);
        } else { // hybrid
            layers.base.setUrl(layers.sat);
            if (!globalMaps.osm.hasLayer(layers.labels)) globalMaps.osm.addLayer(layers.labels);
        }
    }

    // Google
    if (globalMaps.google) {
        const mapTypeMap = { 'street': 'roadmap', 'hybrid': 'hybrid', 'satellite': 'satellite' };
        globalMaps.google.setMapTypeId(mapTypeMap[type]);
    }

    // Mapbox
    if (globalMaps.mapbox) {
        const mf = { 'street': 'mapbox://styles/mapbox/streets-v12', 'hybrid': 'mapbox://styles/mapbox/satellite-streets-v12', 'satellite': 'mapbox://styles/mapbox/satellite-v9' };
        globalMaps.mapbox.setStyle(mf[type]);
    }

    // Apple
    if (globalMaps.apple && window.mapkit) {
        const atMap = { 'street': mapkit.Map.MapTypes.Standard, 'hybrid': mapkit.Map.MapTypes.Hybrid, 'satellite': mapkit.Map.MapTypes.Satellite };
        globalMaps.apple.mapType = atMap[type];
    }

    // Azure
    if (globalMaps.azure) {
        const azMap = { 'street': 'road', 'hybrid': 'satellite_road_labels', 'satellite': 'satellite' };
        globalMaps.azure.setStyle({ style: azMap[type] });
    }

    // Yandex
    if (globalMaps.yandex) {
        const yMap = { 'street': 'yandex#map', 'hybrid': 'yandex#hybrid', 'satellite': 'yandex#satellite' };
        globalMaps.yandex.setType(yMap[type]);
    }
}

// BOOTSTRAP
try { initOSM(); } catch (e) { console.error('OSM Init Error:', e); }
try { initMapbox(); } catch (e) { console.error('Mapbox Init Error:', e); }
try { initApple(); } catch (e) { console.error('Apple Init Error:', e); }

loadGoogle();
loadAzure();
loadYandex();

try { initSearch(); } catch (e) { console.error('Search Init Error:', e); }
try { initMapTypeControl(); } catch (e) { console.error('Map Type Init Error:', e); }
try { initLayoutToggle(); } catch (e) { console.error('Layout Toggle Init Error:', e); }

function initOpenTabs() {
    const btn = document.getElementById('open-tabs-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        let lat = CONFIG.center.lat;
        let lng = CONFIG.center.lng;
        let zoom = CONFIG.zoom;

        const hash = window.location.hash.substring(1);
        const hashParts = hash.split('/');
        if (hashParts.length === 3) {
            const [z, hlat, hlng] = hashParts.map(Number);
            if (!isNaN(z) && !isNaN(hlat) && !isNaN(hlng)) {
                zoom = z;
                lat = hlat;
                lng = hlng;
            }
        }

        const zInt = Math.round(zoom);

        let gType = 'm';
        let aType = 'm';
        let yType = 'map';
        let bType = 'r';

        if (currentMapType === 'satellite') {
            gType = 'k';
            aType = 'k';
            yType = 'sat';
            bType = 'a';
        } else if (currentMapType === 'hybrid') {
            gType = 'h';
            aType = 'h';
            yType = 'sat%2Cskl';
            bType = 'h';
        }

        const urls = [
            `https://maps.google.com/?ll=${lat},${lng}&z=${zoom}&t=${gType}`,
            `https://maps.apple.com/?ll=${lat},${lng}&z=${zoom}&t=${aType}`,
            `https://www.openstreetmap.org/#map=${zInt}/${lat}/${lng}`,
            `https://yandex.com/maps/?ll=${lng}%2C${lat}&z=${zInt}&l=${yType}`,
            `https://www.bing.com/maps?cp=${lat}~${lng}&lvl=${zInt}&sty=${bType}`
        ];

        urls.forEach(url => window.open(url, '_blank'));
    });
}
try { initOpenTabs(); } catch (e) { console.error('Open Tabs Init Error:', e); }
