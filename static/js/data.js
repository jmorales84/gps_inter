// ============================================================
// DATA.JS — Datos de casetas, zonas de riesgo y ciudades
// Versión Internacional + México
// ============================================================

const VEHICLE_FACTORS = {
  auto:   { tolls: 1.0, fuel: 1.0, label: 'Automóvil' },
  moto:   { tolls: 0.5, fuel: 0.5, label: 'Motocicleta' },
  camion: { tolls: 2.5, fuel: 3.2, label: 'Camión' },
  taxi:   { tolls: 1.0, fuel: 1.0, label: 'Taxi / Autos de alquiler' }
};

// Precio combustible por país (USD por litro aprox)
const FUEL_BY_COUNTRY = {
  MX: { priceMXN: 23.50, priceUSD: 1.24, consumption: 0.10, currency: 'MXN', symbol: '$' },
  US: { priceMXN: null,  priceUSD: 0.95, consumption: 0.09, currency: 'USD', symbol: '$' },
  ES: { priceMXN: null,  priceUSD: 1.65, consumption: 0.08, currency: 'EUR', symbol: '€' },
  FR: { priceMXN: null,  priceUSD: 1.75, consumption: 0.08, currency: 'EUR', symbol: '€' },
  DE: { priceMXN: null,  priceUSD: 1.80, consumption: 0.08, currency: 'EUR', symbol: '€' },
  AR: { priceMXN: null,  priceUSD: 0.75, consumption: 0.10, currency: 'ARS', symbol: '$' },
  CO: { priceMXN: null,  priceUSD: 0.55, consumption: 0.10, currency: 'COP', symbol: '$' },
  BR: { priceMXN: null,  priceUSD: 1.10, consumption: 0.10, currency: 'BRL', symbol: 'R$' },
  DEFAULT: { priceMXN: null, priceUSD: 1.20, consumption: 0.09, currency: 'USD', symbol: '$' }
};

// Fuel activo (se actualiza según el país de la ruta)
let FUEL = { ...FUEL_BY_COUNTRY.MX };

// ============================================================
// CASETAS REALES — CAPUFE tarifa 2024 para automóvil
// Ahora con campo 'highway' para asociarlas a la autopista real
// ============================================================
// Coordenadas corregidas: punto sobre la autopista de cuota (no en el centro de la ciudad)
const TOLL_BOOTHS = [
  // ── CDMX – Querétaro (Autopista 57D) ──────────────────────────────────────
  { id:'t01', name:'Caseta Tepotzotlán',       lat:19.7050, lng:-99.2280,  autoMXN:105, state:'Estado de México', country:'MX', highway:'57D México-Querétaro' },
  { id:'t12', name:'Caseta Jilotepec',          lat:19.9530, lng:-99.5760,  autoMXN:80,  state:'Estado de México', country:'MX', highway:'57D México-Querétaro' },
  { id:'t11', name:'Caseta Palmillas',          lat:20.2580, lng:-99.9610,  autoMXN:102, state:'Querétaro',        country:'MX', highway:'57D México-Querétaro' },
  { id:'t13', name:'Caseta Querétaro',          lat:20.6230, lng:-100.4010, autoMXN:105, state:'Querétaro',        country:'MX', highway:'57D México-Querétaro' },

  // ── CDMX – Guadalajara (Autopista 15D) ────────────────────────────────────
  { id:'t03', name:'Caseta El Limón',           lat:19.3890, lng:-99.3580,  autoMXN:80,  state:'Estado de México', country:'MX', highway:'15D CDMX-Toluca' },
  { id:'t25', name:'Caseta Irapuato',           lat:20.6540, lng:-101.4020, autoMXN:55,  state:'Guanajuato',       country:'MX', highway:'45D Qro-Guadalajara' },
  { id:'t26', name:'Caseta Salamanca',          lat:20.5500, lng:-101.2200, autoMXN:40,  state:'Guanajuato',       country:'MX', highway:'45D Qro-Guadalajara' },
  { id:'t05', name:'Caseta Zapotlanejo',        lat:20.6180, lng:-102.9080, autoMXN:86,  state:'Jalisco',          country:'MX', highway:'15D Gdl-México' },
  { id:'t06', name:'Caseta La Barca',           lat:20.2770, lng:-102.5700, autoMXN:68,  state:'Jalisco',          country:'MX', highway:'15D Gdl-México' },
  { id:'t07', name:'Caseta Camacho',            lat:20.5050, lng:-102.2940, autoMXN:110, state:'Michoacán',        country:'MX', highway:'15D Gdl-México' },

  // ── CDMX – Puebla (Autopista 150D) ────────────────────────────────────────
  { id:'t08', name:'Caseta Río Frío',           lat:19.3260, lng:-98.7460,  autoMXN:57,  state:'Estado de México', country:'MX', highway:'150D CDMX-Puebla' },
  { id:'t09', name:'Caseta San Marcos',         lat:19.2020, lng:-98.3870,  autoMXN:35,  state:'Puebla',           country:'MX', highway:'150D CDMX-Puebla' },
  { id:'t10', name:'Caseta Cholula',            lat:19.0780, lng:-98.3240,  autoMXN:24,  state:'Puebla',           country:'MX', highway:'150D CDMX-Puebla' },

  // ── CDMX – Cuernavaca (Autopista 95D) ─────────────────────────────────────
  { id:'t17', name:'Caseta Tlalpan',            lat:19.2700, lng:-99.1760,  autoMXN:38,  state:'CDMX',             country:'MX', highway:'95D CDMX-Cuernavaca' },
  { id:'t18', name:'Caseta Cuernavaca',         lat:18.9700, lng:-99.2270,  autoMXN:80,  state:'Morelos',          country:'MX', highway:'95D CDMX-Cuernavaca' },

  // ── Puebla – Veracruz (Autopista 150D) ────────────────────────────────────
  { id:'t20', name:'Caseta Orizaba',            lat:18.8380, lng:-97.1460,  autoMXN:42,  state:'Veracruz',         country:'MX', highway:'150D Puebla-Veracruz' },
  { id:'t19', name:'Caseta Córdoba',            lat:18.9070, lng:-96.9190,  autoMXN:86,  state:'Veracruz',         country:'MX', highway:'150D Puebla-Veracruz' },

  // ── CDMX – Monterrey (Autopista 57D) ──────────────────────────────────────
  { id:'t24', name:'Caseta San Luis Potosí',    lat:22.0980, lng:-100.8920, autoMXN:120, state:'San Luis Potosí',  country:'MX', highway:'57D CDMX-Monterrey' },
  { id:'t23', name:'Caseta Matehuala',          lat:23.5860, lng:-100.5960, autoMXN:88,  state:'San Luis Potosí',  country:'MX', highway:'57D CDMX-Monterrey' },
  { id:'t28', name:'Caseta Dr. Arroyo',         lat:23.8500, lng:-100.1700, autoMXN:72,  state:'Nuevo León',       country:'MX', highway:'57D CDMX-Monterrey' },

  // ── Monterrey – Saltillo (Autopista 40D) ──────────────────────────────────
  { id:'t14', name:'Caseta Rinconada',          lat:25.5970, lng:-100.4270, autoMXN:42,  state:'Nuevo León',       country:'MX', highway:'40D Mty-Saltillo' },
  { id:'t16', name:'Caseta Saltillo Oriente',   lat:25.4440, lng:-100.7920, autoMXN:67,  state:'Coahuila',         country:'MX', highway:'40D Mty-Saltillo' },

  // ── Guadalajara – Tepic (Autopista 15D) ───────────────────────────────────
  { id:'t02', name:'Caseta La Venta',           lat:20.8460, lng:-103.8780, autoMXN:50,  state:'Jalisco',          country:'MX', highway:'15D Gdl-Tepic' },
  { id:'t21', name:'Caseta Chapalilla',         lat:21.1600, lng:-104.2650, autoMXN:130, state:'Nayarit',          country:'MX', highway:'15D Gdl-Tepic' },
  { id:'t22', name:'Caseta Tepic Norte',        lat:21.5540, lng:-104.9160, autoMXN:75,  state:'Nayarit',          country:'MX', highway:'15D Gdl-Tepic' },

  // ── CDMX – Tampico (Autopista 85D) ────────────────────────────────────────
  { id:'t29', name:'Caseta Ciudad Valles',      lat:21.9700, lng:-99.0280,  autoMXN:90,  state:'San Luis Potosí',  country:'MX', highway:'85D CDMX-Tampico' },
  { id:'t30', name:'Caseta Tamazunchale',       lat:21.2650, lng:-98.7820,  autoMXN:65,  state:'San Luis Potosí',  country:'MX', highway:'85D CDMX-Tampico' },

  // ── Chamapa – Lechería ─────────────────────────────────────────────────────
  { id:'t04', name:'Caseta Chamapa',            lat:19.5380, lng:-99.3060,  autoMXN:96,  state:'Estado de México', country:'MX', highway:'Chamapa-Lechería' },

  // ── Nuevo Laredo – Monterrey (Autopista 85D) ──────────────────────────────
  { id:'t27', name:'Caseta Monterrey Norte',    lat:25.8500, lng:-100.1900, autoMXN:145, state:'Nuevo León',       country:'MX', highway:'85D Laredo-Monterrey' },
  { id:'t15', name:'Caseta Ciénega de Flores',  lat:25.9600, lng:-100.1500, autoMXN:28,  state:'Nuevo León',       country:'MX', highway:'85D Laredo-Monterrey' },
];

// ============================================================
// ZONAS ROJAS — Basadas en datos SESNSP / incidencia delictiva 2024
// ============================================================
const RISK_ZONES = [
  { id:'r01', name:'Colima - Alta violencia',    lat:19.2437, lng:-103.7241, radius:18, level:'extreme', description:'Municipios de Colima y Villa de Álvarez. Zona con máxima incidencia de homicidios (SESNSP 2024).' },
  { id:'r02', name:'Manzanillo - Costa',         lat:19.1016, lng:-104.3318, radius:12, level:'high',    description:'Zona portuaria con actividad criminal activa.' },
  { id:'r03', name:'Chilpancingo - Guerrero',    lat:17.5500, lng:-99.5000,  radius:25, level:'extreme', description:'Guerrero: estado con mayor número de homicidios. Chilpancingo y región sierra.' },
  { id:'r04', name:'Acapulco',                   lat:16.8634, lng:-99.8809,  radius:20, level:'extreme', description:'Acapulco en primeros lugares de homicidios dolosos en México.' },
  { id:'r05', name:'Iguala - Guerrero',          lat:18.3454, lng:-99.5393,  radius:15, level:'high',    description:'Zona de alta incidencia delictiva y violencia.' },
  { id:'r06', name:'Uruapan - Michoacán',        lat:19.4196, lng:-102.0574, radius:20, level:'extreme', description:'Una de las ciudades más violentas. Fuerte presencia de crimen organizado.' },
  { id:'r07', name:'Zamora - Michoacán',         lat:19.9867, lng:-102.2833, radius:15, level:'high',    description:'Altos índices de homicidio y extorsión.' },
  { id:'r08', name:'Apatzingán',                 lat:19.0865, lng:-102.3519, radius:12, level:'extreme', description:'Tierra Caliente Michoacán — zona de alto riesgo.' },
  { id:'r09', name:'Tijuana - BC',               lat:32.5149, lng:-117.0382, radius:22, level:'high',    description:'Tijuana registra miles de homicidios. Mayor violencia en zonas periféricas.' },
  { id:'r10', name:'Ensenada - BC',              lat:31.8667, lng:-116.5966, radius:12, level:'medium',  description:'Incidencia media-alta de delitos.' },
  { id:'r11', name:'Celaya - Guanajuato',        lat:20.5234, lng:-100.8154, radius:18, level:'extreme', description:'Guanajuato lidera robos con violencia y homicidios. Celaya zona crítica.' },
  { id:'r12', name:'Salamanca - Guanajuato',     lat:20.5731, lng:-101.1935, radius:12, level:'high',    description:'Alta presencia criminal — huachicoleros y crimen organizado.' },
  { id:'r13', name:'León - Guanajuato',          lat:21.1244, lng:-101.6863, radius:15, level:'medium',  description:'Índice de robos y extorsiones elevado.' },
  { id:'r14', name:'Tlaquepaque - Jalisco',      lat:20.6424, lng:-103.3108, radius:14, level:'high',    description:'Municipio con alta incidencia delictiva en área metropolitana Guadalajara.' },
  { id:'r15', name:'Tonalá - Jalisco',           lat:20.6236, lng:-103.2347, radius:10, level:'medium',  description:'Robo a transeúnte y a negocio frecuente.' },
  { id:'r16', name:'Coatzacoalcos - Ver.',       lat:18.1500, lng:-94.4500,  radius:14, level:'high',    description:'Alta incidencia de homicidios y extorsión en zona industrial.' },
  { id:'r17', name:'Xalapa - Veracruz',          lat:19.5438, lng:-96.9269,  radius:10, level:'medium',  description:'Robos con violencia — zona periurbana.' },
  { id:'r18', name:'Juárez - Chihuahua',         lat:31.6904, lng:-106.4245, radius:20, level:'high',    description:'Ciudad Juárez con alta incidencia de violencia y tráfico.' },
  { id:'r19', name:'Chihuahua ciudad',           lat:28.6353, lng:-106.0889, radius:14, level:'medium',  description:'Incidencia media de delitos del fuero común.' },
  { id:'r20', name:'Reynosa - Tamaulipas',       lat:26.0797, lng:-98.2954,  radius:16, level:'extreme', description:'Tamaulipas con alertas de viaje de nivel 4 (USA). Crimen organizado activo.' },
  { id:'r21', name:'Matamoros - Tamaulipas',     lat:25.8693, lng:-97.5036,  radius:12, level:'extreme', description:'Zona fronteriza con alta peligrosidad.' },
  { id:'r22', name:'Nuevo Laredo',               lat:27.4767, lng:-99.5167,  radius:12, level:'high',    description:'Ciudad fronteriza — actividad del crimen organizado.' },
  { id:'r23', name:'Ecatepec - Edomex',          lat:19.6010, lng:-99.0503,  radius:16, level:'high',    description:'Ecatepec: mayor incidencia de robos en la ZMC México.' },
  { id:'r24', name:'Valle de Chalco',            lat:19.2943, lng:-98.9544,  radius:12, level:'high',    description:'Alto índice de asalto a transporte público y robo a transeúnte.' },
  { id:'r25', name:'Naucalpan - Edomex',         lat:19.4742, lng:-99.2372,  radius:10, level:'medium',  description:'Robos en carretera y asaltos frecuentes.' },
  { id:'r26', name:'Iztapalapa - CDMX',          lat:19.3574, lng:-99.0573,  radius:12, level:'medium',  description:'Alta tasa de robos en zona comercial.' },
  { id:'r27', name:'Tepito - CDMX',              lat:19.4476, lng:-99.1333,  radius:4,  level:'high',    description:'Zona de alto riesgo — Barrio Bravo.' },
  { id:'r28', name:'Culiacán - Sinaloa',         lat:24.8091, lng:-107.3940, radius:18, level:'high',    description:'Culiacán con altos índices de homicidio.' },
  { id:'r29', name:'Mazatlán - Sinaloa',         lat:23.2494, lng:-106.4111, radius:10, level:'medium',  description:'Zona turística con incidencia media.' },
  { id:'r30', name:'Zacatecas ciudad',           lat:22.7709, lng:-102.5832, radius:15, level:'extreme', description:'Zacatecas escaló al primer lugar en homicidios per cápita en 2023.' },
  { id:'r31', name:'Fresnillo - Zacatecas',      lat:23.1716, lng:-102.8706, radius:12, level:'extreme', description:'Fresnillo figura entre los municipios más peligrosos de México.' },
];

// ============================================================
// CIUDADES MEXICANAS para autocompletado (backup offline)
// ============================================================
const MX_CITIES = [
  { name:'Ciudad de México', state:'CDMX', lat:19.4326, lng:-99.1332, country:'MX' },
  { name:'Guadalajara', state:'Jalisco', lat:20.6597, lng:-103.3496, country:'MX' },
  { name:'Monterrey', state:'Nuevo León', lat:25.6866, lng:-100.3161, country:'MX' },
  { name:'Puebla', state:'Puebla', lat:19.0414, lng:-98.2063, country:'MX' },
  { name:'Tijuana', state:'Baja California', lat:32.5149, lng:-117.0382, country:'MX' },
  { name:'León', state:'Guanajuato', lat:21.1244, lng:-101.6863, country:'MX' },
  { name:'Juárez', state:'Chihuahua', lat:31.6904, lng:-106.4245, country:'MX' },
  { name:'Mérida', state:'Yucatán', lat:20.9674, lng:-89.5926, country:'MX' },
  { name:'San Luis Potosí', state:'San Luis Potosí', lat:22.1565, lng:-100.9855, country:'MX' },
  { name:'Aguascalientes', state:'Aguascalientes', lat:21.8853, lng:-102.2916, country:'MX' },
  { name:'Hermosillo', state:'Sonora', lat:29.0729, lng:-110.9559, country:'MX' },
  { name:'Saltillo', state:'Coahuila', lat:25.4232, lng:-100.9896, country:'MX' },
  { name:'Mexicali', state:'Baja California', lat:32.6245, lng:-115.4523, country:'MX' },
  { name:'Culiacán', state:'Sinaloa', lat:24.8091, lng:-107.3940, country:'MX' },
  { name:'Acapulco', state:'Guerrero', lat:16.8634, lng:-99.8809, country:'MX' },
  { name:'Tepic', state:'Nayarit', lat:21.5042, lng:-104.8953, country:'MX' },
  { name:'Chihuahua', state:'Chihuahua', lat:28.6353, lng:-106.0889, country:'MX' },
  { name:'Morelia', state:'Michoacán', lat:19.7060, lng:-101.1950, country:'MX' },
  { name:'Querétaro', state:'Querétaro', lat:20.5888, lng:-100.3878, country:'MX' },
  { name:'Veracruz', state:'Veracruz', lat:19.1814, lng:-96.1429, country:'MX' },
  { name:'Cancún', state:'Quintana Roo', lat:21.1743, lng:-86.8466, country:'MX' },
  { name:'Toluca', state:'Estado de México', lat:19.2926, lng:-99.6573, country:'MX' },
  { name:'Torreón', state:'Coahuila', lat:25.5428, lng:-103.4068, country:'MX' },
  { name:'Durango', state:'Durango', lat:24.0277, lng:-104.6532, country:'MX' },
  { name:'Oaxaca', state:'Oaxaca', lat:17.0732, lng:-96.7266, country:'MX' },
  { name:'Zacatecas', state:'Zacatecas', lat:22.7709, lng:-102.5832, country:'MX' },
  { name:'Colima', state:'Colima', lat:19.2437, lng:-103.7241, country:'MX' },
  { name:'Manzanillo', state:'Colima', lat:19.0535, lng:-104.3319, country:'MX' },
  { name:'La Paz', state:'Baja California Sur', lat:24.1426, lng:-110.3128, country:'MX' },
  { name:'Villahermosa', state:'Tabasco', lat:17.9892, lng:-92.9475, country:'MX' },
  { name:'Tuxtla Gutiérrez', state:'Chiapas', lat:16.7516, lng:-93.1152, country:'MX' },
  { name:'Playa del Carmen', state:'Quintana Roo', lat:20.6296, lng:-87.0739, country:'MX' },
  { name:'Mazatlán', state:'Sinaloa', lat:23.2494, lng:-106.4111, country:'MX' },
  { name:'Puerto Vallarta', state:'Jalisco', lat:20.6534, lng:-105.2253, country:'MX' },
  { name:'Tultepec', state:'Estado de México', lat:19.6916, lng:-99.1280, country:'MX' },
  { name:'Pachuca', state:'Hidalgo', lat:20.1011, lng:-98.7591, country:'MX' },
  { name:'Reynosa', state:'Tamaulipas', lat:26.0797, lng:-98.2954, country:'MX' },
  { name:'Matamoros', state:'Tamaulipas', lat:25.8693, lng:-97.5036, country:'MX' },
  { name:'Nuevo Laredo', state:'Tamaulipas', lat:27.4767, lng:-99.5167, country:'MX' },
  { name:'Tampico', state:'Tamaulipas', lat:22.2475, lng:-97.8567, country:'MX' },
  { name:'Apatzingán', state:'Michoacán', lat:19.0865, lng:-102.3519, country:'MX' },
  { name:'Uruapan', state:'Michoacán', lat:19.4196, lng:-102.0574, country:'MX' },
  { name:'Zamora', state:'Michoacán', lat:19.9867, lng:-102.2833, country:'MX' },
  { name:'Chilpancingo', state:'Guerrero', lat:17.5500, lng:-99.5000, country:'MX' },
];

// ============================================================
// ZONAS HORARIAS MÉXICO
// ============================================================
const MX_TIMEZONES = [
  { zone:'America/Mexico_City',  label:'Centro (UTC-6)',        states:['CDMX','Estado de México','Jalisco','Nuevo León','Puebla','Veracruz','Hidalgo','Guanajuato','Oaxaca','Querétaro','San Luis Potosí','Tabasco','Tamaulipas','Tlaxcala','Guerrero','Morelos','Aguascalientes','Colima','Michoacán','Nayarit','Durango','Zacatecas','Chiapas','Campeche','Yucatán','Chihuahua'] },
  { zone:'America/Hermosillo',   label:'Pacífico (UTC-7)',       states:['Sonora'] },
  { zone:'America/Tijuana',      label:'Pacífico Norte (UTC-8)', states:['Baja California'] },
  { zone:'America/La_Paz',       label:'Montaña (UTC-7)',        states:['Baja California Sur','Sinaloa'] },
  { zone:'America/Cancun',       label:'Sureste (UTC-6 fijo)',   states:['Quintana Roo'] },
];

function getTimezoneForState(state) {
  for (const tz of MX_TIMEZONES) {
    if (tz.states.includes(state)) return tz;
  }
  return MX_TIMEZONES[0];
}

// ============================================================
// DETECCIÓN DE PAÍS según coordenadas (bounding boxes)
// ============================================================
function detectCountry(lat, lng) {
  if (lat >= 14.5 && lat <= 32.7 && lng >= -117.1 && lng <= -86.7) return 'MX';
  if (lat >= 24.4 && lat <= 49.4 && lng >= -125.0 && lng <= -66.9) return 'US';
  if (lat >= 35.9 && lat <= 43.8 && lng >= -9.3 && lng <= 4.3)     return 'ES';
  if (lat >= 41.3 && lat <= 51.1 && lng >= -5.1 && lng <= 9.6)     return 'FR';
  if (lat >= 47.3 && lat <= 55.1 && lng >= 6.0 && lng <= 15.0)     return 'DE';
  if (lat >= -55.0 && lat <= -21.8 && lng >= -73.6 && lng <= -34.0) return 'BR';
  if (lat >= -55.0 && lat <= -21.8 && lng >= -73.6 && lng <= -53.7) return 'AR';
  if (lat >= -4.2  && lat <= 12.5  && lng >= -77.0 && lng <= -66.9) return 'CO';
  return 'DEFAULT';
}

function getFuelForRoute(originLat, originLng, destLat, destLng) {
  const c1 = detectCountry(originLat, originLng);
  const c2 = detectCountry(destLat, destLng);
  // Usar el país de origen si ambos son distintos
  const country = (c1 === c2) ? c1 : c1;
  return FUEL_BY_COUNTRY[country] || FUEL_BY_COUNTRY.DEFAULT;
}
