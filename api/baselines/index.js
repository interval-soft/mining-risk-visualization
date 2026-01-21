/**
 * Baselines API Endpoint
 * GET /api/baselines - List baselines
 * POST /api/baselines - Learn new baseline from data
 * 
 * Baselines define "normal" operational patterns used for anomaly detection.
 */

import { query } from '../_lib/db.js';
import { learnBaseline, getActiveBaselines } from '../_lib/baselines.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return handleGet(req, res);
    }

    if (req.method === 'POST') {
        return handlePost(req, res);
    }

    res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/baselines
 * List baselines with optional filtering
 */
async function handleGet(req, res) {
    const { type, status = 'active', scope } = req.query;

    try {
        let sql = 'SELECT * FROM baselines WHERE status = $1';
        const params = [status];
        let paramIndex = 2;

        if (type) {
            sql += ` AND baseline_type = $${paramIndex++}`;
            params.push(type);
        }

        if (scope) {
            sql += ` AND scope_key LIKE $${paramIndex++}`;
            params.push(`%${scope}%`);
        }

        sql += ' ORDER BY baseline_type, scope_key, version DESC';

        const baselines = await query(sql, params);

        return res.status(200).json({
            count: baselines.length,
            baselines: baselines.map(normalizeBaseline)
        });

    } catch (error) {
        console.error('Error listing baselines:', error);
        return res.status(500).json({ error: 'Failed to list baselines' });
    }
}

/**
 * POST /api/baselines
 * Learn a new baseline from historical data
 * 
 * Body: {
 *   type: 'sensor' | 'event_frequency',
 *   scopeKey: 'methane_level_3',
 *   dataWindow: { from: ISO date, to: ISO date }
 * }
 */
async function handlePost(req, res) {
    const { type, scopeKey, dataWindow } = req.body;

    if (!type || !scopeKey) {
        return res.status(400).json({ 
            error: 'Missing required fields: type, scopeKey' 
        });
    }

    try {
        let data;

        if (dataWindow?.from && dataWindow?.to) {
            // Fetch historical data for the specified window
            if (type === 'sensor') {
                // Extract sensor type from scopeKey (e.g., 'methane_level_3' -> 'methane')
                const sensorType = scopeKey.split('_level_')[0] || scopeKey.replace('_global', '');
                const levelMatch = scopeKey.match(/_level_(\d+)/);
                
                let sql = `SELECT value, timestamp FROM measurements
                           WHERE sensor_type = $1
                           AND timestamp BETWEEN $2 AND $3`;
                const params = [sensorType, dataWindow.from, dataWindow.to];

                if (levelMatch) {
                    sql += ' AND level_number = $4';
                    params.push(parseInt(levelMatch[1]));
                }

                sql += ' ORDER BY timestamp';
                data = await query(sql, params);

            } else if (type === 'event_frequency') {
                // Count events per hour for frequency baseline
                const eventType = scopeKey;
                const events = await query(
                    `SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as count
                     FROM events
                     WHERE event_type = $1
                     AND timestamp BETWEEN $2 AND $3
                     GROUP BY DATE_TRUNC('hour', timestamp)`,
                    [eventType, dataWindow.from, dataWindow.to]
                );
                data = events.map(e => ({ value: parseInt(e.count), timestamp: e.hour }));
            }
        }

        if (!data || data.length < 10) {
            return res.status(400).json({ 
                error: 'Insufficient data for baseline learning (minimum 10 samples)',
                samplesFound: data?.length || 0
            });
        }

        const baseline = await learnBaseline(type, scopeKey, data);

        return res.status(201).json({
            message: 'Baseline created successfully',
            baseline: normalizeBaseline(baseline)
        });

    } catch (error) {
        console.error('Error creating baseline:', error);
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Normalize baseline for API response
 */
function normalizeBaseline(row) {
    let parameters = row.parameters;
    if (typeof parameters === 'string') {
        try {
            parameters = JSON.parse(parameters);
        } catch {
            // Keep as-is
        }
    }

    return {
        id: row.id,
        type: row.baseline_type,
        scopeKey: row.scope_key,
        parameters,
        sampleSize: row.sample_size,
        version: row.version,
        status: row.status,
        createdAt: row.created_at
    };
}
