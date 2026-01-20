import { query } from './_lib/db.js';

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
            level_number: 3,
            event_type: 'blast_scheduled',
            severity: 'high',
            metadata: { scheduledTime: new Date(now + 30 * 60 * 1000).toISOString(), area: 'Stope 3A' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
            level_number: 3,
            event_type: 'explosive_magazine_access',
            severity: 'high',
            metadata: { authorizedBy: 'J. Smith', magazineId: 'MAG-003' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
            level_number: 4,
            event_type: 'confined_space_entry',
            severity: 'medium',
            metadata: { permitId: 'CSP-2024-0142', crew: ['M. Johnson', 'R. Lee'] }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            level_number: 2,
            event_type: 'equipment_start',
            severity: 'low',
            metadata: { equipmentId: 'CRUSH-01', operator: 'T. Williams' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
            level_number: 5,
            event_type: 'maintenance_complete',
            severity: 'low',
            metadata: { workOrderId: 'WO-5521', equipment: 'Ventilation Fan B' }
        },
        {
            id: generateUUID(),
            timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
            level_number: 4,
            event_type: 'gas_reading',
            severity: 'medium',
            metadata: { gasType: 'methane', reading: 0.8, unit: 'ppm', threshold: 1.0 }
        }
    ];

    if (levelFilter !== undefined) {
        return events.filter(e => e.level_number === levelFilter);
    }
    return events;
}

function normalizeEvent(event) {
    return {
        id: event.id,
        timestamp: event.timestamp,
        levelNumber: event.level_number,
        eventType: event.event_type,
        severity: event.severity,
        metadata: event.metadata
    };
}

export default async function handler(req, res) {
    const level = req.query.level ? parseInt(req.query.level, 10) : undefined;
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;

    try {
        // Try to fetch from database
        let sql = 'SELECT * FROM events WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (level !== undefined) {
            sql += ` AND level_number = $${paramIndex++}`;
            params.push(level);
        }
        if (from) {
            sql += ` AND timestamp >= $${paramIndex++}`;
            params.push(from.toISOString());
        }
        if (to) {
            sql += ` AND timestamp <= $${paramIndex++}`;
            params.push(to.toISOString());
        }

        sql += ' ORDER BY timestamp DESC';

        const events = await query(sql, params);

        // If database has events, return them
        if (events.length > 0) {
            return res.status(200).json({
                count: events.length,
                events: events.map(normalizeEvent),
                source: 'database'
            });
        }

        // Fallback to mock data
        let mockEvents = getMockEvents(level);

        if (from) {
            mockEvents = mockEvents.filter(e => new Date(e.timestamp) >= from);
        }
        if (to) {
            mockEvents = mockEvents.filter(e => new Date(e.timestamp) <= to);
        }

        mockEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.status(200).json({
            count: mockEvents.length,
            events: mockEvents.map(normalizeEvent),
            source: 'mock'
        });
    } catch (error) {
        console.error('Database error:', error);

        // Fallback to mock data
        let mockEvents = getMockEvents(level);

        if (from) {
            mockEvents = mockEvents.filter(e => new Date(e.timestamp) >= from);
        }
        if (to) {
            mockEvents = mockEvents.filter(e => new Date(e.timestamp) <= to);
        }

        mockEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.status(200).json({
            count: mockEvents.length,
            events: mockEvents.map(normalizeEvent),
            source: 'mock'
        });
    }
}
