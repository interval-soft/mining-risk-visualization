/**
 * Demo permit scenario — a believable HMCCP construction morning.
 *
 * SINGLE SOURCE shared by the browser (fallback when the API is
 * unreachable) and by /api/v3/* (fallback when DATABASE_URL is absent,
 * and payload for the demo-reset endpoint). Pure JS, no dependencies.
 *
 * All times anchor to TODAY 07:00 site time (Europe/London) so validity
 * countdowns are alive on any demo day. Deterministic for a given day.
 */

const H = 3600 * 1000, M = 60 * 1000;

/** Today's 07:00 in Europe/London, as epoch ms. */
export function shiftStart(now = Date.now()) {
    const d = new Date(now);
    // UK offset (GMT/BST) via locale trick — good enough for POC
    const ukHour = parseInt(new Intl.DateTimeFormat('en-GB',
        { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(d));
    const drift = (ukHour - d.getUTCHours() + 24) % 24; // 0 (GMT) or 1 (BST)
    const anchor = new Date(d);
    anchor.setUTCHours(7 - drift, 0, 0, 0);
    if (anchor.getTime() > now) anchor.setUTCDate(anchor.getUTCDate() - 1);
    return anchor.getTime();
}

/** CWA centroids for permit pins (approx, from v3/data/cwa.geojson layout). */
const PIN = {
    "CWA-0100": [-3.0636, 53.15],
    "CWA-0200": [-3.0607, 53.1509],
    "CWA-0300": [-3.0625, 53.1506],
    "CWA-0400": [-3.0618, 53.1506],
    "CWA-0500": [-3.0597, 53.1503],
    "CWA-0600": [-3.0607, 53.1504],
    "CWA-0620": [-3.061, 53.1501],
    "CWA-0630": [-3.0609, 53.1498],
    "CWA-0640": [-3.0612, 53.1505],
    "CWA-0650": [-3.0604, 53.1501],
    "CWA-0700": [-3.0614, 53.1498],
    "CWA-0701": [-3.0612, 53.1492],
    "CWA-0710": [-3.0598, 53.1495],
    "CWA-0711": [-3.0617, 53.1483],
    "CWA-0800": [-3.0599, 53.1496],
    "CWA-0900": [-3.0628, 53.1495],
    "CWA-0910": [-3.0633, 53.1494],
    "CWA-1000": [-3.0617, 53.1493],
    "CWA-1010": [-3.0617, 53.1493],
    "CWA-1100": [-3.0606, 53.1488],
    "CWA-1200": [-3.0608, 53.1483],
    "CWA-1300": [-3.0636, 53.1486],
    "CWA-1400": [-3.0624, 53.1484],
    "CWA-1500": [-3.0588, 53.1499],
    "CWA-1600": [-3.0598, 53.1512],
    "CWA-1700": [-3.0611, 53.1479]
};

const sig = (t0, role, name, dt) => ({ [role.toLowerCase()]: { name, ts: new Date(t0 + dt).toISOString() } });

/**
 * Returns { permits, isolations, events } — permits carry permit_no, type,
 * status, cwa, title, contractor, lng/lat, valid_from/to, signatures,
 * attachments (checklist §4.2), performing_authority.
 */
export function buildSeed(now = Date.now()) {
    const t0 = shiftStart(now);          // today 07:00 UK
    const D = 24 * H;

    /** [no, type, status, cwa, title, contractor, pa, validFrom, validTo, attachments, extra] */
    const rows = [
        // ---- ISSUED / ACTIVE ----
        ['PTW-2026-0142', 'hot_work_construction', 'issued', 'CWA-0620',
            'Absorber shell welding — course 3 circumferential seams', 'CamWeld Fabrication', 'D. Roberts',
            t0 - 22.5 * H, t0 + 1.5 * H,   // 24 h permit issued yesterday 08:30 → expires ~08:30 today (feeds "expiring <2h")
            { rams: true, tra: true, hot_work_checklist: true, fire_watch: true },
            { note: 'Fire watch posted; 30 min post-work monitoring per §7.4' }],
        ['PTW-2026-0138', 'cold_work', 'issued', 'CWA-0800',
            'CHP steam turbine pedestal — formwork & rebar', 'AlphaCivil Ltd', 'S. Hughes',
            t0 - 3 * D, t0 + 4 * D,
            { rams: true, tra: true, lift_plan: true },
            { revalidatedAt: t0 + 0.25 * H }],   // revalidated 07:15 per §6.2.2
        ['PTW-2026-0140', 'confined_space', 'issued', 'CWA-1200',
            'Cooling tower basin — internal coating inspection', 'NDT Cymru', 'M. Evans',
            t0, t0 + 12 * H,               // 1 shift
            { rams: true, tra: true, gas_test: true, standby_person: true, rescue_plan: true, icc: true },
            { note: 'AGT gas test 06:45 — O2 20.9%, LEL 0%, entry log open', iccNo: 'ICC-0009' }],
        ['PTW-2026-0136', 'excavation', 'issued', 'CWA-0200',
            'Drainage trench D-D — culvert 2 crossing', 'AlphaCivil Ltd', 'C. Williams',
            t0 - 5 * D, t0 + 2 * D,
            { rams: true, tra: true, utility_drawings: true, cat_scan: true }],
        ['PTW-2026-0139', 'piling', 'issued', 'CWA-0900',
            'CO₂ compression area — pile group P-114 (CFA rig 2)', 'GeoPile UK', 'J. Price',
            t0 - 2 * D, t0 + 5 * D,
            { rams: true, tra: true, utility_drawings: true, piling_prework: true, grid_maps: true }],
        ['PTW-2026-0133', 'confined_space', 'issued', 'CWA-0620',
            'Absorber column — internal weld visual inspection', 'NDT Cymru', 'M. Evans',
            t0, t0 + 12 * H,
            { rams: true, tra: true, gas_test: true, standby_person: true, rescue_plan: true },
            { note: 'Entry via manway M2 — same column as shell welding works' }],
        ['PTW-2026-0143', 'cold_work', 'issued', 'CWA-0700',
            'E-W piperack — steel erection bay 4 (mobile crane)', 'ErectSteel Ltd', 'A. Jones',
            t0 - 1 * D, t0 + 6 * D,
            { rams: true, tra: true, lift_plan: true }],

        // ---- AUTHORISED (awaiting PA acceptance) ----
        ['PTW-2026-0144', 'hot_work_civil', 'authorised', 'CWA-1400',
            'Tank farm — rebar cutting & grinding, bund wall', 'AlphaCivil Ltd', 'S. Hughes',
            t0 + 1 * H, t0 + 1 * H + 7 * D,
            { rams: true, tra: true, hot_work_checklist: true }],
        ['PTW-2026-0145', 'cold_work', 'authorised', 'CWA-1100',
            'Main substation — LV cable pulling, MCC room', 'PowerGrid Services', 'R. Owen',
            t0 + 1 * H, t0 + 1 * H + 7 * D,
            { rams: true, tra: true, icc: true },
            { iccNo: 'ICC-0012' }],

        // ---- PENDING (requested / reviewed / verified) ----
        ['PTW-2026-0147', 'piling', 'requested', 'CWA-0910',
            'Compression area offsite — pile group P-121', 'GeoPile UK', 'J. Price',
            t0 + 1 * D, t0 + 8 * D,
            { rams: false, tra: true, utility_drawings: true },
            { blocked: 'RAMS missing — permit invalid per §4.2' }],
        ['PTW-2026-0148', 'cold_work', 'requested', 'CWA-1600',
            'Central control room — raised floor fit-out', 'InterFit Ltd', 'L. Morgan',
            t0 + 1 * D, t0 + 8 * D,
            { rams: true, tra: true }],
        ['PTW-2026-0146', 'hot_work_construction', 'reviewed', 'CWA-0630',
            'Quencher — nozzle grinding & weld prep', 'CamWeld Fabrication', 'D. Roberts',
            t0 + 2 * H, t0 + 26 * H,
            { rams: true, tra: true, hot_work_checklist: true },
            { note: 'Adjacent to live welding PTW-2026-0142 — SIMOPS review at daily meeting' }],
        ['PTW-2026-0149', 'confined_space', 'verified', 'CWA-1700',
            'Water treatment — clarifier tank entry, weld inspection', 'NDT Cymru', 'M. Evans',
            t0 + 5 * H, t0 + 17 * H,
            { rams: true, tra: true, gas_test: false, standby_person: true, rescue_plan: true }],

        // ---- SUSPENDED ----
        ['PTW-2026-0128', 'excavation', 'suspended', 'CWA-0300',
            'CO₂ AGI compound — foundation excavation FE-03', 'AlphaCivil Ltd', 'C. Williams',
            t0 - 4 * D, t0 + 3 * D,
            { rams: true, tra: true, utility_drawings: false },
            { note: 'Suspended §6.2.4 — utility drawing ambiguity, CAT scan required (§7.1.3)' }],

        // ---- CLOSED (recent history) ----
        ['PTW-2026-0141', 'hot_work_construction', 'closed', 'CWA-0640',
            'Treated gas wash tower — bracket welding L2', 'CamWeld Fabrication', 'D. Roberts',
            t0 - 26 * H, t0 - 2 * H, { rams: true, tra: true, hot_work_checklist: true }],
        ['PTW-2026-0137', 'cold_work', 'closed', 'CWA-1000',
            'Ancillary area — pump skid setting & alignment', 'MechFit Ltd', 'A. Jones',
            t0 - 8 * D, t0 - 1 * D, { rams: true, tra: true }],
        ['PTW-2026-0135', 'excavation', 'closed', 'CWA-1300',
            'Storm water pond — outfall channel trim', 'AlphaCivil Ltd', 'C. Williams',
            t0 - 9 * D, t0 - 2 * D, { rams: true, tra: true, utility_drawings: true }],
    ];

    const CHAIN = { requested: [], reviewed: ['AA'], verified: ['AA', 'PI'],
        authorised: ['WA', 'AA', 'PI'], issued: ['WA', 'AA', 'PI', 'PA'],
        suspended: ['WA', 'AA', 'PI', 'PA'], closed: ['WA', 'AA', 'PI', 'PA'] };
    const NAMES = { WA: 'P. Sinclair', AA: 'G. Latham', PI: 'B. Kavanagh' };

    const permits = rows.map(([no, type, status, cwa, title, contractor, pa, from, to, attachments, extra = {}]) => {
        const signatures = {};
        for (const role of CHAIN[status] || []) {
            Object.assign(signatures, sig(from, role,
                role === 'PA' ? pa : NAMES[role],
                role === 'WA' ? -3 * H : role === 'AA' ? -2 * H : role === 'PI' ? -1 * H : -0.5 * H));
        }
        return {
            permit_no: no, type, status, cwa, title, contractor,
            performing_authority: pa,
            lng: PIN[cwa]?.[0] ?? null, lat: PIN[cwa]?.[1] ?? null,
            valid_from: new Date(from).toISOString(),
            valid_to: new Date(to).toISOString(),
            requested_by: contractor,
            signatures, attachments,
            icc_no: extra.iccNo ?? null,
            revalidated_at: extra.revalidatedAt ? new Date(extra.revalidatedAt).toISOString() : null,
            description: extra.note ?? extra.blocked ?? null
        };
    });

    const isolations = [
        { icc_no: 'ICC-0012', type: 'electrical', status: 'applied',
          description: 'MCC room feeder — LV isolation, proved dead §8.15.2',
          points: [{ no: 1, equipment: "MCC-11 incomer", method: "Racked out + locked", tag_color: "green", lng: -3.0606, lat: 53.1488 }],
          lockbox_key: 'LBX-04', key_holder: 'R. Owen (PA)' },
        { icc_no: 'ICC-0009', type: 'process', status: 'applied',
          description: 'Cooling water basin — inlet valves spade isolated (positive, §8.14.1)',
          points: [
              { no: 1, equipment: "CWS-V101", method: "Spade inserted", tag_color: "red", lng: -3.0608, lat: 53.1483 },
              { no: 2, equipment: "CWS-V102 bleed", method: "Locked open", tag_color: "blue", lng: -3.0604999999999998, lat: 53.148199999999996 }],
          lockbox_key: 'LBX-02', key_holder: 'M. Evans (PA)' }
    ];

    // Audit stream — derived from state transitions, newest first
    const events = [];
    for (const p of permits) {
        const from = new Date(p.valid_from).getTime();
        const chain = CHAIN[p.status] || [];
        if (chain.includes('WA')) events.push({ ts: from - 3 * H, permit_no: p.permit_no, actor_role: 'WA', action: 'authorised (work authorisation)' });
        if (chain.includes('AA')) events.push({ ts: from - 2 * H, permit_no: p.permit_no, actor_role: 'AA', action: 'area approved' });
        if (chain.includes('PI')) events.push({ ts: from - 1 * H, permit_no: p.permit_no, actor_role: 'PI', action: 'permit issued' });
        if (chain.includes('PA')) events.push({ ts: from - 0.5 * H, permit_no: p.permit_no, actor_role: 'PA', action: 'accepted — set to work' });
        if (p.revalidated_at) events.push({ ts: new Date(p.revalidated_at).getTime(), permit_no: p.permit_no, actor_role: 'PI', action: 'daily revalidation (§6.2.2)' });
        if (p.status === 'suspended') events.push({ ts: from + 2 * H, permit_no: p.permit_no, actor_role: 'PI', action: 'SUSPENDED — ' + (p.description || '') });
        if (p.status === 'closed') events.push({ ts: new Date(p.valid_to).getTime(), permit_no: p.permit_no, actor_role: 'PA', action: 'closed — area safe & tidy' });
    }
    events.sort((a, b) => b.ts - a.ts);

    return { permits, isolations, events: events.slice(0, 40) };
}
