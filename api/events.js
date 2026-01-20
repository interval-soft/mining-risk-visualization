function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getMockEvents(levelFilter) {
    const now = Date.now();
    const events = [
        {
            id: generateUUID(),
            timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
            levelNumber: 3,
            eventType: 'blast_scheduled',
            severity: 'high',
            metadata: { scheduledTime: new Date(now + 30 * 60 * 1000).toISOString(), area: 'Stope 3A' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
            levelNumber: 3,
            eventType: 'explosive_magazine_access',
            severity: 'high',
            metadata: { authorizedBy: 'J. Smith', magazineId: 'MAG-003' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
            levelNumber: 4,
            eventType: 'confined_space_entry',
            severity: 'medium',
            metadata: { permitId: 'CSP-2024-0142', crew: ['M. Johnson', 'R. Lee'] }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            levelNumber: 2,
            eventType: 'equipment_start',
            severity: 'low',
            metadata: { equipmentId: 'CRUSH-01', operator: 'T. Williams' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
            levelNumber: 5,
            eventType: 'maintenance_complete',
            severity: 'low',
            metadata: { workOrderId: 'WO-5521', equipment: 'Ventilation Fan B' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
            levelNumber: 4,
            eventType: 'gas_reading',
            severity: 'medium',
            metadata: { gasType: 'methane', reading: 0.8, unit: 'ppm', threshold: 1.0 }
        }
    ];

    if (levelFilter !== undefined) {
        return events.filter(e => e.levelNumber === levelFilter);
    }
    return events;
}

export default function handler(req, res) {
    const level = req.query.level ? parseInt(req.query.level, 10) : undefined;
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    let events = getMockEvents(level);

    // Filter by time range
    if (from) {
        events = events.filter(e => new Date(e.timestamp) >= from);
    }
    if (to) {
        events = events.filter(e => new Date(e.timestamp) <= to);
    }

    // Sort by timestamp descending (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.status(200).json({
        count: events.length,
        events
    });
}
