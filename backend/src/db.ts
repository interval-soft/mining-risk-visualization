import Knex from 'knex';
import { config } from './config.js';

export const db = Knex({
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
  },
  pool: {
    min: 2,
    max: 10,
  },
});

// Types for database rows
export interface SnapshotRow {
  id: string;
  timestamp: Date;
  created_at: Date;
}

export interface SnapshotLevelRow {
  id: string;
  snapshot_id: string;
  level_number: number;
  level_name: string;
  risk_score: number | null;
  risk_band: 'low' | 'medium' | 'high' | null;
  risk_explanation: string | null;
  rule_triggers: Record<string, unknown> | null;
}

export interface SnapshotActivityRow {
  id: string;
  snapshot_level_id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  risk_score: number | null;
  metadata: Record<string, unknown> | null;
}

export interface EventRow {
  id: string;
  timestamp: Date;
  level_number: number;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface MeasurementRow {
  id: string;
  timestamp: Date;
  level_number: number;
  sensor_type: string;
  value: number;
  unit: string;
}

export interface AlertRow {
  id: string;
  timestamp: Date;
  level_number: number;
  risk_score: number;
  status: 'active' | 'acknowledged' | 'resolved';
  cause: string;
  explanation: string;
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
  acknowledged_comment: string | null;
  resolved_at: Date | null;
  created_at: Date;
}

export interface RiskRuleRow {
  id: string;
  rule_code: string;
  category: string;
  name: string;
  description: string;
  impact_type: 'additive' | 'force';
  impact_value: number;
  condition_config: Record<string, unknown>;
  evaluation_order: number;
  enabled: boolean;
  version: number;
}

export interface RiskAuditRow {
  id: string;
  timestamp: Date;
  snapshot_id: string | null;
  level_number: number;
  rules_applied: Record<string, unknown>;
  inputs_used: Record<string, unknown>;
  final_score: number;
  explanation: string;
  rule_version_hash: string;
  created_at: Date;
}
