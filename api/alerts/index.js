import { query } from '../_lib/db.js';

// Mock alerts fallback (used when database is empty or unavailable)
function getMockAlerts() {
    const now = Date.now();
    return [
        {
            id: 'alert-001',
            timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
            level_number: 3,
            risk_score: 85,
            status: 'active',
            cause: 'Blasting operations scheduled with explosive handling in progress',
            explanation: 'Level 3 has reached HIGH risk (85) due to scheduled blasting at 10:30 and active explosive magazine handling. BLAST_SCHEDULED (+40) and EXPLOSIVE_HANDLING (+35) rules triggered.',
            acknowledged_at: null,
            acknowledged_by: null,
            acknowledged_comment: null,
            resolved_at: null
        },
        {
            id: 'alert-002',
            timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            level_number: 4,
            risk_score: 55,
            status: 'acknowledged',
            cause: 'Confined space work active',
            explanation: 'Level 4 MEDIUM risk (55) due to confined space entry. Permit CSP-2024-0142 is valid. CONFINED_SPACE rule triggered (+30).',
            acknowledged_at: new Date(now - 90 * 60 * 1000).toISOString(),
            acknowledged_by: 'Shift Supervisor',
            acknowledged_comment: 'Permit verified, crew equipped with gas monitors',
            resolved_at: null
        },
        {
            id: 'alert-003',
            timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
            level_number: 4,
            risk_score: 72,
            status: 'resolved',
            cause: 'Gas reading elevated',
            explanation: 'Level 4 HIGH risk (72) due to elevated methane reading of 0.9 ppm. GAS_THRESHOLD rule triggered (+30).',
            acknowledged_at: new Date(now - 5.5 * 60 * 60 * 1000).toISOString(),
            acknowledged_by: 'Safety Officer',
            acknowledged_comment: 'Investigating source',
            resolved_at: new Date(now - 5 * 60 * 60 * 1000).toISOString()
        }
    ];
}

// Normalize field names from database (snake_case) to API response (camelCase for some)
function normalizeAlert(alert) {
    return {
        id: alert.id,
        timestamp: alert.timestamp,
        levelNumber: alert.level_number,
        riskScore: alert.risk_score,
        status: alert.status,
        cause: alert.cause,
        explanation: alert.explanation,
        acknowledgedAt: alert.acknowledged_at,
        acknowledgedBy: alert.acknowledged_by,
        acknowledgedComment: alert.acknowledged_comment,
        resolvedAt: alert.resolved_at
    };
}

export default async function handler(req, res) {
    const status = req.query.status;
    const level = req.query.level ? parseInt(req.query.level, 10) : undefined;

    try {
        // Try to fetch from database
        let sql = 'SELECT * FROM alerts WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (status) {
            sql += ` AND status = $${paramIndex++}`;
            params.push(status);
        }
        if (level !== undefined) {
            sql += ` AND level_number = $${paramIndex++}`;
            params.push(level);
        }

        sql += ' ORDER BY timestamp DESC';

        const alerts = await query(sql, params);

        // If database has alerts, return them
        if (alerts.length > 0) {
            return res.status(200).json({
                count: alerts.length,
                alerts: alerts.map(normalizeAlert),
                source: 'database'
            });
        }

        // Fallback to mock data if database is empty
        let mockAlerts = getMockAlerts();

        if (status) {
            mockAlerts = mockAlerts.filter(a => a.status === status);
        }
        if (level !== undefined) {
            mockAlerts = mockAlerts.filter(a => a.level_number === level);
        }

        mockAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.status(200).json({
            count: mockAlerts.length,
            alerts: mockAlerts.map(normalizeAlert),
            source: 'mock'
        });
    } catch (error) {
        console.error('Database error:', error);

        // Fallback to mock data on error
        let mockAlerts = getMockAlerts();

        if (status) {
            mockAlerts = mockAlerts.filter(a => a.status === status);
        }
        if (level !== undefined) {
            mockAlerts = mockAlerts.filter(a => a.level_number === level);
        }

        mockAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.status(200).json({
            count: mockAlerts.length,
            alerts: mockAlerts.map(normalizeAlert),
            source: 'mock'
        });
    }
}
