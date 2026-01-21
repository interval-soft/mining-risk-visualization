/**
 * LiveSimulator - Background event ticker for live demo feel
 * 
 * Generates new events every 30-60 seconds to make the demo feel alive:
 * - 35% - New alert
 * - 20% - Risk score fluctuation (+/- 10 points)
 * - 20% - New AI insight
 * - 25% - Activity status change (acknowledge/resolve existing alert)
 */

import { 
    DemoStructureInfo, 
    getRandomAlertTemplate, 
    getRandomInsightTemplate 
} from './DemoAlertTemplates.js';

export class LiveSimulator {
    constructor(stateManager, dataProvider, scenarios) {
        this.stateManager = stateManager;
        this.dataProvider = dataProvider;
        this.scenarios = scenarios;
        
        this.isRunning = false;
        this.tickTimer = null;
        this.speed = 'normal'; // 'slow', 'normal', 'fast'
        this.autoGenerate = true;
        
        // Speed configurations (min/max interval in ms)
        this.speedConfig = {
            slow: { min: 60000, max: 90000 },      // 60-90 seconds
            normal: { min: 30000, max: 60000 },    // 30-60 seconds
            fast: { min: 10000, max: 20000 }       // 10-20 seconds
        };
    }

    /**
     * Start the live simulation
     */
    start() {
        if (this.isRunning) return;
        
        console.log('[LiveSimulator] Starting...');
        this.isRunning = true;
        this.scheduleNextTick();
    }

    /**
     * Stop the live simulation
     */
    stop() {
        console.log('[LiveSimulator] Stopping...');
        this.isRunning = false;
        
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
    }

    /**
     * Set simulation speed
     */
    setSpeed(speed) {
        if (this.speedConfig[speed]) {
            this.speed = speed;
            console.log(`[LiveSimulator] Speed set to: ${speed}`);
        }
    }

    /**
     * Enable/disable auto-generation
     */
    setAutoGenerate(enabled) {
        this.autoGenerate = enabled;
        console.log(`[LiveSimulator] Auto-generate: ${enabled}`);
    }

    /**
     * Schedule the next simulation tick
     */
    scheduleNextTick() {
        if (!this.isRunning) return;
        
        const config = this.speedConfig[this.speed];
        const delay = config.min + Math.random() * (config.max - config.min);
        
        this.tickTimer = setTimeout(() => {
            this.tick();
            this.scheduleNextTick();
        }, delay);
    }

    /**
     * Execute one simulation step
     */
    tick() {
        if (!this.autoGenerate) return;
        
        const rand = Math.random();
        
        if (rand < 0.35) {
            // 35% - New alert
            this.generateNewAlert();
        } else if (rand < 0.55) {
            // 20% - Risk score fluctuation
            this.fluctuateRiskScore();
        } else if (rand < 0.75) {
            // 20% - New AI insight
            this.generateNewInsight();
        } else {
            // 25% - Activity status change
            this.updateAlertStatus();
        }
    }

    /**
     * Generate a new alert
     */
    generateNewAlert() {
        const structures = Object.keys(DemoStructureInfo);
        const structureCode = structures[Math.floor(Math.random() * structures.length)];
        const structureInfo = DemoStructureInfo[structureCode];
        const template = getRandomAlertTemplate(structureCode);
        
        const levelNumber = structureInfo.levels[
            Math.floor(Math.random() * structureInfo.levels.length)
        ];
        
        const alert = this.dataProvider.addAlert({
            levelNumber,
            structureCode,
            structureName: structureInfo.name,
            riskScore: template.riskScore + Math.floor(Math.random() * 10 - 5),
            cause: template.cause,
            explanation: template.explanation,
            severity: template.severity
        });
        
        console.log(`[LiveSimulator] New alert: ${alert.cause} (${structureInfo.name} L${levelNumber})`);
        
        // Dispatch event
        this.dispatchAlertsChanged();
        
        // Also update risk score for the level
        this.dataProvider.updateRiskScore(
            structureCode, 
            levelNumber, 
            template.riskScore
        );
        this.dispatchStateChanged();
    }

    /**
     * Fluctuate risk scores slightly
     */
    fluctuateRiskScore() {
        const structures = Object.keys(DemoStructureInfo);
        const structureCode = structures[Math.floor(Math.random() * structures.length)];
        const structureInfo = DemoStructureInfo[structureCode];
        const levelNumber = structureInfo.levels[
            Math.floor(Math.random() * structureInfo.levels.length)
        ];
        
        const key = `${structureCode}-${levelNumber}`;
        const current = this.dataProvider.riskState.get(key);
        const currentScore = current?.riskScore || structureInfo.baseRisk;
        
        // Fluctuate by +/- 5-10 points
        const change = Math.floor(Math.random() * 10 - 5);
        const newScore = Math.max(20, Math.min(85, currentScore + change));
        
        this.dataProvider.updateRiskScore(structureCode, levelNumber, newScore);
        
        console.log(`[LiveSimulator] Risk fluctuation: ${structureInfo.name} L${levelNumber}: ${currentScore} → ${newScore}`);
        
        this.dispatchStateChanged();
    }

    /**
     * Generate a new AI insight
     */
    generateNewInsight() {
        const template = getRandomInsightTemplate();
        const structures = template.structures || Object.keys(DemoStructureInfo);
        const structureCode = structures[Math.floor(Math.random() * structures.length)];
        const structureInfo = DemoStructureInfo[structureCode];
        const levelNumber = structureInfo.levels[
            Math.floor(Math.random() * structureInfo.levels.length)
        ];
        
        const insight = this.dataProvider.addInsight({
            insightType: template.insightType,
            levelNumber,
            structureCode,
            structureName: structureInfo.name,
            severity: template.severity,
            title: template.title,
            explanation: template.explanation,
            contributingFactors: template.contributingFactors,
            recommendedAction: template.recommendedAction
        });
        
        console.log(`[LiveSimulator] New insight: ${insight.title}`);
        
        this.dispatchInsightsChanged();
    }

    /**
     * Update status of an existing alert (acknowledge or resolve)
     */
    updateAlertStatus() {
        // Find active alerts to potentially update
        const activeAlerts = this.dataProvider.alerts.filter(a => a.status === 'active');
        
        if (activeAlerts.length === 0) {
            // No active alerts, generate a new one instead
            this.generateNewAlert();
            return;
        }
        
        // Pick a random active alert
        const alert = activeAlerts[Math.floor(Math.random() * activeAlerts.length)];
        
        // 70% acknowledge, 30% resolve directly
        if (Math.random() < 0.70) {
            alert.status = 'acknowledged';
            alert.acknowledgedAt = new Date().toISOString();
            alert.acknowledgedBy = this.dataProvider.getRandomOperator();
            console.log(`[LiveSimulator] Alert acknowledged: ${alert.cause}`);
        } else {
            alert.status = 'resolved';
            alert.resolvedAt = new Date().toISOString();
            console.log(`[LiveSimulator] Alert resolved: ${alert.cause}`);
            
            // Lower the risk score for resolved alerts
            const currentRisk = this.dataProvider.riskState.get(`${alert.structureCode}-${alert.levelNumber}`);
            if (currentRisk) {
                const newScore = Math.max(20, currentRisk.riskScore - 15);
                this.dataProvider.updateRiskScore(alert.structureCode, alert.levelNumber, newScore);
                this.dispatchStateChanged();
            }
        }
        
        this.dispatchAlertsChanged();
    }

    /**
     * Dispatch alertsChanged event
     */
    dispatchAlertsChanged() {
        this.stateManager.dispatchEvent(new CustomEvent('alertsChanged', {
            detail: { alerts: this.dataProvider.alerts }
        }));
    }

    /**
     * Dispatch insightsChanged event
     */
    dispatchInsightsChanged() {
        this.stateManager.dispatchEvent(new CustomEvent('insightsChanged', {
            detail: { insights: this.dataProvider.insights }
        }));
    }

    /**
     * Dispatch stateChanged event for 3D visualization updates
     */
    dispatchStateChanged() {
        const state = this.dataProvider.getCurrentState();
        if (!state) return;
        
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

    /**
     * Force a specific event type (for testing)
     */
    forceEvent(eventType) {
        switch (eventType) {
            case 'alert':
                this.generateNewAlert();
                break;
            case 'insight':
                this.generateNewInsight();
                break;
            case 'fluctuation':
                this.fluctuateRiskScore();
                break;
            case 'status':
                this.updateAlertStatus();
                break;
            default:
                this.tick();
        }
    }
}
