/**
 * V2 Fleet Simulation (server) — deterministic fleet state, Oyu Tolgoi.
 *
 * Shared by /api/v2/fleet and /api/v2/query. Mirrors the cycle/status math
 * of v2/js/sim/FleetSimulator.js so the AI layer sees the same fleet the
 * browser renders. State is a pure function of time — no database, nothing
 * can break. Keep constants in sync with the frontend simulator when tuning.
 */

// Route lengths (m) from v2/data/routes.json (real OSM haul-road paths)
const ROUTES = {
    'RT-HAUL': { name: 'Pit → Primary Crusher', lengthM: 6208, from: 'Open Pit', to: 'Primary Crusher' },
    'RT-CAMP': { name: 'Camp → Pit', lengthM: 5322, from: 'Camp', to: 'Open Pit' },
    'RT-APT': { name: 'Camp → Airport', lengthM: 13357, from: 'Camp', to: 'Khanbumbat Airport' },
    'RT-TSF': { name: 'Concentrator → TSF', lengthM: 6845, from: 'Concentrator', to: 'Tailings Storage' },
    'RT-UG': { name: 'Camp → Shaft #1', lengthM: 3685, from: 'Camp', to: 'Shaft #1' }
};

const PRESETS = {
    haul:    { model: 'Komatsu 930E-4SE', speedLoaded: 7, speedEmpty: 11, loadS: 180, dumpS: 90, payloadT: 290 },
    water:   { model: 'CAT 785 Water Cart', speed: 8, dwellS: 60 },
    grader:  { model: 'CAT 24M Grader', speed: 4, dwellS: 120 },
    bus:     { model: 'Crew Bus', speed: 13, dwellS: 420 },
    service: { model: 'LV Service Ute', speed: 14, dwellS: 900 },
    lhd:     { model: 'Sandvik LH517i', speed: 3, payloadT: 17 }
};

const FLEET = [
    { id: 'HT-101', type: 'haul', route: 'RT-HAUL', offsetFrac: 0.00 },
    { id: 'HT-102', type: 'haul', route: 'RT-HAUL', offsetFrac: 0.17 },
    { id: 'HT-103', type: 'haul', route: 'RT-HAUL', offsetFrac: 0.33 },
    { id: 'HT-104', type: 'haul', route: 'RT-HAUL', offsetFrac: 0.50 },
    { id: 'HT-105', type: 'haul', route: 'RT-HAUL', offsetFrac: 0.67 },
    { id: 'HT-106', type: 'haul', route: 'RT-HAUL', offsetFrac: 0.83 },
    { id: 'WC-201', type: 'water', route: 'RT-HAUL', offsetFrac: 0.40 },
    { id: 'WC-202', type: 'water', route: 'RT-CAMP', offsetFrac: 0.10 },
    { id: 'GR-301', type: 'grader', route: 'RT-TSF', offsetFrac: 0.25 },
    { id: 'CB-401', type: 'bus', route: 'RT-CAMP', offsetFrac: 0.60 },
    { id: 'CB-402', type: 'bus', route: 'RT-APT', offsetFrac: 0.00 },
    { id: 'SV-501', type: 'service', route: 'RT-UG', offsetFrac: 0.45 },
    // Underground fleet — extraction level, no surface position
    { id: 'LH-501', type: 'lhd', drift: 2, offsetFrac: 0.0 },
    { id: 'LH-502', type: 'lhd', drift: 8, offsetFrac: 0.3 },
    { id: 'LH-503', type: 'lhd', drift: 14, offsetFrac: 0.6 },
    { id: 'LH-504', type: 'lhd', drift: 20, offsetFrac: 0.85 }
];

function statusOf(unit, tMs) {
    const hULN = (new Date(tMs).getUTCHours() + 8) % 24;
    const min = new Date(tMs).getUTCMinutes();

    switch (unit.id) {
        case 'HT-104':
            if (hULN >= 13 && hULN < 15) return 'maintenance';
            break;
        case 'HT-106':
            if (hULN >= 9 && hULN < 10) return 'down';
            break;
        case 'WC-202':
            if (min >= 40 && min < 50) return 'standby';
            break;
        case 'GR-301':
            if (hULN >= 20 && hULN < 22) return 'maintenance';
            break;
        case 'CB-402':
            if (!((hULN >= 8 && hULN < 11) || (hULN >= 16 && hULN < 19))) return 'standby';
            break;
        case 'LH-503':
            if (hULN >= 14 && hULN < 16) return 'maintenance';
            break;
        case 'LH-504':
            if (hULN >= 23 || hULN < 5) return 'standby';
            break;
    }
    if (unit.type === 'haul' && (hULN >= 22 || hULN < 5)) {
        if (['HT-102', 'HT-105'].includes(unit.id)) return 'standby';
    }
    return 'operating';
}

function unitState(unit, tMs) {
    if (unit.type === 'lhd') return lhdState(unit, tMs);
    const route = ROUTES[unit.route];
    const preset = PRESETS[unit.type];
    const status = statusOf(unit, tMs);
    const tS = tMs / 1000;

    let phase, dist = 0, speed = 0, loaded = false, cycleS;

    if (unit.type === 'haul') {
        const haulS = route.lengthM / preset.speedLoaded;
        const retS = route.lengthM / preset.speedEmpty;
        cycleS = preset.loadS + haulS + preset.dumpS + retS;
        let tc = (tS + unit.offsetFrac * cycleS) % cycleS;

        if (tc < preset.loadS) { phase = 'loading'; dist = 0; }
        else if ((tc -= preset.loadS) < haulS) { phase = 'hauling'; dist = tc * preset.speedLoaded; speed = preset.speedLoaded; loaded = true; }
        else if ((tc -= haulS) < preset.dumpS) { phase = 'dumping'; dist = route.lengthM; }
        else { phase = 'returning'; dist = route.lengthM - (tc - preset.dumpS) * preset.speedEmpty; speed = preset.speedEmpty; }
    } else {
        const legS = route.lengthM / preset.speed;
        cycleS = 2 * (legS + preset.dwellS);
        let tc = (tS + unit.offsetFrac * cycleS) % cycleS;

        if (tc < legS) { phase = 'outbound'; dist = tc * preset.speed; speed = preset.speed; }
        else if ((tc -= legS) < preset.dwellS) { phase = 'dwell'; dist = route.lengthM; }
        else if ((tc -= preset.dwellS) < legS) { phase = 'inbound'; dist = route.lengthM - tc * preset.speed; speed = preset.speed; }
        else { phase = 'dwell'; dist = 0; }
    }

    if (status !== 'operating') {
        speed = 0;
        loaded = false;
        if (status === 'standby') { dist = 0; phase = 'parked'; }
        else phase = status;
    }

    const progressPct = Math.round(dist / route.lengthM * 100);
    // Human-readable location for LLM grounding
    let location;
    if (progressPct <= 2) location = `at ${route.from}`;
    else if (progressPct >= 98) location = `at ${route.to}`;
    else location = `${progressPct}% along ${route.name}`;

    return {
        id: unit.id,
        model: preset.model,
        type: unit.type,
        routeId: unit.route,
        routeName: route.name,
        status, phase, location,
        speedKmh: Math.round(speed * 3.6),
        payloadT: loaded ? PRESETS.haul.payloadT : 0,
        progressPct,
        cycleS: Math.round(cycleS)
    };
}

/** Underground LHD: 95 s muck→tram cycle on its extraction drift. */
function lhdState(unit, tMs) {
    const preset = PRESETS.lhd;
    const status = statusOf(unit, tMs);
    const CYCLE_S = 95;
    const tc = ((tMs / 1000 + unit.offsetFrac * CYCLE_S) % CYCLE_S) / CYCLE_S;
    let phase = tc < 0.5 ? 'mucking' : 'tramming';
    if (status !== 'operating') phase = status === 'standby' ? 'parked' : status;

    return {
        id: unit.id,
        model: preset.model,
        type: 'lhd',
        routeId: null,
        routeName: `Extraction level — drift ${unit.drift}`,
        status, phase,
        location: `underground, extraction level (−1,300 m), drift ${unit.drift}`,
        speedKmh: status === 'operating' ? Math.round(preset.speed * 3.6) : 0,
        payloadT: status === 'operating' && tc >= 0.5 ? preset.payloadT : 0,
        progressPct: Math.round(tc * 100),
        cycleS: CYCLE_S,
        underground: true
    };
}

/** Full fleet snapshot at time t. */
export function getFleetState(tMs = Date.now()) {
    return FLEET.map(u => unitState(u, tMs));
}

/** KPIs matching the browser's KPI band (throughput from haul trucks only). */
export function getKPIs(tMs = Date.now()) {
    const fleet = getFleetState(tMs);
    const operating = fleet.filter(u => u.status === 'operating').length;
    const down = fleet.filter(u => u.status === 'down');
    const throughput = fleet
        .filter(u => u.type === 'haul' && u.status === 'operating')
        .reduce((sum, u) => sum + PRESETS.haul.payloadT / u.cycleS * 3600, 0);
    return {
        throughputTph: Math.round(throughput / 10) * 10,
        operating,
        total: fleet.length,
        utilisationPct: Math.round(operating / fleet.length * 100),
        activeAlerts: down.length
    };
}
