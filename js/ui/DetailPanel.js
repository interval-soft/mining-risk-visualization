// js/ui/DetailPanel.js
// Detail panel showing selected level information, risk breakdown, and alerts

export class DetailPanel {
    constructor(container, apiClient, stateManager) {
        this.container = container;
        this.apiClient = apiClient;
        this.stateManager = stateManager;

        this.selectedLevel = null;
        this.levelAlerts = [];

        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="detail-panel">
                <div class="detail-header">
                    <h3>Level Details</h3>
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
                const state = e.detail.state;
                const levelData = state?.levels?.find(l => l.level === this.selectedLevel);
                if (levelData) {
                    this.updateContent(levelData);
                }
            }
        });
    }

    /**
     * Show detail panel for a specific level.
     * @param {Object} levelData - Level data from state
     */
    showLevel(levelData) {
        this.selectedLevel = levelData.level;
        this.updateContent(levelData);
        this.show();
        this.loadLevelAlerts(levelData.level);
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
    async loadLevelAlerts(levelNumber) {
        try {
            const response = await this.apiClient.getAlerts({
                level: levelNumber,
                status: 'active'
            });
            this.levelAlerts = response.alerts || [];
        } catch (error) {
            // Use mock alerts
            this.levelAlerts = this.getMockAlerts(levelNumber);
        }

        // Re-render if we're still viewing this level
        if (this.selectedLevel === levelNumber) {
            const state = this.stateManager.currentState;
            const levelData = state?.levels?.find(l => l.level === levelNumber);
            if (levelData) {
                this.updateContent(levelData);
            }
        }
    }

    getMockAlerts(levelNumber) {
        const mockAlerts = {
            3: [
                {
                    cause: 'Blast fired - awaiting reentry clearance',
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    riskScore: 100
                }
            ],
            4: [
                {
                    cause: 'Gas concentration above threshold',
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    riskScore: 72
                }
            ]
        };
        return mockAlerts[levelNumber] || [];
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
    }

    /**
     * Check if panel is currently visible.
     */
    isVisible() {
        return this.selectedLevel !== null;
    }
}
