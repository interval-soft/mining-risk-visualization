import { Router, Request, Response } from 'express';
import type { SnapshotResponse, LevelResponse } from './types.js';

export const levelsRouter = Router();

/**
 * Generate mock levels with time-varying risk scores.
 * Simulates a 24-hour cycle with:
 * - Level 3: High risk during blasting (hours 9-12)
 * - Level 4: Gas spike (hour 14)
 * - Others: Normal operations
 */
function getMockLevels(timestamp: Date): LevelResponse[] {
  const hour = timestamp.getHours();

  // Level 3 risk varies based on blasting schedule
  let level3Risk = 25;
  let level3Explanation = 'Normal operations.';
  const level3Rules: LevelResponse['triggeredRules'] = [];

  if (hour >= 9 && hour < 10) {
    level3Risk = 65;
    level3Explanation = 'MEDIUM risk: Blasting scheduled, explosive handling in progress.';
    level3Rules.push(
      { ruleCode: 'BLAST_SCHEDULED', ruleName: 'Blasting Scheduled', impactType: 'additive', impactValue: 40, reason: 'Blast scheduled within 30 minutes' },
    );
  } else if (hour >= 10 && hour < 12) {
    level3Risk = 100;
    level3Explanation = 'LOCKOUT: Post-blast, re-entry not cleared.';
    level3Rules.push(
      { ruleCode: 'BLAST_NO_REENTRY', ruleName: 'Post-Blast No Re-entry', impactType: 'force', impactValue: 100, reason: 'Blast fired, awaiting re-entry clearance' },
    );
  } else if (hour >= 21 || hour < 6) {
    level3Risk = 15;
    level3Explanation = 'Low risk. Night shift, minimal activity.';
  }

  // Level 4 risk varies based on gas readings
  let level4Risk = 40;
  let level4Explanation = 'MEDIUM risk: Confined space work with valid permit.';
  const level4Rules: LevelResponse['triggeredRules'] = [
    { ruleCode: 'CONFINED_SPACE', ruleName: 'Confined Space Work', impactType: 'additive', impactValue: 30, reason: 'Confined space entry work active with valid permit' },
  ];

  if (hour === 14) {
    level4Risk = 72;
    level4Explanation = 'HIGH risk: Gas reading elevated, ventilation low.';
    level4Rules.push(
      { ruleCode: 'GAS_THRESHOLD', ruleName: 'Gas Level Above Threshold', impactType: 'additive', impactValue: 30, reason: 'Methane reading 1.5 ppm above threshold 1.0' },
    );
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
        { name: 'Diesel Equipment Movement', status: 'active', riskScore: 20 },
      ],
    },
    {
      level: 2,
      name: 'Haulage & Crushing',
      riskScore: hour === 16 ? 45 : 35,
      riskBand: hour === 16 ? 'medium' : 'medium',
      riskExplanation: hour === 16
        ? 'MEDIUM risk: Equipment overspeed violation detected.'
        : 'Active ore crushing operations with planned maintenance.',
      triggeredRules: hour === 16
        ? [{ ruleCode: 'EQUIPMENT_OVERSPEED', ruleName: 'Equipment Overspeed Violation', impactType: 'additive', impactValue: 15, reason: 'HAUL-03 at 28 km/h, limit 25 km/h' }]
        : [],
      activities: [
        { name: 'Ore Crushing', status: 'active', riskScore: 35 },
        { name: 'Conveyor Maintenance', status: 'planned', riskScore: 20 },
      ],
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
        { name: 'Explosive Magazine Handling', status: hour >= 9 && hour < 11 ? 'active' : 'completed', riskScore: 70 },
      ],
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
        { name: 'Confined Space Work', status: 'active', riskScore: 55 },
      ],
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
        { name: 'Dewatering Pump Check', status: 'active', riskScore: 15 },
      ],
    },
  ];
}

// GET /api/levels/current - Returns current snapshot with levels, risk scores, explanations
levelsRouter.get('/current', (_req: Request, res: Response) => {
  const now = new Date();
  const response: SnapshotResponse = {
    id: crypto.randomUUID(),
    timestamp: now.toISOString(),
    levels: getMockLevels(now),
  };
  res.json(response);
});

// GET /api/levels/history - Returns array of snapshots (paginated)
levelsRouter.get('/history', (req: Request, res: Response) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  const at = req.query.at ? new Date(req.query.at as string) : null;

  // If 'at' parameter provided, return single snapshot at that time
  if (at) {
    const response: SnapshotResponse = {
      id: crypto.randomUUID(),
      timestamp: at.toISOString(),
      levels: getMockLevels(at),
    };
    res.json(response);
    return;
  }

  // Otherwise return array of hourly snapshots in range
  const snapshots: SnapshotResponse[] = [];
  const current = new Date(from);

  while (current <= to && snapshots.length < 48) {
    snapshots.push({
      id: crypto.randomUUID(),
      timestamp: current.toISOString(),
      levels: getMockLevels(current),
    });
    current.setMinutes(current.getMinutes() + 30); // 30-minute intervals
  }

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    count: snapshots.length,
    snapshots,
  });
});
