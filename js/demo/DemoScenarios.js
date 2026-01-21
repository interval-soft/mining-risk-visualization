/**
 * DemoScenarios - Dramatic scenario scripts for impressive demos
 * 
 * Each scenario:
 * 1. Injects alert(s) into DemoDataProvider
 * 2. Updates state risk scores
 * 3. Dispatches events to trigger UI refresh
 * 4. Optionally adds AI insight
 */

import { DemoStructureInfo } from './DemoAlertTemplates.js';

export class DemoScenarios {
    constructor(stateManager, dataProvider) {
        this.stateManager = stateManager;
        this.dataProvider = dataProvider;
        
        // Scenario definitions
        this.scenarios = {
            'blast-lockout': this.blastLockout.bind(this),
            'gas-emergency': this.gasEmergency.bind(this),
            'equipment-failure': this.equipmentFailure.bind(this),
            'proximity-cascade': this.proximityCascade.bind(this),
            'shift-change': this.shiftChange.bind(this),
            'ai-prediction': this.aiPrediction.bind(this)
        };
    }

    /**
     * Execute a scenario by ID
     */
    execute(scenarioId) {
        const scenario = this.scenarios[scenarioId];
        if (scenario) {
            console.log(`[DemoScenarios] Executing: ${scenarioId}`);
            scenario();
        } else {
            console.warn(`[DemoScenarios] Unknown scenario: ${scenarioId}`);
        }
    }

    /**
     * Get list of available scenarios
     */
    getAvailableScenarios() {
        return Object.keys(this.scenarios);
    }

    // ==================== SCENARIO IMPLEMENTATIONS ====================

    /**
     * Blast Lockout - Critical scenario
     * Level 2 goes to 100 risk, critical alert with red pulsing
     */
    blastLockout() {
        const structureCode = 'PIT_MAIN';
        const levelNumber = 2;
        
        // Add critical alert
        const alert = this.dataProvider.addAlert({
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            riskScore: 100,
            cause: 'BLAST FIRED - Level 2 in lockout',
            explanation: 'Blast detonation complete. ALL PERSONNEL must remain clear. Awaiting shotfirer reentry clearance. No entry permitted until gases cleared and area inspected.',
            severity: 'critical'
        });
        
        // Set risk to maximum
        this.dataProvider.updateRiskScore(structureCode, levelNumber, 100);
        
        // Also elevate adjacent levels slightly
        this.dataProvider.updateRiskScore(structureCode, 1, 75);
        this.dataProvider.updateRiskScore(structureCode, 3, 70);
        
        // Add AI insight
        this.dataProvider.addInsight({
            insightType: 'prediction',
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            severity: 'critical',
            title: 'Blast lockout duration estimate',
            explanation: 'Based on blast size and ventilation capacity, estimated reentry clearance in 45-60 minutes.',
            contributingFactors: ['Blast magnitude', 'Ventilation rate', 'Gas dispersion model'],
            recommendedAction: 'Maintain exclusion zone. Monitor gas readings at all return airways.'
        });
        
        // Dispatch events
        this.dispatchAllEvents();
        
        console.log('[DemoScenarios] Blast Lockout executed - Level 2 at 100 risk');
    }

    /**
     * Gas Emergency - Critical scenario
     * Methane spike with evacuation alert and AI insight
     */
    gasEmergency() {
        const structureCode = 'DECLINE_NORTH';
        const levelNumber = 3;
        
        // Add critical alert
        this.dataProvider.addAlert({
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            riskScore: 95,
            cause: 'METHANE ALERT - Evacuation in progress',
            explanation: 'Methane concentration reached 1.8% in development heading 3B. This exceeds 1.25% action limit. Immediate evacuation initiated. Power isolated to affected area.',
            severity: 'critical'
        });
        
        // Add secondary ventilation alert
        this.dataProvider.addAlert({
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            riskScore: 85,
            cause: 'Emergency ventilation boost activated',
            explanation: 'Auxiliary fans ramped to maximum. Fresh air being directed to affected heading.',
            severity: 'high'
        });
        
        // Set high risk
        this.dataProvider.updateRiskScore(structureCode, levelNumber, 95);
        this.dataProvider.updateRiskScore(structureCode, levelNumber - 1, 70);
        
        // Add AI insight
        this.dataProvider.addInsight({
            insightType: 'anomaly',
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            severity: 'critical',
            title: 'Gas source analysis in progress',
            explanation: 'Methane spike correlates with recent development advance into suspected fault zone. Pattern suggests pocket release rather than continuous seep.',
            contributingFactors: ['Geological fault intersection', 'Recent face advance', 'Reduced ventilation during shift change'],
            recommendedAction: 'Maintain evacuation until readings below 0.5%. Consider probe drilling ahead of next advance.'
        });
        
        this.dispatchAllEvents();
        
        console.log('[DemoScenarios] Gas Emergency executed - Level 3 at 95 risk');
    }

    /**
     * Equipment Failure - High severity scenario
     * Crusher emergency shutdown at Processing Plant
     */
    equipmentFailure() {
        const structureCode = 'PROCESSING';
        const levelNumber = 1;
        
        // Add critical equipment alert
        this.dataProvider.addAlert({
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            riskScore: 88,
            cause: 'PRIMARY CRUSHER - Emergency shutdown',
            explanation: 'Crusher tripped on overload protection. Motor current exceeded 150% rated capacity. Investigating possible liner failure or tramp metal.',
            severity: 'critical'
        });
        
        // Add secondary alert
        this.dataProvider.addAlert({
            levelNumber: 2,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            riskScore: 65,
            cause: 'Feed conveyor stopped - upstream blockage',
            explanation: 'CV-001 halted to prevent spillage while crusher offline.',
            severity: 'high'
        });
        
        // Set high risk for processing
        this.dataProvider.updateRiskScore(structureCode, levelNumber, 88);
        this.dataProvider.updateRiskScore(structureCode, 2, 65);
        
        // Add AI insight
        this.dataProvider.addInsight({
            insightType: 'anomaly',
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            severity: 'high',
            title: 'Crusher vibration anomaly detected pre-trip',
            explanation: 'Review of sensor data shows increasing vibration amplitude over past 4 hours, suggesting progressive liner wear or feed size issue.',
            contributingFactors: ['ROM size distribution', 'Liner wear pattern', 'Feed rate variance'],
            recommendedAction: 'Inspect liners and CSS setting before restart. Review upstream sizing screen performance.'
        });
        
        this.dispatchAllEvents();
        
        console.log('[DemoScenarios] Equipment Failure executed - Processing at 88 risk');
    }

    /**
     * Proximity Cascade - High severity scenario
     * 3 rapid proximity alerts across multiple levels
     */
    proximityCascade() {
        const structureCode = 'PIT_MAIN';
        
        // Alert 1 - immediate
        this.dataProvider.addAlert({
            levelNumber: 3,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            riskScore: 72,
            cause: 'Proximity alert - Haul truck 27 near crew',
            explanation: 'Light vehicle within 15m of loaded haul truck on main ramp. Collision avoidance system activated.',
            severity: 'high'
        });
        
        // Alert 2 - seconds later
        setTimeout(() => {
            this.dataProvider.addAlert({
                levelNumber: 4,
                structureCode,
                structureName: DemoStructureInfo[structureCode].name,
                riskScore: 68,
                cause: 'Proximity alert - Excavator swing radius breach',
                explanation: 'Personnel detected in excavator swing zone during loading operation.',
                severity: 'high'
            });
            this.dispatchAlertsChanged();
        }, 2000);
        
        // Alert 3 - more seconds later
        setTimeout(() => {
            this.dataProvider.addAlert({
                levelNumber: 5,
                structureCode,
                structureName: DemoStructureInfo[structureCode].name,
                riskScore: 65,
                cause: 'Proximity alert - Drill rig exclusion zone',
                explanation: 'Service vehicle entered active drilling exclusion zone.',
                severity: 'high'
            });
            this.dispatchAlertsChanged();
        }, 4000);
        
        // Update risk scores
        this.dataProvider.updateRiskScore(structureCode, 3, 72);
        this.dataProvider.updateRiskScore(structureCode, 4, 68);
        this.dataProvider.updateRiskScore(structureCode, 5, 65);
        
        // Add AI insight
        this.dataProvider.addInsight({
            insightType: 'anomaly',
            levelNumber: 3,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            severity: 'high',
            title: 'Proximity alert cluster detected',
            explanation: 'Multiple proximity events in short timeframe suggests traffic management breakdown. Pattern indicates shift handover congestion.',
            contributingFactors: ['Shift change timing', 'Multiple concurrent operations', 'Equipment repositioning'],
            recommendedAction: 'Immediate radio call to all operators. Consider temporary traffic hold until pattern clears.'
        });
        
        this.dispatchAllEvents();
        
        console.log('[DemoScenarios] Proximity Cascade executed - 3 alerts triggered');
    }

    /**
     * Shift Change - Calming scenario
     * All risks drop 20-30 points, return to calm state
     */
    shiftChange() {
        // Lower all risk scores significantly
        Object.keys(DemoStructureInfo).forEach(structureCode => {
            const structureInfo = DemoStructureInfo[structureCode];
            structureInfo.levels.forEach(levelNumber => {
                const current = this.dataProvider.riskState.get(`${structureCode}-${levelNumber}`);
                const currentScore = current?.riskScore || 50;
                const newScore = Math.max(20, currentScore - 20 - Math.floor(Math.random() * 10));
                this.dataProvider.updateRiskScore(structureCode, levelNumber, newScore);
            });
        });
        
        // Add positive insight
        this.dataProvider.addInsight({
            insightType: 'recommendation',
            levelNumber: 1,
            structureCode: 'PIT_MAIN',
            structureName: DemoStructureInfo['PIT_MAIN'].name,
            severity: 'low',
            title: 'Shift handover complete - risk profile stable',
            explanation: 'All crews have completed handover procedures. Active operations reduced during transition. Risk levels returning to baseline.',
            contributingFactors: ['Orderly crew transition', 'Reduced equipment movement', 'Communication protocols followed'],
            recommendedAction: 'Good opportunity to complete pending maintenance tasks or inspections.'
        });
        
        // Acknowledge some active alerts
        const activeAlerts = this.dataProvider.alerts.filter(a => a.status === 'active');
        activeAlerts.slice(0, Math.ceil(activeAlerts.length / 2)).forEach(alert => {
            alert.status = 'acknowledged';
            alert.acknowledgedAt = new Date().toISOString();
            alert.acknowledgedBy = this.dataProvider.getRandomOperator();
        });
        
        this.dispatchAllEvents();
        
        console.log('[DemoScenarios] Shift Change executed - Risks lowered');
    }

    /**
     * AI Prediction - Insight-focused scenario
     * AI predicts risk spike with recommendation
     */
    aiPrediction() {
        const structureCode = 'DECLINE_NORTH';
        const levelNumber = 4;
        
        // Add predictive insight
        this.dataProvider.addInsight({
            insightType: 'prediction',
            levelNumber,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            severity: 'high',
            title: 'Risk spike predicted in next 2 hours',
            explanation: 'Machine learning model predicts 78% probability of elevated risk conditions between 14:00-16:00 based on: scheduled blasting, concurrent development activities, and historical incident patterns for this time window.',
            contributingFactors: [
                'Scheduled blast at 14:30',
                'Two concurrent development headings active',
                'Historical incident frequency peak 14:00-16:00',
                'Reduced ventilation during blast preparation'
            ],
            recommendedAction: 'Consider staggering operations. Ensure all crews briefed on elevated risk window. Position emergency response resources.'
        });
        
        // Add secondary insight
        this.dataProvider.addInsight({
            insightType: 'recommendation',
            levelNumber: 2,
            structureCode,
            structureName: DemoStructureInfo[structureCode].name,
            severity: 'medium',
            title: 'Pre-blast checklist reminder',
            explanation: 'Automated reminder: Blast scheduled in 90 minutes. Verify all pre-blast checks completed.',
            contributingFactors: ['Scheduled blast window approaching'],
            recommendedAction: 'Confirm exclusion zone established, all personnel accounted for, communication checks complete.'
        });
        
        // Slight risk increase to show awareness
        this.dataProvider.updateRiskScore(structureCode, levelNumber, 58);
        
        this.dispatchAllEvents();
        
        console.log('[DemoScenarios] AI Prediction executed - Insights added');
    }

    // ==================== EVENT DISPATCHERS ====================

    /**
     * Dispatch alerts changed event
     */
    dispatchAlertsChanged() {
        this.stateManager.dispatchEvent(new CustomEvent('alertsChanged', {
            detail: { alerts: this.dataProvider.alerts }
        }));
    }

    /**
     * Dispatch insights changed event
     */
    dispatchInsightsChanged() {
        this.stateManager.dispatchEvent(new CustomEvent('insightsChanged', {
            detail: { insights: this.dataProvider.insights }
        }));
    }

    /**
     * Dispatch state changed event for 3D visualization
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
     * Dispatch all events (alerts, insights, state)
     */
    dispatchAllEvents() {
        this.dispatchAlertsChanged();
        this.dispatchInsightsChanged();
        this.dispatchStateChanged();
    }
}
