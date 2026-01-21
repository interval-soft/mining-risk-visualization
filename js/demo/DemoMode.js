/**
 * DemoMode - Core orchestrator for Living Demo Mode
 * 
 * Controls the entire demo experience:
 * - Activation via URL param (?demo=true) or keyboard shortcut (Ctrl+Shift+D)
 * - Coordinates DemoDataProvider, LiveSimulator, and DemoTriggerPanel
 * - Shows "DEMO MODE" indicator when active
 */

import { DemoDataProvider } from './DemoDataProvider.js';
import { LiveSimulator } from './LiveSimulator.js';
import { DemoTriggerPanel } from './DemoTriggerPanel.js';
import { DemoScenarios } from './DemoScenarios.js';

export class DemoMode {
    constructor(stateManager, apiClient) {
        this.stateManager = stateManager;
        this.apiClient = apiClient;
        this.originalApiFunctions = {};
        
        this.isActive = false;
        this.dataProvider = null;
        this.simulator = null;
        this.triggerPanel = null;
        this.scenarios = null;
        
        // Bind keyboard shortcut
        this.boundKeyHandler = this.handleKeyDown.bind(this);
    }

    /**
     * Initialize demo mode - called from main.js after app setup
     */
    async initialize() {
        // Bind keyboard shortcut listener
        document.addEventListener('keydown', this.boundKeyHandler);
        
        // Check if demo should auto-activate
        if (this.shouldActivate()) {
            await this.activate();
        }
    }

    /**
     * Check if demo mode should activate (URL param check)
     */
    shouldActivate() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('demo') === 'true';
    }

    /**
     * Activate demo mode
     */
    async activate() {
        if (this.isActive) return;
        
        console.log('[DemoMode] Activating...');
        this.isActive = true;
        
        // Initialize demo data provider
        this.dataProvider = new DemoDataProvider(this.stateManager);
        this.dataProvider.generateHistoricalData();
        
        // Initialize scenarios
        this.scenarios = new DemoScenarios(this.stateManager, this.dataProvider);
        
        // Initialize live simulator
        this.simulator = new LiveSimulator(
            this.stateManager,
            this.dataProvider,
            this.scenarios
        );
        
        // Initialize trigger panel
        this.triggerPanel = new DemoTriggerPanel(this, this.scenarios, this.simulator);
        
        // Monkey-patch API client to return demo data
        this.patchApiClient();
        
        // Show demo mode indicator
        this.showIndicator();
        
        // Dispatch initial demo data
        this.dispatchInitialData();
        
        // Start live simulation
        this.simulator.start();
        
        console.log('[DemoMode] Active - Press Ctrl+Shift+D to toggle control panel');
    }

    /**
     * Deactivate demo mode
     */
    deactivate() {
        if (!this.isActive) return;
        
        console.log('[DemoMode] Deactivating...');
        this.isActive = false;
        
        // Stop live simulation
        if (this.simulator) {
            this.simulator.stop();
        }
        
        // Hide trigger panel
        if (this.triggerPanel) {
            this.triggerPanel.hide();
        }
        
        // Restore original API functions
        this.restoreApiClient();
        
        // Hide demo mode indicator
        this.hideIndicator();
    }

    /**
     * Toggle demo mode on/off
     */
    toggle() {
        if (this.isActive) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    /**
     * Toggle the trigger panel visibility
     */
    togglePanel() {
        if (this.triggerPanel) {
            this.triggerPanel.toggle();
        }
    }

    /**
     * Handle keyboard shortcut (Ctrl+Shift+D)
     */
    handleKeyDown(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'D') {
            event.preventDefault();
            
            if (this.isActive) {
                // Toggle panel visibility
                this.togglePanel();
            } else {
                // Activate demo mode and show panel
                this.activate();
                setTimeout(() => this.triggerPanel?.show(), 100);
            }
        }
    }

    /**
     * Inject a specific scenario by ID
     */
    injectScenario(scenarioId) {
        if (!this.scenarios) return;
        this.scenarios.execute(scenarioId);
    }

    /**
     * Monkey-patch ApiClient to return demo data
     */
    patchApiClient() {
        // Save original functions
        this.originalApiFunctions.getAlerts = this.apiClient.getAlerts?.bind(this.apiClient);
        this.originalApiFunctions.getAIInsights = this.apiClient.getAIInsights?.bind(this.apiClient);
        
        // Override getAlerts
        this.apiClient.getAlerts = async (params = {}) => {
            return {
                alerts: this.dataProvider.getAlerts(params),
                total: this.dataProvider.alerts.length
            };
        };
        
        // Override getAIInsights
        this.apiClient.getAIInsights = async (params = {}) => {
            return {
                insights: this.dataProvider.getInsights(params),
                total: this.dataProvider.insights.length
            };
        };
    }

    /**
     * Restore original ApiClient functions
     */
    restoreApiClient() {
        if (this.originalApiFunctions.getAlerts) {
            this.apiClient.getAlerts = this.originalApiFunctions.getAlerts;
        }
        if (this.originalApiFunctions.getAIInsights) {
            this.apiClient.getAIInsights = this.originalApiFunctions.getAIInsights;
        }
        this.originalApiFunctions = {};
    }

    /**
     * Dispatch initial demo data to all listeners
     */
    dispatchInitialData() {
        // Get initial data
        const alerts = this.dataProvider.getAlerts({ status: 'active' });
        const insights = this.dataProvider.getInsights({ status: 'active' });
        const state = this.dataProvider.getCurrentState();
        
        // Dispatch to UI panels
        this.stateManager.dispatchEvent(new CustomEvent('alertsChanged', {
            detail: { alerts: this.dataProvider.alerts }
        }));
        
        this.stateManager.dispatchEvent(new CustomEvent('insightsChanged', {
            detail: { insights: this.dataProvider.insights }
        }));
        
        // Update risk state for 3D visualization
        if (state) {
            this.stateManager.currentState = state;
            this.stateManager.updateStructuresFromState(state);
            this.stateManager.dispatchEvent(new CustomEvent('stateChanged', {
                detail: {
                    state,
                    timestamp: new Date(),
                    isLive: true
                }
            }));
        }
    }

    /**
     * Show "DEMO MODE" indicator in the header
     */
    showIndicator() {
        // Update toggle button state
        const toggleBtn = document.getElementById('demo-mode-toggle');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
        }

        let indicator = document.getElementById('demo-mode-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'demo-mode-indicator';
            indicator.className = 'demo-mode-indicator';
            indicator.innerHTML = `
                <span class="demo-badge">DEMO MODE</span>
                <span class="demo-shortcut" title="Toggle control panel">Ctrl+Shift+D</span>
            `;
            
            // Insert into top bar after mode indicator
            const topBar = document.getElementById('top-bar');
            const modeIndicator = document.getElementById('mode-indicator');
            if (topBar && modeIndicator) {
                topBar.insertBefore(indicator, modeIndicator.nextSibling);
            } else if (topBar) {
                topBar.prepend(indicator);
            }
        }
        
        indicator.style.display = 'flex';
    }

    /**
     * Hide "DEMO MODE" indicator
     */
    hideIndicator() {
        // Update toggle button state
        const toggleBtn = document.getElementById('demo-mode-toggle');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }

        const indicator = document.getElementById('demo-mode-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Get current demo state
     */
    getStatus() {
        return {
            isActive: this.isActive,
            alertCount: this.dataProvider?.alerts.length || 0,
            insightCount: this.dataProvider?.insights.length || 0,
            simulationRunning: this.simulator?.isRunning || false
        };
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.deactivate();
        document.removeEventListener('keydown', this.boundKeyHandler);
    }
}
