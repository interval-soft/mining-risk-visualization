/**
 * DemoTriggerPanel - Presenter control panel for demo scenarios
 * 
 * Floating modal with:
 * - Dramatic scenario trigger buttons
 * - Simulation speed controls
 * - Auto-generate toggle
 */

export class DemoTriggerPanel {
    constructor(demoMode, scenarios, simulator) {
        this.demoMode = demoMode;
        this.scenarios = scenarios;
        this.simulator = simulator;
        
        this.isVisible = false;
        this.panel = null;
        
        this.createPanel();
    }

    /**
     * Create the panel DOM element
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'demo-trigger-panel';
        this.panel.className = 'demo-trigger-panel';
        this.panel.innerHTML = this.getTemplate();
        
        document.body.appendChild(this.panel);
        this.bindEvents();
    }

    /**
     * Get the panel HTML template
     */
    getTemplate() {
        return `
            <div class="demo-panel-header">
                <h3>Demo Control Panel</h3>
                <span class="demo-panel-shortcut">Ctrl+Shift+D</span>
                <button class="demo-panel-close" title="Close">&times;</button>
            </div>
            
            <div class="demo-panel-content">
                <section class="demo-section">
                    <h4>Dramatic Scenarios</h4>
                    <div class="demo-scenario-grid">
                        <button class="demo-scenario-btn critical" data-scenario="blast-lockout" title="Blast fired, Level 2 goes to 100 risk">
                            <span class="scenario-icon">💥</span>
                            <span class="scenario-label">Blast Lockout</span>
                        </button>
                        <button class="demo-scenario-btn critical" data-scenario="gas-emergency" title="Gas detection with evacuation alert">
                            <span class="scenario-icon">☁️</span>
                            <span class="scenario-label">Gas Emergency</span>
                        </button>
                        <button class="demo-scenario-btn high" data-scenario="equipment-failure" title="Crusher emergency shutdown">
                            <span class="scenario-icon">⚙️</span>
                            <span class="scenario-label">Equipment Fail</span>
                        </button>
                        <button class="demo-scenario-btn high" data-scenario="proximity-cascade" title="Multiple rapid proximity alerts">
                            <span class="scenario-icon">📍</span>
                            <span class="scenario-label">Proximity Cascade</span>
                        </button>
                        <button class="demo-scenario-btn medium" data-scenario="shift-change" title="All risks drop, calm state">
                            <span class="scenario-icon">👥</span>
                            <span class="scenario-label">Shift Change</span>
                        </button>
                        <button class="demo-scenario-btn low" data-scenario="ai-prediction" title="AI predicts risk spike">
                            <span class="scenario-icon">🤖</span>
                            <span class="scenario-label">AI Prediction</span>
                        </button>
                    </div>
                </section>
                
                <section class="demo-section">
                    <h4>Quick Actions</h4>
                    <div class="demo-quick-actions">
                        <button class="demo-action-btn" data-action="new-alert" title="Generate a random new alert">
                            <span>+ New Alert</span>
                        </button>
                        <button class="demo-action-btn" data-action="new-insight" title="Generate a random AI insight">
                            <span>+ AI Insight</span>
                        </button>
                        <button class="demo-action-btn" data-action="resolve-all" title="Resolve all active alerts">
                            <span>✓ Resolve All</span>
                        </button>
                    </div>
                </section>
                
                <section class="demo-section">
                    <h4>Simulation Controls</h4>
                    <div class="demo-controls">
                        <label class="demo-checkbox">
                            <input type="checkbox" id="demo-auto-generate" checked>
                            <span>Auto-generate events</span>
                        </label>
                        
                        <div class="demo-speed-control">
                            <label>Speed:</label>
                            <select id="demo-speed">
                                <option value="slow">Slow (60-90s)</option>
                                <option value="normal" selected>Normal (30-60s)</option>
                                <option value="fast">Fast (10-20s)</option>
                            </select>
                        </div>
                    </div>
                </section>
                
                <section class="demo-section demo-stats">
                    <h4>Current State</h4>
                    <div class="demo-stats-grid">
                        <div class="demo-stat">
                            <span class="stat-value" id="demo-stat-alerts">0</span>
                            <span class="stat-label">Active Alerts</span>
                        </div>
                        <div class="demo-stat">
                            <span class="stat-value" id="demo-stat-insights">0</span>
                            <span class="stat-label">AI Insights</span>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        this.panel.querySelector('.demo-panel-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Click outside to close
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.hide();
            }
        });
        
        // Scenario buttons
        this.panel.querySelectorAll('.demo-scenario-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const scenarioId = btn.dataset.scenario;
                this.triggerScenario(scenarioId, btn);
            });
        });
        
        // Quick action buttons
        this.panel.querySelectorAll('.demo-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.executeAction(action);
            });
        });
        
        // Auto-generate checkbox
        const autoGenCheckbox = this.panel.querySelector('#demo-auto-generate');
        autoGenCheckbox.addEventListener('change', (e) => {
            this.simulator.setAutoGenerate(e.target.checked);
        });
        
        // Speed selector
        const speedSelect = this.panel.querySelector('#demo-speed');
        speedSelect.addEventListener('change', (e) => {
            this.simulator.setSpeed(e.target.value);
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Trigger a scenario with visual feedback
     */
    triggerScenario(scenarioId, button) {
        // Add triggered animation
        button.classList.add('triggered');
        setTimeout(() => button.classList.remove('triggered'), 600);
        
        // Execute the scenario
        if (this.scenarios) {
            this.scenarios.execute(scenarioId);
        }
        
        // Update stats
        this.updateStats();
    }

    /**
     * Execute a quick action
     */
    executeAction(action) {
        switch (action) {
            case 'new-alert':
                this.simulator.forceEvent('alert');
                break;
            case 'new-insight':
                this.simulator.forceEvent('insight');
                break;
            case 'resolve-all':
                this.resolveAllAlerts();
                break;
        }
        
        this.updateStats();
    }

    /**
     * Resolve all active alerts
     */
    resolveAllAlerts() {
        const dataProvider = this.demoMode.dataProvider;
        if (!dataProvider) return;
        
        const activeAlerts = dataProvider.alerts.filter(a => a.status === 'active');
        activeAlerts.forEach(alert => {
            alert.status = 'resolved';
            alert.resolvedAt = new Date().toISOString();
        });
        
        // Dispatch update
        this.demoMode.stateManager.dispatchEvent(new CustomEvent('alertsChanged', {
            detail: { alerts: dataProvider.alerts }
        }));
        
        // Lower all risk scores
        Object.keys(dataProvider.riskState).forEach(key => {
            const [structureCode, levelNumber] = key.split('-');
            dataProvider.updateRiskScore(structureCode, parseInt(levelNumber), 30);
        });
        
        // Update 3D visualization
        this.simulator.dispatchStateChanged();
        
        console.log(`[DemoTriggerPanel] Resolved ${activeAlerts.length} alerts`);
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const dataProvider = this.demoMode.dataProvider;
        if (!dataProvider) return;
        
        const stats = dataProvider.getStats();
        
        const alertsEl = this.panel.querySelector('#demo-stat-alerts');
        const insightsEl = this.panel.querySelector('#demo-stat-insights');
        
        if (alertsEl) alertsEl.textContent = stats.activeAlerts;
        if (insightsEl) insightsEl.textContent = stats.activeInsights;
    }

    /**
     * Show the panel
     */
    show() {
        this.isVisible = true;
        this.panel.classList.add('visible');
        this.updateStats();
    }

    /**
     * Hide the panel
     */
    hide() {
        this.isVisible = false;
        this.panel.classList.remove('visible');
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Destroy the panel
     */
    destroy() {
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
    }
}
