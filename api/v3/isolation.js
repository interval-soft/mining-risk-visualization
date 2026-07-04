/**
 * V3 Isolation actions — POST /api/v3/isolation
 * Body: { icc_no, action, actor_role }
 *
 * Same shared rules as the browser (§8.1.1 de-isolation guard included).
 * Persists when DATABASE_URL is set; validates and defers otherwise.
 */

import { query } from '../_lib/db.js';
import { applyIsolationTransition } from '../../v3/js/data/isolationFlow.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const { icc_no, action, actor_role } = req.body || {};
    if (!icc_no || !action || !actor_role) {
        return res.status(400).json({ error: 'icc_no, action and actor_role are required' });
    }

    if (!process.env.DATABASE_URL) {
        return res.status(200).json({ persisted: false, reason: 'No DATABASE_URL — apply locally.' });
    }

    try {
        const isolations = await query('SELECT * FROM v3_isolations WHERE icc_no = $1', [icc_no]);
        if (!isolations.length) return res.status(404).json({ error: `Unknown ICC ${icc_no}` });
        const permits = await query('SELECT permit_no, status, icc_no FROM v3_permits');

        let result;
        try {
            result = applyIsolationTransition(isolations[0], action, { role: actor_role, permits });
        } catch (ruleError) {
            return res.status(422).json({ error: ruleError.message });
        }

        const iso = result.isolation;
        await query(
            `UPDATE v3_isolations SET status=$2, lockbox_key=$3, key_holder=$4 WHERE icc_no=$1`,
            [icc_no, iso.status, iso.lockbox_key, iso.key_holder]);

        return res.status(200).json({ persisted: true, isolation: iso });
    } catch (error) {
        console.error('Isolation action failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
