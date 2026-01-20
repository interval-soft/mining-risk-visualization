// Risk Engine Types

export interface Event {
  id: string;
  timestamp: Date;
  levelNumber: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown>;
}

export interface Measurement {
  id: string;
  timestamp: Date;
  levelNumber: number;
  sensorType: string;
  value: number;
  unit: string;
}

export interface Activity {
  id: string;
  name: string;
  status: 'planned' | 'active' | 'completed';
  riskScore: number | null;
  metadata: Record<string, unknown> | null;
}

export interface RiskContext {
  timestamp: Date;
  levelNumber: number;
  events: Event[];
  measurements: Measurement[];
  activities: Activity[];
}

export interface Rule {
  id: string;
  ruleCode: string;
  category: string;
  name: string;
  description: string;
  impactType: 'additive' | 'force';
  impactValue: number;
  conditionConfig: RuleConditionConfig;
  evaluationOrder: number;
  enabled: boolean;
  version: number;
}

export interface RuleConditionConfig {
  type: 'event' | 'measurement' | 'activity' | 'time' | 'compound';
  // Event-based conditions
  eventType?: string;
  eventWithinMinutes?: number;
  eventCount?: number;
  eventCountWithinMinutes?: number;
  // Measurement-based conditions
  sensorType?: string;
  threshold?: number;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  // Activity-based conditions
  activityNameContains?: string;
  activityStatus?: 'planned' | 'active' | 'completed';
  requiresEvent?: string; // Event type that must NOT exist (for permit checks)
  // Compound conditions
  conditions?: RuleConditionConfig[];
  logic?: 'and' | 'or';
}

export interface TriggeredRule {
  ruleCode: string;
  ruleName: string;
  impactType: 'additive' | 'force';
  impactValue: number;
  reason: string;
  evaluatedAt: Date;
}

export interface RiskCalculation {
  score: number; // 0-100
  band: 'low' | 'medium' | 'high';
  triggeredRules: TriggeredRule[];
  explanation: string;
  calculatedAt: Date;
}

export type RiskBand = 'low' | 'medium' | 'high';

export function scoreToRiskBand(score: number): RiskBand {
  if (score <= 30) return 'low';
  if (score <= 70) return 'medium';
  return 'high';
}
