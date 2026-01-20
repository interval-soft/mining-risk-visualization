import { Router, Request, Response } from 'express';
import type { EventResponse } from './types.js';

export const eventsRouter = Router();

// Mock events for development
function getMockEvents(levelFilter?: number): EventResponse[] {
  const events: EventResponse[] = [
    {
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      levelNumber: 3,
      eventType: 'blast_scheduled',
      severity: 'high',
      metadata: { scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), area: 'Stope 3A' },
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      levelNumber: 3,
      eventType: 'explosive_magazine_access',
      severity: 'high',
      metadata: { authorizedBy: 'J. Smith', magazineId: 'MAG-003' },
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      levelNumber: 4,
      eventType: 'confined_space_entry',
      severity: 'medium',
      metadata: { permitId: 'CSP-2024-0142', crew: ['M. Johnson', 'R. Lee'] },
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      levelNumber: 2,
      eventType: 'equipment_start',
      severity: 'low',
      metadata: { equipmentId: 'CRUSH-01', operator: 'T. Williams' },
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      levelNumber: 5,
      eventType: 'maintenance_complete',
      severity: 'low',
      metadata: { workOrderId: 'WO-5521', equipment: 'Ventilation Fan B' },
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      levelNumber: 4,
      eventType: 'gas_reading',
      severity: 'medium',
      metadata: { gasType: 'methane', reading: 0.8, unit: 'ppm', threshold: 1.0 },
    },
  ];

  if (levelFilter !== undefined) {
    return events.filter((e) => e.levelNumber === levelFilter);
  }
  return events;
}

// GET /api/events - Returns events matching criteria
eventsRouter.get('/', (req: Request, res: Response) => {
  const level = req.query.level ? parseInt(req.query.level as string, 10) : undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  let events = getMockEvents(level);

  // Filter by time range
  if (from) {
    events = events.filter((e) => new Date(e.timestamp) >= from);
  }
  if (to) {
    events = events.filter((e) => new Date(e.timestamp) <= to);
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    count: events.length,
    events,
  });
});
