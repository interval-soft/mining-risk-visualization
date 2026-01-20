import type {
  RiskContext,
  Rule,
  RiskCalculation,
  TriggeredRule,
  RuleConditionConfig,
} from './types.js';
import { scoreToRiskBand } from './types.js';

export class RiskEngine {
  /**
   * Calculate risk score for a level given its context and applicable rules.
   *
   * Evaluation logic:
   * 1. Sort rules by evaluation_order (lockout → time_critical → environmental → behavioral)
   * 2. Evaluate each enabled rule in order
   * 3. For 'force' rules: set score immediately and stop (lockout conditions)
   * 4. For 'additive' rules: accumulate score (capped at 100)
   * 5. Generate human-readable explanation from triggered rules
   */
  calculateRisk(context: RiskContext, rules: Rule[]): RiskCalculation {
    const calculatedAt = new Date();
    const triggeredRules: TriggeredRule[] = [];
    let score = 0;
    let forcedScore: number | null = null;

    // Sort rules by evaluation order (lower = evaluated first)
    const sortedRules = [...rules]
      .filter((r) => r.enabled)
      .sort((a, b) => a.evaluationOrder - b.evaluationOrder);

    for (const rule of sortedRules) {
      const evaluationResult = this.evaluateRule(rule, context);

      if (evaluationResult.triggered) {
        const triggeredRule: TriggeredRule = {
          ruleCode: rule.ruleCode,
          ruleName: rule.name,
          impactType: rule.impactType,
          impactValue: rule.impactValue,
          reason: evaluationResult.reason,
          evaluatedAt: calculatedAt,
        };
        triggeredRules.push(triggeredRule);

        if (rule.impactType === 'force') {
          // Force rules set the score directly and stop evaluation
          forcedScore = rule.impactValue;
          break;
        } else {
          // Additive rules accumulate
          score += rule.impactValue;
        }
      }
    }

    // Apply forced score or cap additive score at 100
    const finalScore = forcedScore !== null ? forcedScore : Math.min(score, 100);
    const band = scoreToRiskBand(finalScore);
    const explanation = this.generateExplanation(finalScore, band, triggeredRules, forcedScore !== null);

    return {
      score: finalScore,
      band,
      triggeredRules,
      explanation,
      calculatedAt,
    };
  }

  /**
   * Evaluate a single rule against the context.
   * Returns whether the rule triggered and the reason why.
   */
  private evaluateRule(
    rule: Rule,
    context: RiskContext
  ): { triggered: boolean; reason: string } {
    const config = rule.conditionConfig;
    return this.evaluateCondition(config, context, rule.name);
  }

  /**
   * Evaluate a condition configuration recursively (for compound conditions).
   */
  private evaluateCondition(
    config: RuleConditionConfig,
    context: RiskContext,
    ruleName: string
  ): { triggered: boolean; reason: string } {
    switch (config.type) {
      case 'event':
        return this.evaluateEventCondition(config, context);

      case 'measurement':
        return this.evaluateMeasurementCondition(config, context);

      case 'activity':
        return this.evaluateActivityCondition(config, context);

      case 'time':
        return this.evaluateTimeCondition(config, context);

      case 'compound':
        return this.evaluateCompoundCondition(config, context, ruleName);

      default:
        return { triggered: false, reason: '' };
    }
  }

  /**
   * Evaluate event-based conditions.
   * Examples: blast_scheduled within 30 min, multiple proximity alarms
   */
  private evaluateEventCondition(
    config: RuleConditionConfig,
    context: RiskContext
  ): { triggered: boolean; reason: string } {
    if (!config.eventType) {
      return { triggered: false, reason: '' };
    }

    const matchingEvents = context.events.filter(
      (e) => e.eventType === config.eventType
    );

    // Check for events within time window
    if (config.eventWithinMinutes !== undefined) {
      const cutoff = new Date(context.timestamp.getTime() - config.eventWithinMinutes * 60 * 1000);
      const recentEvents = matchingEvents.filter((e) => e.timestamp >= cutoff);

      if (recentEvents.length > 0) {
        const mostRecent = recentEvents[0];
        const minutesAgo = Math.round(
          (context.timestamp.getTime() - mostRecent.timestamp.getTime()) / 60000
        );
        return {
          triggered: true,
          reason: `${config.eventType} event occurred ${minutesAgo} minutes ago`,
        };
      }
      return { triggered: false, reason: '' };
    }

    // Check for event count threshold
    if (config.eventCount !== undefined && config.eventCountWithinMinutes !== undefined) {
      const cutoff = new Date(
        context.timestamp.getTime() - config.eventCountWithinMinutes * 60 * 1000
      );
      const recentEvents = matchingEvents.filter((e) => e.timestamp >= cutoff);

      if (recentEvents.length >= config.eventCount) {
        return {
          triggered: true,
          reason: `${recentEvents.length} ${config.eventType} events in last ${config.eventCountWithinMinutes} minutes`,
        };
      }
      return { triggered: false, reason: '' };
    }

    // Simple event existence check
    if (matchingEvents.length > 0) {
      return {
        triggered: true,
        reason: `${config.eventType} event present`,
      };
    }

    return { triggered: false, reason: '' };
  }

  /**
   * Evaluate measurement-based conditions.
   * Examples: gas reading above threshold, ventilation below minimum
   */
  private evaluateMeasurementCondition(
    config: RuleConditionConfig,
    context: RiskContext
  ): { triggered: boolean; reason: string } {
    if (!config.sensorType || config.threshold === undefined || !config.operator) {
      return { triggered: false, reason: '' };
    }

    const matchingMeasurements = context.measurements.filter(
      (m) => m.sensorType === config.sensorType
    );

    if (matchingMeasurements.length === 0) {
      return { triggered: false, reason: '' };
    }

    // Get most recent measurement
    const latest = matchingMeasurements.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )[0];

    const triggered = this.compareValue(latest.value, config.operator, config.threshold);

    if (triggered) {
      const operatorText = this.operatorToText(config.operator);
      return {
        triggered: true,
        reason: `${config.sensorType} reading ${latest.value} ${latest.unit} is ${operatorText} threshold ${config.threshold}`,
      };
    }

    return { triggered: false, reason: '' };
  }

  /**
   * Evaluate activity-based conditions.
   * Examples: confined space work active without permit event
   */
  private evaluateActivityCondition(
    config: RuleConditionConfig,
    context: RiskContext
  ): { triggered: boolean; reason: string } {
    let matchingActivities = context.activities;

    // Filter by name pattern
    if (config.activityNameContains) {
      const pattern = config.activityNameContains.toLowerCase();
      matchingActivities = matchingActivities.filter((a) =>
        a.name.toLowerCase().includes(pattern)
      );
    }

    // Filter by status
    if (config.activityStatus) {
      matchingActivities = matchingActivities.filter(
        (a) => a.status === config.activityStatus
      );
    }

    if (matchingActivities.length === 0) {
      return { triggered: false, reason: '' };
    }

    // Check if a required event is missing (e.g., permit)
    if (config.requiresEvent) {
      const hasRequiredEvent = context.events.some(
        (e) => e.eventType === config.requiresEvent
      );

      if (!hasRequiredEvent) {
        const activity = matchingActivities[0];
        return {
          triggered: true,
          reason: `${activity.name} is ${activity.status} without required ${config.requiresEvent}`,
        };
      }
      return { triggered: false, reason: '' };
    }

    // Simple activity match
    const activity = matchingActivities[0];
    return {
      triggered: true,
      reason: `${activity.name} is ${activity.status}`,
    };
  }

  /**
   * Evaluate time-based conditions.
   * Reserved for future use (shift changes, time-of-day rules)
   */
  private evaluateTimeCondition(
    _config: RuleConditionConfig,
    _context: RiskContext
  ): { triggered: boolean; reason: string } {
    // Placeholder for time-based rules
    return { triggered: false, reason: '' };
  }

  /**
   * Evaluate compound conditions (AND/OR logic).
   */
  private evaluateCompoundCondition(
    config: RuleConditionConfig,
    context: RiskContext,
    ruleName: string
  ): { triggered: boolean; reason: string } {
    if (!config.conditions || config.conditions.length === 0) {
      return { triggered: false, reason: '' };
    }

    const results = config.conditions.map((c) =>
      this.evaluateCondition(c, context, ruleName)
    );

    if (config.logic === 'and') {
      const allTriggered = results.every((r) => r.triggered);
      if (allTriggered) {
        const reasons = results.map((r) => r.reason).filter(Boolean);
        return {
          triggered: true,
          reason: reasons.join(' AND '),
        };
      }
      return { triggered: false, reason: '' };
    }

    // Default to OR logic
    const anyTriggered = results.find((r) => r.triggered);
    if (anyTriggered) {
      return anyTriggered;
    }
    return { triggered: false, reason: '' };
  }

  /**
   * Compare a value against a threshold using the specified operator.
   */
  private compareValue(
    value: number,
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Convert operator to human-readable text.
   */
  private operatorToText(operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'): string {
    const map: Record<string, string> = {
      gt: 'above',
      gte: 'at or above',
      lt: 'below',
      lte: 'at or below',
      eq: 'equal to',
    };
    return map[operator] || operator;
  }

  /**
   * Generate a human-readable explanation of the risk calculation.
   */
  private generateExplanation(
    score: number,
    band: 'low' | 'medium' | 'high',
    triggeredRules: TriggeredRule[],
    wasForced: boolean
  ): string {
    if (triggeredRules.length === 0) {
      return `LOW risk (${score}). No risk conditions detected.`;
    }

    const bandLabel = band.toUpperCase();
    const parts: string[] = [];

    if (wasForced) {
      const forceRule = triggeredRules.find((r) => r.impactType === 'force');
      parts.push(`LOCKOUT: ${forceRule?.ruleName}. ${forceRule?.reason}.`);
    } else {
      parts.push(`${bandLabel} risk (${score}).`);
    }

    // Add rule summaries
    const ruleDescriptions = triggeredRules.map((r) => {
      const impact = r.impactType === 'force' ? `force=${r.impactValue}` : `+${r.impactValue}`;
      return `${r.ruleCode} (${impact}): ${r.reason}`;
    });

    parts.push(...ruleDescriptions);

    return parts.join(' ');
  }
}
