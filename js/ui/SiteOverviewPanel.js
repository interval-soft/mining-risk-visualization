// js/ui/SiteOverviewPanel.js
/**
 * Site overview panel showing all structures as clickable cards with risk scores.
 * Allows quick navigation between site view and individual structure focus.
 */
export class SiteOverviewPanel {
    /**
     * Create a new SiteOverviewPanel.
     * @param {HTMLElement} container - Container element
     * @param {StateManager} stateManager - State manager for structure data
     */
    constructor(container, stateManager) {
        this.container = container;
        this.stateManager = stateManager;

        // Callbacks
        this.onStructureClick = null;
        this.onSiteViewClick = null;

        this.render();
        this.bindEvents();

        // Listen to state changes
        this.stateManager.addEventListener('stateChanged', () => this.updateRisks());
        this.stateManager.addEventListener('viewModeChanged', (e) => this.onViewModeChanged(e));
    }

    render() {
        const structures = Array.from(this.stateManager.getStructures().values());
        const siteRisk = this.stateManager.getSiteRisk();
        const viewMode = this.stateManager.viewMode;
        const focusedStructure = this.stateManager.focusedStructure;

        this.container.innerHTML = `
            <div class="site-overview-panel">
                <div class="site-header">
                    <button class="site-view-btn ${viewMode === 'site' ? 'active' : ''}" title="View all structures">
                        <span class="site-icon">◉</span>
                        <span class="site-label">Site Overview</span>
                    </button>
                    <div class="site-risk ${this.getRiskClass(siteRisk.riskBand)}">
                        ${siteRisk.riskScore}
                    </div>
                </div>

                <div class="structures-list">
                    ${structures.map(s => this.renderStructureCard(s, focusedStructure)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render a single structure card.
     */
    renderStructureCard(structure, focusedStructure) {
        const isFocused = focusedStructure === structure.code;
        const riskClass = this.getRiskClass(structure.riskBand);
        const typeIcon = this.getTypeIcon(structure.type);

        return `
            <div class="structure-card ${isFocused ? 'focused' : ''}" data-structure="${structure.code}">
                <div class="structure-icon">${typeIcon}</div>
                <div class="structure-info">
                    <div class="structure-name">${structure.name}</div>
                    <div class="structure-meta">
                        <span class="structure-type">${this.formatType(structure.type)}</span>
                        <span class="structure-levels">${structure.levels?.length || 0} levels</span>
                    </div>
                </div>
                <div class="structure-risk ${riskClass}">
                    ${structure.riskScore || 0}
                </div>
            </div>
        `;
    }

    /**
     * Get CSS class for risk level.
     */
    getRiskClass(riskBand) {
        const classes = {
            low: 'risk-low',
            medium: 'risk-medium',
            high: 'risk-high'
        };
        return classes[riskBand] || 'risk-low';
    }

    /**
     * Get icon for structure type.
     */
    getTypeIcon(type) {
        const icons = {
            open_pit: '⛏',
            underground: '🔽',
            processing: '⚙',
            stockpile: '📦',
            mixed: '🏭'
        };
        return icons[type] || '◆';
    }

    /**
     * Format structure type for display.
     */
    formatType(type) {
        const labels = {
            open_pit: 'Open Pit',
            underground: 'Underground',
            processing: 'Processing',
            stockpile: 'Stockpile',
            mixed: 'Mixed'
        };
        return labels[type] || type;
    }

    bindEvents() {
        // Site view button
        const siteBtn = this.container.querySelector('.site-view-btn');
        if (siteBtn) {
            siteBtn.addEventListener('click', () => {
                this.stateManager.setFocusedStructure(null);
                if (this.onSiteViewClick) {
                    this.onSiteViewClick();
                }
            });
        }

        // Structure cards
        this.container.querySelectorAll('.structure-card').forEach(card => {
            card.addEventListener('click', () => {
                const code = card.dataset.structure;
                this.stateManager.setFocusedStructure(code);
                if (this.onStructureClick) {
                    this.onStructureClick(code);
                }
            });
        });
    }

    /**
     * Update risk displays without full re-render.
     */
    updateRisks() {
        const structures = Array.from(this.stateManager.getStructures().values());
        const siteRisk = this.stateManager.getSiteRisk();

        // Update site risk
        const siteRiskEl = this.container.querySelector('.site-header .site-risk');
        if (siteRiskEl) {
            siteRiskEl.textContent = siteRisk.riskScore;
            siteRiskEl.className = `site-risk ${this.getRiskClass(siteRisk.riskBand)}`;
        }

        // Update each structure card
        structures.forEach(s => {
            const card = this.container.querySelector(`[data-structure="${s.code}"]`);
            if (card) {
                const riskEl = card.querySelector('.structure-risk');
                if (riskEl) {
                    riskEl.textContent = s.riskScore || 0;
                    riskEl.className = `structure-risk ${this.getRiskClass(s.riskBand)}`;
                }
            }
        });
    }

    /**
     * Handle view mode changes.
     */
    onViewModeChanged(event) {
        const { viewMode, focusedStructure } = event.detail || {};

        // Update site view button
        const siteBtn = this.container.querySelector('.site-view-btn');
        if (siteBtn) {
            siteBtn.classList.toggle('active', viewMode === 'site');
        }

        // Update structure cards
        this.container.querySelectorAll('.structure-card').forEach(card => {
            const code = card.dataset.structure;
            card.classList.toggle('focused', code === focusedStructure);
        });
    }

    /**
     * Set callback for structure card clicks.
     * @param {Function} callback - (structureCode) => void
     */
    setStructureClickHandler(callback) {
        this.onStructureClick = callback;
    }

    /**
     * Set callback for site view button click.
     * @param {Function} callback - () => void
     */
    setSiteViewClickHandler(callback) {
        this.onSiteViewClick = callback;
    }

    /**
     * Full refresh of the panel.
     */
    refresh() {
        this.render();
        this.bindEvents();
    }

    /**
     * Show or hide the panel.
     */
    setVisible(visible) {
        this.container.style.display = visible ? '' : 'none';
    }
}
