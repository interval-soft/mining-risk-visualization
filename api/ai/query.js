/**
 * AI Query API Endpoint
 * POST /api/ai/query
 * 
 * Allows operators to ask natural language questions about the mine state.
 * Returns grounded answers with citations.
 */

import { query } from '../_lib/db.js';
import { processNaturalLanguageQuery } from '../_lib/queries.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query: queryText, operatorId } = req.body;

    // Validate input
    if (!queryText || typeof queryText !== 'string') {
        return res.status(400).json({ error: 'Missing required field: query' });
    }

    const trimmedQuery = queryText.trim();
    if (trimmedQuery.length < 3) {
        return res.status(400).json({ error: 'Query too short (minimum 3 characters)' });
    }

    if (trimmedQuery.length > 500) {
        return res.status(400).json({ error: 'Query too long (maximum 500 characters)' });
    }

    const startTime = Date.now();

    try {
        // Process the query
        const result = await processNaturalLanguageQuery(trimmedQuery);
        const totalLatencyMs = Date.now() - startTime;

        // Log query to database for analytics and improvement
        try {
            await query(
                `INSERT INTO ai_queries (query_text, response_text, cited_data, model_id, latency_ms)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    trimmedQuery,
                    result.answer,
                    JSON.stringify(result.citations),
                    result.modelId || 'unknown',
                    result.latencyMs || totalLatencyMs
                ]
            );
        } catch (logError) {
            console.error('Failed to log query:', logError);
            // Don't fail the request if logging fails
        }

        // Log to audit trail
        try {
            await query(
                `INSERT INTO ai_audit 
                 (operation_type, model_id, latency_ms, success, prompt_summary, output_summary, confidence)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    'natural_language_query',
                    result.modelId || 'unknown',
                    result.latencyMs || totalLatencyMs,
                    !result.error,
                    trimmedQuery.substring(0, 100),
                    result.answer.substring(0, 200),
                    result.confidence
                ]
            );
        } catch {
            // Audit logging failed, continue
        }

        return res.status(200).json({
            id: generateQueryId(),
            query: trimmedQuery,
            answer: result.answer,
            citations: result.citations,
            confidence: result.confidence,
            queryType: result.queryType,
            suggestedFollowups: result.suggestedFollowups,
            latencyMs: totalLatencyMs
        });

    } catch (error) {
        console.error('Query processing failed:', error);

        // Log failure to audit
        try {
            await query(
                `INSERT INTO ai_audit 
                 (operation_type, model_id, latency_ms, success, error_message, prompt_summary)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    'natural_language_query',
                    'unknown',
                    Date.now() - startTime,
                    false,
                    error.message,
                    trimmedQuery.substring(0, 100)
                ]
            );
        } catch {
            // Audit logging failed, continue
        }

        return res.status(500).json({ 
            error: 'Query processing failed',
            message: 'Unable to process your question. Please try rephrasing or ask a simpler question.',
            suggestedFollowups: [
                'What is the current mine status?',
                'Are there any active alerts?',
                'Which level has the highest risk?'
            ]
        });
    }
}

/**
 * Generate a unique query ID for tracking.
 */
function generateQueryId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
