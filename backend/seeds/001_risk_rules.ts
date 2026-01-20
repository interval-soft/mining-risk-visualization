import type { Knex } from 'knex';

interface RiskRuleSeed {
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

/**
 * Risk Rules from PRD Section 7.2
 *
 * Evaluation order categories:
 * - 100-199: lockout (force rules - evaluated first, can short-circuit)
 * - 200-299: time_critical (high priority additive)
 * - 300-399: environmental (sensor-based)
 * - 400-499: behavioral (activity-based)
 */
const RISK_RULES: RiskRuleSeed[] = [
  // === LOCKOUT RULES (100-199) ===
  {
    rule_code: 'BLAST_NO_REENTRY',
    category: 'lockout',
    name: 'Post-Blast No Re-entry',
    description: 'Area lockout after blast fired until re-entry cleared',
    impact_type: 'force',
    impact_value: 100,
    condition_config: {
      type: 'compound',
      logic: 'and',
      conditions: [
        { type: 'event', eventType: 'blast_fired', eventWithinMinutes: 120 },
        {
          type: 'compound',
          logic: 'or',
          conditions: [
            // No reentry_cleared event at all
            { type: 'event', eventType: 'reentry_cleared', eventWithinMinutes: 0 },
          ],
        },
      ],
    },
    evaluation_order: 100,
    enabled: true,
    version: 1,
  },
  {
    rule_code: 'EXPLOSIVE_UNAUTHORIZED',
    category: 'lockout',
    name: 'Unauthorized Explosive Access',
    description: 'Unauthorized access detected in explosive magazine area',
    impact_type: 'force',
    impact_value: 100,
    condition_config: {
      type: 'event',
      eventType: 'unauthorized_explosive_access',
    },
    evaluation_order: 101,
    enabled: true,
    version: 1,
  },

  // === TIME CRITICAL RULES (200-299) ===
  {
    rule_code: 'BLAST_SCHEDULED',
    category: 'time_critical',
    name: 'Blasting Scheduled',
    description: 'Blast operations scheduled within 30 minutes',
    impact_type: 'additive',
    impact_value: 40,
    condition_config: {
      type: 'event',
      eventType: 'blast_scheduled',
      eventWithinMinutes: 30,
    },
    evaluation_order: 200,
    enabled: true,
    version: 1,
  },

  // === ENVIRONMENTAL RULES (300-399) ===
  {
    rule_code: 'GAS_THRESHOLD',
    category: 'environmental',
    name: 'Gas Level Above Threshold',
    description: 'Methane or other hazardous gas reading exceeds safe threshold',
    impact_type: 'additive',
    impact_value: 30,
    condition_config: {
      type: 'measurement',
      sensorType: 'methane',
      threshold: 1.0,
      operator: 'gt',
    },
    evaluation_order: 300,
    enabled: true,
    version: 1,
  },
  {
    rule_code: 'SEISMIC_EVENT',
    category: 'environmental',
    name: 'Seismic Activity Detected',
    description: 'Seismic reading above baseline indicates ground instability',
    impact_type: 'additive',
    impact_value: 25,
    condition_config: {
      type: 'measurement',
      sensorType: 'seismic',
      threshold: 2.0,
      operator: 'gt',
    },
    evaluation_order: 301,
    enabled: true,
    version: 1,
  },
  {
    rule_code: 'VENTILATION_LOW',
    category: 'environmental',
    name: 'Low Ventilation Airflow',
    description: 'Ventilation airflow below minimum safe threshold',
    impact_type: 'additive',
    impact_value: 20,
    condition_config: {
      type: 'measurement',
      sensorType: 'airflow',
      threshold: 1.0,
      operator: 'lt',
    },
    evaluation_order: 302,
    enabled: true,
    version: 1,
  },

  // === BEHAVIORAL RULES (400-499) ===
  {
    rule_code: 'CONFINED_NO_PERMIT',
    category: 'behavioral',
    name: 'Confined Space Without Permit',
    description: 'Confined space work active without valid permit event',
    impact_type: 'additive',
    impact_value: 50,
    condition_config: {
      type: 'activity',
      activityNameContains: 'confined',
      activityStatus: 'active',
      requiresEvent: 'confined_space_permit',
    },
    evaluation_order: 400,
    enabled: true,
    version: 1,
  },
  {
    rule_code: 'PROXIMITY_ALARMS',
    category: 'behavioral',
    name: 'Multiple Proximity Alarms',
    description: 'Multiple proximity alarm events indicate collision risk',
    impact_type: 'additive',
    impact_value: 20,
    condition_config: {
      type: 'event',
      eventType: 'proximity_alarm',
      eventCount: 3,
      eventCountWithinMinutes: 15,
    },
    evaluation_order: 401,
    enabled: true,
    version: 1,
  },
  {
    rule_code: 'EQUIPMENT_OVERSPEED',
    category: 'behavioral',
    name: 'Equipment Overspeed Violation',
    description: 'Mobile equipment exceeding speed limits',
    impact_type: 'additive',
    impact_value: 15,
    condition_config: {
      type: 'event',
      eventType: 'equipment_overspeed',
      eventWithinMinutes: 30,
    },
    evaluation_order: 402,
    enabled: true,
    version: 1,
  },
  {
    rule_code: 'CREW_EXPOSURE',
    category: 'behavioral',
    name: 'Crew Exposure Time Exceeded',
    description: 'Personnel exposure time in hazardous area exceeded limits',
    impact_type: 'additive',
    impact_value: 20,
    condition_config: {
      type: 'event',
      eventType: 'exposure_limit_exceeded',
      eventWithinMinutes: 60,
    },
    evaluation_order: 403,
    enabled: true,
    version: 1,
  },
];

export async function seed(knex: Knex): Promise<void> {
  // Clear existing rules
  await knex('risk_rules').del();

  // Insert rules with generated UUIDs
  for (const rule of RISK_RULES) {
    await knex('risk_rules').insert({
      id: knex.fn.uuid(),
      ...rule,
      condition_config: JSON.stringify(rule.condition_config),
    });
  }

  console.log(`Seeded ${RISK_RULES.length} risk rules`);
}
