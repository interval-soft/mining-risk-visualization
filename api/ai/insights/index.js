/**
 * AI Insights API Endpoint
 * GET /api/ai/insights - List insights
 * POST /api/ai/insights - Trigger anomaly detection
 * 
 * Insights are AI-generated observations about anomalies and risks.
 */

import { query } from '../../_lib/db.js';
import { detectAnomalies, analyzeAnomaliesWithLLM } from '../../_lib/anomaly.js';

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
 * GET /api/ai/insights
 * List AI insights with optional filtering
 */
async function handleGet(req, res) {
    const { 
        level, 
        type, 
        status = 'active', 
        severity,
        limit = 20,
        offset = 0 
    } = req.query;

    try {
        let sql = 'SELECT * FROM ai_insights WHERE status = $1';
        const params = [status];
        let paramIndex = 2;

        if (level) {
            sql += ` AND level_number = $${paramIndex++}`;
            params.push(parseInt(level));
        }

        if (type) {
            sql += ` AND insight_type = $${paramIndex++}`;
            params.push(type);
        }

        if (severity) {
            sql += ` AND severity = $${paramIndex++}`;
            params.push(severity);
        }

        sql += ` ORDER BY 
                 CASE severity 
                   WHEN 'critical' THEN 1 
                   WHEN 'high' THEN 2 
                   WHEN 'medium' THEN 3 
                   ELSE 4 
                 END,
                 timestamp DESC`;

        sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const insights = await query(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) as total FROM ai_insights WHERE status = $1';
        const countParams = [status];
        let countParamIndex = 2;

        if (level) {
            countSql += ` AND level_number = $${countParamIndex++}`;
            countParams.push(parseInt(level));
        }
        if (type) {
            countSql += ` AND insight_type = $${countParamIndex++}`;
            countParams.push(type);
        }
        if (severity) {
            countSql += ` AND severity = $${countParamIndex++}`;
            countParams.push(severity);
        }

        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult[0]?.total || 0);

        return res.status(200).json({
            count: insights.length,
            total,
            hasMore: offset + insights.length < total,
            insights: insights.map(normalizeInsight)
        });

    } catch (error) {
        console.error('Error fetching insights:', error);
        
        // Return empty array on error (graceful degradation)
        return res.status(200).json({
            count: 0,
            total: 0,
            hasMore: false,
            insights: [],
            error: 'Unable to fetch insights'
        });
    }
}

/**
 * POST /api/ai/insights
 * Trigger anomaly detection for a level
 * 
 * Body: { level: number }
 */
async function handlePost(req, res) {
    const { level } = req.body;

    if (!level) {
        return res.status(400).json({ error: 'Missing required field: level' });
    }

    const levelNumber = parseInt(level);

    try {
        // Run anomaly detection
        const anomalies = await detectAnomalies(levelNumber);

        if (anomalies.length === 0) {
            return res.status(200).json({
                message: 'No anomalies detected',
                count: 0,
                insights: []
            });
        }

        // Analyze with LLM
        const insights = await analyzeAnomaliesWithLLM(anomalies, levelNumber);

        // Store insights in database
        const storedInsights = [];
        for (const insight of insights) {
            try {
                const result = await query(
                    `INSERT INTO ai_insights
                     (insight_type, level_number, severity, confidence, title, explanation,
                      contributing_factors, recommended_action, model_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING *`,
                    [
                        'anomaly',
                        levelNumber,
                        insight.severity,
                        insight.confidence,
                        insight.title,
                        insight.explanation,
                        JSON.stringify(insight.causes || []),
                        insight.recommendedAction,
                        insight.modelId || 'unknown'
                    ]
                );
                storedInsights.push(normalizeInsight(result[0]));

                // Log to audit trail
                await query(
                    `INSERT INTO ai_audit 
                     (operation_type, model_id, latency_ms, related_level, success, output_summary)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        'anomaly_detection',
                        insight.modelId || 'unknown',
                        insight.latencyMs || 0,
                        levelNumber,
                        true,
                        insight.title
                    ]
                );
            } catch (insertError) {
                console.error('Failed to store insight:', insertError);
            }
        }

        return res.status(201).json({
            message: `Detected ${anomalies.length} anomalies, generated ${storedInsights.length} insights`,
            anomalyCount: anomalies.length,
            count: storedInsights.length,
            insights: storedInsights
        });

    } catch (error) {
        console.error('Anomaly detection failed:', error);

        // Log failure to audit
        try {
            await query(
                `INSERT INTO ai_audit 
                 (operation_type, model_id, latency_ms, related_level, success, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ['anomaly_detection', 'unknown', 0, levelNumber, false, error.message]
            );
        } catch {
            // Audit logging failed, continue
        }

        return res.status(500).json({ 
            error: 'Anomaly detection failed',
            message: error.message 
        });
    }
}

/**
 * Normalize insight for API response (snake_case to camelCase)
 */
function normalizeInsight(row) {
    let contributingFactors = row.contributing_factors;
    if (typeof contributingFactors === 'string') {
        try {
            contributingFactors = JSON.parse(contributingFactors);
        } catch {
            contributingFactors = [];
        }
    }

    return {
        id: row.id,
        timestamp: row.timestamp,
        insightType: row.insight_type,
        levelNumber: row.level_number,
        severity: row.severity,
        confidence: parseFloat(row.confidence),
        title: row.title,
        explanation: row.explanation,
        contributingFactors: contributingFactors || [],
        recommendedAction: row.recommended_action,
        modelId: row.model_id,
        status: row.status,
        createdAt: row.created_at
    };
}
