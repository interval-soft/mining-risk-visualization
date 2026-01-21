/**
 * AI Insight Feedback Endpoint
 * POST /api/ai/insights/[id]/feedback
 * 
 * Allows operators to provide feedback on AI insights (helpful/not helpful).
 * This feedback is used to improve AI accuracy over time.
 */

import { query } from '../../../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    const { type, comment, operatorId } = req.body;

    // Validate insight ID
    if (!id) {
        return res.status(400).json({ error: 'Missing insight ID' });
    }

    // Validate feedback type
    const validTypes = ['agree', 'dismiss', 'helpful', 'not_helpful', 'incorrect'];
    if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ 
            error: `Invalid feedback type. Valid types: ${validTypes.join(', ')}` 
        });
    }

    try {
        // Verify insight exists
        const insight = await query(
            'SELECT id, status FROM ai_insights WHERE id = $1',
            [id]
        );

        if (insight.length === 0) {
            return res.status(404).json({ error: 'Insight not found' });
        }

        // Store feedback
        const result = await query(
            `INSERT INTO ai_feedback (insight_id, feedback_type, comment, operator_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, type, comment || null, operatorId || null]
        );

        // Update insight status based on feedback
        if (type === 'dismiss' || type === 'incorrect') {
            await query(
                `UPDATE ai_insights SET status = 'dismissed' WHERE id = $1`,
                [id]
            );
        } else if (type === 'agree' || type === 'helpful') {
            // Could update confidence or other metrics in the future
            // For now, just keep as active
        }

        // Log to audit trail
        try {
            await query(
                `INSERT INTO ai_audit 
                 (operation_type, model_id, latency_ms, success, output_summary)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    'feedback_received',
                    'n/a',
                    0,
                    true,
                    `Feedback '${type}' on insight ${id}`
                ]
            );
        } catch {
            // Audit logging failed, continue
        }

        return res.status(200).json({ 
            success: true,
            feedback: {
                id: result[0].id,
                insightId: id,
                type,
                createdAt: result[0].created_at
            }
        });

    } catch (error) {
        console.error('Feedback submission failed:', error);
        return res.status(500).json({ 
            error: 'Failed to submit feedback',
            message: error.message 
        });
    }
}
