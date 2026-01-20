/**
 * Generate mock levels with time-varying risk scores.
 */
function getMockLevels(timestamp) {
    const hour = timestamp.getHours();

    let level3Risk = 25;
    let level3Explanation = 'Normal operations.';
    const level3Rules = [];

    if (hour >= 9 && hour < 10) {
        level3Risk = 65;
        level3Explanation = 'MEDIUM risk: Blasting scheduled, explosive handling in progress.';
        level3Rules.push({
            ruleCode: 'BLAST_SCHEDULED',
            ruleName: 'Blasting Scheduled',
            impactType: 'additive',
            impactValue: 40,
            reason: 'Blast scheduled within 30 minutes'
        });
    } else if (hour >= 10 && hour < 12) {
        level3Risk = 100;
        level3Explanation = 'LOCKOUT: Post-blast, re-entry not cleared.';
        level3Rules.push({
            ruleCode: 'BLAST_NO_REENTRY',
            ruleName: 'Post-Blast No Re-entry',
            impactType: 'force',
            impactValue: 100,
            reason: 'Blast fired, awaiting re-entry clearance'
        });
    } else if (hour >= 21 || hour < 6) {
        level3Risk = 15;
        level3Explanation = 'Low risk. Night shift, minimal activity.';
    }

    let level4Risk = 40;
    let level4Explanation = 'MEDIUM risk: Confined space work with valid permit.';
    const level4Rules = [
        {
            ruleCode: 'CONFINED_SPACE',
            ruleName: 'Confined Space Work',
            impactType: 'additive',
            impactValue: 30,
            reason: 'Confined space entry work active with valid permit'
        }
    ];

    if (hour === 14) {
        level4Risk = 72;
        level4Explanation = 'HIGH risk: Gas reading elevated, ventilation low.';
        level4Rules.push({
            ruleCode: 'GAS_THRESHOLD',
            ruleName: 'Gas Level Above Threshold',
            impactType: 'additive',
            impactValue: 30,
            reason: 'Methane reading 1.5 ppm above threshold 1.0'
        });
    }

    return [
        {
            level: 1,
            name: 'Processing & Logistics',
            riskScore: 20,
            riskBand: 'low',
            riskExplanation: 'Normal operations with routine diesel equipment movement.',
            triggeredRules: [],
            activities: [
                { name: 'Control Room Operations', status: 'active', riskScore: 10 },
                { name: 'Diesel Equipment Movement', status: 'active', riskScore: 20 }
            ]
        },
        {
            level: 2,
            name: 'Haulage & Crushing',
            riskScore: hour === 16 ? 45 : 35,
            riskBand: 'medium',
            riskExplanation: hour === 16
                ? 'MEDIUM risk: Equipment overspeed violation detected.'
                : 'Active ore crushing operations with planned maintenance.',
            triggeredRules: hour === 16
                ? [{ ruleCode: 'EQUIPMENT_OVERSPEED', ruleName: 'Equipment Overspeed Violation', impactType: 'additive', impactValue: 15, reason: 'HAUL-03 at 28 km/h, limit 25 km/h' }]
                : [],
            activities: [
                { name: 'Ore Crushing', status: 'active', riskScore: 35 },
                { name: 'Conveyor Maintenance', status: 'planned', riskScore: 20 }
            ]
        },
        {
            level: 3,
            name: 'Active Stoping',
            riskScore: level3Risk,
            riskBand: level3Risk > 70 ? 'high' : level3Risk > 30 ? 'medium' : 'low',
            riskExplanation: level3Explanation,
            triggeredRules: level3Rules,
            activities: [
                { name: 'Blasting Operations', status: hour >= 9 && hour < 12 ? 'active' : 'planned', riskScore: level3Risk },
                { name: 'Explosive Magazine Handling', status: hour >= 9 && hour < 11 ? 'active' : 'completed', riskScore: 70 }
            ]
        },
        {
            level: 4,
            name: 'Development & Ground Support',
            riskScore: level4Risk,
            riskBand: level4Risk > 70 ? 'high' : level4Risk > 30 ? 'medium' : 'low',
            riskExplanation: level4Explanation,
            triggeredRules: level4Rules,
            activities: [
                { name: 'Ground Support Installation', status: 'active', riskScore: 40 },
                { name: 'Confined Space Work', status: 'active', riskScore: 55 }
            ]
        },
        {
            level: 5,
            name: 'Ventilation & Pumping',
            riskScore: 15,
            riskBand: 'low',
            riskExplanation: 'Low risk. Routine ventilation and pump operations.',
            triggeredRules: [],
            activities: [
                { name: 'Ventilation Fan Maintenance', status: hour < 8 ? 'active' : 'completed', riskScore: 10 },
                { name: 'Dewatering Pump Check', status: 'active', riskScore: 15 }
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
    const { from, to, at } = req.query;

    // If 'at' parameter provided, return single snapshot at that time
    if (at) {
        const atDate = new Date(at);
        const response = {
            id: generateUUID(),
            timestamp: atDate.toISOString(),
            levels: getMockLevels(atDate)
        };
        return res.status(200).json(response);
    }

    // Otherwise return array of hourly snapshots in range
    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const snapshots = [];
    const current = new Date(fromDate);

    while (current <= toDate && snapshots.length < 48) {
        snapshots.push({
            id: generateUUID(),
            timestamp: current.toISOString(),
            levels: getMockLevels(current)
        });
        current.setMinutes(current.getMinutes() + 30); // 30-minute intervals
    }

    res.status(200).json({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        count: snapshots.length,
        snapshots
    });
}
