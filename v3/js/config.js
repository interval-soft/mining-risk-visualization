/**
 * DigitalTwin v3 — ePTW Configuration
 * HMCCP: Heidelberg Materials Carbon Capture Project, Padeswood, Wales.
 * Functional basis: Worley PTW Procedure 215000-00190-000-HS-PRO-00002 RevB.
 */

export const SITE = {
    name: 'HMCCP — Padeswood',
    client: 'Heidelberg Materials · Worley/MHI',
    center: [-3.0568, 53.1517],
    defaultZoom: 15.2,
    minZoom: 10,
    maxZoom: 19,
    timeZone: 'Europe/London',
    timeLabel: 'UK'
};

export const TILES = {
    satellite: {
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
    }
};

/**
 * Permit types — colours follow the HMCCP Permit Request Form coding
 * (Excavation black, Cold Work blue, Hot Work red, Other green).
 * Validity per §4.1.
 */
export const PERMIT_TYPES = {
    cold_work:             { label: 'Cold Work', color: '#4a90d9', validity: '7 days', validityH: 168, form: 'blue' },
    hot_work_civil:        { label: 'Hot Work (Early Works)', color: '#d95757', validity: '7 days', validityH: 168, form: 'red' },
    hot_work_construction: { label: 'Hot Work (Construction)', color: '#c23030', validity: '24 h', validityH: 24, form: 'red' },
    confined_space:        { label: 'Confined Space Entry', color: '#3fae6a', validity: '1 shift', validityH: 12, form: 'green' },
    excavation:            { label: 'Excavation', color: '#2b2f33', validity: '7 days', validityH: 168, form: 'black' },
    piling:                { label: 'Excavation (Piling)', color: '#4d4d55', validity: '7 days', validityH: 168, form: 'black' }
};

/** Lifecycle states — Set To Work §5 + §6.2 */
export const PERMIT_STATUS = {
    requested:  { label: 'Requested', tone: 'muted' },
    reviewed:   { label: 'Reviewed', tone: 'muted' },
    verified:   { label: 'Verified', tone: 'muted' },
    authorised: { label: 'Authorised', tone: 'standby' },
    issued:     { label: 'Issued · Active', tone: 'operating' },
    suspended:  { label: 'Suspended', tone: 'down' },
    closed:     { label: 'Closed', tone: 'muted' },
    withdrawn:  { label: 'Withdrawn', tone: 'down' },
    expired:    { label: 'Expired', tone: 'down' }
};

/** PTW roles — approval chain WA → AA → PI, then PA acceptance (§2) */
export const ROLES = [
    { id: 'WA', name: 'Work Authority' },
    { id: 'AA', name: 'Area Authority' },
    { id: 'PI', name: 'Permit Issuer' },
    { id: 'PA', name: 'Performing Authority' }
];

export const DATA_URLS = {
    cwa: '/v3/data/cwa.geojson',
    buildings: '/v3/data/buildings.geojson',
    infrastructure: '/v3/data/infrastructure.geojson',
    areas: '/v3/data/areas.geojson'
};
