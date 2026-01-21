/**
 * DemoDataProvider - Pre-loaded 48h data generator
 * 
 * Generates realistic historical data for demo presentations:
 * - 48 hours of alerts with realistic time distribution
 * - AI insights sprinkled throughout
 * - Mix of statuses: ~60% active, ~25% acknowledged, ~15% resolved
 */

import { 
    DemoAlertTemplates, 
    DemoInsightTemplates,
    DemoStructureInfo,
    getRandomAlertTemplate,
    getRandomInsightTemplate
} from './DemoAlertTemplates.js';

export class DemoDataProvider {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.alerts = [];
        this.insights = [];
        this.alertIdCounter = 1000;
        this.insightIdCounter = 2000;
        
        // Risk state for each structure/level
        this.riskState = new Map();
    }

    /**
     * Generate 48 hours of historical demo data
     */
    generateHistoricalData() {
        console.log('[DemoDataProvider] Generating 48h of historical data...');
        
        const now = new Date();
        const hoursBack = 48;
        
        // Clear existing data
        this.alerts = [];
        this.insights = [];
        
        // Generate alerts for each hour
        for (let h = hoursBack; h >= 0; h--) {
            const hourTimestamp = new Date(now.getTime() - h * 60 * 60 * 1000);
            const hour = hourTimestamp.getHours();
            
            // Day shift (6am-6pm): 40% chance of alert per hour
            // Night shift: 15% chance per hour
            const isDayShift = hour >= 6 && hour < 18;
            const alertChance = isDayShift ? 0.40 : 0.15;
            
            // Generate alerts for each structure
            Object.keys(DemoStructureInfo).forEach(structureCode => {
                if (Math.random() < alertChance) {
                    this.generateAlertAtTime(structureCode, hourTimestamp);
                }
            });
            
            // AI insights: 20% chance per hour
            if (Math.random() < 0.20) {
                this.generateInsightAtTime(hourTimestamp);
            }
        }
        
        // Ensure we have some recent active alerts for visual impact
        this.ensureRecentActiveAlerts();
        
        // Sort by timestamp (newest first)
        this.alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.insights.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Initialize risk state from current state manager
        this.initializeRiskState();
        
        console.log(`[DemoDataProvider] Generated ${this.alerts.length} alerts, ${this.insights.length} insights`);
    }

    /**
     * Generate a single alert at a specific time
     */
    generateAlertAtTime(structureCode, timestamp) {
        const structureInfo = DemoStructureInfo[structureCode];
        const template = getRandomAlertTemplate(structureCode);
        const levelNumber = structureInfo.levels[
            Math.floor(Math.random() * structureInfo.levels.length)
        ];
        
        // Determine status based on age
        const ageHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
        let status = 'active';
        let acknowledgedAt = null;
        let acknowledgedBy = null;
        let resolvedAt = null;
        
        if (ageHours > 12) {
            // Older alerts are mostly resolved
            const rand = Math.random();
            if (rand < 0.70) {
                status = 'resolved';
                resolvedAt = new Date(timestamp.getTime() + Math.random() * 4 * 60 * 60 * 1000).toISOString();
            } else if (rand < 0.90) {
                status = 'acknowledged';
                acknowledgedAt = new Date(timestamp.getTime() + Math.random() * 2 * 60 * 60 * 1000).toISOString();
                acknowledgedBy = this.getRandomOperator();
            }
        } else if (ageHours > 4) {
            // Medium age: mix of statuses
            const rand = Math.random();
            if (rand < 0.40) {
                status = 'resolved';
                resolvedAt = new Date(timestamp.getTime() + Math.random() * 2 * 60 * 60 * 1000).toISOString();
            } else if (rand < 0.70) {
                status = 'acknowledged';
                acknowledgedAt = new Date(timestamp.getTime() + Math.random() * 60 * 60 * 1000).toISOString();
                acknowledgedBy = this.getRandomOperator();
            }
        } else {
            // Recent alerts: mostly active
            if (Math.random() < 0.25) {
                status = 'acknowledged';
                acknowledgedAt = new Date(timestamp.getTime() + Math.random() * 30 * 60 * 1000).toISOString();
                acknowledgedBy = this.getRandomOperator();
            }
        }
        
        // Add some random time variation within the hour
        const adjustedTimestamp = new Date(
            timestamp.getTime() + Math.random() * 55 * 60 * 1000
        );
        
        const alert = {
            id: `demo-alert-${this.alertIdCounter++}`,
            timestamp: adjustedTimestamp.toISOString(),
            levelNumber,
            structureCode,
            structureName: structureInfo.name,
            riskScore: template.riskScore + Math.floor(Math.random() * 10 - 5),
            status,
            cause: template.cause,
            explanation: template.explanation,
            severity: template.severity,
            acknowledgedAt,
            acknowledgedBy,
            resolvedAt
        };
        
        this.alerts.push(alert);
        return alert;
    }

    /**
     * Generate an AI insight at a specific time
     */
    generateInsightAtTime(timestamp) {
        const template = getRandomInsightTemplate();
        const structures = template.structures || Object.keys(DemoStructureInfo);
        const structureCode = structures[Math.floor(Math.random() * structures.length)];
        const structureInfo = DemoStructureInfo[structureCode];
        const levelNumber = structureInfo.levels[
            Math.floor(Math.random() * structureInfo.levels.length)
        ];
        
        // Add time variation
        const adjustedTimestamp = new Date(
            timestamp.getTime() + Math.random() * 55 * 60 * 1000
        );
        
        const insight = {
            id: `demo-insight-${this.insightIdCounter++}`,
            timestamp: adjustedTimestamp.toISOString(),
            insightType: template.insightType,
            levelNumber,
            structureCode,
            structureName: structureInfo.name,
            severity: template.severity,
            confidence: 0.65 + Math.random() * 0.30, // 65-95%
            title: template.title,
            explanation: template.explanation,
            contributingFactors: template.contributingFactors,
            recommendedAction: template.recommendedAction,
            status: 'active'
        };
        
        this.insights.push(insight);
        return insight;
    }

    /**
     * Ensure we have some recent active alerts for visual impact
     */
    ensureRecentActiveAlerts() {
        const now = new Date();
        const recentActive = this.alerts.filter(
            a => a.status === 'active' && 
                 (now - new Date(a.timestamp)) < 2 * 60 * 60 * 1000
        );
        
        // If less than 3 recent active alerts, add some
        if (recentActive.length < 3) {
            const structures = Object.keys(DemoStructureInfo);
            for (let i = recentActive.length; i < 3; i++) {
                const struct = structures[i % structures.length];
                const timestamp = new Date(now.getTime() - Math.random() * 90 * 60 * 1000);
                const alert = this.generateAlertAtTime(struct, timestamp);
                alert.status = 'active';
                alert.acknowledgedAt = null;
                alert.acknowledgedBy = null;
                alert.resolvedAt = null;
            }
        }
    }

    /**
     * Initialize risk state from state manager
     */
    initializeRiskState() {
        const state = this.stateManager?.currentState;
        if (!state?.structures) return;
        
        state.structures.forEach(structure => {
            structure.levels?.forEach(level => {
                const key = `${structure.code}-${level.level}`;
                this.riskState.set(key, {
                    riskScore: level.riskScore || DemoStructureInfo[structure.code]?.baseRisk || 45,
                    riskBand: level.riskBand || 'medium'
                });
            });
        });
    }

    /**
     * Get alerts with optional filters
     */
    getAlerts(filters = {}) {
        let filtered = [...this.alerts];
        
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(a => a.status === filters.status);
        }
        
        if (filters.structure && filters.structure !== 'all') {
            filtered = filtered.filter(a => a.structureCode === filters.structure);
        }
        
        if (filters.level && filters.level !== 'all') {
            filtered = filtered.filter(a => a.levelNumber === parseInt(filters.level));
        }
        
        if (filters.severity) {
            filtered = filtered.filter(a => a.severity === filters.severity);
        }
        
        return filtered;
    }

    /**
     * Get insights with optional filters
     */
    getInsights(filters = {}) {
        let filtered = [...this.insights];
        
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(i => i.status === filters.status);
        }
        
        if (filters.severity && filters.severity !== 'all') {
            filtered = filtered.filter(i => i.severity === filters.severity);
        }
        
        if (filters.level && filters.level !== 'all') {
            filtered = filtered.filter(i => i.levelNumber === parseInt(filters.level));
        }
        
        return filtered;
    }

    /**
     * Add a new alert (for live simulation)
     */
    addAlert(alertData) {
        const alert = {
            id: `demo-alert-${this.alertIdCounter++}`,
            timestamp: new Date().toISOString(),
            status: 'active',
            ...alertData
        };
        
        this.alerts.unshift(alert); // Add to beginning (newest first)
        return alert;
    }

    /**
     * Add a new insight (for live simulation)
     */
    addInsight(insightData) {
        const insight = {
            id: `demo-insight-${this.insightIdCounter++}`,
            timestamp: new Date().toISOString(),
            status: 'active',
            confidence: 0.70 + Math.random() * 0.25,
            ...insightData
        };
        
        this.insights.unshift(insight);
        return insight;
    }

    /**
     * Update risk score for a level
     */
    updateRiskScore(structureCode, levelNumber, riskScore) {
        const key = `${structureCode}-${levelNumber}`;
        const current = this.riskState.get(key) || { riskScore: 45, riskBand: 'medium' };
        
        const newScore = Math.max(0, Math.min(100, riskScore));
        const newBand = newScore <= 30 ? 'low' : newScore <= 70 ? 'medium' : 'high';
        
        this.riskState.set(key, { riskScore: newScore, riskBand: newBand });
        return { riskScore: newScore, riskBand: newBand };
    }

    /**
     * Get current state with demo risk scores
     */
    getCurrentState() {
        const baseState = this.stateManager?.currentState;
        if (!baseState) return null;
        
        // Clone and update with demo risk scores
        const state = JSON.parse(JSON.stringify(baseState));
        
        if (state.structures) {
            state.structures.forEach(structure => {
                let maxRisk = 0;
                structure.levels?.forEach(level => {
                    const key = `${structure.code}-${level.level}`;
                    const risk = this.riskState.get(key);
                    if (risk) {
                        level.riskScore = risk.riskScore;
                        level.riskBand = risk.riskBand;
                        maxRisk = Math.max(maxRisk, risk.riskScore);
                    }
                });
                structure.riskScore = maxRisk;
                structure.riskBand = maxRisk <= 30 ? 'low' : maxRisk <= 70 ? 'medium' : 'high';
            });
        }
        
        return state;
    }

    /**
     * Get random operator name for acknowledgments
     */
    getRandomOperator() {
        const operators = [
            'J. Smith', 'M. Johnson', 'K. Williams', 'R. Brown',
            'A. Davis', 'S. Miller', 'T. Wilson', 'D. Anderson'
        ];
        return operators[Math.floor(Math.random() * operators.length)];
    }

    /**
     * Get statistics about current data
     */
    getStats() {
        return {
            totalAlerts: this.alerts.length,
            activeAlerts: this.alerts.filter(a => a.status === 'active').length,
            acknowledgedAlerts: this.alerts.filter(a => a.status === 'acknowledged').length,
            resolvedAlerts: this.alerts.filter(a => a.status === 'resolved').length,
            totalInsights: this.insights.length,
            activeInsights: this.insights.filter(i => i.status === 'active').length
        };
    }
}
