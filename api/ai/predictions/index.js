/**
 * AI Predictions API Endpoint
 * GET /api/ai/predictions - List predictions
 * POST /api/ai/predictions - Generate new prediction
 * 
 * Predictions forecast future risk levels based on trends and scheduled events.
 */

import { query } from '../../_lib/db.js';
import { predictRisk, PREDICTION_WINDOWS } from '../../_lib/predictions.js';

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
 * GET /api/ai/predictions
 * List predictions with optional filtering
 */
async function handleGet(req, res) {
    const { level, window, valid = 'true' } = req.query;

    try {
        let sql = 'SELECT * FROM ai_predictions WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Only return still-valid predictions by default
        if (valid === 'true') {
            sql += ' AND valid_until > NOW()';
        }

        if (level) {
            sql += ` AND level_number = $${paramIndex++}`;
            params.push(parseInt(level));
        }

        if (window) {
            sql += ` AND prediction_window = $${paramIndex++}`;
            params.push(window);
        }

        sql += ' ORDER BY timestamp DESC';

        const predictions = await query(sql, params);

        return res.status(200).json({
            count: predictions.length,
            predictions: predictions.map(normalizePrediction)
        });

    } catch (error) {
        console.error('Error fetching predictions:', error);
        
        // Return empty array on error (graceful degradation)
        return res.status(200).json({
            count: 0,
            predictions: [],
            error: 'Unable to fetch predictions'
        });
    }
}

/**
 * POST /api/ai/predictions
 * Generate a new prediction for a level
 * 
 * Body: { level: number, window?: string }
 */
async function handlePost(req, res) {
    const { level, window = '1_hour' } = req.body;

    if (!level) {
        return res.status(400).json({ error: 'Missing required field: level' });
    }

    if (!PREDICTION_WINDOWS[window]) {
        return res.status(400).json({ 
            error: `Invalid window. Valid options: ${Object.keys(PREDICTION_WINDOWS).join(', ')}` 
        });
    }

    const levelNumber = parseInt(level);

    try {
        // Generate prediction
        const prediction = await predictRisk(levelNumber, window);

        // Store prediction
        const result = await query(
            `INSERT INTO ai_predictions
             (level_number, prediction_window, predicted_risk_score, predicted_risk_band,
              confidence, contributing_factors, explanation, model_id, valid_until)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                prediction.levelNumber,
                prediction.predictionWindow,
                prediction.predictedRiskScore,
                prediction.predictedRiskBand,
                prediction.confidence,
                JSON.stringify(prediction.contributingFactors),
                prediction.explanation,
                prediction.modelId,
                prediction.validUntil
            ]
        );

        // Log to audit trail
        await query(
            `INSERT INTO ai_audit 
             (operation_type, model_id, latency_ms, related_level, success, output_summary, confidence)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                'prediction',
                prediction.modelId,
                prediction.latencyMs || 0,
                levelNumber,
                true,
                `Predicted ${prediction.predictedRiskBand} risk (${prediction.predictedRiskScore})`,
                prediction.confidence
            ]
        );

        return res.status(201).json({
            prediction: {
                ...normalizePrediction(result[0]),
                currentScore: prediction.currentScore,
                scoreDelta: prediction.scoreDelta
            }
        });

    } catch (error) {
        console.error('Prediction failed:', error);

        // Log failure to audit
        try {
            await query(
                `INSERT INTO ai_audit 
                 (operation_type, model_id, latency_ms, related_level, success, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ['prediction', 'unknown', 0, levelNumber, false, error.message]
            );
        } catch {
            // Audit logging failed, continue
        }

        return res.status(500).json({ 
            error: 'Prediction failed',
            message: error.message 
        });
    }
}

/**
 * Normalize prediction for API response
 */
function normalizePrediction(row) {
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
        levelNumber: row.level_number,
        predictionWindow: row.prediction_window,
        predictedRiskScore: row.predicted_risk_score,
        predictedRiskBand: row.predicted_risk_band,
        confidence: parseFloat(row.confidence),
        contributingFactors: contributingFactors || [],
        explanation: row.explanation,
        modelId: row.model_id,
        validUntil: row.valid_until,
        createdAt: row.created_at
    };
}
