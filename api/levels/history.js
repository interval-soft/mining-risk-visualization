/**
 * Newman Iron Operations - Multi-Structure Mine Site
 * Generate historical snapshots with time-varying risk scores.
 * Supports multiple structures with independent positioning.
 */

/**
 * Get mock levels for the Main Open Pit structure
 */
function getPitMainLevels(timestamp) {
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
        }
    ];
}

/**
 * Get mock levels for the Northern Decline (underground) structure
 */
function getDeclineNorthLevels(timestamp) {
    const hour = timestamp.getHours();

    // Underground risk varies by shift
    let level1Risk = 82;
    let level1Explanation = 'HIGH risk: Active decline development with confined space entry.';
    const level1Rules = [
        { ruleCode: 'DECLINE_DEV', ruleName: 'Active Decline Development', impactType: 'additive', impactValue: 35, reason: 'Underground decline development in progress' },
        { ruleCode: 'GROUND_SUPPORT', ruleName: 'Ground Support Installation', impactType: 'additive', impactValue: 25, reason: 'Active rock bolting and mesh installation' },
        { ruleCode: 'CONFINED_SPACE', ruleName: 'Confined Space Entry', impactType: 'additive', impactValue: 30, reason: 'Confined space work with valid permit' }
    ];

    if (hour >= 22 || hour < 5) {
        level1Risk = 55;
        level1Explanation = 'MEDIUM risk: Night maintenance, reduced development activity.';
        level1Rules.length = 1;
    }

    // Level 4: Deep Services - ventilation and air quality
    let level4Risk = 45;
    let level4Explanation = 'MEDIUM risk: Primary ventilation with air quality monitoring.';
    const level4Rules = [
        { ruleCode: 'VENTILATION_OPS', ruleName: 'Primary Ventilation Fan', impactType: 'additive', impactValue: 20, reason: 'Main ventilation fan operating' },
        { ruleCode: 'ELECTRICAL_SUB', ruleName: 'Electrical Substation', impactType: 'additive', impactValue: 15, reason: 'High voltage substation active' }
    ];

    if (hour === 14 || hour === 15) {
        level4Risk = 62;
        level4Explanation = 'HIGH risk: Air quality reading elevated, increased ventilation required.';
        level4Rules.push(
            { ruleCode: 'AIR_QUALITY', ruleName: 'Air Quality Alert', impactType: 'additive', impactValue: 20, reason: 'Dust particulates elevated at 85 µg/m³' }
        );
    }

    return [
        {
            level: 1,
            name: 'Decline Portal',
            riskScore: level1Risk,
            riskBand: level1Risk > 70 ? 'high' : level1Risk > 30 ? 'medium' : 'low',
            riskExplanation: level1Explanation,
            triggeredRules: level1Rules,
            activities: [
                { name: 'Decline Development', status: 'active', riskScore: 75 },
                { name: 'Ground Support Installation', status: 'active', riskScore: 70 },
                { name: 'Shotcrete Application', status: 'planned', riskScore: 45 },
                { name: 'Bogger Ore Extraction', status: 'active', riskScore: 65 }
            ]
        },
        {
            level: 2,
            name: 'Level 1 Development',
            riskScore: 68,
            riskBand: 'medium',
            riskExplanation: 'MEDIUM risk: Active stope development with ventilation.',
            triggeredRules: [
                { ruleCode: 'STOPE_DEV', ruleName: 'Stope Development', impactType: 'additive', impactValue: 30, reason: 'Active stoping operations' }
            ],
            activities: [
                { name: 'Stope Development', status: 'active', riskScore: 70 },
                { name: 'Ore Pass Loading', status: 'active', riskScore: 55 },
                { name: 'Ventilation Duct Installation', status: 'completed', riskScore: 35 }
            ]
        },
        {
            level: 3,
            name: 'Level 2 Extraction',
            riskScore: 58,
            riskBand: 'medium',
            riskExplanation: 'MEDIUM risk: Active ore extraction with bogger operations.',
            triggeredRules: [
                { ruleCode: 'BOGGER_OPS', ruleName: 'Bogger Operations', impactType: 'additive', impactValue: 25, reason: 'Active LHD ore extraction' }
            ],
            activities: [
                { name: 'LHD Ore Mucking', status: 'active', riskScore: 60 },
                { name: 'Scaling Operations', status: 'planned', riskScore: 65 },
                { name: 'Ground Monitoring', status: 'active', riskScore: 20 }
            ]
        },
        {
            level: 4,
            name: 'Deep Services',
            riskScore: level4Risk,
            riskBand: level4Risk > 70 ? 'high' : level4Risk > 30 ? 'medium' : 'low',
            riskExplanation: level4Explanation,
            triggeredRules: level4Rules,
            activities: [
                { name: 'Primary Ventilation Fan', status: 'active', riskScore: 40 },
                { name: 'Emergency Refuge Check', status: 'completed', riskScore: 15 },
                { name: 'Secondary Escapeway', status: 'active', riskScore: 20 },
                { name: 'Air Quality Monitoring', status: 'active', riskScore: 45 }
            ]
        }
    ];
}

/**
 * Get mock levels for the Processing Plant structure
 */
function getProcessingLevels(timestamp) {
    const hour = timestamp.getHours();

    // Crusher maintenance during afternoon shift
    let level1Risk = 32;
    let level1Explanation = 'MEDIUM risk: Heavy equipment operation with rotating machinery.';
    const level1Rules = [
        { ruleCode: 'ROTATING_EQUIP', ruleName: 'Rotating Equipment', impactType: 'additive', impactValue: 15, reason: 'Primary crusher and conveyors operating' }
    ];

    if (hour >= 13 && hour < 15) {
        level1Risk = 45;
        level1Explanation = 'MEDIUM risk: Crusher bearing temperature elevated, maintenance required.';
        level1Rules.push(
            { ruleCode: 'MAINTENANCE_REQ', ruleName: 'Maintenance Required', impactType: 'additive', impactValue: 15, reason: 'Primary crusher bearing temperature at 85°C' }
        );
    }

    return [
        {
            level: 1,
            name: 'Primary Crushing',
            riskScore: level1Risk,
            riskBand: level1Risk > 70 ? 'high' : level1Risk > 30 ? 'medium' : 'low',
            riskExplanation: level1Explanation,
            triggeredRules: level1Rules,
            activities: [
                { name: 'Primary Jaw Crusher', status: 'active', riskScore: 35 },
                { name: 'Apron Feeder', status: 'active', riskScore: 25 },
                { name: 'Grizzly Screen', status: 'active', riskScore: 30 }
            ]
        },
        {
            level: 2,
            name: 'Screening & Conveying',
            riskScore: 28,
            riskBand: 'low',
            riskExplanation: 'Low risk: Automated screening operations.',
            triggeredRules: [],
            activities: [
                { name: 'Vibrating Screens', status: 'active', riskScore: 25 },
                { name: 'Conveyor System', status: 'active', riskScore: 20 },
                { name: 'Dust Suppression', status: 'active', riskScore: 15 }
            ]
        },
        {
            level: 3,
            name: 'Stockpile Area',
            riskScore: 22,
            riskBand: 'low',
            riskExplanation: 'Low risk: Stockpile management with stacker/reclaimer.',
            triggeredRules: [],
            activities: [
                { name: 'Stacker Operations', status: 'active', riskScore: 25 },
                { name: 'Reclaimer Operations', status: 'planned', riskScore: 25 },
                { name: 'Train Loadout', status: 'active', riskScore: 30 }
            ]
        }
    ];
}

/**
 * Get all structures with their levels at a given timestamp
 */
function getMockStructures(timestamp) {
    const pitMainLevels = getPitMainLevels(timestamp);
    const declineLevels = getDeclineNorthLevels(timestamp);
    const processingLevels = getProcessingLevels(timestamp);

    // Calculate max risk per structure
    const pitMainRisk = Math.max(...pitMainLevels.map(l => l.riskScore));
    const declineRisk = Math.max(...declineLevels.map(l => l.riskScore));
    const processingRisk = Math.max(...processingLevels.map(l => l.riskScore));

    return [
        {
            code: 'PIT_MAIN',
            name: 'Main Open Pit',
            type: 'open_pit',
            position: { x: 0, z: 0 },
            rotation: 0,
            riskScore: pitMainRisk,
            riskBand: pitMainRisk > 70 ? 'high' : pitMainRisk > 30 ? 'medium' : 'low',
            levels: pitMainLevels
        },
        {
            code: 'DECLINE_NORTH',
            name: 'Northern Decline',
            type: 'underground',
            position: { x: 600, z: -200 },
            rotation: 0,
            riskScore: declineRisk,
            riskBand: declineRisk > 70 ? 'high' : declineRisk > 30 ? 'medium' : 'low',
            levels: declineLevels
        },
        {
            code: 'PROCESSING',
            name: 'Processing Plant',
            type: 'surface_plant',
            position: { x: -500, z: 300 },
            rotation: 0,
            riskScore: processingRisk,
            riskBand: processingRisk > 70 ? 'high' : processingRisk > 30 ? 'medium' : 'low',
            levels: processingLevels
        }
    ];
}

/**
 * Flatten structures into legacy levels array for backward compatibility
 * Adds structureCode to each level for reference
 */
function flattenToLegacyLevels(structures) {
    const levels = [];
    let globalLevelNumber = 1;

    for (const structure of structures) {
        for (const level of structure.levels) {
            levels.push({
                ...level,
                level: globalLevelNumber++,
                structureCode: structure.code,
                structureName: structure.name
            });
        }
    }

    return levels;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function handler(req, res) {
    const { from, to, at, structure: structureFilter } = req.query;

    // If 'at' parameter provided, return single snapshot at that time
    if (at) {
        const atDate = new Date(at);
        let structures = getMockStructures(atDate);

        // Filter by structure if specified
        if (structureFilter) {
            structures = structures.filter(s => s.code === structureFilter);
        }

        const levels = flattenToLegacyLevels(structures);

        const response = {
            id: generateUUID(),
            timestamp: atDate.toISOString(),
            structures: structures,
            levels: levels
        };
        return res.status(200).json(response);
    }

    // Otherwise return array of hourly snapshots in range
    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const snapshots = [];
    const current = new Date(fromDate);

    while (current <= toDate && snapshots.length < 48) {
        let structures = getMockStructures(current);

        // Filter by structure if specified
        if (structureFilter) {
            structures = structures.filter(s => s.code === structureFilter);
        }

        const levels = flattenToLegacyLevels(structures);

        snapshots.push({
            id: generateUUID(),
            timestamp: current.toISOString(),
            structures: structures,
            levels: levels
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
