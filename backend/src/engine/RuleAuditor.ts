import { createHash } from 'crypto';
import type { Rule, RiskCalculation, RiskContext } from './types.js';

export interface RiskAuditEntry {
  timestamp: Date;
  snapshotId: string | null;
  levelNumber: number;
  rulesApplied: {
    ruleCode: string;
    ruleVersion: number;
    impactType: string;
    impactValue: number;
    triggered: boolean;
    reason: string;
  }[];
  inputsUsed: {
    eventCount: number;
    measurementCount: number;
    activityCount: number;
    eventTypes: string[];
    measurementTypes: string[];
  };
  finalScore: number;
  explanation: string;
  ruleVersionHash: string;
}

export class RuleAuditor {
  /**
   * Generate a deterministic hash of all rule versions.
   * This allows verifying that the same rules were used for a calculation.
   */
  generateRuleVersionHash(rules: Rule[]): string {
    const sortedRules = [...rules].sort((a, b) => a.ruleCode.localeCompare(b.ruleCode));
    const ruleSignatures = sortedRules.map(
      (r) => `${r.ruleCode}:${r.version}:${r.enabled}:${r.impactValue}`
    );
    const combined = ruleSignatures.join('|');
    return createHash('sha256').update(combined).digest('hex').substring(0, 64);
  }

  /**
   * Create an audit entry for a risk calculation.
   */
  createAuditEntry(
    context: RiskContext,
    rules: Rule[],
    calculation: RiskCalculation,
    snapshotId: string | null
  ): RiskAuditEntry {
    const triggeredCodes = new Set(calculation.triggeredRules.map((r) => r.ruleCode));

    const rulesApplied = rules
      .filter((r) => r.enabled)
      .sort((a, b) => a.evaluationOrder - b.evaluationOrder)
      .map((rule) => {
        const triggered = triggeredCodes.has(rule.ruleCode);
        const triggeredRule = calculation.triggeredRules.find(
          (tr) => tr.ruleCode === rule.ruleCode
        );
        return {
          ruleCode: rule.ruleCode,
          ruleVersion: rule.version,
          impactType: rule.impactType,
          impactValue: rule.impactValue,
          triggered,
          reason: triggered ? triggeredRule?.reason || '' : '',
        };
      });

    const inputsUsed = {
      eventCount: context.events.length,
      measurementCount: context.measurements.length,
      activityCount: context.activities.length,
      eventTypes: [...new Set(context.events.map((e) => e.eventType))],
      measurementTypes: [...new Set(context.measurements.map((m) => m.sensorType))],
    };

    return {
      timestamp: context.timestamp,
      snapshotId,
      levelNumber: context.levelNumber,
      rulesApplied,
      inputsUsed,
      finalScore: calculation.score,
      explanation: calculation.explanation,
      ruleVersionHash: this.generateRuleVersionHash(rules),
    };
  }

  /**
   * Verify that a calculation can be reproduced with the same rules.
   */
  verifyReproducibility(
    currentRules: Rule[],
    storedHash: string
  ): { reproducible: boolean; currentHash: string } {
    const currentHash = this.generateRuleVersionHash(currentRules);
    return {
      reproducible: currentHash === storedHash,
      currentHash,
    };
  }
}
