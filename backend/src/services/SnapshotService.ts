import { db } from '../db.js';
import { RiskEngine, RuleAuditor, type RiskContext, type Rule, type Activity } from '../engine/index.js';
import { DataIngestionService } from './DataIngestionService.js';

// Level definitions (static for now, could be DB-driven)
const LEVEL_DEFINITIONS = [
  { level: 1, name: 'Processing & Logistics' },
  { level: 2, name: 'Haulage & Crushing' },
  { level: 3, name: 'Active Stoping' },
  { level: 4, name: 'Development & Ground Support' },
  { level: 5, name: 'Ventilation & Pumping' },
];

export interface SnapshotWithLevels {
  id: string;
  timestamp: Date;
  levels: LevelSnapshot[];
}

export interface LevelSnapshot {
  id: string;
  levelNumber: number;
  levelName: string;
  riskScore: number;
  riskBand: 'low' | 'medium' | 'high';
  riskExplanation: string;
  triggeredRules: {
    ruleCode: string;
    ruleName: string;
    impactType: string;
    impactValue: number;
    reason: string;
  }[];
  activities: ActivitySnapshot[];
}

export interface ActivitySnapshot {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  riskScore: number | null;
}

export class SnapshotService {
  private riskEngine: RiskEngine;
  private ruleAuditor: RuleAuditor;
  private dataIngestion: DataIngestionService;

  constructor() {
    this.riskEngine = new RiskEngine();
    this.ruleAuditor = new RuleAuditor();
    this.dataIngestion = new DataIngestionService();
  }

  /**
   * Generate a new snapshot at the given timestamp.
   * This captures the current state of all levels with risk calculations.
   */
  async generateSnapshot(timestamp: Date): Promise<SnapshotWithLevels> {
    // Create snapshot record
    const [snapshotRow] = await db('snapshots')
      .insert({
        id: db.fn.uuid(),
        timestamp,
      })
      .returning('*');

    const snapshotId = snapshotRow.id;

    // Load all enabled rules
    const rules = await this.loadRules();

    // Calculate risk for each level
    const levelSnapshots: LevelSnapshot[] = [];

    for (const levelDef of LEVEL_DEFINITIONS) {
      const levelSnapshot = await this.calculateLevelSnapshot(
        snapshotId,
        levelDef.level,
        levelDef.name,
        timestamp,
        rules
      );
      levelSnapshots.push(levelSnapshot);
    }

    return {
      id: snapshotId,
      timestamp,
      levels: levelSnapshots,
    };
  }

  /**
   * Get the most recent snapshot.
   */
  async getCurrentSnapshot(): Promise<SnapshotWithLevels | null> {
    const snapshotRow = await db('snapshots')
      .orderBy('timestamp', 'desc')
      .first();

    if (!snapshotRow) {
      return null;
    }

    return this.loadSnapshotWithLevels(snapshotRow.id);
  }

  /**
   * Get snapshot at a specific time (or closest before it).
   */
  async getSnapshotAtTime(timestamp: Date): Promise<SnapshotWithLevels | null> {
    const snapshotRow = await db('snapshots')
      .where('timestamp', '<=', timestamp)
      .orderBy('timestamp', 'desc')
      .first();

    if (!snapshotRow) {
      return null;
    }

    return this.loadSnapshotWithLevels(snapshotRow.id);
  }

  /**
   * Get all snapshots within a time range.
   */
  async getSnapshotsInRange(from: Date, to: Date): Promise<SnapshotWithLevels[]> {
    const snapshotRows = await db('snapshots')
      .whereBetween('timestamp', [from, to])
      .orderBy('timestamp', 'asc');

    const snapshots: SnapshotWithLevels[] = [];
    for (const row of snapshotRows) {
      const snapshot = await this.loadSnapshotWithLevels(row.id);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Load a snapshot by ID with all its level data.
   */
  private async loadSnapshotWithLevels(snapshotId: string): Promise<SnapshotWithLevels | null> {
    const snapshotRow = await db('snapshots').where('id', snapshotId).first();
    if (!snapshotRow) {
      return null;
    }

    const levelRows = await db('snapshot_levels')
      .where('snapshot_id', snapshotId)
      .orderBy('level_number', 'asc');

    const levels: LevelSnapshot[] = [];

    for (const levelRow of levelRows) {
      const activityRows = await db('snapshot_activities')
        .where('snapshot_level_id', levelRow.id);

      levels.push({
        id: levelRow.id,
        levelNumber: levelRow.level_number,
        levelName: levelRow.level_name,
        riskScore: levelRow.risk_score || 0,
        riskBand: (levelRow.risk_band as 'low' | 'medium' | 'high') || 'low',
        riskExplanation: levelRow.risk_explanation || '',
        triggeredRules: levelRow.rule_triggers ? JSON.parse(levelRow.rule_triggers) : [],
        activities: activityRows.map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status as 'planned' | 'active' | 'completed',
          riskScore: a.risk_score,
        })),
      });
    }

    return {
      id: snapshotRow.id,
      timestamp: new Date(snapshotRow.timestamp),
      levels,
    };
  }

  /**
   * Calculate risk for a single level and store it.
   */
  private async calculateLevelSnapshot(
    snapshotId: string,
    levelNumber: number,
    levelName: string,
    timestamp: Date,
    rules: Rule[]
  ): Promise<LevelSnapshot> {
    // Get context data for risk calculation
    const lookbackMinutes = 120; // 2 hour lookback for events
    const from = new Date(timestamp.getTime() - lookbackMinutes * 60 * 1000);

    const eventRows = await this.dataIngestion.getEventsForLevel(levelNumber, from, timestamp);
    const measurementRows = await this.dataIngestion.getMeasurementsForLevel(levelNumber, from, timestamp);

    // Get activities (for now, using a simplified approach - could be from a separate activities table)
    const activities = await this.getActivitiesForLevel(levelNumber);

    // Build risk context
    const context: RiskContext = {
      timestamp,
      levelNumber,
      events: eventRows.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        levelNumber: e.level_number,
        eventType: e.event_type,
        severity: e.severity,
        metadata: e.metadata || {},
      })),
      measurements: measurementRows.map((m) => ({
        id: m.id,
        timestamp: m.timestamp,
        levelNumber: m.level_number,
        sensorType: m.sensor_type,
        value: m.value,
        unit: m.unit,
      })),
      activities,
    };

    // Calculate risk
    const calculation = this.riskEngine.calculateRisk(context, rules);

    // Create audit entry
    const auditEntry = this.ruleAuditor.createAuditEntry(context, rules, calculation, snapshotId);

    // Store level snapshot
    const [levelRow] = await db('snapshot_levels')
      .insert({
        id: db.fn.uuid(),
        snapshot_id: snapshotId,
        level_number: levelNumber,
        level_name: levelName,
        risk_score: calculation.score,
        risk_band: calculation.band,
        risk_explanation: calculation.explanation,
        rule_triggers: JSON.stringify(
          calculation.triggeredRules.map((r) => ({
            ruleCode: r.ruleCode,
            ruleName: r.ruleName,
            impactType: r.impactType,
            impactValue: r.impactValue,
            reason: r.reason,
          }))
        ),
      })
      .returning('*');

    // Store activities
    const activitySnapshots: ActivitySnapshot[] = [];
    for (const activity of activities) {
      const [activityRow] = await db('snapshot_activities')
        .insert({
          id: db.fn.uuid(),
          snapshot_level_id: levelRow.id,
          name: activity.name,
          status: activity.status,
          risk_score: activity.riskScore,
          metadata: JSON.stringify(activity.metadata || {}),
        })
        .returning('*');

      activitySnapshots.push({
        id: activityRow.id,
        name: activityRow.name,
        status: activityRow.status,
        riskScore: activityRow.risk_score,
      });
    }

    // Store audit record
    await db('risk_audit').insert({
      id: db.fn.uuid(),
      timestamp: auditEntry.timestamp,
      snapshot_id: snapshotId,
      level_number: levelNumber,
      rules_applied: JSON.stringify(auditEntry.rulesApplied),
      inputs_used: JSON.stringify(auditEntry.inputsUsed),
      final_score: auditEntry.finalScore,
      explanation: auditEntry.explanation,
      rule_version_hash: auditEntry.ruleVersionHash,
    });

    return {
      id: levelRow.id,
      levelNumber,
      levelName,
      riskScore: calculation.score,
      riskBand: calculation.band,
      riskExplanation: calculation.explanation,
      triggeredRules: calculation.triggeredRules.map((r) => ({
        ruleCode: r.ruleCode,
        ruleName: r.ruleName,
        impactType: r.impactType,
        impactValue: r.impactValue,
        reason: r.reason,
      })),
      activities: activitySnapshots,
    };
  }

  /**
   * Load all enabled risk rules from the database.
   */
  private async loadRules(): Promise<Rule[]> {
    const rows = await db('risk_rules')
      .where('enabled', true)
      .orderBy('evaluation_order', 'asc');

    return rows.map((row) => ({
      id: row.id,
      ruleCode: row.rule_code,
      category: row.category,
      name: row.name,
      description: row.description,
      impactType: row.impact_type,
      impactValue: row.impact_value,
      conditionConfig: typeof row.condition_config === 'string'
        ? JSON.parse(row.condition_config)
        : row.condition_config,
      evaluationOrder: row.evaluation_order,
      enabled: row.enabled,
      version: row.version,
    }));
  }

  /**
   * Get activities for a level.
   * In a real system, this would come from a live activities/work orders system.
   * For now, returns static demo data.
   */
  private async getActivitiesForLevel(levelNumber: number): Promise<Activity[]> {
    // Demo activities - in production, this would query a real activities source
    const activitiesByLevel: Record<number, Activity[]> = {
      1: [
        { id: '1-1', name: 'Control Room Operations', status: 'active', riskScore: 10, metadata: null },
        { id: '1-2', name: 'Diesel Equipment Movement', status: 'active', riskScore: 25, metadata: null },
      ],
      2: [
        { id: '2-1', name: 'Ore Crushing', status: 'active', riskScore: 35, metadata: null },
        { id: '2-2', name: 'Conveyor Maintenance', status: 'planned', riskScore: 20, metadata: null },
      ],
      3: [
        { id: '3-1', name: 'Blasting Operations', status: 'planned', riskScore: 85, metadata: null },
        { id: '3-2', name: 'Explosive Magazine Handling', status: 'active', riskScore: 70, metadata: null },
      ],
      4: [
        { id: '4-1', name: 'Ground Support Installation', status: 'active', riskScore: 40, metadata: null },
        { id: '4-2', name: 'Confined Space Work', status: 'active', riskScore: 55, metadata: null },
      ],
      5: [
        { id: '5-1', name: 'Ventilation Fan Maintenance', status: 'completed', riskScore: 10, metadata: null },
        { id: '5-2', name: 'Dewatering Pump Check', status: 'active', riskScore: 15, metadata: null },
      ],
    };

    return activitiesByLevel[levelNumber] || [];
  }
}
