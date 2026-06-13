// ============================================================
// APP.JS — GPS INTERNACIONAL | Lógica principal v2
// ============================================================

// ===== MAP INIT =====
const map = L.map('map', {
  center: [23.6345, -102.5528],
  zoom: 5,
  zoomControl: false,
}).addLayer(
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  })
);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// ===== STATE =====
let userLocation   = null;
let originCoords   = null;
let destCoords     = null;
let vehicleType    = 'auto';
let routeLayers    = [];
let riskLayers     = [];
let tollMarkers    = [];
let trafficLayers  = [];
let locationMarker = null;
let destMarker     = null;
let currentRoute   = null;
let activeFuel     = FUEL_BY_COUNTRY.MX;

// ===== RISK ZONES ON MAP =====
function drawRiskZones() {
  riskLayers.forEach(l => map.removeLayer(l));
  riskLayers = [];
  const colors = { extreme:'#ef4444', high:'#f97316', medium:'#eab308', low:'#84cc16' };
  RISK_ZONES.forEach(zone => {
    const color = colors[zone.level] || '#ef4444';
    const circle = L.circle([zone.lat, zone.lng], {
      radius: zone.radius * 1000,
      color,
      fillColor: color,
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: zone.level === 'extreme' ? '6,3' : null,
    }).addTo(map);
    circle.bindPopup(`
      <div style="min-width:180px">
        <p style="font-weight:700;font-size:13px;margin-bottom:4px">⚠️ ${zone.name}</p>
        <p style="font-size:11px;color:#f59e0b;margin-bottom:6px">Nivel: ${zone.level.toUpperCase()}</p>
        <p style="font-size:11px">${zone.description}</p>
        <p style="font-size:10px;color:#7c8db0;margin-top:6px">Fuente: SESNSP 2023-2024</p>
      </div>
    `);
    riskLayers.push(circle);
  });
}

// ===== TOLL MARKERS (solo los activos en México) =====
function drawTollMarkers() {
  tollMarkers.forEach(m => map.removeLayer(m));
  tollMarkers = [];

  const tollIcon = L.divIcon({
    className: '',
    html: `<div style="background:#f59e0b;border:2px solid #1a1d27;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:7px;color:#000;font-weight:900">$</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  TOLL_BOOTHS.forEach(toll => {
    const factor = VEHICLE_FACTORS[vehicleType].tolls;
    const cost = Math.round(toll.autoMXN * factor);
    const m = L.marker([toll.lat, toll.lng], { icon: tollIcon }).addTo(map);
    m.bindPopup(`
      <div style="min-width:160px">
        <p style="font-weight:700;font-size:13px;margin-bottom:4px">🛣️ ${toll.name}</p>
        <p style="font-size:11px;color:#7c8db0">${toll.state} · ${toll.highway || ''}</p>
        <p style="font-size:15px;font-weight:700;color:#f59e0b;margin-top:6px">$${cost} MXN <span style="font-size:11px;font-weight:400;color:#7c8db0">(${VEHICLE_FACTORS[vehicleType].label})</span></p>
        <p style="font-size:10px;color:#7c8db0;margin-top:4px">Fuente: CAPUFE 2024</p>
      </div>
    `);
    tollMarkers.push(m);
  });
}

// ===== SIMULATED TRAFFIC ZONES =====
function drawTraffic() {
  trafficLayers.forEach(l => map.removeLayer(l));
  trafficLayers = [];
  const trafficSpots = [
    { lat:19.4326, lng:-99.1332, r:6 },
    { lat:20.6597, lng:-103.3496, r:5 },
    { lat:25.6866, lng:-100.3161, r:5 },
    { lat:19.0414, lng:-98.2063, r:4 },
    { lat:19.6010, lng:-99.0503, r:4 },
    { lat:19.5478, lng:-99.2014, r:3 },
  ];
  trafficSpots.forEach(s => {
    const c = L.circle([s.lat, s.lng], {
      radius: s.r * 1000,
      color: '#64748b',
      fillColor: '#64748b',
      fillOpacity: 0.18,
      weight: 1,
    }).addTo(map);
    c.bindPopup('<p style="font-size:12px">🚦 <strong>Embotellamiento detectado</strong><br>Tráfico pesado en esta zona.</p>');
    trafficLayers.push(c);
  });
}

// ===== CUSTOM ICONS =====
function makeIcon(emoji, color) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};border:2px solid #0f1117;border-radius:50% 50% 50% 0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,0.5)"><span style="transform:rotate(45deg)">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// ============================================================
// AUTOCOMPLETE INTERNACIONAL — usa Nominatim (OpenStreetMap)
// ============================================================
let acTimers = {};

function setupAutocomplete(inputId, dropdownId, onSelect) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    dropdown.innerHTML = '';

    if (q.length < 3) { dropdown.classList.remove('show'); return; }

    // Primero busca en lista MX local (rápida)
    const localResults = MX_CITIES
      .filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || (c.state && c.state.toLowerCase().includes(q.toLowerCase())))
      .slice(0, 4);

    // Luego hace búsqueda global en Nominatim con debounce
    clearTimeout(acTimers[inputId]);
    acTimers[inputId] = setTimeout(() => {
      fetchNominatim(q).then(places => {
        dropdown.innerHTML = '';

        // Combina: locales primero, luego globales (sin duplicar)
        const combined = [...localResults];
        places.forEach(p => {
          const dup = combined.some(c => Math.abs(c.lat - p.lat) < 0.05 && Math.abs(c.lng - p.lng) < 0.05);
          if (!dup) combined.push(p);
        });

        if (!combined.length) { dropdown.classList.remove('show'); return; }

        combined.slice(0, 8).forEach(city => {
          const item = document.createElement('div');
          item.className = 'ac-item';
          const flag = getCountryFlag(city.country || 'MX');
          const subtitle = city.state ? `${city.state}` : (city.country || '');
          item.innerHTML = `
            <span class="ac-icon">${flag}</span>
            <span><span class="ac-name">${city.name}</span><br>
            <span class="ac-detail">${subtitle}</span></span>
          `;
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            input.value = city.displayName || `${city.name}${city.state ? ', ' + city.state : ''}`;
            dropdown.classList.remove('show');
            onSelect({ lat: city.lat, lng: city.lng, name: input.value, state: city.state || '', country: city.country || 'MX' });
          });
          dropdown.appendChild(item);
        });

        dropdown.classList.add('show');
      });
    }, 350);
  });

  input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('show'), 200));
}

async function fetchNominatim(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    const data = await res.json();
    return data.map(item => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name.split(',').slice(0, 3).join(',').trim(),
      state: item.address?.state || item.address?.county || '',
      country: item.address?.country_code?.toUpperCase() || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}

function getCountryFlag(code) {
  const flags = {
    MX:'🇲🇽', US:'🇺🇸', ES:'🇪🇸', FR:'🇫🇷', DE:'🇩🇪',
    BR:'🇧🇷', AR:'🇦🇷', CO:'🇨🇴', CL:'🇨🇱', PE:'🇵🇪',
    GB:'🇬🇧', IT:'🇮🇹', JP:'🇯🇵', CA:'🇨🇦', AU:'🇦🇺',
    CN:'🇨🇳', IN:'🇮🇳', RU:'🇷🇺', KR:'🇰🇷', PT:'🇵🇹',
  };
  return flags[code] || '📍';
}

// ===== GEOLOCATION =====
document.getElementById('useMyLocation').addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('❌ Geolocalización no disponible'); return; }
  showToast('📡 Obteniendo ubicación...');
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    originCoords = { ...userLocation, name: 'Mi ubicación', state: '', country: 'MX' };
    document.getElementById('originInput').value = 'Mi ubicación actual';
    placeOriginMarker(userLocation.lat, userLocation.lng);
    map.setView([userLocation.lat, userLocation.lng], 13);
    showToast('✅ Ubicación obtenida');
  }, () => {
    userLocation = { lat:19.4326, lng:-99.1332 };
    originCoords = { ...userLocation, name: 'Ciudad de México (por defecto)', state:'CDMX', country:'MX' };
    document.getElementById('originInput').value = 'Ciudad de México (por defecto)';
    placeOriginMarker(userLocation.lat, userLocation.lng);
    map.setView([userLocation.lat, userLocation.lng], 11);
    showToast('⚠️ Usando CDMX como ubicación por defecto');
  });
});

function placeOriginMarker(lat, lng) {
  if (locationMarker) map.removeLayer(locationMarker);
  locationMarker = L.marker([lat, lng], { icon: makeIcon('📍', '#3b82f6') }).addTo(map);
}

// ===== VEHICLE SELECTOR =====
document.querySelectorAll('.vehicle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vehicle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    vehicleType = btn.dataset.type;
    tollMarkers.forEach(m => map.removeLayer(m));
    tollMarkers = [];
    drawTollMarkers();
  });
});

// ===== FUEL SLIDER =====
const fuelSlider = document.getElementById('fuelSlider');
const fuelFill   = document.getElementById('fuelFill');
const fuelPct    = document.getElementById('fuelPercent');
const fuelAlert  = document.getElementById('fuelAlert');

fuelSlider.addEventListener('input', () => {
  const v = fuelSlider.value;
  fuelFill.style.width = v + '%';
  fuelPct.textContent = v + '%';
  fuelAlert.style.display = v < 20 ? 'block' : 'none';
});

// ===== DEPARTURE TIME DEFAULT =====
const now = new Date();
document.getElementById('departureTime').value =
  `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

// ===== AUTOCOMPLETE SETUP =====
setupAutocomplete('originInput', 'originDropdown', coords => {
  originCoords = coords;
  placeOriginMarker(coords.lat, coords.lng);
});

setupAutocomplete('destInput', 'destDropdown', coords => {
  destCoords = coords;
  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.marker([coords.lat, coords.lng], { icon: makeIcon('🏁', '#22c55e') }).addTo(map);
});

// ===== MAIN SEARCH =====
document.getElementById('searchBtn').addEventListener('click', async () => {
  if (!originCoords || !destCoords) {
    showToast('⚠️ Ingresa origen y destino');
    return;
  }

  const btn = document.getElementById('searchBtn');
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinner"></span> Calculando...';

  setTimeout(async () => {
    const options = {
      vehicleType,
      avoidTolls:   document.getElementById('avoidTolls').checked,
      avoidRed:     document.getElementById('avoidRed').checked,
      avoidTraffic: document.getElementById('avoidTraffic').checked,
      algorithm:    document.getElementById('algorithmSelect').value,
    };

    try {
      // Actualizar combustible según países de la ruta
      activeFuel = getFuelForRoute(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);

      const result = calculateRoute(
        { lat: originCoords.lat, lng: originCoords.lng },
        { lat: destCoords.lat,   lng: destCoords.lng },
        options
      );

      const realGeometry = await getRealRoute(originCoords, destCoords);
      result.realGeometry = realGeometry;

      // Calcular casetas solo si la ruta pasa por México
      const isMexicanRoute = isRouteInMexico(originCoords, destCoords);
      if (isMexicanRoute && !options.avoidTolls) {
        const realTolls = calculateRealTolls(realGeometry, options.avoidTolls);
        result.main.tolls    = realTolls;
        result.main.tollCost = realTolls.reduce((s, t) => s + t.cost, 0);
      } else if (!isMexicanRoute) {
        result.main.tolls    = [];
        result.main.tollCost = 0;
        result.main.tollNote = 'Casetas no disponibles fuera de México';
      }

      // Recalcular costo de combustible con precio del país correcto
      const fuelL = result.main.fuelL;
      result.main.fuelCostFormatted = formatFuelCost(parseFloat(fuelL), activeFuel);

      currentRoute = result;
      drawRouteOnMap(result, originCoords, destCoords);
      showInfoPanel(result, options);
    } catch(e) {
      showToast('❌ Error calculando ruta');
      console.error(e);
    }

    btn.classList.remove('loading');
    btn.innerHTML = '<span class="btn-icon">🔍</span> Calcular Ruta';
  }, 600);
});

function isRouteInMexico(origin, dest) {
  const inMX = (lat, lng) => lat >= 14.5 && lat <= 32.7 && lng >= -117.1 && lng <= -86.7;
  return inMX(origin.lat, origin.lng) || inMX(dest.lat, dest.lng);
}

function formatFuelCost(liters, fuel) {
  if (fuel.priceMXN) {
    return { text: `$${Math.round(liters * fuel.priceMXN)} MXN`, liters };
  }
  return { text: `${fuel.symbol}${(liters * fuel.priceUSD).toFixed(0)} ${fuel.currency}`, liters };
}

async function getRealRoute(origin, dest) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data     = await response.json();

  if (!data.routes || !data.routes[0]) throw new Error('No se encontró ruta');
  return data.routes[0].geometry.coordinates;
}

// ===== DRAW ROUTE =====
function drawRouteOnMap(result, origin, dest) {
  routeLayers.forEach(l => map.removeLayer(l));
  routeLayers = [];

  const mainWps = result.realGeometry
    ? result.realGeometry.map(coord => [coord[1], coord[0]])
    : result.main.waypoints.map(wp => [wp.lat, wp.lng]);

  const mainLine = L.polyline(mainWps, {
    color: '#22d3ee',
    weight: 5,
    opacity: 0.9
  }).addTo(map);
  routeLayers.push(mainLine);

  result.alternatives.forEach((alt, i) => {
    const altLine = L.polyline(
      alt.waypoints.map(wp => [wp.lat, wp.lng]),
      { color: i === 0 ? '#6366f1' : '#84cc16', weight: 3, opacity: 0.45, dashArray: '8,5' }
    ).addTo(map);
    routeLayers.push(altLine);
  });

  if (locationMarker) map.removeLayer(locationMarker);
  locationMarker = L.marker([origin.lat, origin.lng], { icon: makeIcon('📍', '#3b82f6') })
    .addTo(map)
    .bindPopup(`<strong>Origen</strong><br>${origin.name}`);

  if (destMarker) map.removeLayer(destMarker);
  destMarker = L.marker([dest.lat, dest.lng], { icon: makeIcon('🏁', '#22c55e') })
    .addTo(map)
    .bindPopup(`<strong>Destino</strong><br>${dest.name}`);

  routeLayers.push(locationMarker);
  routeLayers.push(destMarker);
  map.fitBounds(L.latLngBounds(mainWps), { padding: [60, 60] });
}

// ============================================================
// CALCULAR CASETAS SOBRE RUTA REAL — Distancia a segmentos
//
// Mide la distancia perpendicular de cada caseta al segmento
// de ruta más cercano (punto a línea), no solo al punto más
// cercano. Esto detecta casetas aunque OSRM no tenga puntos
// exactamente encima de la plaza, porque la autopista y la
// carretera libre son paralelas a pocos km.
//
// Umbral: 2.5 km — cubre el ancho entre autopista de cuota
// y carretera federal paralela, sin detectar casetas de rutas
// perpendiculares.
// ============================================================
function distPointToSegment(plat, plng, alat, alng, blat, blng) {
  const dlat = blat - alat;
  const dlng = blng - alng;
  if (dlat === 0 && dlng === 0) return haversine(plat, plng, alat, alng);
  const t = Math.max(0, Math.min(1,
    ((plat - alat) * dlat + (plng - alng) * dlng) / (dlat * dlat + dlng * dlng)
  ));
  return haversine(plat, plng, alat + t * dlat, alng + t * dlng);
}

function calculateRealTolls(routeCoords, avoidTolls) {
  if (avoidTolls || !routeCoords || routeCoords.length < 5) return [];

  // Bounding box ampliado para prefilter rápido
  const lats = routeCoords.map(c => c[1]);
  const lngs = routeCoords.map(c => c[0]);
  const minLat = Math.min(...lats) - 0.05;
  const maxLat = Math.max(...lats) + 0.05;
  const minLng = Math.min(...lngs) - 0.05;
  const maxLng = Math.max(...lngs) + 0.05;

  const THRESHOLD_KM = 6; // ancho máximo entre autopista y libre paralela
  const tolls = [];

  for (const toll of TOLL_BOOTHS) {
    // Prefilter: descartar casetas fuera del bbox
    if (toll.lat < minLat || toll.lat > maxLat || toll.lng < minLng || toll.lng > maxLng) continue;

    // Distancia mínima a cualquier SEGMENTO de la ruta
    let minDist = Infinity;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const a = routeCoords[i];
      const b = routeCoords[i + 1];
      const d = distPointToSegment(toll.lat, toll.lng, a[1], a[0], b[1], b[0]);
      if (d < minDist) minDist = d;
      if (minDist < 0.6) break; // suficientemente cerca, no seguir buscando
    }

    if (minDist <= THRESHOLD_KM) {
      tolls.push({
        ...toll,
        cost: Math.round(toll.autoMXN * VEHICLE_FACTORS[vehicleType].tolls),
        distKm: minDist.toFixed(2)
      });
    }
  }

  return tolls;
}

// ===== INFO PANEL =====
function showInfoPanel(result, options) {
  const { main, alternatives } = result;
  const dep     = document.getElementById('departureTime').value;
  const arrTime = addMinutes(dep, main.timeMin);
  document.getElementById('arrivalTime').value = arrTime;

  document.getElementById('routeDistance').textContent = `${main.totalDist} km`;
  document.getElementById('routeTime').textContent     = formatTime(main.timeMin);

  // Casetas
  if (main.tollNote) {
    document.getElementById('routeTolls').textContent = '—';
  } else {
    document.getElementById('routeTolls').textContent = main.tollCost > 0 ? `$${main.tollCost} MXN` : 'Libre';
  }

  // Combustible con moneda del país
  const fuelFormatted = main.fuelCostFormatted || { text: `$${main.fuelCost} MXN`, liters: parseFloat(main.fuelL) };
  document.getElementById('routeFuel').textContent = `${fuelFormatted.text} (${main.fuelL}L)`;

  document.getElementById('routeTitle').textContent = `Ruta ${main.algorithm}`;

  // Alt routes
  const altList = document.getElementById('altRoutesList');
  altList.innerHTML = '';
  alternatives.forEach((alt, i) => {
    const badges = ['fast','cheap'];
    const labels = ['Más rápida','Más económica'];
    const div = document.createElement('div');
    div.className = 'alt-route-item';
    div.innerHTML = `
      <div class="alt-info">
        <span class="alt-name">${alt.algorithm}</span>
        <span class="alt-meta">${alt.totalDist} km · ${formatTime(alt.timeMin)} · $${alt.tollCost} casetas</span>
      </div>
      <span class="alt-badge ${badges[i]}">${labels[i]}</span>
    `;
    div.addEventListener('click', () => {
      document.querySelectorAll('.alt-route-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      showToast(`✅ Ruta ${alt.algorithm} seleccionada`);
    });
    altList.appendChild(div);
  });

  // Tolls detail
  const tollsList = document.getElementById('tollsList');
  tollsList.innerHTML = '';
  if (main.tollNote) {
    tollsList.innerHTML = `<p style="font-size:12px;color:#7c8db0">ℹ️ ${main.tollNote}</p>`;
  } else if (main.tolls.length === 0) {
    tollsList.innerHTML = '<p style="font-size:12px;color:#7c8db0">Sin casetas en esta ruta.</p>';
  } else {
    main.tolls.forEach(t => {
      const div = document.createElement('div');
      div.className = 'toll-item';
      div.innerHTML = `
        <span class="toll-name">🛣️ ${t.name}<br><span style="font-size:10px;color:#7c8db0">${t.highway || t.state}</span></span>
        <span class="toll-price">$${t.cost} MXN</span>`;
      tollsList.appendChild(div);
    });
    const total = document.createElement('div');
    total.className = 'toll-item';
    total.innerHTML = `<span class="toll-name" style="font-weight:700">TOTAL casetas</span><span class="toll-price">$${main.tollCost} MXN</span>`;
    tollsList.appendChild(total);
  }

  // Fuel info internacional
  const fuelInfoEl = document.getElementById('fuelInfo');
  if (fuelInfoEl) {
    fuelInfoEl.innerHTML = `<p style="font-size:11px;color:#7c8db0;margin-top:4px">
      💱 Precio combustible: ${activeFuel.symbol}${activeFuel.priceUSD.toFixed(2)} USD/L · Moneda: ${activeFuel.currency}
    </p>`;
  }

  // Timezone
  const originState = originCoords?.state || '';
  const destState   = destCoords?.state || '';
  const tzOrigin = getTimezoneForState(originState);
  const tzDest   = getTimezoneForState(destState);
  const tzContent = document.getElementById('timezoneContent');
  const isIntl = (originCoords?.country || 'MX') !== (destCoords?.country || 'MX');

  if (isIntl) {
    tzContent.innerHTML = `
      <div class="timezone-box">
        <p>${getCountryFlag(originCoords?.country || 'MX')} Origen: <strong>${originCoords?.country || 'MX'}</strong></p>
        <p>${getCountryFlag(destCoords?.country   || 'MX')} Destino: <strong>${destCoords?.country   || 'MX'}</strong></p>
        <p style="color:#f59e0b;margin-top:6px">🌐 Ruta internacional — verifica requisitos de cruce de frontera.</p>
      </div>`;
  } else if (tzOrigin.zone !== tzDest.zone) {
    tzContent.innerHTML = `
      <div class="timezone-box">
        <p>📍 Origen: <strong>${tzOrigin.label}</strong></p>
        <p>🏁 Destino: <strong>${tzDest.label}</strong></p>
        <p style="color:#f59e0b;margin-top:6px">⚠️ Cambio de zona horaria en tu ruta.</p>
      </div>`;
  } else {
    tzContent.innerHTML = `<div class="timezone-box">🕐 Zona horaria: <strong>${tzOrigin.label}</strong></div>`;
  }

  // Arrival box
  document.getElementById('arrivalContent').innerHTML = `
    <div class="arrival-row"><span>Hora de salida</span><strong>${dep || '--:--'}</strong></div>
    <div class="arrival-row"><span>Duración estimada</span><strong>${formatTime(main.timeMin)}</strong></div>
    <div class="arrival-row"><span>Hora de llegada</span><strong>${arrTime}</strong></div>
    <div class="arrival-row"><span>Algoritmo usado</span><strong>${main.algorithm}</strong></div>
    ${isIntl ? '<div style="background:rgba(99,102,241,0.1);border:1px solid #6366f1;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#a5b4fc">🌐 Ruta internacional detectada.</div>' : ''}
    ${main.riskLevel > 0.5 ? '<div style="background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#fca5a5">⚠️ La ruta pasa cerca de zonas con alta incidencia delictiva.</div>' : ''}
  `;

  // Fuel check
  const fuelPctVal  = parseInt(fuelSlider.value);
  const fuelNeeded  = parseFloat(main.fuelL);
  const tankL       = 50 * (fuelPctVal / 100);
  if (tankL < fuelNeeded) {
    fuelAlert.style.display = 'block';
    fuelAlert.textContent = `⚠️ ¡Combustible insuficiente! Necesitas ${fuelNeeded}L y tienes ~${tankL.toFixed(0)}L. Recarga antes de salir.`;
  }

  document.getElementById('infoPanel').style.display = 'flex';
}

// ===== SIDEBAR TOGGLE =====
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('closeSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});
document.getElementById('closeInfo').addEventListener('click', () => {
  document.getElementById('infoPanel').style.display = 'none';
});

// ===== TOAST =====
function showToast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== INIT =====
drawRiskZones();
drawTollMarkers();
drawTraffic();
showToast('🌐 GPS Internacional cargado. Ingresa origen y destino.');
