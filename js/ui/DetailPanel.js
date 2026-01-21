// js/ui/DetailPanel.js
/**
 * Detail panel showing selected level information, risk breakdown, and alerts.
 * Supports breadcrumb navigation for multi-structure sites.
 */
export class DetailPanel {
    constructor(container, apiClient, stateManager) {
        this.container = container;
        this.apiClient = apiClient;
        this.stateManager = stateManager;

        this.selectedLevel = null;
        this.selectedStructure = null;
        this.levelAlerts = [];

        // Callbacks
        this.onBreadcrumbClick = null;

        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="detail-panel">
                <div class="detail-header">
                    <div class="detail-breadcrumb"></div>
                    <button class="detail-close" title="Close">×</button>
                </div>
                <div class="detail-content">
                    <div class="detail-empty">
                        Select a level to view details
                    </div>
                </div>
            </div>
        `;

        this.panelEl = this.container.querySelector('.detail-panel');
        this.breadcrumbEl = this.container.querySelector('.detail-breadcrumb');
        this.contentEl = this.container.querySelector('.detail-content');
        this.closeBtn = this.container.querySelector('.detail-close');

        // Initially hidden
        this.hide();
    }

    bindEvents() {
        this.closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // Listen to state changes to update if viewing a level
        this.stateManager.addEventListener('stateChanged', (e) => {
            if (this.selectedLevel !== null) {
                const levelData = this.getLevelData();
                if (levelData) {
                    this.updateContent(levelData);
                }
            }
        });
    }

    /**
     * Get level data from state manager.
     */
    getLevelData() {
        if (this.selectedStructure) {
            return this.stateManager.getLevel(this.selectedStructure, this.selectedLevel);
        }
        // Legacy: search in flat levels array
        const state = this.stateManager.currentState;
        return state?.levels?.find(l => l.level === this.selectedLevel);
    }

    /**
     * Show detail panel for a specific level.
     * @param {Object} levelData - Level data from state
     * @param {string} structureCode - Optional structure code
     */
    showLevel(levelData, structureCode = null) {
        this.selectedLevel = levelData.level;
        this.selectedStructure = structureCode || levelData.structureCode || null;
        this.updateBreadcrumb(levelData);
        this.updateContent(levelData);
        this.show();
        this.loadLevelAlerts(levelData.level, this.selectedStructure);
    }

    /**
     * Update breadcrumb navigation.
     */
    updateBreadcrumb(levelData) {
        const structure = this.selectedStructure
            ? this.stateManager.getStructure(this.selectedStructure)
            : null;

        let breadcrumbHtml = '';

        // Site link (always shown for multi-structure)
        if (structure || this.stateManager.getStructures().size > 1) {
            breadcrumbHtml += `
                <span class="breadcrumb-item breadcrumb-site" data-action="site" title="View all structures">
                    Site
                </span>
                <span class="breadcrumb-separator">›</span>
            `;
        }

        // Structure link
        if (structure) {
            breadcrumbHtml += `
                <span class="breadcrumb-item breadcrumb-structure" data-action="structure" data-code="${structure.code}" title="${structure.name}">
                    ${this.truncateName(structure.name, 20)}
                </span>
                <span class="breadcrumb-separator">›</span>
            `;
        }

        // Current level (not a link)
        breadcrumbHtml += `
            <span class="breadcrumb-item breadcrumb-current">
                Level ${levelData.level}
            </span>
        `;

        this.breadcrumbEl.innerHTML = breadcrumbHtml;

        // Bind breadcrumb click events
        this.breadcrumbEl.querySelectorAll('.breadcrumb-item[data-action]').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                const code = item.dataset.code;

                if (action === 'site') {
                    this.stateManager.setFocusedStructure(null);
                    if (this.onBreadcrumbClick) {
                        this.onBreadcrumbClick('site', null);
                    }
                } else if (action === 'structure' && code) {
                    this.stateManager.setFocusedStructure(code);
                    if (this.onBreadcrumbClick) {
                        this.onBreadcrumbClick('structure', code);
                    }
                }
            });
        });
    }

    /**
     * Truncate name for display.
     */
    truncateName(name, maxLength) {
        if (!name || name.length <= maxLength) return name;
        return name.substring(0, maxLength - 2) + '...';
    }

    /**
     * Update panel content with level data.
     */
    updateContent(levelData) {
        const riskScore = levelData.riskScore ?? 0;
        const riskBand = levelData.riskBand || this.scoreToRisk(riskScore);
        const triggeredRules = levelData.triggeredRules || [];

        this.contentEl.innerHTML = `
            <div class="detail-level-info">
                <div class="detail-level-header">
                    <span class="detail-level-number">Level ${levelData.level}</span>
                    <span class="detail-level-name">${levelData.name}</span>
                </div>

                <div class="detail-risk-section">
                    <div class="detail-risk-bar-container">
                        <div class="detail-risk-bar ${riskBand}" style="width: ${riskScore}%"></div>
                    </div>
                    <div class="detail-risk-info">
                        <span class="detail-risk-score">${riskScore}</span>
                        <span class="detail-risk-band ${riskBand}">${riskBand.toUpperCase()}</span>
                    </div>
                </div>

                ${levelData.riskExplanation ? `
                    <div class="detail-explanation">
                        <h4>Risk Summary</h4>
                        <p>${levelData.riskExplanation}</p>
                    </div>
                ` : ''}

                ${triggeredRules.length > 0 ? `
                    <div class="detail-rules">
                        <h4>Triggered Rules</h4>
                        <ul class="rule-list">
                            ${triggeredRules.map(rule => `
                                <li class="rule-item ${rule.impactType || 'additive'}">
                                    <span class="rule-name">${rule.name || rule.ruleCode}</span>
                                    <span class="rule-impact">+${rule.impactValue || rule.contribution || 0}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="detail-activities">
                    <h4>Activities (${levelData.activities?.length || 0})</h4>
                    <ul class="activity-list">
                        ${(levelData.activities || []).map(activity => `
                            <li class="activity-item">
                                <span class="activity-risk ${activity.risk || 'low'}"></span>
                                <span class="activity-name">${activity.name}</span>
                                <span class="activity-status">${activity.status}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="detail-alerts-section">
                    <h4>Active Alerts</h4>
                    <div class="detail-alerts-list">
                        ${this.levelAlerts.length > 0 ? this.levelAlerts.map(alert => `
                            <div class="detail-alert ${this.getSeverityClass(alert)}">
                                <span class="detail-alert-cause">${alert.cause}</span>
                                <span class="detail-alert-time">${this.formatTime(alert.timestamp)}</span>
                            </div>
                        `).join('') : '<div class="no-alerts">No active alerts</div>'}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load alerts for a specific level.
     */
    async loadLevelAlerts(levelNumber, structureCode = null) {
        try {
            const params = {
                level: levelNumber,
                status: 'active'
            };
            if (structureCode) {
                params.structure = structureCode;
            }

            const response = await this.apiClient.getAlerts(params);
            this.levelAlerts = response.alerts || [];
        } catch (error) {
            // Use mock alerts
            this.levelAlerts = this.getMockAlerts(levelNumber, structureCode);
        }

        // Re-render if we're still viewing this level
        if (this.selectedLevel === levelNumber) {
            const levelData = this.getLevelData();
            if (levelData) {
                this.updateContent(levelData);
            }
        }
    }

    getMockAlerts(levelNumber, structureCode) {
        const mockAlerts = {
            3: [
                {
                    cause: 'Blast fired - awaiting reentry clearance',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    riskScore: 100,
                    structureCode: 'PIT_MAIN'
                }
            ],
            4: [
                {
                    cause: 'Gas concentration above threshold',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    riskScore: 72,
                    structureCode: 'DECLINE_NORTH'
                }
            ],
            1: [
                {
                    cause: 'Crusher temperature elevated',
                    timestamp: new Date(Date.now() - 1800000).toISOString(),
                    riskScore: 65,
                    structureCode: 'PROCESSING'
                }
            ]
        };

        let alerts = mockAlerts[levelNumber] || [];

        // Filter by structure if specified
        if (structureCode) {
            alerts = alerts.filter(a => a.structureCode === structureCode);
        }

        return alerts;
    }

    getSeverityClass(alert) {
        const score = alert.riskScore || 0;
        if (score >= 90) return 'severity-critical';
        if (score >= 71) return 'severity-high';
        if (score >= 31) return 'severity-medium';
        return 'severity-low';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scoreToRisk(score) {
        if (score == null) return 'low';
        if (score <= 30) return 'low';
        if (score <= 70) return 'medium';
        return 'high';
    }

    /**
     * Set callback for breadcrumb navigation.
     * @param {Function} callback - (type: 'site'|'structure', code?: string) => void
     */
    setBreadcrumbClickHandler(callback) {
        this.onBreadcrumbClick = callback;
    }

    show() {
        this.container.style.display = 'block';
        this.panelEl.classList.add('visible');
    }

    hide() {
        this.panelEl.classList.remove('visible');
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 200);
        this.selectedLevel = null;
        this.selectedStructure = null;
    }

    /**
     * Check if panel is currently visible.
     */
    isVisible() {
        return this.selectedLevel !== null;
    }

    /**
     * Get current selection info.
     */
    getSelection() {
        return {
            level: this.selectedLevel,
            structure: this.selectedStructure
        };
    }
}
