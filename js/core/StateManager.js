// js/core/StateManager.js

/**
 * Centralized state manager for the mine visualization.
 * Manages live vs historical viewing modes, multi-structure state, and emits state change events.
 *
 * Events:
 * - 'stateChanged': Fired when mine state data changes (with { state, timestamp, isLive })
 * - 'modeChanged': Fired when switching between live/historical (with { isLive, timestamp })
 * - 'playbackChanged': Fired when playback state changes (with { isPlaying, speed })
 * - 'alertsChanged': Fired when alerts are updated (with { alerts })
 * - 'viewModeChanged': Fired when switching between site/structure view (with { viewMode, focusedStructure })
 * - 'structureSelected': Fired when a structure is clicked/selected (with { structureCode, structure })
 */
export class StateManager extends EventTarget {
    constructor(dataLoader) {
        super();
        this.dataLoader = dataLoader;

        // Current state
        this.currentState = null;
        this.viewingTimestamp = null; // null = live mode
        this.isLive = true;

        // Multi-structure state
        this.structures = new Map();      // code -> structure data
        this.viewMode = 'site';           // 'site' | 'structure'
        this.focusedStructure = null;     // Currently focused structure code

        // Playback state
        this.playbackSpeed = 1; // 1x, 2x, 5x, etc.
        this.isPlaying = false;
        this.playbackInterval = null;

        // Cache for historical states
        this.stateCache = new Map();
        this.maxCacheSize = 100;

        // Live update interval
        this.liveUpdateInterval = null;
        this.liveUpdateRate = 30000; // 30 seconds
    }

    /**
     * Initialize the state manager and start live updates.
     */
    async initialize() {
        try {
            // Load initial state
            this.currentState = await this.dataLoader.loadCurrent();
            this.viewingTimestamp = new Date(this.currentState.timestamp);

            // Populate structures map from state
            this.updateStructuresFromState(this.currentState);

            // Start live updates
            this.startLiveUpdates();

            // Emit initial state
            this.emitStateChanged();

            return this.currentState;
        } catch (error) {
            console.error('Failed to initialize StateManager:', error);
            throw error;
        }
    }

    /**
     * Update the structures map from API state.
     * @param {Object} state - State object with structures array
     */
    updateStructuresFromState(state) {
        if (!state.structures) return;

        this.structures.clear();
        for (const structure of state.structures) {
            this.structures.set(structure.code, structure);
        }
    }

    /**
     * Get the currently displayed state.
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get the timestamp being viewed.
     */
    getViewingTimestamp() {
        return this.viewingTimestamp;
    }

    /**
     * Check if currently in live mode.
     */
    getIsLive() {
        return this.isLive;
    }

    // ==================== Multi-Structure Methods ====================

    /**
     * Get all structures as an array.
     * @returns {Array} Array of structure objects
     */
    getStructures() {
        return Array.from(this.structures.values());
    }

    /**
     * Get a specific structure by code.
     * @param {string} code - Structure code (e.g., 'PIT_MAIN')
     * @returns {Object|null} Structure object or null
     */
    getStructure(code) {
        return this.structures.get(code) || null;
    }

    /**
     * Get the current view mode.
     * @returns {string} 'site' or 'structure'
     */
    getViewMode() {
        return this.viewMode;
    }

    /**
     * Get the currently focused structure code.
     * @returns {string|null} Structure code or null if in site view
     */
    getFocusedStructure() {
        return this.focusedStructure;
    }

    /**
     * Get the focused structure object.
     * @returns {Object|null} Structure object or null
     */
    getFocusedStructureData() {
        return this.focusedStructure ? this.structures.get(this.focusedStructure) : null;
    }

    /**
     * Set the focused structure and switch to structure view mode.
     * @param {string|null} code - Structure code to focus, or null to return to site view
     */
    setFocusedStructure(code) {
        const previousMode = this.viewMode;
        const previousStructure = this.focusedStructure;

        if (code === null) {
            // Return to site view
            this.viewMode = 'site';
            this.focusedStructure = null;
        } else {
            // Focus on specific structure
            if (!this.structures.has(code)) {
                console.warn(`Structure not found: ${code}`);
                return;
            }
            this.viewMode = 'structure';
            this.focusedStructure = code;
        }

        // Emit events if changed
        if (this.viewMode !== previousMode || this.focusedStructure !== previousStructure) {
            this.emitViewModeChanged();

            if (code !== null) {
                this.emitStructureSelected(code);
            }
        }
    }

    /**
     * Toggle between site and structure view.
     * If in structure view, returns to site view.
     * If in site view with a previously focused structure, returns to it.
     */
    toggleViewMode() {
        if (this.viewMode === 'structure') {
            this.setFocusedStructure(null);
        }
        // In site mode, do nothing - user must click a structure to focus
    }

    /**
     * Get site-level aggregated risk (max across all structures).
     * @returns {Object} { riskScore, riskBand }
     */
    getSiteRisk() {
        const structures = this.getStructures();
        if (structures.length === 0) {
            return { riskScore: 0, riskBand: 'low' };
        }

        const maxRisk = Math.max(...structures.map(s => s.riskScore || 0));
        const riskBand = maxRisk <= 30 ? 'low' : maxRisk <= 70 ? 'medium' : 'high';

        return { riskScore: maxRisk, riskBand };
    }

    /**
     * Get levels for a specific structure.
     * @param {string} code - Structure code
     * @returns {Array} Array of level objects
     */
    getStructureLevels(code) {
        const structure = this.structures.get(code);
        return structure?.levels || [];
    }

    /**
     * Find a level by structure code and level number.
     * @param {string} structureCode - Structure code
     * @param {number} levelNumber - Level number within structure
     * @returns {Object|null} Level object or null
     */
    getLevel(structureCode, levelNumber) {
        const levels = this.getStructureLevels(structureCode);
        return levels.find(l => l.level === levelNumber) || null;
    }

    // ==================== Time Navigation ====================

    /**
     * Set the view to a specific historical timestamp.
     * @param {Date} timestamp - The time to view
     */
    async setViewTime(timestamp) {
        this.stopPlayback();
        this.stopLiveUpdates();

        this.isLive = false;
        this.viewingTimestamp = timestamp;

        // Check cache first
        const cacheKey = timestamp.toISOString();
        if (this.stateCache.has(cacheKey)) {
            this.currentState = this.stateCache.get(cacheKey);
        } else {
            // Load from API
            this.currentState = await this.dataLoader.loadAtTime(timestamp);
            this.addToCache(cacheKey, this.currentState);
        }

        // Update structures from new state
        this.updateStructuresFromState(this.currentState);

        this.emitModeChanged();
        this.emitStateChanged();
    }

    /**
     * Return to live mode (real-time data).
     */
    async goLive() {
        this.stopPlayback();

        this.isLive = true;
        this.viewingTimestamp = null;

        // Load current state
        this.currentState = await this.dataLoader.loadCurrent();
        this.viewingTimestamp = new Date(this.currentState.timestamp);

        // Update structures from new state
        this.updateStructuresFromState(this.currentState);

        // Restart live updates
        this.startLiveUpdates();

        this.emitModeChanged();
        this.emitStateChanged();
    }

    /**
     * Start playback from current position.
     * @param {number} speed - Playback speed multiplier (1, 2, 5, 10)
     */
    startPlayback(speed = 1) {
        if (this.isLive) {
            // Can't play back in live mode, need to set a historical time first
            return;
        }

        this.playbackSpeed = speed;
        this.isPlaying = true;

        // Stop live updates during playback
        this.stopLiveUpdates();

        // Calculate interval: at 1x speed, advance 1 minute every second
        // At higher speeds, advance faster
        const realTimeIntervalMs = 1000; // Update every second
        const simulatedAdvanceMs = 60 * 1000 * speed; // How much simulated time per update

        this.playbackInterval = setInterval(async () => {
            const newTime = new Date(this.viewingTimestamp.getTime() + simulatedAdvanceMs);
            const now = new Date();

            // Stop if we've reached current time
            if (newTime >= now) {
                this.stopPlayback();
                this.goLive();
                return;
            }

            this.viewingTimestamp = newTime;

            // Load state at new time
            const cacheKey = newTime.toISOString();
            if (this.stateCache.has(cacheKey)) {
                this.currentState = this.stateCache.get(cacheKey);
            } else {
                try {
                    this.currentState = await this.dataLoader.loadAtTime(newTime);
                    this.addToCache(cacheKey, this.currentState);
                } catch (error) {
                    console.error('Failed to load state during playback:', error);
                }
            }

            // Update structures
            this.updateStructuresFromState(this.currentState);

            this.emitStateChanged();
        }, realTimeIntervalMs);

        this.emitPlaybackChanged();
    }

    /**
     * Pause playback.
     */
    pausePlayback() {
        this.stopPlayback();
    }

    /**
     * Stop playback (internal).
     */
    stopPlayback() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        this.isPlaying = false;
        this.emitPlaybackChanged();
    }

    /**
     * Start live updates.
     */
    startLiveUpdates() {
        this.stopLiveUpdates();

        this.liveUpdateInterval = setInterval(async () => {
            if (!this.isLive) return;

            try {
                this.currentState = await this.dataLoader.loadCurrent();
                this.viewingTimestamp = new Date(this.currentState.timestamp);

                // Update structures
                this.updateStructuresFromState(this.currentState);

                this.emitStateChanged();
            } catch (error) {
                console.error('Failed to update live state:', error);
            }
        }, this.liveUpdateRate);
    }

    /**
     * Stop live updates.
     */
    stopLiveUpdates() {
        if (this.liveUpdateInterval) {
            clearInterval(this.liveUpdateInterval);
            this.liveUpdateInterval = null;
        }
    }

    /**
     * Add a state to the cache.
     */
    addToCache(key, state) {
        // Evict oldest entries if cache is full
        if (this.stateCache.size >= this.maxCacheSize) {
            const firstKey = this.stateCache.keys().next().value;
            this.stateCache.delete(firstKey);
        }
        this.stateCache.set(key, state);
    }

    /**
     * Preload states for a time range (for smooth scrubbing).
     * @param {Date} from - Start time
     * @param {Date} to - End time
     */
    async preloadRange(from, to) {
        try {
            const history = await this.dataLoader.loadHistory(from, to);
            for (const snapshot of history.snapshots || []) {
                const key = snapshot.timestamp;
                if (!this.stateCache.has(key)) {
                    this.addToCache(key, snapshot);
                }
            }
        } catch (error) {
            console.error('Failed to preload history:', error);
        }
    }

    /**
     * Clean up resources.
     */
    dispose() {
        this.stopPlayback();
        this.stopLiveUpdates();
        this.stateCache.clear();
        this.structures.clear();
    }

    // ==================== Event Emitters ====================

    emitStateChanged() {
        this.dispatchEvent(new CustomEvent('stateChanged', {
            detail: {
                state: this.currentState,
                timestamp: this.viewingTimestamp,
                isLive: this.isLive,
            },
        }));
    }

    emitModeChanged() {
        this.dispatchEvent(new CustomEvent('modeChanged', {
            detail: {
                isLive: this.isLive,
                timestamp: this.viewingTimestamp,
            },
        }));
    }

    emitPlaybackChanged() {
        this.dispatchEvent(new CustomEvent('playbackChanged', {
            detail: {
                isPlaying: this.isPlaying,
                speed: this.playbackSpeed,
            },
        }));
    }

    emitViewModeChanged() {
        this.dispatchEvent(new CustomEvent('viewModeChanged', {
            detail: {
                viewMode: this.viewMode,
                focusedStructure: this.focusedStructure,
                structure: this.getFocusedStructureData(),
            },
        }));
    }

    emitStructureSelected(code) {
        this.dispatchEvent(new CustomEvent('structureSelected', {
            detail: {
                structureCode: code,
                structure: this.structures.get(code),
            },
        }));
    }
}
