// API Response Types

export interface LevelResponse {
  level: number;
  name: string;
  riskScore: number;
  riskBand: 'low' | 'medium' | 'high';
  riskExplanation: string;
  triggeredRules: TriggeredRuleResponse[];
  activities: ActivityResponse[];
}

export interface ActivityResponse {
  name: string;
  status: 'planned' | 'active' | 'completed';
  riskScore: number | null;
}

export interface TriggeredRuleResponse {
  ruleCode: string;
  ruleName: string;
  impactType: 'additive' | 'force';
  impactValue: number;
  reason: string;
}

export interface SnapshotResponse {
  id: string;
  timestamp: string;
  levels: LevelResponse[];
}

export interface EventResponse {
  id: string;
  timestamp: string;
  levelNumber: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown>;
}

export interface AlertResponse {
  id: string;
  timestamp: string;
  levelNumber: number;
  riskScore: number;
  status: 'active' | 'acknowledged' | 'resolved';
  cause: string;
  explanation: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedComment: string | null;
  resolvedAt: string | null;
}
