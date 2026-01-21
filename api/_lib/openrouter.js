/**
 * OpenRouter LLM Client
 * Handles all communication with OpenRouter API for AI inference.
 * 
 * Features:
 * - Rate limiting to prevent API throttling
 * - Automatic fallback to secondary model on failure
 * - Retry logic for transient errors
 * - Comprehensive response handling
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Rate limiter state (simple token bucket)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call OpenRouter API with automatic rate limiting and fallback.
 * 
 * @param {Array} messages - Chat messages in OpenAI format
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model ID (default: primary model from env)
 * @param {number} options.maxTokens - Max response tokens (default: 1000)
 * @param {number} options.temperature - Sampling temperature (default: 0.3)
 * @param {boolean} options.useFallback - Whether to try fallback on failure (default: true)
 * @returns {Promise<Object>} Response with content, model, latencyMs, usage
 */
export async function callOpenRouter(messages, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    lastRequestTime = Date.now();

    const model = options.model || process.env.OPENROUTER_PRIMARY_MODEL || 'anthropic/claude-sonnet-4';
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature ?? 0.3;
    const useFallback = options.useFallback !== false;

    const startTime = Date.now();

    try {
        const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'https://mining-risk-visualization.vercel.app',
                'X-Title': 'Mining Risk Visualization'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature
            })
        });

        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            
            // Log the error for debugging
            console.error('OpenRouter API error:', { 
                status: response.status, 
                error: errorMessage,
                model 
            });

            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Validate response
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response structure from OpenRouter');
        }

        return {
            content: data.choices[0].message.content,
            model,
            latencyMs,
            usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 }
        };

    } catch (error) {
        const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-3-haiku';
        
        // Try fallback model if not already using it
        if (useFallback && model !== fallbackModel) {
            console.warn(`Primary model failed, attempting fallback: ${fallbackModel}`);
            return callOpenRouter(messages, {
                ...options,
                model: fallbackModel,
                useFallback: false // Prevent infinite recursion
            });
        }

        throw error;
    }
}

/**
 * Check if OpenRouter API is available and configured.
 * Used for health checks and graceful degradation.
 * 
 * @returns {Promise<boolean>} True if API is reachable and key is valid
 */
export async function isAIAvailable() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return false;
    }

    try {
        const response = await fetch(`${OPENROUTER_BASE}/models`, {
            headers: { 
                'Authorization': `Bearer ${apiKey}` 
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get available models from OpenRouter.
 * Useful for dynamic model selection or debugging.
 * 
 * @returns {Promise<Array>} List of available models
 */
export async function getAvailableModels() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return [];
    }

    try {
        const response = await fetch(`${OPENROUTER_BASE}/models`, {
            headers: { 
                'Authorization': `Bearer ${apiKey}` 
            }
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.data || [];
    } catch {
        return [];
    }
}

/**
 * Parse JSON from LLM response, handling common formatting issues.
 * LLMs sometimes include markdown code blocks or extra text.
 * 
 * @param {string} content - Raw response content
 * @returns {Object} Parsed JSON object
 */
export function parseJSONResponse(content) {
    // Try direct parse first
    try {
        return JSON.parse(content);
    } catch {
        // Try extracting from markdown code block
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
        }

        // Try finding JSON object pattern
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            return JSON.parse(objectMatch[0]);
        }

        throw new Error('Could not parse JSON from response');
    }
}
