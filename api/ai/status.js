/**
 * AI Status Endpoint
 * GET /api/ai/status
 * 
 * Returns the current status of AI capabilities:
 * - Whether AI is enabled in configuration
 * - Whether the OpenRouter API is reachable
 * - Configured models (primary and fallback)
 * - Available AI features
 */

import { query } from '../_lib/db.js';
import { isAIAvailable } from '../_lib/openrouter.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check OpenRouter API availability
        const available = await isAIAvailable();

        // Get configuration from database
        let config = {
            enabled: true,
            primary_model: 'anthropic/claude-sonnet-4',
            fallback_model: 'anthropic/claude-3-haiku',
            confidence_threshold: 0.6
        };

        try {
            const rows = await query('SELECT key, value FROM ai_config');
            rows.forEach(row => {
                try {
                    config[row.key] = JSON.parse(row.value);
                } catch {
                    config[row.key] = row.value;
                }
            });
        } catch (dbError) {
            // Database might not have AI tables yet - use defaults
            console.warn('Could not load AI config from database:', dbError.message);
        }

        // Get recent AI activity stats
        let recentActivity = null;
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_operations,
                    AVG(latency_ms) as avg_latency,
                    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
                    MAX(timestamp) as last_operation
                FROM ai_audit
                WHERE timestamp > NOW() - INTERVAL '1 hour'
            `);
            if (stats[0]?.total_operations > 0) {
                recentActivity = {
                    operationsLastHour: parseInt(stats[0].total_operations),
                    avgLatencyMs: Math.round(parseFloat(stats[0].avg_latency) || 0),
                    successRate: stats[0].total_operations > 0 
                        ? (stats[0].successful / stats[0].total_operations) 
                        : 1,
                    lastOperation: stats[0].last_operation
                };
            }
        } catch {
            // Stats not critical
        }

        res.status(200).json({
            enabled: config.enabled !== false,
            available,
            status: available ? (config.enabled ? 'active' : 'disabled') : 'unavailable',
            models: {
                primary: process.env.OPENROUTER_PRIMARY_MODEL || config.primary_model,
                fallback: process.env.OPENROUTER_FALLBACK_MODEL || config.fallback_model
            },
            features: {
                anomalyDetection: true,
                predictions: true,
                naturalLanguageQueries: true,
                feedback: true
            },
            config: {
                confidenceThreshold: config.confidence_threshold
            },
            recentActivity
        });

    } catch (error) {
        console.error('AI status check failed:', error);
        
        // Return degraded status on error
        res.status(200).json({
            enabled: false,
            available: false,
            status: 'error',
            error: error.message,
            models: {
                primary: process.env.OPENROUTER_PRIMARY_MODEL || 'anthropic/claude-sonnet-4',
                fallback: process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-3-haiku'
            },
            features: {
                anomalyDetection: false,
                predictions: false,
                naturalLanguageQueries: false,
                feedback: false
            }
        });
    }
}
