/**
 * V3 Permit actions — POST /api/v3/action
 * Body: { permit_no, action, actor_role, actor_name?, reason? }
 *
 * Validates the transition against the shared state machine
 * (v3/js/data/permitFlow.js) and persists it when DATABASE_URL is set.
 * Without a DB it validates and returns { persisted: false } — the client
 * applies the same transition optimistically (demo never breaks).
 */

import { query } from '../_lib/db.js';
import { applyTransition } from '../../v3/js/data/permitFlow.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { permit_no, action, actor_role, actor_name, reason } = req.body || {};
    if (!permit_no || !action || !actor_role) {
        return res.status(400).json({ error: 'permit_no, action and actor_role are required' });
    }

    if (!process.env.DATABASE_URL) {
        return res.status(200).json({ persisted: false, reason: 'No DATABASE_URL — apply locally.' });
    }

    try {
        const rows = await query('SELECT * FROM v3_permits WHERE permit_no = $1', [permit_no]);
        if (!rows.length) return res.status(404).json({ error: `Unknown permit ${permit_no}` });

        let result;
        try {
            result = applyTransition(rows[0], action, {
                role: actor_role, name: actor_name, reason
            });
        } catch (ruleError) {
            return res.status(422).json({ error: ruleError.message });
        }

        const p = result.permit;
        await query(
            `UPDATE v3_permits SET status=$2, signatures=$3, description=$4,
                    revalidated_at=$5, updated_at=now() WHERE permit_no=$1`,
            [permit_no, p.status, JSON.stringify(p.signatures), p.description,
             p.revalidated_at]);
        await query(
            `INSERT INTO v3_permit_events (permit_id, actor_role, actor_name, action)
             VALUES ((SELECT id FROM v3_permits WHERE permit_no=$1), $2, $3, $4)`,
            [permit_no, actor_role, actor_name || null, result.event.action]);

        return res.status(200).json({ persisted: true, permit: p });
    } catch (error) {
        console.error('Action failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
