// js/data/ApiClient.js

/**
 * HTTP client for the Mining Risk API.
 * Handles all communication with the backend.
 */
export class ApiClient {
    constructor(baseUrl = window.ENV?.API_URL || '/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get the current mine state with risk scores.
     * @returns {Promise<Object>} Current snapshot with levels
     */
    async getCurrentState() {
        const response = await this.fetch('/levels/current');
        return response;
    }

    /**
     * Get historical state at a specific timestamp.
     * @param {Date|string} timestamp - The time to query
     * @returns {Promise<Object>} Snapshot at that time
     */
    async getHistoricalState(timestamp) {
        const isoTime = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
        const response = await this.fetch(`/levels/history?at=${encodeURIComponent(isoTime)}`);
        return response;
    }

    /**
     * Get all snapshots within a time range.
     * @param {Date} from - Start time
     * @param {Date} to - End time
     * @returns {Promise<Object>} Object with snapshots array
     */
    async getHistory(from, to) {
        const params = new URLSearchParams({
            from: from.toISOString(),
            to: to.toISOString(),
        });
        const response = await this.fetch(`/levels/history?${params}`);
        return response;
    }

    /**
     * Get events matching criteria.
     * @param {Object} options - Filter options
     * @param {number} [options.level] - Filter by level number
     * @param {Date} [options.from] - Start time
     * @param {Date} [options.to] - End time
     * @returns {Promise<Object>} Object with events array
     */
    async getEvents(options = {}) {
        const params = new URLSearchParams();
        if (options.level !== undefined) params.set('level', options.level.toString());
        if (options.from) params.set('from', options.from.toISOString());
        if (options.to) params.set('to', options.to.toISOString());

        const response = await this.fetch(`/events?${params}`);
        return response;
    }

    /**
     * Get alerts matching criteria.
     * @param {Object} options - Filter options
     * @param {string} [options.status] - Filter by status: 'active', 'acknowledged', 'resolved'
     * @param {number} [options.level] - Filter by level number
     * @returns {Promise<Object>} Object with alerts array
     */
    async getAlerts(options = {}) {
        const params = new URLSearchParams();
        if (options.status) params.set('status', options.status);
        if (options.level !== undefined) params.set('level', options.level.toString());

        const response = await this.fetch(`/alerts?${params}`);
        return response;
    }

    /**
     * Acknowledge an alert.
     * @param {string} id - Alert ID
     * @param {string} [comment] - Optional comment
     * @returns {Promise<Object>} Updated alert
     */
    async acknowledgeAlert(id, comment) {
        const response = await this.fetch(`/alerts/${id}/acknowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment }),
        });
        return response;
    }

    /**
     * Check if the API is available.
     * @returns {Promise<boolean>} True if API is reachable
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Internal fetch wrapper with error handling.
     */
    async fetch(path, options = {}) {
        const url = `${this.baseUrl}${path}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('API unavailable. Is the backend running?');
            }
            throw error;
        }
    }
}
