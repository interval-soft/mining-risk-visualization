import { query } from '../../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    const { comment } = req.body || {};

    try {
        // Try to update in database
        const result = await query(
            `UPDATE alerts
             SET status = 'acknowledged',
                 acknowledged_at = NOW(),
                 acknowledged_by = 'API User',
                 acknowledged_comment = $2
             WHERE id = $1 AND status = 'active'
             RETURNING *`,
            [id, comment || null]
        );

        if (result.length > 0) {
            const alert = result[0];
            return res.status(200).json({
                id: alert.id,
                status: alert.status,
                acknowledgedAt: alert.acknowledged_at,
                acknowledgedBy: alert.acknowledged_by,
                acknowledgedComment: alert.acknowledged_comment,
                source: 'database'
            });
        }

        // If not found in database, return mock response
        res.status(200).json({
            id,
            status: 'acknowledged',
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: 'API User',
            acknowledgedComment: comment || null,
            source: 'mock'
        });
    } catch (error) {
        console.error('Database error:', error);

        // Fallback to mock response
        res.status(200).json({
            id,
            status: 'acknowledged',
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: 'API User',
            acknowledgedComment: comment || null,
            source: 'mock'
        });
    }
}
