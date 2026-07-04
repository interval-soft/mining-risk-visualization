/**
 * V3 demo reset — POST /api/v3/seed
 *
 * Wipes and re-seeds the v3 tables with the shared scenario anchored to
 * today's shift. Run before a demo so DB-backed countdowns are alive.
 * Requires DATABASE_URL; harmless otherwise (the GET fallback already
 * serves the same seed).
 */

import { query } from '../_lib/db.js';
import { buildSeed } from '../../v3/js/data/permitSeed.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!process.env.DATABASE_URL) {
        return res.status(200).json({ seeded: false, reason: 'No DATABASE_URL — GET already serves the seed.' });
    }

    try {
        const { permits, isolations, events } = buildSeed(Date.now());

        await query('TRUNCATE v3_permit_events, v3_permits, v3_isolations RESTART IDENTITY CASCADE');

        for (const p of permits) {
            const rows = await query(
                `INSERT INTO v3_permits
                 (permit_no, type, status, cwa, title, description, contractor,
                  lng, lat, valid_from, valid_to, requested_by, performing_authority,
                  signatures, attachments, icc_no, revalidated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                 RETURNING id`,
                [p.permit_no, p.type, p.status, p.cwa, p.title, p.description, p.contractor,
                 p.lng, p.lat, p.valid_from, p.valid_to, p.requested_by, p.performing_authority,
                 JSON.stringify(p.signatures), JSON.stringify(p.attachments), p.icc_no, p.revalidated_at]
            );
            const id = rows[0].id;
            for (const ev of events.filter(e => e.permit_no === p.permit_no)) {
                await query(
                    `INSERT INTO v3_permit_events (permit_id, ts, actor_role, action)
                     VALUES ($1, $2, $3, $4)`,
                    [id, new Date(ev.ts).toISOString(), ev.actor_role, ev.action]);
            }
        }
        for (const iso of isolations) {
            await query(
                `INSERT INTO v3_isolations (icc_no, type, status, description, points, lockbox_key, key_holder)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [iso.icc_no, iso.type, iso.status, iso.description,
                 JSON.stringify(iso.points), iso.lockbox_key, iso.key_holder]);
        }

        res.status(200).json({ seeded: true, permits: permits.length, isolations: isolations.length });
    } catch (error) {
        console.error('Seed failed:', error);
        res.status(500).json({ error: error.message });
    }
}
