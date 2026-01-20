import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../src/engine/RiskEngine.js';
import type { RiskContext, Rule } from '../src/engine/types.js';

describe('RiskEngine', () => {
  const engine = new RiskEngine();

  const createContext = (overrides: Partial<RiskContext> = {}): RiskContext => ({
    timestamp: new Date('2026-01-20T10:00:00Z'),
    levelNumber: 3,
    events: [],
    measurements: [],
    activities: [],
    ...overrides,
  });

  const createRule = (overrides: Partial<Rule>): Rule => ({
    id: 'test-rule',
    ruleCode: 'TEST_RULE',
    category: 'test',
    name: 'Test Rule',
    description: 'Test rule description',
    impactType: 'additive',
    impactValue: 20,
    conditionConfig: { type: 'event', eventType: 'test_event' },
    evaluationOrder: 100,
    enabled: true,
    version: 1,
    ...overrides,
  });

  describe('score calculation', () => {
    it('returns 0 score with no rules', () => {
      const context = createContext();
      const result = engine.calculateRisk(context, []);

      expect(result.score).toBe(0);
      expect(result.band).toBe('low');
      expect(result.triggeredRules).toHaveLength(0);
    });

    it('returns 0 score when no rules trigger', () => {
      const context = createContext();
      const rules = [
        createRule({
          conditionConfig: { type: 'event', eventType: 'nonexistent_event' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(0);
      expect(result.band).toBe('low');
    });

    it('accumulates additive rule scores', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'event_a', severity: 'medium', metadata: {} },
          { id: '2', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, eventType: 'event_b', severity: 'high', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'RULE_A',
          impactValue: 25,
          conditionConfig: { type: 'event', eventType: 'event_a' },
          evaluationOrder: 1,
        }),
        createRule({
          ruleCode: 'RULE_B',
          impactValue: 30,
          conditionConfig: { type: 'event', eventType: 'event_b' },
          evaluationOrder: 2,
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(55); // 25 + 30
      expect(result.band).toBe('medium');
      expect(result.triggeredRules).toHaveLength(2);
    });

    it('caps additive scores at 100', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'event_a', severity: 'medium', metadata: {} },
          { id: '2', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, eventType: 'event_b', severity: 'high', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'RULE_A',
          impactValue: 60,
          conditionConfig: { type: 'event', eventType: 'event_a' },
        }),
        createRule({
          ruleCode: 'RULE_B',
          impactValue: 60,
          conditionConfig: { type: 'event', eventType: 'event_b' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(100); // capped
      expect(result.band).toBe('high');
    });

    it('force rules set score directly and stop evaluation', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'lockout_event', severity: 'critical', metadata: {} },
          { id: '2', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, eventType: 'other_event', severity: 'low', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'LOCKOUT',
          impactType: 'force',
          impactValue: 100,
          conditionConfig: { type: 'event', eventType: 'lockout_event' },
          evaluationOrder: 1, // evaluated first
        }),
        createRule({
          ruleCode: 'OTHER',
          impactType: 'additive',
          impactValue: 20,
          conditionConfig: { type: 'event', eventType: 'other_event' },
          evaluationOrder: 2,
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(100);
      expect(result.band).toBe('high');
      expect(result.triggeredRules).toHaveLength(1); // Only lockout triggered
      expect(result.triggeredRules[0].ruleCode).toBe('LOCKOUT');
    });
  });

  describe('risk bands', () => {
    it('assigns low band for scores 0-30', () => {
      const context = createContext({
        events: [{ id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'minor_event', severity: 'low', metadata: {} }],
      });
      const rules = [
        createRule({
          impactValue: 25,
          conditionConfig: { type: 'event', eventType: 'minor_event' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(25);
      expect(result.band).toBe('low');
    });

    it('assigns medium band for scores 31-70', () => {
      const context = createContext({
        events: [{ id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'moderate_event', severity: 'medium', metadata: {} }],
      });
      const rules = [
        createRule({
          impactValue: 50,
          conditionConfig: { type: 'event', eventType: 'moderate_event' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(50);
      expect(result.band).toBe('medium');
    });

    it('assigns high band for scores 71-100', () => {
      const context = createContext({
        events: [{ id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'severe_event', severity: 'high', metadata: {} }],
      });
      const rules = [
        createRule({
          impactValue: 75,
          conditionConfig: { type: 'event', eventType: 'severe_event' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(75);
      expect(result.band).toBe('high');
    });
  });

  describe('event conditions', () => {
    it('triggers on event within time window', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:45:00Z'), levelNumber: 3, eventType: 'blast_scheduled', severity: 'high', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'BLAST_SCHEDULED',
          impactValue: 40,
          conditionConfig: { type: 'event', eventType: 'blast_scheduled', eventWithinMinutes: 30 },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(40);
      expect(result.triggeredRules[0].reason).toContain('15 minutes ago');
    });

    it('does not trigger for event outside time window', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T08:00:00Z'), levelNumber: 3, eventType: 'blast_scheduled', severity: 'high', metadata: {} }, // 2 hours ago
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'BLAST_SCHEDULED',
          impactValue: 40,
          conditionConfig: { type: 'event', eventType: 'blast_scheduled', eventWithinMinutes: 30 },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(0);
    });

    it('triggers on event count threshold', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'proximity_alarm', severity: 'medium', metadata: {} },
          { id: '2', timestamp: new Date('2026-01-20T09:52:00Z'), levelNumber: 3, eventType: 'proximity_alarm', severity: 'medium', metadata: {} },
          { id: '3', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, eventType: 'proximity_alarm', severity: 'medium', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'PROXIMITY_ALARMS',
          impactValue: 20,
          conditionConfig: {
            type: 'event',
            eventType: 'proximity_alarm',
            eventCount: 3,
            eventCountWithinMinutes: 15,
          },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(20);
      expect(result.triggeredRules[0].reason).toContain('3 proximity_alarm events');
    });
  });

  describe('measurement conditions', () => {
    it('triggers on measurement above threshold', () => {
      const context = createContext({
        measurements: [
          { id: '1', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, sensorType: 'methane', value: 1.2, unit: 'ppm' },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'GAS_THRESHOLD',
          impactValue: 30,
          conditionConfig: { type: 'measurement', sensorType: 'methane', threshold: 1.0, operator: 'gt' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(30);
      expect(result.triggeredRules[0].reason).toContain('1.2 ppm is above threshold 1');
    });

    it('triggers on measurement below threshold', () => {
      const context = createContext({
        measurements: [
          { id: '1', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, sensorType: 'airflow', value: 0.8, unit: 'm3/s' },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'VENTILATION_LOW',
          impactValue: 20,
          conditionConfig: { type: 'measurement', sensorType: 'airflow', threshold: 1.0, operator: 'lt' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(20);
      expect(result.triggeredRules[0].reason).toContain('below threshold');
    });
  });

  describe('activity conditions', () => {
    it('triggers on activity without required permit event', () => {
      const context = createContext({
        activities: [
          { id: '1', name: 'Confined Space Work', status: 'active', riskScore: null, metadata: null },
        ],
        events: [], // No permit event
      });
      const rules = [
        createRule({
          ruleCode: 'CONFINED_NO_PERMIT',
          impactValue: 50,
          conditionConfig: {
            type: 'activity',
            activityNameContains: 'confined',
            activityStatus: 'active',
            requiresEvent: 'permit_issued',
          },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(50);
      expect(result.triggeredRules[0].reason).toContain('without required permit_issued');
    });

    it('does not trigger when permit event exists', () => {
      const context = createContext({
        activities: [
          { id: '1', name: 'Confined Space Work', status: 'active', riskScore: null, metadata: null },
        ],
        events: [
          { id: '1', timestamp: new Date('2026-01-20T08:00:00Z'), levelNumber: 3, eventType: 'permit_issued', severity: 'low', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'CONFINED_NO_PERMIT',
          impactValue: 50,
          conditionConfig: {
            type: 'activity',
            activityNameContains: 'confined',
            activityStatus: 'active',
            requiresEvent: 'permit_issued',
          },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(0);
    });
  });

  describe('evaluation order', () => {
    it('evaluates rules in order', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'event_a', severity: 'medium', metadata: {} },
          { id: '2', timestamp: new Date('2026-01-20T09:55:00Z'), levelNumber: 3, eventType: 'event_b', severity: 'high', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'RULE_B',
          impactValue: 30,
          conditionConfig: { type: 'event', eventType: 'event_b' },
          evaluationOrder: 200, // Higher order = evaluated later
        }),
        createRule({
          ruleCode: 'RULE_A',
          impactValue: 25,
          conditionConfig: { type: 'event', eventType: 'event_a' },
          evaluationOrder: 100, // Lower order = evaluated first
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      // Rules should be triggered in evaluation order
      expect(result.triggeredRules[0].ruleCode).toBe('RULE_A');
      expect(result.triggeredRules[1].ruleCode).toBe('RULE_B');
    });

    it('skips disabled rules', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'test_event', severity: 'medium', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'DISABLED_RULE',
          impactValue: 50,
          enabled: false,
          conditionConfig: { type: 'event', eventType: 'test_event' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.score).toBe(0);
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  describe('explanation generation', () => {
    it('generates explanation for no risk', () => {
      const context = createContext();
      const result = engine.calculateRisk(context, []);

      expect(result.explanation).toContain('LOW risk');
      expect(result.explanation).toContain('No risk conditions detected');
    });

    it('generates explanation with triggered rules', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'blast_scheduled', severity: 'high', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'BLAST_SCHEDULED',
          name: 'Blasting Scheduled',
          impactValue: 40,
          conditionConfig: { type: 'event', eventType: 'blast_scheduled', eventWithinMinutes: 30 },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.explanation).toContain('MEDIUM risk');
      expect(result.explanation).toContain('BLAST_SCHEDULED');
      expect(result.explanation).toContain('+40');
    });

    it('generates lockout explanation for force rules', () => {
      const context = createContext({
        events: [
          { id: '1', timestamp: new Date('2026-01-20T09:50:00Z'), levelNumber: 3, eventType: 'unauthorized_access', severity: 'critical', metadata: {} },
        ],
      });
      const rules = [
        createRule({
          ruleCode: 'UNAUTHORIZED',
          name: 'Unauthorized Access',
          impactType: 'force',
          impactValue: 100,
          conditionConfig: { type: 'event', eventType: 'unauthorized_access' },
        }),
      ];
      const result = engine.calculateRisk(context, rules);

      expect(result.explanation).toContain('LOCKOUT');
      expect(result.explanation).toContain('Unauthorized Access');
    });
  });
});
