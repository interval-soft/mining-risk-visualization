/**
 * Natural Language Query Processor
 * Allows operators to ask questions about the mine state in plain English.
 * 
 * Approach:
 * 1. Gather relevant context from database
 * 2. Send to LLM with strict grounding instructions
 * 3. Extract citations for traceability
 */

import { query } from './db.js';
import { callOpenRouter, parseJSONResponse } from './openrouter.js';

/**
 * Process a natural language query about the mine state.
 * 
 * @param {string} queryText - User's question in natural language
 * @returns {Promise<Object>} Answer with citations and metadata
 */
export async function processNaturalLanguageQuery(queryText) {
    // Gather comprehensive context
    const context = await gatherQueryContext(queryText);

    // Classify query type for better prompting
    const queryType = classifyQuery(queryText);

    // Build system prompt with grounding rules
    const systemPrompt = `You are a mining safety AI assistant answering questions about the current state of the mine.

CRITICAL RULES:
1. ONLY answer based on the provided data - never make up or assume information
2. ALWAYS cite specific data points with their timestamps or sources
3. If you don't have enough data to answer, clearly state what's missing
4. Never speculate about safety-critical information
5. Keep responses concise but complete
6. Use plain language suitable for mine operators

Data freshness: All data is current as of ${new Date().toLocaleTimeString()}`;

    // Build user prompt with context
    const userPrompt = buildUserPrompt(queryText, context, queryType);

    try {
        const response = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            temperature: 0.3,
            maxTokens: 800
        });

        // Extract any citations from the response
        const citations = extractCitations(response.content, context);

        return {
            answer: response.content,
            citations,
            confidence: calculateResponseConfidence(response.content, context),
            queryType,
            latencyMs: response.latencyMs,
            modelId: response.model,
            suggestedFollowups: generateFollowups(queryType, context)
        };

    } catch (error) {
        console.error('Query processing failed:', error);
        
        return {
            answer: 'I apologize, but I am unable to process your query at this time. Please try again or rephrase your question.',
            citations: [],
            confidence: 0,
            queryType: 'error',
            error: error.message,
            suggestedFollowups: getDefaultFollowups()
        };
    }
}

/**
 * Gather all context that might be relevant to answering queries.
 */
async function gatherQueryContext(queryText) {
    const lowerQuery = queryText.toLowerCase();

    // Get current levels
    let levels = [];
    try {
        levels = await query(`
            SELECT sl.level_number, sl.level_name, sl.risk_score, sl.risk_band, sl.risk_explanation
            FROM snapshot_levels sl
            JOIN (SELECT MAX(id) as id FROM snapshots) s ON sl.snapshot_id = s.id
            ORDER BY sl.level_number
        `);
    } catch {
        levels = [];
    }

    // Get recent events (last 2 hours)
    let events = [];
    try {
        events = await query(`
            SELECT * FROM events
            WHERE timestamp > NOW() - INTERVAL '2 hours'
            ORDER BY timestamp DESC
            LIMIT 20
        `);
    } catch {
        events = [];
    }

    // Get recent measurements (latest per sensor per level)
    let measurements = [];
    try {
        measurements = await query(`
            SELECT DISTINCT ON (level_number, sensor_type) 
                   level_number, sensor_type, value, unit, timestamp
            FROM measurements
            WHERE timestamp > NOW() - INTERVAL '1 hour'
            ORDER BY level_number, sensor_type, timestamp DESC
        `);
    } catch {
        measurements = [];
    }

    // Get active alerts
    let alerts = [];
    try {
        alerts = await query(`
            SELECT * FROM alerts 
            WHERE status = 'active'
            ORDER BY risk_score DESC
        `);
    } catch {
        alerts = [];
    }

    // Get recent AI insights if query is about AI/anomalies
    let aiInsights = [];
    if (lowerQuery.includes('ai') || lowerQuery.includes('anomal') || lowerQuery.includes('insight')) {
        try {
            aiInsights = await query(`
                SELECT * FROM ai_insights
                WHERE status = 'active'
                ORDER BY timestamp DESC
                LIMIT 5
            `);
        } catch {
            aiInsights = [];
        }
    }

    // Get predictions if query is about future/forecast
    let predictions = [];
    if (lowerQuery.includes('predict') || lowerQuery.includes('forecast') || 
        lowerQuery.includes('will') || lowerQuery.includes('going to')) {
        try {
            predictions = await query(`
                SELECT * FROM ai_predictions
                WHERE valid_until > NOW()
                ORDER BY timestamp DESC
                LIMIT 5
            `);
        } catch {
            predictions = [];
        }
    }

    return {
        levels,
        events,
        measurements,
        alerts,
        aiInsights,
        predictions,
        timestamp: new Date().toISOString()
    };
}

/**
 * Classify the type of query for better prompting.
 */
function classifyQuery(queryText) {
    const lower = queryText.toLowerCase();

    if (lower.includes('why') && (lower.includes('risk') || lower.includes('score') || lower.includes('high'))) {
        return 'risk_explanation';
    }
    if (lower.includes('change') || lower.includes('happen') || lower.includes('what') && lower.includes('last')) {
        return 'change_analysis';
    }
    if (lower.includes('predict') || lower.includes('forecast') || lower.includes('will') || lower.includes('expect')) {
        return 'prediction';
    }
    if (lower.includes('compare') || lower.includes('versus') || lower.includes('vs') || lower.includes('difference')) {
        return 'comparison';
    }
    if (lower.includes('alert') || lower.includes('warning')) {
        return 'alert_inquiry';
    }
    if (lower.includes('safest') || lower.includes('lowest risk') || lower.includes('best')) {
        return 'recommendation';
    }
    return 'general';
}

/**
 * Build the user prompt with context.
 */
function buildUserPrompt(queryText, context, queryType) {
    let prompt = `Question: ${queryText}\n\n`;

    // Add levels context
    prompt += `Current Mine State (${context.levels.length} levels):\n`;
    if (context.levels.length > 0) {
        context.levels.forEach(l => {
            prompt += `- Level ${l.level_number} (${l.level_name}): Risk ${l.risk_score} (${l.risk_band})`;
            if (l.risk_explanation) {
                prompt += ` - ${l.risk_explanation.substring(0, 100)}`;
            }
            prompt += '\n';
        });
    } else {
        prompt += '- No level data available\n';
    }

    // Add events
    prompt += `\nRecent Events (last 2 hours):\n`;
    if (context.events.length > 0) {
        context.events.slice(0, 10).forEach(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            prompt += `- [${time}] Level ${e.level_number}: ${e.event_type}`;
            if (e.severity) prompt += ` (${e.severity})`;
            prompt += '\n';
        });
    } else {
        prompt += '- No recent events\n';
    }

    // Add measurements
    prompt += `\nLatest Sensor Readings:\n`;
    if (context.measurements.length > 0) {
        context.measurements.forEach(m => {
            const time = new Date(m.timestamp).toLocaleTimeString();
            prompt += `- Level ${m.level_number} ${m.sensor_type}: ${m.value} ${m.unit} (${time})\n`;
        });
    } else {
        prompt += '- No recent measurements\n';
    }

    // Add alerts
    prompt += `\nActive Alerts:\n`;
    if (context.alerts.length > 0) {
        context.alerts.forEach(a => {
            prompt += `- Level ${a.level_number}: ${a.cause} (Risk: ${a.risk_score})\n`;
        });
    } else {
        prompt += '- No active alerts\n';
    }

    // Add AI insights if available
    if (context.aiInsights.length > 0) {
        prompt += `\nAI Insights:\n`;
        context.aiInsights.forEach(i => {
            prompt += `- ${i.title}: ${i.explanation}\n`;
        });
    }

    // Add predictions if available
    if (context.predictions.length > 0) {
        prompt += `\nAI Predictions:\n`;
        context.predictions.forEach(p => {
            prompt += `- Level ${p.level_number} (${p.prediction_window}): Predicted ${p.predicted_risk_band} (${p.predicted_risk_score})\n`;
        });
    }

    prompt += `\nAnswer the question based on this data. Include specific citations where relevant.`;

    return prompt;
}

/**
 * Extract citations from the response.
 */
function extractCitations(answer, context) {
    const citations = [];

    // Check for level mentions
    context.levels.forEach(l => {
        if (answer.includes(`Level ${l.level_number}`) || answer.includes(l.level_name)) {
            citations.push({
                type: 'level',
                reference: `Level ${l.level_number}`,
                data: { riskScore: l.risk_score, riskBand: l.risk_band }
            });
        }
    });

    // Check for event mentions
    context.events.forEach(e => {
        if (answer.toLowerCase().includes(e.event_type.toLowerCase().replace(/_/g, ' '))) {
            citations.push({
                type: 'event',
                reference: e.event_type,
                timestamp: e.timestamp,
                levelNumber: e.level_number
            });
        }
    });

    // Check for alert mentions
    context.alerts.forEach(a => {
        if (answer.includes(a.cause) || (answer.includes('alert') && answer.includes(`Level ${a.level_number}`))) {
            citations.push({
                type: 'alert',
                reference: a.cause,
                levelNumber: a.level_number,
                riskScore: a.risk_score
            });
        }
    });

    return citations;
}

/**
 * Calculate confidence based on data availability.
 */
function calculateResponseConfidence(answer, context) {
    let confidence = 0.5;

    // More data = higher confidence
    if (context.levels.length > 0) confidence += 0.1;
    if (context.events.length > 0) confidence += 0.1;
    if (context.measurements.length > 0) confidence += 0.1;
    if (context.alerts.length > 0) confidence += 0.05;

    // Shorter answers for simple queries = higher confidence
    if (answer.length < 500) confidence += 0.05;

    // Caveats reduce confidence
    if (answer.toLowerCase().includes("i don't have") || 
        answer.toLowerCase().includes("insufficient") ||
        answer.toLowerCase().includes("unable to")) {
        confidence -= 0.2;
    }

    return Math.min(0.95, Math.max(0.3, confidence));
}

/**
 * Generate relevant follow-up questions.
 */
function generateFollowups(queryType, context) {
    const followups = {
        risk_explanation: [
            'What events contributed to this risk level?',
            'How has the risk changed in the last hour?',
            'What is the recommended action?'
        ],
        change_analysis: [
            'What is the current risk level?',
            'Are there any active alerts?',
            'What events are scheduled?'
        ],
        prediction: [
            'What is the current risk score?',
            'What factors are driving the prediction?',
            'Are there scheduled events that might change this?'
        ],
        comparison: [
            'Which level is safest right now?',
            'What caused the difference?',
            'Show me the trend for each level'
        ],
        alert_inquiry: [
            'What caused this alert?',
            'Has the alert been acknowledged?',
            'What is the recommended action?'
        ],
        recommendation: [
            'What are the current risk scores?',
            'Are there any active alerts?',
            'What is scheduled in the next hour?'
        ],
        general: [
            'Why is Level 3 high risk?',
            'What happened in the last 30 minutes?',
            'Which level is safest?'
        ]
    };

    return followups[queryType] || followups.general;
}

/**
 * Default follow-ups when query fails.
 */
function getDefaultFollowups() {
    return [
        'What is the current mine status?',
        'Are there any active alerts?',
        'Which level has the highest risk?'
    ];
}
