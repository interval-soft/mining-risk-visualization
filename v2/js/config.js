/**
 * DigitalTwin v2 — Configuration
 * Oyu Tolgoi mine site, Ömnögovi, Mongolia.
 * All coordinates are [lng, lat] (MapLibre convention).
 */

export const SITE = {
    name: 'Oyu Tolgoi',
    operator: 'Newman Iron Operations', // demo operator branding
    center: [106.858, 43.025],
    bounds: [[106.79, 42.97], [106.94, 43.16]], // [sw, ne]
    defaultZoom: 12.6,
    minZoom: 9,
    maxZoom: 18
};

/**
 * Curated immovable assets (from OSM survey + NI 43-101).
 * Each entry drives the asset rail, fly-to targets and detail panel.
 */
export const KEY_ASSETS = [
    { id: 'PIT-SW', name: 'Open Pit — Southwest Oyu', type: 'pit', icon: 'ph-circles-three',
      lngLat: [106.8516, 43.0085], zoom: 14.2, pitch: 55,
      facts: { 'Dimensions': '2.56 × 1.74 km', 'Depth': '~466 m', 'Benches': '15 m' } },
    { id: 'SH-01', name: 'Shaft #1', type: 'shaft', icon: 'ph-elevator',
      lngLat: [106.8558, 43.0342], zoom: 15.5, pitch: 55,
      facts: { 'Diameter': '6.7 m', 'Depth': '1,385 m', 'Role': 'Production / services' } },
    { id: 'SH-02', name: 'Shaft #2 (winding)', type: 'shaft', icon: 'ph-elevator',
      lngLat: [106.8458, 43.0380], zoom: 15.5, pitch: 55,
      facts: { 'Diameter': '10 m', 'Depth': '1,284 m', 'Role': 'Ore hoisting' } },
    { id: 'SH-05', name: 'Shaft #5 (ventilation)', type: 'shaft', icon: 'ph-wind',
      lngLat: [106.8472, 43.0357], zoom: 15.5, pitch: 55,
      facts: { 'Diameter': '6.7 m', 'Depth': '1,178 m', 'Role': 'Exhaust ventilation' } },
    { id: 'CON-01', name: 'Concentrator', type: 'plant', icon: 'ph-factory',
      lngLat: [106.8327, 43.0487], zoom: 15.2, pitch: 50,
      facts: { 'Throughput': '100,000 t/day', 'Levels': '6 (25 m)', 'Output': 'Cu concentrate' } },
    { id: 'DOM-01', name: 'Coarse Ore Stockpile Dome', type: 'plant', icon: 'ph-igloo',
      lngLat: [106.8394, 43.0487], zoom: 15.5, pitch: 50,
      facts: { 'Height': '45 m', 'Feed': 'Overland conveyor' } },
    { id: 'TSF-01', name: 'Tailings Storage Facility', type: 'tsf', icon: 'ph-waves',
      lngLat: [106.90, 43.04], zoom: 13.5, pitch: 40,
      facts: { 'Cells': 'Multiple', 'Monitoring': 'Piezometers (planned)' } },
    { id: 'CMP-01', name: 'Camp & Administration', type: 'camp', icon: 'ph-buildings',
      lngLat: [106.826, 43.043], zoom: 15.0, pitch: 45,
      facts: { 'Population': '~20,000 (site-wide)', 'Facilities': 'Dorms, mess, admin' } },
    { id: 'APT-01', name: 'Khanbumbat Airport', type: 'airport', icon: 'ph-airplane-tilt',
      lngLat: [106.8464, 43.1348], zoom: 13.8, pitch: 0,
      facts: { 'ICAO': 'ZMKB', 'Runway': 'Paved', 'Rank': '2nd busiest in Mongolia' } },
    { id: 'UG-HN', name: 'Hugo North Block Cave', type: 'underground', icon: 'ph-stack',
      lngLat: [106.855, 43.036], zoom: 14.0, pitch: 0,
      facts: { 'Depth': '1,300 m', 'Drawpoints': '2,231', 'Capacity': '95,000 t/day', 'Tunnels': '~200 km' },
      underground: true }
];

/** Basemap & terrain sources ($0, attribution required) */
export const TILES = {
    satellite: {
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
    },
    terrain: {
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 14,
        encoding: 'terrarium',
        attribution: 'Terrain: Mapzen/AWS Open Data (SRTM)'
    }
};

/**
 * ISA-101 palette — colour carries STATUS ONLY.
 * Structural greys live in CSS; these are shared with map layers.
 */
export const COLORS = {
    // Semantic status (GMG time model)
    operating: '#4caf7d',
    standby: '#d9a441',
    down: '#d95757',
    maintenance: '#5b8dbe',
    // Neutral map ink (desaturated, reads on satellite)
    ink: '#e8ecef',
    inkDim: 'rgba(232, 236, 239, 0.55)',
    buildingFill: '#8d99a4',
    shaftFill: '#b7c2cc',
    roadLine: 'rgba(240, 243, 245, 0.5)',
    conveyorLine: '#9d8fc4',
    pitOutline: 'rgba(240, 243, 245, 0.75)'
};

export const DATA_URLS = {
    areas: 'data/areas.geojson',
    buildings: 'data/buildings.geojson',
    infrastructure: 'data/infrastructure.geojson',
    points: 'data/points.geojson'
};
