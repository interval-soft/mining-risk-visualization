import { Router, Request, Response } from 'express';
import type { AlertResponse } from './types.js';

export const alertsRouter = Router();

// Mock alerts store (in-memory for stubs)
const mockAlerts: AlertResponse[] = [
  {
    id: 'alert-001',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    levelNumber: 3,
    riskScore: 85,
    status: 'active',
    cause: 'Blasting operations scheduled with explosive handling in progress',
    explanation: 'Level 3 has reached HIGH risk (85) due to scheduled blasting at 10:30 and active explosive magazine handling. BLAST_SCHEDULED (+40) and EXPLOSIVE_HANDLING (+35) rules triggered.',
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgedComment: null,
    resolvedAt: null,
  },
  {
    id: 'alert-002',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    levelNumber: 4,
    riskScore: 55,
    status: 'acknowledged',
    cause: 'Confined space work active',
    explanation: 'Level 4 MEDIUM risk (55) due to confined space entry. Permit CSP-2024-0142 is valid. CONFINED_SPACE rule triggered (+30).',
    acknowledgedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    acknowledgedBy: 'Shift Supervisor',
    acknowledgedComment: 'Permit verified, crew equipped with gas monitors',
    resolvedAt: null,
  },
  {
    id: 'alert-003',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    levelNumber: 4,
    riskScore: 72,
    status: 'resolved',
    cause: 'Gas reading elevated',
    explanation: 'Level 4 HIGH risk (72) due to elevated methane reading of 0.9 ppm. GAS_THRESHOLD rule triggered (+30).',
    acknowledgedAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
    acknowledgedBy: 'Safety Officer',
    acknowledgedComment: 'Investigating source',
    resolvedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

// GET /api/alerts - Returns alerts matching criteria
alertsRouter.get('/', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const level = req.query.level ? parseInt(req.query.level as string, 10) : undefined;

  let alerts = [...mockAlerts];

  if (status) {
    alerts = alerts.filter((a) => a.status === status);
  }
  if (level !== undefined) {
    alerts = alerts.filter((a) => a.levelNumber === level);
  }

  // Sort by timestamp descending
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    count: alerts.length,
    alerts,
  });
});

// POST /api/alerts/:id/acknowledge - Acknowledge an alert
alertsRouter.post('/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body as { comment?: string };

  const alert = mockAlerts.find((a) => a.id === id);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  if (alert.status !== 'active') {
    res.status(400).json({ error: `Cannot acknowledge alert with status: ${alert.status}` });
    return;
  }

  // Update alert
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = 'API User'; // Would come from auth in production
  alert.acknowledgedComment = comment || null;

  res.json(alert);
});
