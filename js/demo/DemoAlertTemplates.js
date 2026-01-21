/**
 * Demo Alert and Insight Templates
 * 
 * Realistic templates for generating demo data across all mining structures.
 * Each template includes structure-specific context for authentic presentations.
 */

/**
 * Alert templates organized by structure
 */
export const DemoAlertTemplates = {
    // Main Open Pit alerts
    PIT_MAIN: [
        {
            cause: 'Blast fired - awaiting reentry clearance',
            explanation: 'Blast detonation complete. Level is in lockout condition. No personnel may enter until reentry clearance is issued by shotfirer.',
            severity: 'critical',
            riskScore: 100
        },
        {
            cause: 'Blast scheduled within 30 minutes',
            explanation: 'Scheduled blast imminent. Evacuation in progress. All personnel must clear the exclusion zone.',
            severity: 'high',
            riskScore: 85
        },
        {
            cause: 'Drilling near explosives storage',
            explanation: 'Drilling activity detected within 50m of explosives magazine. Heightened safety protocols in effect.',
            severity: 'high',
            riskScore: 78
        },
        {
            cause: 'Haul truck speeding detected',
            explanation: 'Haul truck 42 exceeded speed limit at 45km/h in 30km/h zone near active excavation.',
            severity: 'medium',
            riskScore: 55
        },
        {
            cause: 'Bench stability concern flagged',
            explanation: 'Geotechnical sensors indicate minor ground movement. Visual inspection recommended.',
            severity: 'medium',
            riskScore: 52
        },
        {
            cause: 'Multiple proximity alerts in 15 minutes',
            explanation: '6 proximity events detected near active equipment. Review crew positioning.',
            severity: 'medium',
            riskScore: 48
        },
        {
            cause: 'Dust suppression system offline',
            explanation: 'Water truck offline for maintenance. Alternative dust control measures required.',
            severity: 'low',
            riskScore: 32
        }
    ],

    // Northern Decline (Underground) alerts
    DECLINE_NORTH: [
        {
            cause: 'Gas concentration above threshold',
            explanation: 'Methane detected at 1.2% in Stope 4B. Ventilation increased. Area monitoring in progress.',
            severity: 'critical',
            riskScore: 92
        },
        {
            cause: 'Ventilation flow below minimum',
            explanation: 'Primary fan output dropped to 78% of required flow. Backup systems engaged.',
            severity: 'high',
            riskScore: 82
        },
        {
            cause: 'Ground movement sensor triggered',
            explanation: 'Seismic sensors detected minor ground movement in development heading. Inspection required.',
            severity: 'high',
            riskScore: 75
        },
        {
            cause: 'Emergency refuge chamber inspection due',
            explanation: 'Monthly inspection overdue by 3 days. Compliance action required.',
            severity: 'medium',
            riskScore: 58
        },
        {
            cause: 'Shotcrete thickness below specification',
            explanation: 'Recent ground support measurements below design thickness. Remediation scheduled.',
            severity: 'medium',
            riskScore: 54
        },
        {
            cause: 'Personnel tracking system gap detected',
            explanation: '2 personnel tags not responding for 15+ minutes in active heading.',
            severity: 'medium',
            riskScore: 62
        },
        {
            cause: 'Water inflow rate increasing',
            explanation: 'Pumping capacity adequate but monitoring frequency increased due to rising water levels.',
            severity: 'low',
            riskScore: 38
        }
    ],

    // Processing Plant alerts
    PROCESSING: [
        {
            cause: 'Crusher emergency shutdown triggered',
            explanation: 'Primary crusher auto-stopped due to overload protection. Investigation underway.',
            severity: 'critical',
            riskScore: 88
        },
        {
            cause: 'Crusher temperature elevated',
            explanation: 'Primary crusher bearing temperature at 85°C, above 80°C threshold. Monitoring closely.',
            severity: 'high',
            riskScore: 72
        },
        {
            cause: 'Conveyor belt misalignment detected',
            explanation: 'Belt tracking sensors indicate drift on CV-003. Adjustment required during next stop.',
            severity: 'high',
            riskScore: 68
        },
        {
            cause: 'Dust levels exceeding limits',
            explanation: 'Crusher house particulate readings above occupational exposure limits. Filters due for replacement.',
            severity: 'medium',
            riskScore: 58
        },
        {
            cause: 'Reagent tank level critical',
            explanation: 'Flotation reagent tank at 12% capacity. Resupply scheduled for today.',
            severity: 'medium',
            riskScore: 45
        },
        {
            cause: 'Vibration anomaly on mill motor',
            explanation: 'Spectral analysis indicates bearing wear on SAG mill motor. Maintenance window requested.',
            severity: 'medium',
            riskScore: 52
        },
        {
            cause: 'Tailings pipeline pressure variance',
            explanation: 'Minor pressure fluctuations detected. Within tolerance but monitoring increased.',
            severity: 'low',
            riskScore: 35
        }
    ]
};

/**
 * AI Insight templates for realistic predictions and anomalies
 */
export const DemoInsightTemplates = {
    anomaly: [
        {
            title: 'Methane reading elevated',
            explanation: 'Methane sensor reading of 0.95 ppm is 2.3 standard deviations above normal baseline.',
            contributingFactors: ['Recent blasting activity', 'Reduced ventilation flow'],
            recommendedAction: 'Verify sensor calibration and increase ventilation monitoring frequency.',
            severity: 'high',
            structures: ['DECLINE_NORTH']
        },
        {
            title: 'Unusual proximity alert frequency',
            explanation: 'Proximity alerts occurred 5 times in the last hour, compared to expected 2.',
            contributingFactors: ['Shift change', 'Equipment repositioning'],
            recommendedAction: 'Review crew movement patterns and equipment spacing.',
            severity: 'medium',
            structures: ['PIT_MAIN', 'DECLINE_NORTH']
        },
        {
            title: 'Ventilation efficiency reduced',
            explanation: 'Air flow measurement slightly below expected range for current operations.',
            contributingFactors: ['Filter maintenance due'],
            recommendedAction: 'Schedule filter inspection during next maintenance window.',
            severity: 'low',
            structures: ['DECLINE_NORTH', 'PROCESSING']
        },
        {
            title: 'Temperature rise pattern detected',
            explanation: 'Equipment temperature trending upward over past 6 hours, 15% above baseline.',
            contributingFactors: ['Ambient temperature increase', 'Reduced cooling efficiency'],
            recommendedAction: 'Schedule thermal inspection and verify cooling system operation.',
            severity: 'medium',
            structures: ['PROCESSING']
        },
        {
            title: 'Ground vibration pattern change',
            explanation: 'Seismic signature differs from normal blasting patterns. May indicate stress redistribution.',
            contributingFactors: ['Sequential blasting schedule', 'Geological structure'],
            recommendedAction: 'Consult geotechnical engineer for assessment.',
            severity: 'high',
            structures: ['PIT_MAIN', 'DECLINE_NORTH']
        }
    ],

    prediction: [
        {
            title: 'Risk spike predicted in 2 hours',
            explanation: 'Based on current activity patterns and historical data, elevated risk conditions likely.',
            contributingFactors: ['Shift handover approaching', 'Multiple concurrent operations'],
            recommendedAction: 'Consider staggering operations during predicted window.',
            severity: 'high',
            structures: ['PIT_MAIN', 'DECLINE_NORTH', 'PROCESSING']
        },
        {
            title: 'Equipment maintenance recommended',
            explanation: 'Predictive model indicates bearing failure probability increasing over next 72 hours.',
            contributingFactors: ['Runtime hours exceeding service interval', 'Vibration signature change'],
            recommendedAction: 'Schedule preventive maintenance before end of current week.',
            severity: 'medium',
            structures: ['PROCESSING']
        },
        {
            title: 'Optimal blast timing identified',
            explanation: 'Analysis suggests best blast window at 14:30 based on personnel distribution and weather.',
            contributingFactors: ['Minimum personnel exposure', 'Favorable wind direction'],
            recommendedAction: 'Confirm blast schedule aligns with recommended window.',
            severity: 'low',
            structures: ['PIT_MAIN']
        },
        {
            title: 'Ventilation demand increase expected',
            explanation: 'Predicted 20% increase in air flow requirement based on upcoming activities.',
            contributingFactors: ['Development heading advance', 'Additional equipment deployment'],
            recommendedAction: 'Pre-position auxiliary ventilation equipment.',
            severity: 'medium',
            structures: ['DECLINE_NORTH']
        }
    ],

    recommendation: [
        {
            title: 'Safety protocol review suggested',
            explanation: 'Recent alert patterns indicate potential for procedural improvement.',
            contributingFactors: ['Recurring alert type', 'Near-miss incident trend'],
            recommendedAction: 'Schedule safety toolbox talk with affected crews.',
            severity: 'medium',
            structures: ['PIT_MAIN', 'DECLINE_NORTH', 'PROCESSING']
        },
        {
            title: 'Communication enhancement needed',
            explanation: 'Multiple instances of delayed alert acknowledgment detected.',
            contributingFactors: ['Radio coverage gaps', 'Shift handover timing'],
            recommendedAction: 'Review communication protocols and equipment coverage.',
            severity: 'low',
            structures: ['DECLINE_NORTH']
        },
        {
            title: 'Training opportunity identified',
            explanation: 'Operational patterns suggest crew would benefit from equipment refresher training.',
            contributingFactors: ['New equipment deployment', 'Recent personnel changes'],
            recommendedAction: 'Coordinate with training department for targeted session.',
            severity: 'low',
            structures: ['PROCESSING']
        }
    ]
};

/**
 * Structure metadata for demo generation
 */
export const DemoStructureInfo = {
    PIT_MAIN: {
        code: 'PIT_MAIN',
        name: 'Main Open Pit',
        levels: [1, 2, 3, 4, 5, 6, 7],
        baseRisk: 45
    },
    DECLINE_NORTH: {
        code: 'DECLINE_NORTH',
        name: 'Northern Decline',
        levels: [1, 2, 3, 4, 5],
        baseRisk: 50
    },
    PROCESSING: {
        code: 'PROCESSING',
        name: 'Processing Plant',
        levels: [1, 2, 3],
        baseRisk: 40
    }
};

/**
 * Helper to get a random template for a structure
 */
export function getRandomAlertTemplate(structureCode) {
    const templates = DemoAlertTemplates[structureCode];
    if (!templates || templates.length === 0) {
        return DemoAlertTemplates.PIT_MAIN[0];
    }
    return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Helper to get a random insight template
 */
export function getRandomInsightTemplate(type = null) {
    const types = type ? [type] : Object.keys(DemoInsightTemplates);
    const selectedType = types[Math.floor(Math.random() * types.length)];
    const templates = DemoInsightTemplates[selectedType];
    return {
        ...templates[Math.floor(Math.random() * templates.length)],
        insightType: selectedType
    };
}
