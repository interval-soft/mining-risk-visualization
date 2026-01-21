// js/data/DataLoader.js
import { ApiClient } from './ApiClient.js';

/**
 * Data loader that fetches mine state from the API.
 * Falls back to static JSON if API is unavailable.
 * Supports multi-structure mine sites.
 */
export class DataLoader {
    constructor(apiClient = null) {
        this.apiClient = apiClient || new ApiClient();
        this.useApi = true; // Will be set to false if API unavailable
        this.fallbackUrl = 'data/mine-data.json';
    }

    /**
     * Load current mine state.
     * Tries API first, falls back to static JSON.
     * @returns {Promise<Object>} Mine state data with structures and levels
     */
    async loadCurrent() {
        if (this.useApi) {
            try {
                const apiData = await this.apiClient.getCurrentState();
                return this.transformApiResponse(apiData);
            } catch (error) {
                console.warn('API unavailable, falling back to static data:', error.message);
                this.useApi = false;
            }
        }

        // Fallback to static JSON
        return this.loadStatic();
    }

    /**
     * Load state at a specific historical time.
     * @param {Date} timestamp - The time to query
     * @returns {Promise<Object>} Mine state at that time
     */
    async loadAtTime(timestamp) {
        if (this.useApi) {
            try {
                const apiData = await this.apiClient.getHistoricalState(timestamp);
                return this.transformApiResponse(apiData);
            } catch (error) {
                console.warn('Failed to load historical state:', error.message);
                // Fall back to current static data
                return this.loadStatic();
            }
        }

        // No historical data available in static mode
        return this.loadStatic();
    }

    /**
     * Load history for a time range.
     * @param {Date} from - Start time
     * @param {Date} to - End time
     * @returns {Promise<Object>} History with snapshots array
     */
    async loadHistory(from, to) {
        if (this.useApi) {
            try {
                const history = await this.apiClient.getHistory(from, to);
                return {
                    from: history.from,
                    to: history.to,
                    count: history.count,
                    snapshots: history.snapshots.map(s => this.transformApiResponse(s)),
                };
            } catch (error) {
                console.warn('Failed to load history:', error.message);
            }
        }

        // Return single snapshot in static mode
        const staticData = await this.loadStatic();
        return {
            from: from.toISOString(),
            to: to.toISOString(),
            count: 1,
            snapshots: [staticData],
        };
    }

    /**
     * Legacy load method for backward compatibility.
     * @param {string} url - Optional URL (ignored if using API)
     * @returns {Promise<Object>} Mine state data
     */
    async load(url = null) {
        if (url) {
            // Explicit URL provided, use static loading
            return this.loadStatic(url);
        }
        return this.loadCurrent();
    }

    /**
     * Load from static JSON file.
     */
    async loadStatic(url = this.fallbackUrl) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            this.validateLegacy(data);
            return this.transformLegacyData(data);
        } catch (error) {
            console.error('Failed to load mine data:', error);
            throw error;
        }
    }

    /**
     * Transform API response to internal format.
     * Handles both multi-structure and legacy single-structure responses.
     */
    transformApiResponse(apiData) {
        // Check if response has structures (new format)
        if (apiData.structures && Array.isArray(apiData.structures)) {
            return this.transformMultiStructureResponse(apiData);
        }

        // Legacy format with just levels
        return this.transformLegacyApiResponse(apiData);
    }

    /**
     * Transform multi-structure API response.
     */
    transformMultiStructureResponse(apiData) {
        const structures = apiData.structures.map(structure => ({
            code: structure.code,
            name: structure.name,
            type: structure.type,
            position: structure.position || { x: 0, z: 0 },
            rotation: structure.rotation || 0,
            riskScore: structure.riskScore,
            riskBand: structure.riskBand,
            levels: structure.levels.map(level => this.transformLevel(level)),
        }));

        // Also maintain flat levels array for backward compatibility
        const levels = apiData.levels
            ? apiData.levels.map(level => this.transformLevel(level))
            : this.flattenStructureLevels(structures);

        return {
            timestamp: apiData.timestamp,
            structures,
            levels,
        };
    }

    /**
     * Transform a single level object.
     */
    transformLevel(level) {
        return {
            level: level.level,
            name: level.name,
            riskScore: level.riskScore,
            riskBand: level.riskBand,
            riskExplanation: level.riskExplanation,
            triggeredRules: level.triggeredRules || [],
            structureCode: level.structureCode || null,
            structureName: level.structureName || null,
            activities: (level.activities || []).map(activity => ({
                name: activity.name,
                status: activity.status,
                riskScore: activity.riskScore,
                // Map riskScore to risk band for backward compat
                risk: this.scoreToRisk(activity.riskScore),
            })),
        };
    }

    /**
     * Flatten structure levels into a single array.
     */
    flattenStructureLevels(structures) {
        const levels = [];
        let globalLevelNumber = 1;

        for (const structure of structures) {
            for (const level of structure.levels) {
                levels.push({
                    ...level,
                    level: globalLevelNumber++,
                    structureCode: structure.code,
                    structureName: structure.name,
                });
            }
        }

        return levels;
    }

    /**
     * Transform legacy API response (single-structure, no structures array).
     */
    transformLegacyApiResponse(apiData) {
        const levels = apiData.levels.map(level => ({
            level: level.level,
            name: level.name,
            riskScore: level.riskScore,
            riskBand: level.riskBand,
            riskExplanation: level.riskExplanation,
            triggeredRules: level.triggeredRules || [],
            structureCode: null,
            structureName: null,
            activities: (level.activities || []).map(activity => ({
                name: activity.name,
                status: activity.status,
                riskScore: activity.riskScore,
                risk: this.scoreToRisk(activity.riskScore),
            })),
        }));

        // Create a default structure from the levels
        const maxRisk = Math.max(...levels.map(l => l.riskScore || 0), 0);
        const defaultStructure = {
            code: 'DEFAULT',
            name: 'Mine Site',
            type: 'mixed',
            position: { x: 0, z: 0 },
            rotation: 0,
            riskScore: maxRisk,
            riskBand: this.scoreToRisk(maxRisk),
            levels: levels,
        };

        return {
            timestamp: apiData.timestamp,
            structures: [defaultStructure],
            levels: levels,
        };
    }

    /**
     * Transform legacy static JSON to new format.
     * Adds computed risk scores based on activity risks.
     */
    transformLegacyData(data) {
        const levels = data.levels.map(level => {
            // Compute level risk from activities (legacy behavior)
            const maxRisk = this.computeLevelRisk(level.activities);
            const riskScore = this.riskToScore(maxRisk);

            return {
                level: level.level,
                name: level.name,
                riskScore,
                riskBand: maxRisk,
                riskExplanation: `Risk determined by ${level.activities.length} activities.`,
                triggeredRules: [],
                structureCode: null,
                structureName: null,
                activities: level.activities.map(activity => ({
                    name: activity.name,
                    status: activity.status,
                    risk: activity.risk,
                    riskScore: this.riskToScore(activity.risk),
                })),
            };
        });

        // Create a default structure from the levels
        const maxRisk = Math.max(...levels.map(l => l.riskScore || 0), 0);
        const defaultStructure = {
            code: 'DEFAULT',
            name: 'Mine Site',
            type: 'mixed',
            position: { x: 0, z: 0 },
            rotation: 0,
            riskScore: maxRisk,
            riskBand: this.scoreToRisk(maxRisk),
            levels: levels,
        };

        return {
            timestamp: data.timestamp,
            structures: [defaultStructure],
            levels: levels,
        };
    }

    /**
     * Validate legacy data format.
     */
    validateLegacy(data) {
        if (!data.timestamp) {
            throw new Error('Missing timestamp in data');
        }
        if (!Array.isArray(data.levels)) {
            throw new Error('Missing or invalid levels array');
        }

        data.levels.forEach((level, i) => {
            if (typeof level.level !== 'number') {
                throw new Error(`Level ${i}: missing level number`);
            }
            if (typeof level.name !== 'string') {
                throw new Error(`Level ${i}: missing name`);
            }
            if (!Array.isArray(level.activities)) {
                throw new Error(`Level ${i}: missing activities array`);
            }

            level.activities.forEach((activity, j) => {
                if (!['low', 'medium', 'high'].includes(activity.risk)) {
                    throw new Error(`Level ${i}, Activity ${j}: invalid risk value`);
                }
            });
        });
    }

    /**
     * Compute level risk from activities (max risk).
     */
    computeLevelRisk(activities) {
        const priority = { low: 1, medium: 2, high: 3 };
        let maxRisk = 'low';

        for (const activity of activities) {
            if (priority[activity.risk] > priority[maxRisk]) {
                maxRisk = activity.risk;
            }
        }

        return maxRisk;
    }

    /**
     * Convert risk band to numeric score.
     */
    riskToScore(risk) {
        const scores = { low: 20, medium: 50, high: 85 };
        return scores[risk] || 20;
    }

    /**
     * Convert numeric score to risk band.
     */
    scoreToRisk(score) {
        if (score == null) return 'low';
        if (score <= 30) return 'low';
        if (score <= 70) return 'medium';
        return 'high';
    }

    /**
     * Check if API is being used.
     */
    isUsingApi() {
        return this.useApi;
    }

    /**
     * Force API mode (for testing).
     */
    setUseApi(value) {
        this.useApi = value;
    }
}
