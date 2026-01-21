/**
 * Newman Iron Operations - 7 Level Mixed Operations Mine
 *
 * Generate levels with time-varying risk scores simulating a 24-hour cycle:
 * - Level 2 (Active Pit Face): High risk during blasting (hours 9-12)
 * - Level 6 (Underground Decline): High risk with active development
 * - Level 7 (Deep Services): Moderate risk with ventilation and electrical
 */
function getMockLevels(timestamp) {
    const hour = timestamp.getHours();

    // Level 2: Active Pit Face - risk varies based on blasting schedule
    let level2Risk = 55;
    let level2Explanation = 'MEDIUM risk: Active drilling operations with explosive magazine access.';
    const level2Rules = [
        { ruleCode: 'EXPLOSIVE_HANDLING', ruleName: 'Explosive Magazine Access', impactType: 'additive', impactValue: 35, reason: 'Explosive magazine access currently active' }
    ];

    if (hour >= 9 && hour < 10) {
        level2Risk = 85;
        level2Explanation = 'HIGH risk: Blasting scheduled, explosive handling in progress.';
        level2Rules.push(
            { ruleCode: 'BLAST_SCHEDULED', ruleName: 'Shot Firing Scheduled', impactType: 'additive', impactValue: 40, reason: 'West Wall shot firing scheduled within 30 minutes' }
        );
    } else if (hour >= 10 && hour < 12) {
        level2Risk = 100;
        level2Explanation = 'LOCKOUT: Post-blast, re-entry not cleared.';
        level2Rules.length = 0;
        level2Rules.push(
            { ruleCode: 'BLAST_NO_REENTRY', ruleName: 'Post-Blast No Re-entry', impactType: 'force', impactValue: 100, reason: 'Blast fired, awaiting re-entry clearance' }
        );
    } else if (hour >= 21 || hour < 6) {
        level2Risk = 35;
        level2Explanation = 'MEDIUM risk. Night shift, reduced drilling activity.';
    }

    // Level 6: Underground Decline - consistently high risk
    let level6Risk = 82;
    let level6Explanation = 'HIGH risk: Active decline development with confined space entry.';
    const level6Rules = [
        { ruleCode: 'DECLINE_DEV', ruleName: 'Active Decline Development', impactType: 'additive', impactValue: 35, reason: 'Underground decline development in progress' },
        { ruleCode: 'GROUND_SUPPORT', ruleName: 'Ground Support Installation', impactType: 'additive', impactValue: 25, reason: 'Active rock bolting and mesh installation' },
        { ruleCode: 'CONFINED_SPACE', ruleName: 'Confined Space Entry', impactType: 'additive', impactValue: 30, reason: 'Confined space work with valid permit' }
    ];

    if (hour >= 22 || hour < 5) {
        level6Risk = 55;
        level6Explanation = 'MEDIUM risk: Night maintenance, reduced development activity.';
        level6Rules.length = 1;
    }

    // Level 7: Deep Services - ventilation and air quality
    let level7Risk = 45;
    let level7Explanation = 'MEDIUM risk: Primary ventilation with air quality monitoring.';
    const level7Rules = [
        { ruleCode: 'VENTILATION_OPS', ruleName: 'Primary Ventilation Fan', impactType: 'additive', impactValue: 20, reason: 'Main ventilation fan operating' },
        { ruleCode: 'ELECTRICAL_SUB', ruleName: 'Electrical Substation', impactType: 'additive', impactValue: 15, reason: 'High voltage substation active' }
    ];

    if (hour === 14 || hour === 15) {
        level7Risk = 62;
        level7Explanation = 'HIGH risk: Air quality reading elevated, increased ventilation required.';
        level7Rules.push(
            { ruleCode: 'AIR_QUALITY', ruleName: 'Air Quality Alert', impactType: 'additive', impactValue: 20, reason: 'Dust particulates elevated at 85 µg/m³' }
        );
    }

    return [
        {
            level: 1,
            name: 'ROM Pad & Primary Crushing',
            riskScore: 32,
            riskBand: 'medium',
            riskExplanation: 'MEDIUM risk: Active haul truck dumping and primary crushing operations.',
            triggeredRules: [
                { ruleCode: 'HAUL_OPS', ruleName: 'Haul Truck Dumping', impactType: 'additive', impactValue: 15, reason: 'Active haul truck operations at ROM pad' }
            ],
            activities: [
                { name: 'Haul Truck Dumping', status: 'active', riskScore: 35 },
                { name: 'Primary Jaw Crusher Operation', status: 'active', riskScore: 35 },
                { name: 'Light Vehicle Workshop', status: 'active', riskScore: 15 },
                { name: 'Fuel Bay Operations', status: 'planned', riskScore: 40 }
            ]
        },
        {
            level: 2,
            name: 'Active Pit Face',
            riskScore: level2Risk,
            riskBand: level2Risk > 70 ? 'high' : level2Risk > 30 ? 'medium' : 'low',
            riskExplanation: level2Explanation,
            triggeredRules: level2Rules,
            activities: [
                { name: 'Production Drilling', status: 'active', riskScore: 65 },
                { name: 'Shot Firing - West Wall', status: hour >= 9 && hour < 12 ? 'active' : 'planned', riskScore: 90 },
                { name: 'Explosive Magazine Access', status: 'active', riskScore: 75 },
                { name: 'Pit Wall Inspection', status: 'completed', riskScore: 35 }
            ]
        },
        {
            level: 3,
            name: 'Haulage Ramp',
            riskScore: 38,
            riskBand: 'medium',
            riskExplanation: 'MEDIUM risk: Heavy vehicle operations on ramp with dust suppression.',
            triggeredRules: [
                { ruleCode: 'HEAVY_VEHICLE', ruleName: 'Heavy Vehicle Movement', impactType: 'additive', impactValue: 20, reason: 'CAT 793 haul trucks on ramp' }
            ],
            activities: [
                { name: 'CAT 793 Haul Operations', status: 'active', riskScore: 40 },
                { name: 'Front-End Loader', status: 'active', riskScore: 35 },
                { name: 'Road Maintenance Grader', status: 'active', riskScore: 20 },
                { name: 'Water Cart Dust Suppression', status: 'active', riskScore: 15 }
            ]
        },
        {
            level: 4,
            name: 'Grade Control',
            riskScore: 18,
            riskBand: 'low',
            riskExplanation: 'Low risk: Geological sampling and survey operations.',
            triggeredRules: [],
            activities: [
                { name: 'Geological Sampling', status: 'active', riskScore: 15 },
                { name: 'Survey Mark-Up', status: 'active', riskScore: 10 },
                { name: 'Assay Sample Transport', status: 'completed', riskScore: 15 }
            ]
        },
        {
            level: 5,
            name: 'Pit Floor',
            riskScore: 22,
            riskBand: 'low',
            riskExplanation: 'Low risk: Dewatering and drainage operations.',
            triggeredRules: [],
            activities: [
                { name: 'Dewatering Pump Operations', status: 'active', riskScore: 20 },
                { name: 'Sump Inspection', status: 'completed', riskScore: 15 },
                { name: 'Drainage Channel Clearing', status: 'active', riskScore: 20 },
                { name: 'Water Quality Monitoring', status: 'active', riskScore: 10 }
            ]
        },
        {
            level: 6,
            name: 'Underground Decline',
            riskScore: level6Risk,
            riskBand: level6Risk > 70 ? 'high' : level6Risk > 30 ? 'medium' : 'low',
            riskExplanation: level6Explanation,
            triggeredRules: level6Rules,
            activities: [
                { name: 'Decline Development', status: 'active', riskScore: 75 },
                { name: 'Ground Support Installation', status: 'active', riskScore: 70 },
                { name: 'Shotcrete Application', status: 'planned', riskScore: 45 },
                { name: 'Bogger Ore Extraction', status: 'active', riskScore: 65 },
                { name: 'Confined Space Entry', status: 'active', riskScore: 80 }
            ]
        },
        {
            level: 7,
            name: 'Deep Services',
            riskScore: level7Risk,
            riskBand: level7Risk > 70 ? 'high' : level7Risk > 30 ? 'medium' : 'low',
            riskExplanation: level7Explanation,
            triggeredRules: level7Rules,
            activities: [
                { name: 'Primary Ventilation Fan', status: 'active', riskScore: 40 },
                { name: 'Emergency Refuge Check', status: 'completed', riskScore: 15 },
                { name: 'Secondary Escapeway', status: 'active', riskScore: 20 },
                { name: 'Air Quality Monitoring', status: 'active', riskScore: 45 },
                { name: 'Electrical Substation', status: 'active', riskScore: 50 }
            ]
        }
    ];
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function handler(req, res) {
    const now = new Date();
    const response = {
        id: generateUUID(),
        timestamp: now.toISOString(),
        levels: getMockLevels(now)
    };
    res.status(200).json(response);
}
