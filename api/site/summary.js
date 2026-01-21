import { query } from '../_lib/db.js';

/**
 * Mock site summary for Newman Iron Operations
 * Risk is aggregated as maximum across all structures
 */
function getMockSiteSummary() {
    const now = new Date();

    // Individual structure risks
    const structureRisks = [
        { code: 'PIT_MAIN', name: 'Main Open Pit', riskScore: 85, riskBand: 'high', activeAlerts: 1 },
        { code: 'DECLINE_NORTH', name: 'Northern Decline', riskScore: 82, riskBand: 'high', activeAlerts: 1 },
        { code: 'PROCESSING', name: 'Processing Plant', riskScore: 32, riskBand: 'medium', activeAlerts: 0 }
    ];

    // Site-level aggregation (max risk across structures)
    const maxRisk = Math.max(...structureRisks.map(s => s.riskScore));
    const totalAlerts = structureRisks.reduce((sum, s) => sum + s.activeAlerts, 0);

    return {
        siteId: '00000000-0000-0000-0000-000000000000',
        siteName: 'Newman Iron Operations',
        timestamp: now.toISOString(),
        riskScore: maxRisk,
        riskBand: maxRisk <= 30 ? 'low' : maxRisk <= 70 ? 'medium' : 'high',
        structureCount: structureRisks.length,
        totalLevels: 12, // 5 + 4 + 3
        activeAlerts: totalAlerts,
        structures: structureRisks,
        aggregationMethod: 'max'
    };
}

/**
 * GET /api/site/summary
 * Returns site-level aggregated risk across all structures
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Try to fetch aggregated data from database
        const structureRisksSql = `
            SELECT
                s.code,
                s.name,
                COALESCE(MAX(snl.risk_score), 0) as risk_score,
                COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'active') as active_alerts,
                COUNT(DISTINCT sl.id) as level_count
            FROM structures s
            LEFT JOIN structure_levels sl ON sl.structure_id = s.id AND sl.enabled = true
            LEFT JOIN snapshot_levels snl ON snl.structure_id = s.id
            LEFT JOIN alerts a ON a.structure_id = s.id
            WHERE s.enabled = true
            GROUP BY s.id, s.code, s.name, s.display_order
            ORDER BY s.display_order
        `;

        const structureRisks = await query(structureRisksSql, []);

        if (structureRisks.length > 0) {
            const now = new Date();
            const risks = structureRisks.map(row => ({
                code: row.code,
                name: row.name,
                riskScore: parseInt(row.risk_score) || 0,
                riskBand: getRiskBand(parseInt(row.risk_score) || 0),
                activeAlerts: parseInt(row.active_alerts) || 0
            }));

            const maxRisk = Math.max(...risks.map(s => s.riskScore), 0);
            const totalAlerts = risks.reduce((sum, s) => sum + s.activeAlerts, 0);
            const totalLevels = structureRisks.reduce((sum, row) => sum + (parseInt(row.level_count) || 0), 0);

            return res.status(200).json({
                siteId: '00000000-0000-0000-0000-000000000000',
                siteName: 'Newman Iron Operations',
                timestamp: now.toISOString(),
                riskScore: maxRisk,
                riskBand: getRiskBand(maxRisk),
                structureCount: risks.length,
                totalLevels,
                activeAlerts: totalAlerts,
                structures: risks,
                aggregationMethod: 'max',
                source: 'database'
            });
        }

        // Fallback to mock data
        const summary = getMockSiteSummary();
        res.status(200).json({ ...summary, source: 'mock' });

    } catch (error) {
        console.error('Database error:', error);

        // Fallback to mock data on error
        const summary = getMockSiteSummary();
        res.status(200).json({ ...summary, source: 'mock' });
    }
}

function getRiskBand(score) {
    if (score <= 30) return 'low';
    if (score <= 70) return 'medium';
    return 'high';
}
