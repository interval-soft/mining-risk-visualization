import { query } from '../_lib/db.js';

/**
 * Default structure ID matching the migration seed
 */
const DEFAULT_STRUCTURE_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Mock structures data for Newman Iron Operations multi-structure demo
 */
function getMockStructures() {
    return [
        {
            id: DEFAULT_STRUCTURE_ID,
            code: 'PIT_MAIN',
            name: 'Main Open Pit',
            type: 'open_pit',
            position: { x: 0, z: 0 },
            rotation: 0,
            enabled: true,
            displayOrder: 0,
            riskScore: 85,
            riskBand: 'high',
            levelCount: 5,
            metadata: {
                description: 'Primary open pit extraction area',
                depths: { min: 0, max: -300 }
            }
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            code: 'DECLINE_NORTH',
            name: 'Northern Decline',
            type: 'underground',
            position: { x: 600, z: -200 },
            rotation: 0,
            enabled: true,
            displayOrder: 1,
            riskScore: 82,
            riskBand: 'high',
            levelCount: 4,
            metadata: {
                description: 'Underground decline development area',
                depths: { min: -300, max: -450 }
            }
        },
        {
            id: '00000000-0000-0000-0000-000000000003',
            code: 'PROCESSING',
            name: 'Processing Plant',
            type: 'processing',
            position: { x: -500, z: 300 },
            rotation: 0,
            enabled: true,
            displayOrder: 2,
            riskScore: 32,
            riskBand: 'medium',
            levelCount: 3,
            metadata: {
                description: 'Ore processing and crushing facility',
                throughput: '50000 tonnes/day'
            }
        }
    ];
}

/**
 * Transform database row to API response format
 */
function normalizeStructure(row, riskData = {}) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        position: {
            x: parseFloat(row.position_x) || 0,
            z: parseFloat(row.position_z) || 0
        },
        rotation: parseFloat(row.rotation_y) || 0,
        enabled: row.enabled,
        displayOrder: row.display_order,
        riskScore: riskData.riskScore || 0,
        riskBand: riskData.riskBand || 'low',
        levelCount: riskData.levelCount || 0,
        metadata: row.metadata || {}
    };
}

/**
 * GET /api/structures
 * Returns list of structures with aggregated risk scores
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { enabled } = req.query;

    try {
        // Try to fetch from database
        let sql = `
            SELECT s.*,
                   COUNT(sl.id) as level_count,
                   COALESCE(MAX(snl.risk_score), 0) as max_risk_score
            FROM structures s
            LEFT JOIN structure_levels sl ON sl.structure_id = s.id AND sl.enabled = true
            LEFT JOIN snapshot_levels snl ON snl.structure_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (enabled !== undefined) {
            sql += ` AND s.enabled = $${paramIndex++}`;
            params.push(enabled === 'true');
        }

        sql += ' GROUP BY s.id ORDER BY s.display_order, s.name';

        const structures = await query(sql, params);

        if (structures.length > 0) {
            const normalizedStructures = structures.map(row => {
                const riskScore = parseInt(row.max_risk_score) || 0;
                return normalizeStructure(row, {
                    riskScore,
                    riskBand: riskScore <= 30 ? 'low' : riskScore <= 70 ? 'medium' : 'high',
                    levelCount: parseInt(row.level_count) || 0
                });
            });

            return res.status(200).json({
                count: normalizedStructures.length,
                structures: normalizedStructures,
                source: 'database'
            });
        }

        // Fallback to mock data
        let mockStructures = getMockStructures();

        if (enabled !== undefined) {
            const enabledBool = enabled === 'true';
            mockStructures = mockStructures.filter(s => s.enabled === enabledBool);
        }

        res.status(200).json({
            count: mockStructures.length,
            structures: mockStructures,
            source: 'mock'
        });

    } catch (error) {
        console.error('Database error:', error);

        // Fallback to mock data on error
        let mockStructures = getMockStructures();

        if (enabled !== undefined) {
            const enabledBool = enabled === 'true';
            mockStructures = mockStructures.filter(s => s.enabled === enabledBool);
        }

        res.status(200).json({
            count: mockStructures.length,
            structures: mockStructures,
            source: 'mock'
        });
    }
}
