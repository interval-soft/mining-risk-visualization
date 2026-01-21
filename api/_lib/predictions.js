/**
 * Predictive Risk Engine
 * Forecasts future risk levels based on current state, trends, and scheduled events.
 * 
 * Combines:
 * 1. Statistical trend extrapolation (fast, deterministic)
 * 2. Event-based adjustments (scheduled blasts, maintenance)
 * 3. LLM enhancement for complex reasoning
 */

import { query } from './db.js';
import { callOpenRouter, parseJSONResponse } from './openrouter.js';

/**
 * Prediction windows supported
 */
export const PREDICTION_WINDOWS = {
    '15_minutes': { hours: 0.25, label: '15 min' },
    '1_hour': { hours: 1, label: '1 hour' },
    '1_shift': { hours: 8, label: '8 hours' }
};

/**
 * Predict future risk for a level.
 * 
 * @param {number} levelNumber - Mine level to predict
 * @param {string} window - Prediction window ('15_minutes', '1_hour', '1_shift')
 * @returns {Promise<Object>} Prediction with score, confidence, and explanation
 */
export async function predictRisk(levelNumber, window = '1_hour') {
    const windowConfig = PREDICTION_WINDOWS[window];
    if (!windowConfig) {
        throw new Error(`Invalid prediction window: ${window}`);
    }

    // Gather context
    const context = await gatherPredictionContext(levelNumber);

    // Statistical prediction
    const statisticalPrediction = calculateStatisticalPrediction(
        context.currentScore,
        context.trends,
        windowConfig.hours
    );

    // Adjust for scheduled events
    const eventAdjustment = calculateEventAdjustment(
        context.scheduledEvents,
        windowConfig.hours
    );

    // Combined base prediction
    const basePrediction = Math.max(0, Math.min(100,
        statisticalPrediction.predictedScore + eventAdjustment.adjustment
    ));

    // Enhance with LLM for complex reasoning
    const enhancedPrediction = await enhanceWithLLM({
        levelNumber,
        window,
        windowLabel: windowConfig.label,
        currentScore: context.currentScore,
        currentBand: context.currentBand,
        trends: context.trends,
        scheduledEvents: context.scheduledEvents,
        recentEvents: context.recentEvents,
        statisticalPrediction: basePrediction,
        eventAdjustment
    });

    return enhancedPrediction;
}

/**
 * Gather all context needed for prediction.
 */
async function gatherPredictionContext(levelNumber) {
    // Get current state
    const currentState = await query(
        `SELECT sl.risk_score, sl.risk_band, sl.level_name 
         FROM snapshot_levels sl
         JOIN snapshots s ON sl.snapshot_id = s.id
         WHERE sl.level_number = $1
         ORDER BY s.timestamp DESC LIMIT 1`,
        [levelNumber]
    );

    const currentScore = currentState[0]?.risk_score || 50;
    const currentBand = currentState[0]?.risk_band || 'medium';

    // Get trend data (last 6 hours)
    const trends = await query(
        `SELECT sl.risk_score, s.timestamp 
         FROM snapshot_levels sl
         JOIN snapshots s ON sl.snapshot_id = s.id
         WHERE sl.level_number = $1 
         AND s.timestamp > NOW() - INTERVAL '6 hours'
         ORDER BY s.timestamp ASC`,
        [levelNumber]
    );

    // Get scheduled events (next 8 hours)
    const scheduledEvents = await query(
        `SELECT * FROM events
         WHERE level_number = $1
         AND event_type IN ('blast_scheduled', 'maintenance_scheduled', 'inspection_scheduled')
         AND timestamp > NOW() 
         AND timestamp < NOW() + INTERVAL '8 hours'
         ORDER BY timestamp ASC`,
        [levelNumber]
    );

    // Get recent events (last 2 hours)
    const recentEvents = await query(
        `SELECT * FROM events
         WHERE level_number = $1
         AND timestamp > NOW() - INTERVAL '2 hours'
         ORDER BY timestamp DESC
         LIMIT 10`,
        [levelNumber]
    );

    return {
        currentScore,
        currentBand,
        trends,
        scheduledEvents,
        recentEvents
    };
}

/**
 * Calculate statistical trend-based prediction.
 */
function calculateStatisticalPrediction(currentScore, trends, windowHours) {
    if (trends.length < 2) {
        return {
            predictedScore: currentScore,
            velocity: 0,
            confidence: 0.5
        };
    }

    // Calculate velocity (change per hour)
    const first = trends[0];
    const last = trends[trends.length - 1];
    const timeDiffMs = new Date(last.timestamp) - new Date(first.timestamp);
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    if (timeDiffHours === 0) {
        return {
            predictedScore: currentScore,
            velocity: 0,
            confidence: 0.5
        };
    }

    const velocity = (last.risk_score - first.risk_score) / timeDiffHours;

    // Extrapolate
    const predictedScore = Math.round(currentScore + velocity * windowHours);

    // Confidence decreases with:
    // - Higher velocity (more volatile)
    // - Longer prediction window
    // - Fewer data points
    const volatilityPenalty = Math.min(0.3, Math.abs(velocity) * 0.02);
    const windowPenalty = windowHours * 0.05;
    const dataPenalty = Math.max(0, 0.2 - (trends.length * 0.02));

    const confidence = Math.max(0.3, 0.9 - volatilityPenalty - windowPenalty - dataPenalty);

    return {
        predictedScore: Math.max(0, Math.min(100, predictedScore)),
        velocity: Math.round(velocity * 10) / 10,
        confidence: Math.round(confidence * 100) / 100
    };
}

/**
 * Calculate adjustment based on scheduled events.
 */
function calculateEventAdjustment(scheduledEvents, windowHours) {
    let adjustment = 0;
    const factors = [];
    const windowEnd = new Date(Date.now() + windowHours * 60 * 60 * 1000);

    for (const event of scheduledEvents) {
        const eventTime = new Date(event.timestamp);
        if (eventTime > windowEnd) continue;

        switch (event.event_type) {
            case 'blast_scheduled':
                adjustment += 25;
                factors.push(`Scheduled blast (+25)`);
                break;
            case 'maintenance_scheduled':
                adjustment -= 10;
                factors.push(`Scheduled maintenance (-10)`);
                break;
            case 'inspection_scheduled':
                adjustment += 5;
                factors.push(`Scheduled inspection (+5)`);
                break;
        }
    }

    return {
        adjustment,
        factors
    };
}

/**
 * Enhance prediction with LLM reasoning.
 */
async function enhanceWithLLM(context) {
    const prompt = `You are predicting mining risk for Level ${context.levelNumber}.

Current State:
- Risk Score: ${context.currentScore} (${context.currentBand})
- Trend velocity: ${context.trends.length >= 2 ? 
    `${context.statisticalPrediction > context.currentScore ? '+' : ''}${(context.statisticalPrediction - context.currentScore).toFixed(1)} points over ${context.windowLabel}` : 
    'Insufficient trend data'}

Prediction Window: ${context.windowLabel}

Scheduled Events in Window:
${context.scheduledEvents.length > 0 ? 
    context.scheduledEvents.map(e => `- ${e.event_type} at ${new Date(e.timestamp).toLocaleTimeString()}`).join('\n') : 
    '- None'}

Recent Events (last 2 hours):
${context.recentEvents.length > 0 ? 
    context.recentEvents.slice(0, 5).map(e => `- ${e.event_type}`).join('\n') : 
    '- None'}

Statistical Base Prediction: ${context.statisticalPrediction}
${context.eventAdjustment.factors.length > 0 ? `Event Adjustments: ${context.eventAdjustment.factors.join(', ')}` : ''}

Based on this data:
1. Predict the risk score at the end of the ${context.windowLabel} window
2. Determine the risk band (low: 0-30, medium: 31-70, high: 71-100)
3. List contributing factors
4. Rate your confidence (0-1)
5. Provide a brief explanation for operators

Be conservative - when uncertain, predict higher risk for safety.

Respond ONLY with valid JSON:
{
  "predictedScore": 0-100,
  "predictedBand": "low|medium|high",
  "confidence": 0.0-1.0,
  "factors": ["factor1", "factor2"],
  "explanation": "Brief 1-2 sentence explanation"
}`;

    try {
        const response = await callOpenRouter([
            { 
                role: 'system', 
                content: 'You are a mining safety prediction AI. Be conservative and safety-focused. Always respond with valid JSON only.' 
            },
            { role: 'user', content: prompt }
        ], {
            temperature: 0.2,
            maxTokens: 500
        });

        const parsed = parseJSONResponse(response.content);

        return {
            levelNumber: context.levelNumber,
            predictionWindow: context.window,
            predictedRiskScore: parsed.predictedScore,
            predictedRiskBand: parsed.predictedBand,
            confidence: parsed.confidence,
            contributingFactors: parsed.factors || [],
            explanation: parsed.explanation,
            modelId: response.model,
            latencyMs: response.latencyMs,
            validUntil: calculateValidUntil(context.window),
            currentScore: context.currentScore,
            scoreDelta: parsed.predictedScore - context.currentScore
        };

    } catch (error) {
        console.error('LLM prediction enhancement failed:', error);
        
        // Fallback to statistical prediction
        return createFallbackPrediction(context);
    }
}

/**
 * Create fallback prediction when LLM is unavailable.
 */
function createFallbackPrediction(context) {
    const predictedScore = Math.max(0, Math.min(100, context.statisticalPrediction));

    return {
        levelNumber: context.levelNumber,
        predictionWindow: context.window,
        predictedRiskScore: predictedScore,
        predictedRiskBand: scoreToRiskBand(predictedScore),
        confidence: 0.5,
        contributingFactors: [
            'Trend extrapolation',
            ...context.eventAdjustment.factors
        ],
        explanation: `Based on current trend${context.eventAdjustment.factors.length > 0 ? ' and scheduled events' : ''}.`,
        modelId: 'statistical_fallback',
        latencyMs: 0,
        validUntil: calculateValidUntil(context.window),
        currentScore: context.currentScore,
        scoreDelta: predictedScore - context.currentScore
    };
}

/**
 * Convert score to risk band.
 */
function scoreToRiskBand(score) {
    if (score <= 30) return 'low';
    if (score <= 70) return 'medium';
    return 'high';
}

/**
 * Calculate when prediction expires.
 */
function calculateValidUntil(window) {
    const now = new Date();
    const config = PREDICTION_WINDOWS[window];
    const minutes = config.hours * 60;
    return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}

/**
 * Get all valid predictions (not yet expired).
 */
export async function getValidPredictions(levelNumber = null) {
    let sql = `SELECT * FROM ai_predictions WHERE valid_until > NOW()`;
    const params = [];

    if (levelNumber !== null) {
        sql += ' AND level_number = $1';
        params.push(levelNumber);
    }

    sql += ' ORDER BY timestamp DESC';

    return query(sql, params);
}
