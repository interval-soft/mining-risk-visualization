// js/ui/FilterPanel.js
/**
 * Filter panel for controlling visibility by risk level and structure.
 * Supports both single-structure (legacy) and multi-structure modes.
 */
export class FilterPanel {
    /**
     * Create a new FilterPanel.
     * @param {LevelFactory|StructureManager} levelSource - Level or structure manager
     * @param {MaterialSystem} materialSystem - Material system for visual effects
     * @param {IconManager} iconManager - Icon visibility control
     * @param {StateManager} stateManager - Optional state manager for multi-structure
     */
    constructor(levelSource, materialSystem, iconManager, stateManager = null) {
        this.levelSource = levelSource;
        this.materialSystem = materialSystem;
        this.iconManager = iconManager;
        this.stateManager = stateManager;

        this.activeFilters = new Set(['high', 'medium', 'low']);
        this.selectedStructure = 'all'; // 'all' or structure code

        // Callbacks
        this.onStructureChange = null;

        this.element = document.getElementById('filter-panel');
        this.render();
        this.attachListeners();

        // Listen to state changes if available
        if (this.stateManager) {
            this.stateManager.addEventListener('stateChanged', () => this.updateStructureOptions());
            this.stateManager.addEventListener('viewModeChanged', (e) => this.onViewModeChanged(e));
        }
    }

    render() {
        const hasMultiStructure = this.hasMultipleStructures();

        this.element.innerHTML = `
            ${hasMultiStructure ? `
            <div class="filter-section structure-filter">
                <h3>Structure</h3>
                <select class="structure-select">
                    <option value="all">All Structures</option>
                    ${this.renderStructureOptions()}
                </select>
            </div>
            ` : ''}
            <div class="filter-section">
                <h3>Filter by Risk</h3>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-risk="high" style="--filter-color: #F44336;">
                        <span class="indicator"></span>High
                    </button>
                    <button class="filter-btn active" data-risk="medium" style="--filter-color: #FFC107;">
                        <span class="indicator"></span>Medium
                    </button>
                    <button class="filter-btn active" data-risk="low" style="--filter-color: #4CAF50;">
                        <span class="indicator"></span>Low
                    </button>
                </div>
            </div>
        `;

        // Cache selector reference
        this.structureSelect = this.element.querySelector('.structure-select');
    }

    /**
     * Render structure options for dropdown.
     */
    renderStructureOptions() {
        const structures = this.getStructures();
        return structures.map(s => `
            <option value="${s.code}">${s.name}</option>
        `).join('');
    }

    /**
     * Check if there are multiple structures.
     */
    hasMultipleStructures() {
        if (this.stateManager) {
            const structures = this.stateManager.getStructures();
            return structures.size > 1;
        }
        // Check if levelSource is StructureManager
        if (typeof this.levelSource.getAllStructures === 'function') {
            return this.levelSource.getAllStructures().length > 1;
        }
        return false;
    }

    /**
     * Get list of structures.
     */
    getStructures() {
        if (this.stateManager) {
            return Array.from(this.stateManager.getStructures().values());
        }
        if (typeof this.levelSource.getAllStructures === 'function') {
            return this.levelSource.getAllStructures().map(s => ({
                code: s.code,
                name: s.data?.name || s.code
            }));
        }
        return [];
    }

    /**
     * Update structure options when state changes.
     */
    updateStructureOptions() {
        if (!this.structureSelect) return;

        const currentValue = this.structureSelect.value;
        const structures = this.getStructures();

        // Rebuild options
        this.structureSelect.innerHTML = `
            <option value="all">All Structures</option>
            ${structures.map(s => `
                <option value="${s.code}" ${s.code === currentValue ? 'selected' : ''}>
                    ${s.name}
                </option>
            `).join('')}
        `;
    }

    attachListeners() {
        // Risk filter buttons
        this.element.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const risk = e.currentTarget.dataset.risk;
                this.toggleFilter(risk, e.currentTarget);
            });
        });

        // Structure selector
        if (this.structureSelect) {
            this.structureSelect.addEventListener('change', (e) => {
                this.selectedStructure = e.target.value;
                this.applyFilters();

                // Trigger callback
                if (this.onStructureChange) {
                    this.onStructureChange(this.selectedStructure === 'all' ? null : this.selectedStructure);
                }

                // Update state manager if available
                if (this.stateManager) {
                    this.stateManager.setFocusedStructure(
                        this.selectedStructure === 'all' ? null : this.selectedStructure
                    );
                }
            });
        }
    }

    /**
     * Handle view mode changes from state manager.
     */
    onViewModeChanged(event) {
        const { viewMode, focusedStructure } = event.detail || {};

        if (this.structureSelect) {
            if (viewMode === 'site' || !focusedStructure) {
                this.structureSelect.value = 'all';
                this.selectedStructure = 'all';
            } else {
                this.structureSelect.value = focusedStructure;
                this.selectedStructure = focusedStructure;
            }
        }
    }

    toggleFilter(risk, button) {
        if (this.activeFilters.has(risk)) {
            this.activeFilters.delete(risk);
            button.classList.remove('active');
        } else {
            this.activeFilters.add(risk);
            button.classList.add('active');
        }

        this.applyFilters();
    }

    applyFilters() {
        const allLevels = this.getAllLevels();

        allLevels.forEach(mesh => {
            const levelRisk = mesh.userData.risk;
            const structureCode = mesh.userData.structureCode;

            // Check risk filter
            const riskMatch = this.activeFilters.has(levelRisk);

            // Check structure filter
            const structureMatch = this.selectedStructure === 'all' ||
                                   structureCode === this.selectedStructure ||
                                   structureCode === null; // Legacy single-structure

            const visible = riskMatch && structureMatch;

            mesh.visible = visible;
            this.iconManager.setVisibilityForLevel(mesh.userData.levelNumber, visible);
        });
    }

    /**
     * Get all level meshes from the level source.
     * Supports both LevelFactory and StructureManager.
     */
    getAllLevels() {
        // StructureManager has getAllLevelMeshes()
        if (typeof this.levelSource.getAllLevelMeshes === 'function') {
            return this.levelSource.getAllLevelMeshes();
        }
        // LevelFactory has getAllLevels()
        if (typeof this.levelSource.getAllLevels === 'function') {
            return this.levelSource.getAllLevels();
        }
        return [];
    }

    /**
     * Set callback for structure selection changes.
     * @param {Function} callback - (structureCode|null) => void
     */
    setStructureChangeHandler(callback) {
        this.onStructureChange = callback;
    }

    /**
     * Programmatically select a structure.
     * @param {string|null} structureCode - Structure code or null for all
     */
    selectStructure(structureCode) {
        this.selectedStructure = structureCode || 'all';

        if (this.structureSelect) {
            this.structureSelect.value = this.selectedStructure;
        }

        this.applyFilters();
    }

    /**
     * Get currently selected structure.
     * @returns {string|null} Structure code or null if 'all'
     */
    getSelectedStructure() {
        return this.selectedStructure === 'all' ? null : this.selectedStructure;
    }

    /**
     * Re-render when structures change.
     */
    refresh() {
        this.render();
        this.attachListeners();
    }
}
