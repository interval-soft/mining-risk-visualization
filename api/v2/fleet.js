/**
 * V2 Fleet API — GET /api/v2/fleet
 * Deterministic fleet snapshot (see api/_lib/v2/fleetSim.js).
 */

import { getFleetState, getKPIs } from '../_lib/v2/fleetSim.js';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const now = Date.now();
    res.status(200).json({
        timestamp: new Date(now).toISOString(),
        site: 'Oyu Tolgoi',
        kpis: getKPIs(now),
        units: getFleetState(now)
    });
}
