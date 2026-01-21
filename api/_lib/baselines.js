/**
 * Baseline Manager
 * Learns and manages "normal" operational patterns for anomaly detection.
 * 
 * Baselines are statistical models of expected values that allow us to
 * detect when current readings deviate significantly from normal.
 */

import { query } from './db.js';

/**
 * Get the active baseline for a given type and scope.
 * 
 * @param {string} type - Baseline type (e.g., 'sensor', 'event_frequency')
 * @param {string} scopeKey - Scope identifier (e.g., 'methane_level_3')
 * @returns {Promise<Object|null>} Active baseline or null
 */
export async function getBaseline(type, scopeKey) {
    try {
        const rows = await query(
            `SELECT * FROM baselines
             WHERE baseline_type = $1 AND scope_key = $2 AND status = 'active'
             ORDER BY version DESC LIMIT 1`,
            [type, scopeKey]
        );
        
        if (rows.length === 0) {
            return null;
        }

        const baseline = rows[0];
        // Parse parameters if stored as string
        if (typeof baseline.parameters === 'string') {
            baseline.parameters = JSON.parse(baseline.parameters);
        }
        return baseline;
    } catch (error) {
        console.error('Error fetching baseline:', error);
        return null;
    }
}

/**
 * Get baseline with fallback to global scope if level-specific doesn't exist.
 * 
 * @param {string} type - Baseline type
 * @param {string} sensorType - Sensor type (e.g., 'methane')
 * @param {number} levelNumber - Level number
 * @returns {Promise<Object|null>} Baseline (level-specific or global)
 */
export async function getBaselineWithFallback(type, sensorType, levelNumber) {
    // Try level-specific first
    const levelKey = `${sensorType}_level_${levelNumber}`;
    let baseline = await getBaseline(type, levelKey);
    
    if (baseline) {
        return baseline;
    }

    // Fall back to global baseline
    const globalKey = `${sensorType}_global`;
    return getBaseline(type, globalKey);
}

/**
 * Learn a new baseline from historical data.
 * Creates a new version and marks previous versions as superseded.
 * 
 * @param {string} type - Baseline type
 * @param {string} scopeKey - Scope identifier
 * @param {Array} data - Array of {value, timestamp} objects
 * @returns {Promise<Object>} New baseline record
 */
export async function learnBaseline(type, scopeKey, data) {
    if (!data || data.length < 10) {
        throw new Error('Insufficient data for baseline learning (minimum 10 samples)');
    }

    // Extract values
    const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
    
    if (values.length < 10) {
        throw new Error('Insufficient valid numeric values for baseline');
    }

    // Calculate statistical parameters
    const parameters = calculateStatistics(values);

    // Get next version number
    const existing = await query(
        `SELECT MAX(version) as max_version FROM baselines
         WHERE baseline_type = $1 AND scope_key = $2`,
        [type, scopeKey]
    );
    const nextVersion = (existing[0]?.max_version || 0) + 1;

    // Mark old versions as superseded
    await query(
        `UPDATE baselines SET status = 'superseded'
         WHERE baseline_type = $1 AND scope_key = $2 AND status = 'active'`,
        [type, scopeKey]
    );

    // Insert new baseline
    const result = await query(
        `INSERT INTO baselines (baseline_type, scope_key, parameters, sample_size, version)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [type, scopeKey, JSON.stringify(parameters), values.length, nextVersion]
    );

    return result[0];
}

/**
 * Calculate statistical parameters from a set of values.
 * 
 * @param {Array<number>} values - Numeric values
 * @returns {Object} Statistical parameters
 */
function calculateStatistics(values) {
    const n = values.length;
    
    // Mean
    const mean = values.reduce((a, b) => a + b, 0) / n;
    
    // Standard deviation
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (p) => {
        const index = Math.floor(sorted.length * p / 100);
        return sorted[Math.min(index, sorted.length - 1)];
    };

    return {
        mean: round(mean, 4),
        stdDev: round(stdDev, 4),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        percentiles: {
            p5: round(percentile(5), 4),
            p25: round(percentile(25), 4),
            p50: round(percentile(50), 4),
            p75: round(percentile(75), 4),
            p95: round(percentile(95), 4)
        },
        sampleSize: n
    };
}

/**
 * Check if a value is anomalous relative to a baseline.
 * Uses z-score method with configurable sensitivity.
 * 
 * @param {number} value - Current value to check
 * @param {Object} baseline - Baseline with parameters
 * @param {number} sensitivity - Number of standard deviations (default: 2)
 * @returns {boolean} True if value is anomalous
 */
export function isAnomaly(value, baseline, sensitivity = 2) {
    if (!baseline?.parameters) {
        return false;
    }

    const { mean, stdDev } = baseline.parameters;
    
    // Avoid division by zero
    if (stdDev === 0) {
        return value !== mean;
    }

    const zScore = Math.abs(value - mean) / stdDev;
    return zScore > sensitivity;
}

/**
 * Get detailed deviation information for a value.
 * 
 * @param {number} value - Current value
 * @param {Object} baseline - Baseline with parameters
 * @returns {Object} Deviation details including z-score and percentile
 */
export function getDeviation(value, baseline) {
    if (!baseline?.parameters) {
        return { zScore: 0, percentile: 50, direction: 'normal' };
    }

    const { mean, stdDev, percentiles } = baseline.parameters;
    
    // Calculate z-score
    const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;
    
    // Determine approximate percentile
    const approximatePercentile = calculateApproximatePercentile(value, percentiles);
    
    // Determine direction
    let direction = 'normal';
    if (zScore > 2) direction = 'high';
    else if (zScore < -2) direction = 'low';
    else if (zScore > 1) direction = 'elevated';
    else if (zScore < -1) direction = 'reduced';

    return {
        zScore: round(zScore, 2),
        percentile: approximatePercentile,
        direction,
        deviationFromMean: round(value - mean, 4),
        deviationPercent: mean !== 0 ? round(((value - mean) / mean) * 100, 1) : 0
    };
}

/**
 * Calculate approximate percentile from stored percentile values.
 */
function calculateApproximatePercentile(value, percentiles) {
    if (!percentiles) return 50;

    const { p5, p25, p50, p75, p95 } = percentiles;
    
    if (value <= p5) return 5;
    if (value <= p25) return 25;
    if (value <= p50) return 50;
    if (value <= p75) return 75;
    if (value <= p95) return 95;
    return 99;
}

/**
 * Get all active baselines, optionally filtered by type.
 * 
 * @param {string} type - Optional baseline type filter
 * @returns {Promise<Array>} Active baselines
 */
export async function getActiveBaselines(type = null) {
    let sql = 'SELECT * FROM baselines WHERE status = $1';
    const params = ['active'];

    if (type) {
        sql += ' AND baseline_type = $2';
        params.push(type);
    }

    sql += ' ORDER BY baseline_type, scope_key';
    return query(sql, params);
}

/**
 * Round a number to specified decimal places.
 */
function round(value, decimals) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
