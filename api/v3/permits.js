/**
 * V3 Permits API — GET /api/v3/permits
 *
 * Returns { permits, isolations, events, kpis, source }.
 * Reads Supabase when DATABASE_URL is set and populated; otherwise serves
 * the shared deterministic seed (v3/js/data/permitSeed.js) so the console
 * is always alive. Demo must never break on DB.
 */

import { query } from '../_lib/db.js';
import { buildSeed } from '../../v3/js/data/permitSeed.js';

function computeKpis(permits, isolations, now) {
    const issued = permits.filter(p => p.status === 'issued');
    const pending = permits.filter(p => ['requested', 'reviewed', 'verified'].includes(p.status));
    const expiring = issued.filter(p =>
        new Date(p.valid_to).getTime() - now < 2 * 3600 * 1000);
    return {
        active: issued.length,
        pending: pending.length,
        expiringSoon: expiring.length,
        conflicts: null,   // SIMOPS engine — milestone 4
        isolationsLive: isolations.filter(i => i.status === 'applied' || i.status === 'sanction_to_test').length
    };
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const now = Date.now();
    let permits = [], isolations = [], events = [], source = 'seed';

    if (process.env.DATABASE_URL) {
        try {
            permits = await query('SELECT * FROM v3_permits ORDER BY permit_no');
            isolations = await query('SELECT * FROM v3_isolations ORDER BY icc_no');
            const rows = await query(`
                SELECT e.ts, p.permit_no, e.actor_role, e.action
                FROM v3_permit_events e JOIN v3_permits p ON p.id = e.permit_id
                ORDER BY e.ts DESC LIMIT 40`);
            events = rows.map(r => ({ ...r, ts: new Date(r.ts).getTime() }));
            if (permits.length > 0) source = 'db';
        } catch (err) {
            console.warn('DB read failed, serving seed:', err.message);
        }
    }

    if (source === 'seed') {
        const seed = buildSeed(now);
        permits = seed.permits;
        isolations = seed.isolations;
        events = seed.events;
    }

    res.status(200).json({
        timestamp: new Date(now).toISOString(),
        source,
        kpis: computeKpis(permits, isolations, now),
        permits, isolations, events
    });
}
