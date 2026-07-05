/**
 * V3 Permit creation — POST /api/v3/create
 * Digital Appendix I (HMCCP Permit Request Form).
 * Body: { type, cwa, title, contractor, performing_authority, lng, lat, attachments }
 *
 * New permits enter the lifecycle as "requested" (§5.2 — submitted to the
 * Permit Issuer). Validity window derives from the permit type (§4.1) and
 * starts when the permit is later issued; a provisional window is stored.
 */

import { query } from '../_lib/db.js';
import { PERMIT_TYPES } from '../../v3/js/config.js';
import { clampStr, cleanCwa, cleanNum, cleanAttachments } from '../_lib/v3/sanitize.js';

const VALIDITY_H = Object.fromEntries(
    Object.entries(PERMIT_TYPES).map(([k, t]) => [k, t.validityH]));

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const type = body.type;
    if (!type || !VALIDITY_H[type]) return res.status(400).json({ error: 'Invalid permit type' });

    const cwa = cleanCwa(body.cwa);
    const title = clampStr(body.title, 90);
    if (!cwa) return res.status(400).json({ error: 'Invalid or missing cwa (expected CWA-0000)' });
    if (!title) return res.status(400).json({ error: 'title is required' });

    const contractor = clampStr(body.contractor, 40) || 'Contractor';
    const performing_authority = clampStr(body.performing_authority, 40) || '—';
    const lng = cleanNum(body.lng, -180, 180);
    const lat = cleanNum(body.lat, -90, 90);
    const attachments = cleanAttachments(body.attachments);

    const now = Date.now();
    const validFrom = new Date(now + 24 * 3600e3);        // §4.3.3: ≥24 h notice
    const validTo = new Date(validFrom.getTime() + VALIDITY_H[type] * 3600e3);

    if (!process.env.DATABASE_URL) {
        // Client will mint the permit locally with the same shape
        return res.status(200).json({
            persisted: false,
            template: { valid_from: validFrom.toISOString(), valid_to: validTo.toISOString() }
        });
    }

    try {
        const seq = await query(
            `SELECT COALESCE(MAX(CAST(RIGHT(permit_no, 4) AS int)), 149) + 1 AS n FROM v3_permits`);
        const permitNo = `PTW-2026-${String(seq[0].n).padStart(4, '0')}`;

        const rows = await query(
            `INSERT INTO v3_permits
             (permit_no, type, status, cwa, title, contractor, lng, lat,
              valid_from, valid_to, requested_by, performing_authority, signatures, attachments)
             VALUES ($1,$2,'requested',$3,$4,$5,$6,$7,$8,$9,$5,$10,'{}',$11)
             RETURNING *`,
            [permitNo, type, cwa, title, contractor, lng, lat,
             validFrom.toISOString(), validTo.toISOString(),
             performing_authority, JSON.stringify(attachments)]);
        await query(
            `INSERT INTO v3_permit_events (permit_id, actor_role, action)
             VALUES ($1, 'PR', 'permit requested — Appendix I form submitted (§5.2)')`,
            [rows[0].id]);

        return res.status(201).json({ persisted: true, permit: rows[0] });
    } catch (error) {
        console.error('Create failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
