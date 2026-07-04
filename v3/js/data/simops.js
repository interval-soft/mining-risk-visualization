/**
 * SIMOPS engine — simultaneous-operations conflict detection.
 *
 * Implements the intent of §6.4 (daily SIMOPS management, cumulative risk)
 * and §C.11 (PI verifies interacting activities are identified and the
 * conflict avoided or controlled). Geometric (distance/same-CWA) plus
 * type-incompatibility rules. Pure JS, SINGLE SOURCE shared by the browser
 * and /api/v3/permits.
 *
 * Severity: 'high' when both permits are live (issued); 'medium' when one
 * is still in approval — surfaced for the §6.4 daily look-ahead meeting.
 */

const M_LAT = 111320, M_LNG = 111320 * Math.cos(53.15 * Math.PI / 180);

function distanceM(a, b) {
    if (a.lng == null || b.lng == null) return Infinity;
    return Math.hypot((a.lng - b.lng) * M_LNG, (a.lat - b.lat) * M_LAT);
}

function overlaps(a, b) {
    return new Date(a.valid_from) < new Date(b.valid_to)
        && new Date(b.valid_from) < new Date(a.valid_to);
}

const LIVE = ['issued'];
const UPCOMING = ['authorised', 'verified', 'reviewed', 'requested'];
const HOT = ['hot_work_civil', 'hot_work_construction'];
const GROUND = ['excavation', 'piling'];

const atts = p => typeof p.attachments === 'string' ? JSON.parse(p.attachments) : (p.attachments || {});

/** Pairwise incompatibility rules. */
const PAIR_RULES = [
    {
        kind: 'hot-work-vs-confined-space',
        label: 'Hot work × confined space entry',
        radiusM: 45,
        test: (a, b) =>
            (HOT.includes(a.type) && b.type === 'confined_space') ||
            (HOT.includes(b.type) && a.type === 'confined_space'),
        advice: 'Ignition source adjacent to a manned confined space. Separate in time or establish a controlled area; fire watch + continuous gas monitoring (§6.3). Raise at the daily SIMOPS meeting (§6.4).'
    },
    {
        kind: 'lift-exclusion-overlap',
        label: 'Lifting exclusion zone overlap',
        radiusM: 35,
        test: (a, b) => (atts(a).lift_plan && !atts(b).lift_plan) || (atts(b).lift_plan && !atts(a).lift_plan),
        advice: 'Work party inside a planned lift exclusion zone. Only planned lifts per lift plan, exclusion zone established (§6.3). Sequence the operations or re-route.'
    },
    {
        kind: 'ground-works-interaction',
        label: 'Concurrent ground disturbance',
        radiusM: 35,
        test: (a, b) => GROUND.includes(a.type) && GROUND.includes(b.type),
        advice: 'Adjacent excavations/piling affect ground stability and buried services. Joint review of utility drawings and spoil zones (§7.1).'
    }
];

const CUMULATIVE_THRESHOLD = 3; // live permits in one CWA → cumulative-risk flag

/**
 * @param {Array} permits
 * @returns {Array} conflicts: { id, kind, label, severity, permits: [no,no],
 *   cwa, distanceM, midpoint: [lng,lat]|null, advice }
 */
export function detectConflicts(permits) {
    const considered = permits.filter(p =>
        [...LIVE, ...UPCOMING].includes(p.status));
    const conflicts = [];
    const seen = new Set();

    for (let i = 0; i < considered.length; i++) {
        for (let j = i + 1; j < considered.length; j++) {
            const a = considered[i], b = considered[j];
            if (!overlaps(a, b)) continue;
            const liveCount = [a, b].filter(p => LIVE.includes(p.status)).length;
            if (liveCount === 0) continue;   // two future requests — meeting will sort it

            for (const rule of PAIR_RULES) {
                if (!rule.test(a, b)) continue;
                const d = distanceM(a, b);
                const near = a.cwa === b.cwa || d <= rule.radiusM;
                if (!near) continue;
                const key = [rule.kind, a.permit_no, b.permit_no].join('|');
                if (seen.has(key)) continue;
                seen.add(key);
                conflicts.push({
                    id: key,
                    kind: rule.kind,
                    label: rule.label,
                    severity: liveCount === 2 ? 'high' : 'medium',
                    permits: [a.permit_no, b.permit_no],
                    cwa: a.cwa === b.cwa ? a.cwa : `${a.cwa} / ${b.cwa}`,
                    distanceM: Number.isFinite(d) ? Math.round(d) : null,
                    midpoint: (a.lng != null && b.lng != null)
                        ? [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2] : null,
                    pins: [[a.lng, a.lat], [b.lng, b.lat]],
                    advice: rule.advice
                });
            }
        }
    }

    // Cumulative risk per CWA (§6.4: evaluate cumulative risk)
    const byCwa = {};
    for (const p of considered.filter(p => LIVE.includes(p.status))) {
        (byCwa[p.cwa] = byCwa[p.cwa] || []).push(p);
    }
    for (const [cwa, list] of Object.entries(byCwa)) {
        if (list.length >= CUMULATIVE_THRESHOLD) {
            conflicts.push({
                id: `cumulative|${cwa}`,
                kind: 'cumulative-risk',
                label: `Cumulative risk — ${list.length} live permits in one area`,
                severity: 'medium',
                permits: list.map(p => p.permit_no),
                cwa,
                distanceM: null,
                midpoint: list[0].lng != null ? [list[0].lng, list[0].lat] : null,
                pins: [],
                advice: 'Confirm supervision coverage and emergency readiness for the concentration of work parties (§6.4).'
            });
        }
    }

    return conflicts.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1));
}
