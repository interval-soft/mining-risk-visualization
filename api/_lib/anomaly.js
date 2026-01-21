/**
 * Anomaly Detection System
 * Detects statistical anomalies and enhances them with LLM analysis.
 * 
 * Two-stage approach:
 * 1. Statistical detection using baselines (fast, deterministic)
 * 2. LLM analysis for context and recommendations (slower, intelligent)
 */

import { query } from './db.js';
import { getBaselineWithFallback, isAnomaly, getDeviation } from './baselines.js';
import { callOpenRouter, parseJSONResponse } from './openrouter.js';

/**
 * Detect anomalies for a specific level.
 * Uses statistical methods against learned baselines.
 * 
 * @param {number} levelNumber - Mine level to analyze
 * @returns {Promise<Array>} Array of detected anomalies
 */
export async function detectAnomalies(levelNumber) {
    const anomalies = [];
    const lookbackMinutes = 120; // 2 hours

    try {
        // Get recent measurements
        const measurements = await query(
            `SELECT * FROM measurements
             WHERE level_number = $1 AND timestamp > NOW() - INTERVAL '${lookbackMinutes} minutes'
             ORDER BY timestamp DESC`,
            [levelNumber]
        );

        // Get recent events
        const events = await query(
            `SELECT * FROM events
             WHERE level_number = $1 AND timestamp > NOW() - INTERVAL '${lookbackMinutes} minutes'
             ORDER BY timestamp DESC`,
            [levelNumber]
        );

        // Statistical anomaly detection for measurements
        for (const m of measurements) {
            const baseline = await getBaselineWithFallback('sensor', m.sensor_type, levelNumber);
            
            if (baseline && isAnomaly(m.value, baseline)) {
                const deviation = getDeviation(m.value, baseline);
                anomalies.push({
                    type: 'measurement_deviation',
                    sensorType: m.sensor_type,
                    value: parseFloat(m.value),
                    unit: m.unit,
                    baseline: {
                        mean: baseline.parameters.mean,
                        stdDev: baseline.parameters.stdDev
                    },
                    deviation,
                    timestamp: m.timestamp,
                    levelNumber
                });
            }
        }

        // Event frequency anomaly detection
        const eventCounts = {};
        events.forEach(e => {
            eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
        });

        // Check each event type against baseline
        for (const [eventType, count] of Object.entries(eventCounts)) {
            const baseline = await getBaselineWithFallback('event_frequency', eventType, levelNumber);
            
            if (baseline && isAnomaly(count, baseline, 1.5)) { // Lower threshold for events
                const deviation = getDeviation(count, baseline);
                anomalies.push({
                    type: 'event_frequency',
                    eventType,
                    count,
                    expected: baseline.parameters.mean,
                    deviation,
                    timestamp: new Date().toISOString(),
                    levelNumber
                });
            }
        }

        // Check for unusual event combinations (heuristic)
        const highRiskCombinations = checkHighRiskCombinations(events);
        anomalies.push(...highRiskCombinations.map(c => ({
            ...c,
            levelNumber
        })));

    } catch (error) {
        console.error('Error detecting anomalies:', error);
    }

    return anomalies;
}

/**
 * Check for high-risk event combinations that may not trigger individually.
 */
function checkHighRiskCombinations(events) {
    const anomalies = [];
    const eventTypes = new Set(events.map(e => e.event_type));

    // Blasting + personnel nearby = high risk
    if (eventTypes.has('blast_scheduled') && eventTypes.has('personnel_entry')) {
        anomalies.push({
            type: 'risk_combination',
            combination: ['blast_scheduled', 'personnel_entry'],
            description: 'Personnel activity detected during scheduled blast window',
            timestamp: new Date().toISOString()
        });
    }

    // Confined space + ventilation issue = high risk
    if (eventTypes.has('confined_space_entry') && eventTypes.has('ventilation_alarm')) {
        anomalies.push({
            type: 'risk_combination',
            combination: ['confined_space_entry', 'ventilation_alarm'],
            description: 'Confined space entry during ventilation alarm',
            timestamp: new Date().toISOString()
        });
    }

    // Multiple gas readings in short time
    const gasReadings = events.filter(e => e.event_type === 'gas_reading');
    if (gasReadings.length >= 3) {
        anomalies.push({
            type: 'pattern',
            pattern: 'multiple_gas_readings',
            count: gasReadings.length,
            description: `${gasReadings.length} gas readings in monitoring window`,
            timestamp: new Date().toISOString()
        });
    }

    return anomalies;
}

/**
 * Analyze detected anomalies with LLM for human-readable insights.
 * 
 * @param {Array} anomalies - Detected anomalies
 * @param {number} levelNumber - Mine level
 * @returns {Promise<Array>} Enhanced insights with explanations
 */
export async function analyzeAnomaliesWithLLM(anomalies, levelNumber) {
    if (anomalies.length === 0) {
        return [];
    }

    const prompt = `You are analyzing mining safety data for Level ${levelNumber} of an underground mine.

Statistical anomalies detected:
${anomalies.map((a, i) => `${i + 1}. ${formatAnomalyForPrompt(a)}`).join('\n')}

Analyze these anomalies and provide actionable insights for mine operators. For each significant finding:
1. Explain what is abnormal in plain, non-technical language
2. Suggest potential operational causes
3. Recommend specific monitoring or mitigation actions
4. Rate your confidence (0.0-1.0) based on data quality

Important: Be conservative and safety-focused. When in doubt, recommend further investigation.

Respond ONLY with valid JSON in this exact format:
{
  "insights": [
    {
      "title": "Brief descriptive title (max 50 chars)",
      "severity": "low|medium|high|critical",
      "explanation": "Clear explanation for operators (1-2 sentences)",
      "causes": ["potential cause 1", "potential cause 2"],
      "recommendedAction": "Specific action to take",
      "confidence": 0.0-1.0,
      "relatedAnomalyIndices": [0, 1]
    }
  ]
}`;

    try {
        const response = await callOpenRouter([
            { 
                role: 'system', 
                content: 'You are a mining safety AI assistant. Provide concise, actionable insights. Always respond with valid JSON only.' 
            },
            { role: 'user', content: prompt }
        ], {
            temperature: 0.2, // Lower temperature for more consistent output
            maxTokens: 1500
        });

        const parsed = parseJSONResponse(response.content);

        if (!parsed.insights || !Array.isArray(parsed.insights)) {
            throw new Error('Invalid response structure');
        }

        return parsed.insights.map(insight => ({
            ...insight,
            levelNumber,
            modelId: response.model,
            latencyMs: response.latencyMs,
            // Link back to original anomalies
            sourceAnomalies: (insight.relatedAnomalyIndices || []).map(i => anomalies[i])
        }));

    } catch (error) {
        console.error('LLM analysis failed:', error);
        
        // Fallback to basic insights without LLM
        return generateFallbackInsights(anomalies, levelNumber);
    }
}

/**
 * Format anomaly for LLM prompt.
 */
function formatAnomalyForPrompt(anomaly) {
    switch (anomaly.type) {
        case 'measurement_deviation':
            return `Sensor reading: ${anomaly.sensorType} = ${anomaly.value} ${anomaly.unit || ''} ` +
                   `(expected ~${anomaly.baseline.mean}, z-score: ${anomaly.deviation.zScore})`;
        
        case 'event_frequency':
            return `Event frequency: ${anomaly.eventType} occurred ${anomaly.count} times ` +
                   `(expected ~${anomaly.expected.toFixed(1)})`;
        
        case 'risk_combination':
            return `Risk combination: ${anomaly.description}`;
        
        case 'pattern':
            return `Pattern detected: ${anomaly.description}`;
        
        default:
            return JSON.stringify(anomaly);
    }
}

/**
 * Generate basic insights when LLM is unavailable.
 */
function generateFallbackInsights(anomalies, levelNumber) {
    return anomalies.map(anomaly => {
        let title, severity, explanation, action;

        switch (anomaly.type) {
            case 'measurement_deviation':
                title = `${anomaly.sensorType} reading ${anomaly.deviation.direction}`;
                severity = Math.abs(anomaly.deviation.zScore) > 3 ? 'high' : 'medium';
                explanation = `${anomaly.sensorType} reading of ${anomaly.value} is ${Math.abs(anomaly.deviation.zScore).toFixed(1)} standard deviations from normal.`;
                action = 'Verify sensor calibration and investigate if reading persists.';
                break;

            case 'event_frequency':
                title = `Unusual ${anomaly.eventType} frequency`;
                severity = anomaly.count > anomaly.expected * 2 ? 'high' : 'medium';
                explanation = `${anomaly.eventType} occurred ${anomaly.count} times vs expected ${anomaly.expected.toFixed(1)}.`;
                action = 'Review recent operations for unusual activity patterns.';
                break;

            case 'risk_combination':
                title = 'High-risk activity combination';
                severity = 'high';
                explanation = anomaly.description;
                action = 'Immediately verify personnel safety and operational protocols.';
                break;

            default:
                title = 'Anomaly detected';
                severity = 'medium';
                explanation = 'An unusual pattern was detected that requires attention.';
                action = 'Investigate and monitor.';
        }

        return {
            title,
            severity,
            explanation,
            causes: ['Unable to determine - AI analysis unavailable'],
            recommendedAction: action,
            confidence: 0.5,
            levelNumber,
            modelId: 'fallback',
            sourceAnomalies: [anomaly]
        };
    });
}

/**
 * Run full anomaly detection and analysis for all levels.
 * 
 * @returns {Promise<Object>} Insights grouped by level
 */
export async function runFullAnalysis() {
    const results = {};

    try {
        // Get all active levels
        const levels = await query(
            `SELECT DISTINCT level_number FROM snapshot_levels
             WHERE snapshot_id = (SELECT id FROM snapshots ORDER BY timestamp DESC LIMIT 1)`
        );

        for (const { level_number } of levels) {
            const anomalies = await detectAnomalies(level_number);
            if (anomalies.length > 0) {
                const insights = await analyzeAnomaliesWithLLM(anomalies, level_number);
                results[level_number] = {
                    anomalyCount: anomalies.length,
                    insights
                };
            }
        }

    } catch (error) {
        console.error('Full analysis failed:', error);
    }

    return results;
}
