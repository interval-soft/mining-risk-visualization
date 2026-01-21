import { query } from '../_lib/db.js';

// Mock alerts fallback for Newman Iron Operations (used when database is empty or unavailable)
function getMockAlerts() {
    const now = Date.now();
    return [
        {
            id: 'alert-001',
            timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
            level_number: 2,
            risk_score: 85,
            status: 'active',
            cause: 'Production drilling active with explosive magazine access',
            explanation: 'Level 2 (Active Pit Face) has reached HIGH risk (85) due to concurrent drilling and explosive handling. PRODUCTION_DRILLING (+30) and EXPLOSIVE_MAGAZINE (+35) rules triggered.',
            acknowledged_at: null,
            acknowledged_by: null,
            acknowledged_comment: null,
            resolved_at: null
        },
        {
            id: 'alert-002',
            timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            level_number: 6,
            risk_score: 82,
            status: 'acknowledged',
            cause: 'Active decline development with confined space entry',
            explanation: 'Level 6 (Underground Decline) HIGH risk (82) due to decline development, ground support work, and confined space entry. DECLINE_DEV (+35), GROUND_SUPPORT (+25), CONFINED_SPACE (+30) rules triggered.',
            acknowledged_at: new Date(now - 90 * 60 * 1000).toISOString(),
            acknowledged_by: 'Underground Supervisor',
            acknowledged_comment: 'Permits verified, gas monitors on all personnel, bogger operator briefed',
            resolved_at: null
        },
        {
            id: 'alert-003',
            timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
            level_number: 7,
            risk_score: 62,
            status: 'resolved',
            cause: 'Air quality reading elevated',
            explanation: 'Level 7 (Deep Services) MEDIUM-HIGH risk (62) due to elevated dust particulates at 85 µg/m³. AIR_QUALITY_ALERT rule triggered (+20).',
            acknowledged_at: new Date(now - 5.5 * 60 * 60 * 1000).toISOString(),
            acknowledged_by: 'Ventilation Officer',
            acknowledged_comment: 'Increasing main fan output, monitoring levels',
            resolved_at: new Date(now - 5 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'alert-004',
            timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
            level_number: 2,
            risk_score: 100,
            status: 'resolved',
            cause: 'Post-blast lockout active',
            explanation: 'Level 2 (Active Pit Face) LOCKOUT (100) - West Wall blast fired, re-entry not yet cleared. BLAST_NO_REENTRY rule force=100.',
            acknowledged_at: new Date(now - 11.9 * 60 * 60 * 1000).toISOString(),
            acknowledged_by: 'Blast Supervisor M. Chen',
            acknowledged_comment: 'Standard post-blast protocol, monitoring dust and fumes clearance',
            resolved_at: new Date(now - 10 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'alert-005',
            timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
            level_number: 3,
            risk_score: 48,
            status: 'acknowledged',
            cause: 'Haul truck overspeed violation',
            explanation: 'Level 3 (Haulage Ramp) MEDIUM risk (48) due to CAT793-05 exceeding speed limit (42 km/h in 35 km/h zone). EQUIPMENT_OVERSPEED rule triggered (+18).',
            acknowledged_at: new Date(now - 7.8 * 60 * 60 * 1000).toISOString(),
            acknowledged_by: 'Pit Supervisor',
            acknowledged_comment: 'Operator counseled, incident logged, monitoring continues',
            resolved_at: null
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
