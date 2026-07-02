/**
 * FleetSimulator — deterministic fleet simulation.
 *
 * State is a pure function of wall-clock time: `getFleetState(t)` returns the
 * same answer for the same t on any client or server. No accumulated state,
 * no drift, nothing to persist — the demo can never break.
 *
 * NOTE: api/v2/fleet.js mirrors the cycle/status math server-side for AI
 * grounding. Keep constants in sync when tuning.
 */

/** Unit type presets (speeds m/s, dwell seconds, payload tonnes) */
const PRESETS = {
    haul:    { model: 'Komatsu 930E-4SE', speedLoaded: 7, speedEmpty: 11, loadS: 180, dumpS: 90, payloadT: 290 },
    water:   { model: 'CAT 785 Water Cart', speed: 8, dwellS: 60 },
    grader:  { model: 'CAT 24M Grader', speed: 4, dwellS: 120 },
    bus:     { model: 'Crew Bus', speed: 13, dwellS: 420 },
    service: { model: 'LV Service Ute', speed: 14, dwellS: 900 }
};

/** Fleet definition — routes reference v2/data/routes.json ids */
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
    { id: 'SV-501', type: 'service', route: 'RT-UG', offsetFrac: 0.45 }
];

export class FleetSimulator {
    /** @param {Object} routesData - parsed v2/data/routes.json */
    constructor(routesData) {
        this.routes = new Map();
        for (const r of routesData.routes) {
            this.routes.set(r.id, this._prepareRoute(r));
        }
        this.units = FLEET.filter(u => this.routes.has(u.route));
    }

    /** Precompute cumulative distances for fast interpolation. */
    _prepareRoute(route) {
        const cum = [0];
        const M_LAT = 111320, M_LNG = 111320 * Math.cos(43.05 * Math.PI / 180);
        for (let i = 1; i < route.path.length; i++) {
            const [x1, y1] = route.path[i - 1], [x2, y2] = route.path[i];
            cum.push(cum[i - 1] + Math.hypot((x2 - x1) * M_LNG, (y2 - y1) * M_LAT));
        }
        // IMPORTANT: cycle math uses the integer lengthM from routes.json, NOT
        // the recomputed float total. api/v2/fleet.js shares the same integers —
        // with t % cycle over epoch-scale t, even a 0.1 s cycle difference would
        // desynchronise client and server phases completely.
        return { ...route, cum, lengthM: route.lengthM, cumTotal: cum[cum.length - 1] };
    }

    /** Position + heading at distance d (meters) along a route. */
    _pointAt(route, d) {
        const { path, cum } = route;
        const dd = Math.max(0, Math.min(d, route.cumTotal));
        let i = cum.findIndex(c => c >= dd);
        if (i <= 0) i = 1;
        const segLen = cum[i] - cum[i - 1] || 1;
        const f = (dd - cum[i - 1]) / segLen;
        const [x1, y1] = path[i - 1], [x2, y2] = path[i];
        const lng = x1 + (x2 - x1) * f, lat = y1 + (y2 - y1) * f;
        // heading in degrees clockwise from north
        const heading = Math.atan2((x2 - x1) * Math.cos(lat * Math.PI / 180), y2 - y1) * 180 / Math.PI;
        return { position: [lng, lat], heading };
    }

    /** Deterministic GMG status for a unit at time t. Hours in site time (ULN, UTC+8). */
    _statusOf(unit, tMs) {
        const hULN = (new Date(tMs).getUTCHours() + 8) % 24;
        const min = new Date(tMs).getUTCMinutes();

        switch (unit.id) {
            case 'HT-104': // planned maintenance window, day shift
                if (hULN >= 13 && hULN < 15) return 'maintenance';
                break;
            case 'HT-106': // breakdown scenario, morning
                if (hULN >= 9 && hULN < 10) return 'down';
                break;
            case 'WC-202': // hourly refill
                if (min >= 40 && min < 50) return 'standby';
                break;
            case 'GR-301': // night maintenance
                if (hULN >= 20 && hULN < 22) return 'maintenance';
                break;
            case 'CB-402': // airport shuttle runs around flight windows
                if (!((hULN >= 8 && hULN < 11) || (hULN >= 16 && hULN < 19))) return 'standby';
                break;
        }
        // night shift: reduced haul fleet
        if (unit.type === 'haul' && (hULN >= 22 || hULN < 5)) {
            if (['HT-102', 'HT-105'].includes(unit.id)) return 'standby';
        }
        return 'operating';
    }

    /**
     * Full unit state at time t.
     * Haul cycle: load (at pit) → haul loaded → dump (at crusher) → return empty.
     * Other types: out-and-back patrol with dwell at each end.
     */
    _unitState(unit, tMs) {
        const route = this.routes.get(unit.route);
        const preset = PRESETS[unit.type];
        const status = this._statusOf(unit, tMs);
        const tS = tMs / 1000;

        let phase, dist, dir = 1, speed = 0, loaded = false;

        if (unit.type === 'haul') {
            const haulS = route.lengthM / preset.speedLoaded;
            const retS = route.lengthM / preset.speedEmpty;
            const cycleS = preset.loadS + haulS + preset.dumpS + retS;
            let tc = (tS + unit.offsetFrac * cycleS) % cycleS;

            if (tc < preset.loadS) {
                phase = 'loading'; dist = 0;
            } else if ((tc -= preset.loadS) < haulS) {
                phase = 'hauling'; dist = tc * preset.speedLoaded; speed = preset.speedLoaded; loaded = true;
            } else if ((tc -= haulS) < preset.dumpS) {
                phase = 'dumping'; dist = route.lengthM;
            } else {
                phase = 'returning'; dist = route.lengthM - (tc - preset.dumpS) * preset.speedEmpty; dir = -1; speed = preset.speedEmpty;
            }
            unit._cycleS = cycleS;
        } else {
            const legS = route.lengthM / preset.speed;
            const cycleS = 2 * (legS + preset.dwellS);
            let tc = (tS + unit.offsetFrac * cycleS) % cycleS;

            if (tc < legS) {
                phase = 'outbound'; dist = tc * preset.speed; speed = preset.speed;
            } else if ((tc -= legS) < preset.dwellS) {
                phase = 'dwell'; dist = route.lengthM;
            } else if ((tc -= preset.dwellS) < legS) {
                phase = 'inbound'; dist = route.lengthM - tc * preset.speed; dir = -1; speed = preset.speed;
            } else {
                phase = 'dwell'; dist = 0;
            }
        }

        // Non-operating units hold position (down/maintenance freeze where they are;
        // standby returns to route start). No payload while off-cycle.
        if (status !== 'operating') {
            speed = 0;
            loaded = false;
            if (status === 'standby') { dist = 0; phase = 'parked'; }
            else phase = status;
        }

        const { position, heading } = this._pointAt(route, dist);
        return {
            id: unit.id,
            model: preset.model,
            type: unit.type,
            routeId: route.id,
            routeName: route.name,
            status, phase,
            position,
            heading: dir === 1 ? heading : (heading + 180) % 360,
            speedKmh: Math.round(speed * 3.6),
            payloadT: loaded ? PRESETS.haul.payloadT : 0,
            distAlongM: Math.round(dist),
            routeLengthM: Math.round(route.lengthM)
        };
    }

    /** Fleet snapshot at time t (defaults to now). */
    getFleetState(tMs = Date.now()) {
        return this.units.map(u => this._unitState(u, tMs));
    }

    /** Trail for TripsLayer: positions over the last `windowS` seconds. */
    getTrail(unitId, tMs, windowS = 120, stepS = 4) {
        const unit = this.units.find(u => u.id === unitId);
        if (!unit) return null;
        const path = [], timestamps = [];
        for (let dt = windowS; dt >= 0; dt -= stepS) {
            const s = this._unitState(unit, tMs - dt * 1000);
            path.push(s.position);
            timestamps.push((tMs - dt * 1000) / 1000);
        }
        return { path, timestamps };
    }

    /** KPIs derived from a fleet snapshot. */
    getKPIs(tMs = Date.now()) {
        const fleet = this.getFleetState(tMs);
        const operating = fleet.filter(u => u.status === 'operating').length;
        const down = fleet.filter(u => u.status === 'down').length;
        const haulers = fleet.filter(u => u.type === 'haul' && u.status === 'operating');
        // throughput: tonnes/hour delivered by operating haul trucks
        const throughput = haulers.reduce((sum, u) => {
            const unit = this.units.find(x => x.id === u.id);
            return sum + PRESETS.haul.payloadT / (unit._cycleS || 1721) * 3600;
        }, 0);
        return {
            throughputTph: Math.round(throughput / 10) * 10,
            operating,
            total: fleet.length,
            utilisationPct: Math.round(operating / fleet.length * 100),
            activeAlerts: down
        };
    }

    /**
     * Status-change events in (t0, t1], scanned at `stepS` resolution.
     * Deterministic — used both for live feed and for backfilling history.
     */
    getEventsBetween(t0Ms, t1Ms, stepS = 60) {
        const events = [];
        for (const unit of this.units) {
            let prev = this._statusOf(unit, t0Ms);
            for (let t = t0Ms + stepS * 1000; t <= t1Ms; t += stepS * 1000) {
                const cur = this._statusOf(unit, t);
                if (cur !== prev) {
                    events.push({
                        timeMs: t,
                        unitId: unit.id,
                        from: prev,
                        to: cur,
                        severity: cur === 'down' ? 'high' : (cur === 'operating' ? 'info' : 'medium')
                    });
                    prev = cur;
                }
            }
        }
        return events.sort((a, b) => b.timeMs - a.timeMs);
    }
}
