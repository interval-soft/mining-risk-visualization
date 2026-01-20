// Mock alerts store (note: in serverless, this resets on each cold start)
const now = Date.now();
const mockAlerts = [
    {
        id: 'alert-001',
        timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
        levelNumber: 3,
        riskScore: 85,
        status: 'active',
        cause: 'Blasting operations scheduled with explosive handling in progress',
        explanation: 'Level 3 has reached HIGH risk (85) due to scheduled blasting at 10:30 and active explosive magazine handling. BLAST_SCHEDULED (+40) and EXPLOSIVE_HANDLING (+35) rules triggered.',
        acknowledgedAt: null,
        acknowledgedBy: null,
        acknowledgedComment: null,
        resolvedAt: null
    },
    {
        id: 'alert-002',
        timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        levelNumber: 4,
        riskScore: 55,
        status: 'acknowledged',
        cause: 'Confined space work active',
        explanation: 'Level 4 MEDIUM risk (55) due to confined space entry. Permit CSP-2024-0142 is valid. CONFINED_SPACE rule triggered (+30).',
        acknowledgedAt: new Date(now - 90 * 60 * 1000).toISOString(),
        acknowledgedBy: 'Shift Supervisor',
        acknowledgedComment: 'Permit verified, crew equipped with gas monitors',
        resolvedAt: null
    },
    {
        id: 'alert-003',
        timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        levelNumber: 4,
        riskScore: 72,
        status: 'resolved',
        cause: 'Gas reading elevated',
        explanation: 'Level 4 HIGH risk (72) due to elevated methane reading of 0.9 ppm. GAS_THRESHOLD rule triggered (+30).',
        acknowledgedAt: new Date(now - 5.5 * 60 * 60 * 1000).toISOString(),
        acknowledgedBy: 'Safety Officer',
        acknowledgedComment: 'Investigating source',
        resolvedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString()
    }
];

export default function handler(req, res) {
    const status = req.query.status;
    const level = req.query.level ? parseInt(req.query.level, 10) : undefined;

    let alerts = [...mockAlerts];

    if (status) {
        alerts = alerts.filter(a => a.status === status);
    }
    if (level !== undefined) {
        alerts = alerts.filter(a => a.levelNumber === level);
    }

    // Sort by timestamp descending
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
        count: alerts.length,
        alerts
    });
}
