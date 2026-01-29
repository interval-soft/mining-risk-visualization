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
        this.activeTypes = null; // null = all types active
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
            <div class="filter-section">
                <h3>Filter by Type</h3>
                <div class="filter-type-buttons">
                    ${this.renderTypeButtons()}
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

    renderTypeButtons() {
        const types = this.iconManager.getActivityTypes();
        if (!types.length) return '<span style="color:var(--text-muted);font-size:11px;">No activities</span>';

        // Initialize activeTypes with all types if not set
        if (!this.activeTypes) {
            this.activeTypes = new Set(types.map(t => t.icon));
        }

        return types.map(t => `
            <button class="filter-btn filter-type-btn active" data-type-icon="${t.icon}" title="${t.label}">
                <span class="material-symbols-rounded filter-type-icon">${t.icon}</span>
                <span class="filter-type-label">${t.label}</span>
            </button>
        `).join('');
    }

    attachListeners() {
        // Risk filter buttons
        this.element.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const risk = e.currentTarget.dataset.risk;
                this.toggleFilter(risk, e.currentTarget);
            });
        });

        // Type filter buttons
        this.element.querySelectorAll('.filter-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const icon = e.currentTarget.dataset.typeIcon;
                this.toggleTypeFilter(icon, e.currentTarget);
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

    toggleTypeFilter(icon, button) {
        if (this.activeTypes.has(icon)) {
            this.activeTypes.delete(icon);
            button.classList.remove('active');
        } else {
            this.activeTypes.add(icon);
            button.classList.add('active');
        }
        this.applyFilters();
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

            const levelVisible = riskMatch && structureMatch;
            mesh.visible = levelVisible;

            // For icons, also apply type filter per-sprite
            const levelNum = mesh.userData.levelNumber;
            const sprites = this.iconManager.getAllSprites().filter(s => {
                const sameLevel = s.userData.levelNumber === levelNum;
                if (structureCode !== null) {
                    return sameLevel && s.userData.structureCode === structureCode;
                }
                return sameLevel;
            });

            sprites.forEach(s => {
                const typeMatch = !this.activeTypes || this.activeTypes.has(s.userData.activityIcon);
                s.visible = levelVisible && typeMatch;
            });
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
        // Preserve active types across refresh
        const prevTypes = this.activeTypes;
        this.render();
        this.attachListeners();

        // Restore type filter state
        if (prevTypes && this.activeTypes) {
            this.activeTypes = new Set(
                [...this.activeTypes].filter(t => prevTypes.has(t))
            );
            this.element.querySelectorAll('.filter-type-btn').forEach(btn => {
                const icon = btn.dataset.typeIcon;
                btn.classList.toggle('active', this.activeTypes.has(icon));
            });
        }
    }
}
