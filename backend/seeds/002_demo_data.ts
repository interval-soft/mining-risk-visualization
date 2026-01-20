import type { Knex } from 'knex';

/**
 * Demo Data Generator
 *
 * Generates 24 hours of realistic mining operation data:
 * - Hourly snapshots with varying risk levels
 * - Blasting sequence on Level 3 (high risk period around 10:00-12:00)
 * - Gas spike event on Level 4 (around 14:00)
 * - Normal operations on Levels 1, 2, 5
 * - Several alerts (active, acknowledged, resolved)
 */

// Base timestamp: 24 hours ago from "now"
const BASE_TIME = new Date();
BASE_TIME.setHours(BASE_TIME.getHours() - 24);

function hoursFromBase(hours: number): Date {
  return new Date(BASE_TIME.getTime() + hours * 60 * 60 * 1000);
}

function minutesFromBase(minutes: number): Date {
  return new Date(BASE_TIME.getTime() + minutes * 60 * 1000);
}

interface EventSeed {
  timestamp: Date;
  level_number: number;
  event_type: string;
  severity: string;
  metadata: Record<string, unknown>;
}

interface MeasurementSeed {
  timestamp: Date;
  level_number: number;
  sensor_type: string;
  value: number;
  unit: string;
}

interface AlertSeed {
  timestamp: Date;
  level_number: number;
  risk_score: number;
  status: string;
  cause: string;
  explanation: string;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  acknowledged_comment?: string;
  resolved_at?: Date;
}

export async function seed(knex: Knex): Promise<void> {
  // Clear existing demo data (keep rules)
  await knex('risk_audit').del();
  await knex('alerts').del();
  await knex('snapshot_activities').del();
  await knex('snapshot_levels').del();
  await knex('snapshots').del();
  await knex('measurements').del();
  await knex('events').del();

  // Generate events
  const events = generateEvents();
  for (const event of events) {
    await knex('events').insert({
      id: knex.fn.uuid(),
      ...event,
      metadata: JSON.stringify(event.metadata),
    });
  }
  console.log(`Seeded ${events.length} events`);

  // Generate measurements
  const measurements = generateMeasurements();
  for (const measurement of measurements) {
    await knex('measurements').insert({
      id: knex.fn.uuid(),
      ...measurement,
    });
  }
  console.log(`Seeded ${measurements.length} measurements`);

  // Generate alerts
  const alerts = generateAlerts();
  for (const alert of alerts) {
    await knex('alerts').insert({
      id: knex.fn.uuid(),
      ...alert,
    });
  }
  console.log(`Seeded ${alerts.length} alerts`);

  console.log('Demo data seeding complete');
}

function generateEvents(): EventSeed[] {
  const events: EventSeed[] = [];

  // === Level 3: Blasting sequence (hours 9-12) ===

  // Blast scheduled event at hour 9
  events.push({
    timestamp: hoursFromBase(9),
    level_number: 3,
    event_type: 'blast_scheduled',
    severity: 'high',
    metadata: { scheduledTime: hoursFromBase(10.5).toISOString(), area: 'Stope 3A', chargeKg: 250 },
  });

  // Explosive magazine access at hour 9.5
  events.push({
    timestamp: hoursFromBase(9.5),
    level_number: 3,
    event_type: 'explosive_magazine_access',
    severity: 'high',
    metadata: { authorizedBy: 'J. Smith', magazineId: 'MAG-003', quantity: '50 units' },
  });

  // Area evacuation at hour 10
  events.push({
    timestamp: hoursFromBase(10),
    level_number: 3,
    event_type: 'area_evacuation',
    severity: 'medium',
    metadata: { area: 'Stope 3A', personnelCount: 12 },
  });

  // Blast fired at hour 10.5
  events.push({
    timestamp: hoursFromBase(10.5),
    level_number: 3,
    event_type: 'blast_fired',
    severity: 'critical',
    metadata: { area: 'Stope 3A', chargeKg: 250, success: true },
  });

  // Re-entry cleared at hour 12
  events.push({
    timestamp: hoursFromBase(12),
    level_number: 3,
    event_type: 'reentry_cleared',
    severity: 'low',
    metadata: { area: 'Stope 3A', clearedBy: 'Safety Officer Chen' },
  });

  // === Level 4: Gas spike and confined space work ===

  // Confined space permit at hour 6
  events.push({
    timestamp: hoursFromBase(6),
    level_number: 4,
    event_type: 'confined_space_permit',
    severity: 'low',
    metadata: { permitId: 'CSP-2024-0142', crew: ['M. Johnson', 'R. Lee'], validUntil: hoursFromBase(14).toISOString() },
  });

  // Confined space entry at hour 7
  events.push({
    timestamp: hoursFromBase(7),
    level_number: 4,
    event_type: 'confined_space_entry',
    severity: 'medium',
    metadata: { permitId: 'CSP-2024-0142', location: 'Shaft 4B access' },
  });

  // Gas spike detected at hour 14
  events.push({
    timestamp: hoursFromBase(14),
    level_number: 4,
    event_type: 'gas_reading_alert',
    severity: 'high',
    metadata: { gasType: 'methane', reading: 1.5, unit: 'ppm', threshold: 1.0 },
  });

  // Ventilation increased at hour 14.25
  events.push({
    timestamp: hoursFromBase(14.25),
    level_number: 4,
    event_type: 'ventilation_increased',
    severity: 'low',
    metadata: { previousFlow: 0.8, newFlow: 1.5, unit: 'm3/s' },
  });

  // Gas levels normal at hour 15
  events.push({
    timestamp: hoursFromBase(15),
    level_number: 4,
    event_type: 'gas_reading_normal',
    severity: 'low',
    metadata: { gasType: 'methane', reading: 0.4, unit: 'ppm' },
  });

  // === Level 2: Equipment operations ===

  // Shift start
  events.push({
    timestamp: hoursFromBase(6),
    level_number: 2,
    event_type: 'shift_start',
    severity: 'low',
    metadata: { shift: 'Day', crewCount: 8 },
  });

  // Equipment start at hour 6.5
  events.push({
    timestamp: hoursFromBase(6.5),
    level_number: 2,
    event_type: 'equipment_start',
    severity: 'low',
    metadata: { equipmentId: 'CRUSH-01', operator: 'T. Williams' },
  });

  // Proximity alarm at hour 8
  events.push({
    timestamp: hoursFromBase(8),
    level_number: 2,
    event_type: 'proximity_alarm',
    severity: 'medium',
    metadata: { vehicleA: 'HAUL-03', vehicleB: 'LOAD-07', distance: 3.2, unit: 'm' },
  });

  // Equipment overspeed at hour 16
  events.push({
    timestamp: hoursFromBase(16),
    level_number: 2,
    event_type: 'equipment_overspeed',
    severity: 'medium',
    metadata: { equipmentId: 'HAUL-03', speed: 28, limit: 25, unit: 'km/h' },
  });

  // === Level 5: Maintenance activities ===

  events.push({
    timestamp: hoursFromBase(4),
    level_number: 5,
    event_type: 'maintenance_start',
    severity: 'low',
    metadata: { workOrderId: 'WO-5521', equipment: 'Ventilation Fan B' },
  });

  events.push({
    timestamp: hoursFromBase(8),
    level_number: 5,
    event_type: 'maintenance_complete',
    severity: 'low',
    metadata: { workOrderId: 'WO-5521', equipment: 'Ventilation Fan B', result: 'success' },
  });

  // === Level 1: Normal operations ===

  events.push({
    timestamp: hoursFromBase(6),
    level_number: 1,
    event_type: 'shift_start',
    severity: 'low',
    metadata: { shift: 'Day', area: 'Control Room' },
  });

  events.push({
    timestamp: hoursFromBase(18),
    level_number: 1,
    event_type: 'shift_change',
    severity: 'low',
    metadata: { outgoingShift: 'Day', incomingShift: 'Night' },
  });

  return events;
}

function generateMeasurements(): MeasurementSeed[] {
  const measurements: MeasurementSeed[] = [];

  // Generate hourly measurements for each level
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = hoursFromBase(hour);

    // Level 3: Seismic (spike during blasting)
    const seismicValue = hour >= 10 && hour <= 11 ? 2.5 + Math.random() * 0.5 : 0.5 + Math.random() * 0.3;
    measurements.push({
      timestamp,
      level_number: 3,
      sensor_type: 'seismic',
      value: parseFloat(seismicValue.toFixed(2)),
      unit: 'mm/s',
    });

    // Level 4: Methane (spike at hour 14)
    let methaneValue = 0.3 + Math.random() * 0.2;
    if (hour === 14) methaneValue = 1.5;
    if (hour === 15) methaneValue = 0.6;
    measurements.push({
      timestamp,
      level_number: 4,
      sensor_type: 'methane',
      value: parseFloat(methaneValue.toFixed(2)),
      unit: 'ppm',
    });

    // Level 4: Airflow (dip at hour 14)
    let airflowValue = 1.2 + Math.random() * 0.3;
    if (hour === 14) airflowValue = 0.7;
    if (hour >= 15) airflowValue = 1.5;
    measurements.push({
      timestamp,
      level_number: 4,
      sensor_type: 'airflow',
      value: parseFloat(airflowValue.toFixed(2)),
      unit: 'm3/s',
    });

    // Level 5: Pump flow rate (normal)
    measurements.push({
      timestamp,
      level_number: 5,
      sensor_type: 'pump_flow',
      value: parseFloat((45 + Math.random() * 10).toFixed(1)),
      unit: 'L/min',
    });

    // Level 2: Temperature (slight variation)
    measurements.push({
      timestamp,
      level_number: 2,
      sensor_type: 'temperature',
      value: parseFloat((28 + Math.random() * 4).toFixed(1)),
      unit: '°C',
    });
  }

  return measurements;
}

function generateAlerts(): AlertSeed[] {
  return [
    // Active alert: Current blasting preparation (if within last few hours)
    {
      timestamp: hoursFromBase(22),
      level_number: 3,
      risk_score: 85,
      status: 'active',
      cause: 'Blasting operations scheduled with explosive handling in progress',
      explanation: 'Level 3 has reached HIGH risk (85) due to scheduled blasting and active explosive magazine handling. BLAST_SCHEDULED (+40) and EXPLOSIVE_HANDLING (+35) rules triggered.',
    },

    // Acknowledged alert: Confined space work
    {
      timestamp: hoursFromBase(7),
      level_number: 4,
      risk_score: 55,
      status: 'acknowledged',
      cause: 'Confined space work active',
      explanation: 'Level 4 MEDIUM risk (55) due to confined space entry. Permit CSP-2024-0142 is valid. CONFINED_SPACE rule triggered (+30).',
      acknowledged_at: hoursFromBase(7.5),
      acknowledged_by: 'Shift Supervisor',
      acknowledged_comment: 'Permit verified, crew equipped with gas monitors',
    },

    // Resolved alert: Gas spike
    {
      timestamp: hoursFromBase(14),
      level_number: 4,
      risk_score: 72,
      status: 'resolved',
      cause: 'Gas reading elevated',
      explanation: 'Level 4 HIGH risk (72) due to elevated methane reading of 1.5 ppm. GAS_THRESHOLD rule triggered (+30), VENTILATION_LOW rule triggered (+20).',
      acknowledged_at: hoursFromBase(14.1),
      acknowledged_by: 'Safety Officer',
      acknowledged_comment: 'Investigating source, increasing ventilation',
      resolved_at: hoursFromBase(15),
    },

    // Resolved alert: Post-blast lockout
    {
      timestamp: hoursFromBase(10.5),
      level_number: 3,
      risk_score: 100,
      status: 'resolved',
      cause: 'Post-blast lockout active',
      explanation: 'Level 3 LOCKOUT (100) - Blast fired, re-entry not yet cleared. BLAST_NO_REENTRY rule force=100.',
      acknowledged_at: hoursFromBase(10.6),
      acknowledged_by: 'Blast Supervisor',
      acknowledged_comment: 'Standard post-blast protocol, monitoring ventilation',
      resolved_at: hoursFromBase(12),
    },

    // Acknowledged alert: Equipment overspeed
    {
      timestamp: hoursFromBase(16),
      level_number: 2,
      risk_score: 45,
      status: 'acknowledged',
      cause: 'Equipment overspeed violation',
      explanation: 'Level 2 MEDIUM risk (45) due to haul truck HAUL-03 exceeding speed limit. EQUIPMENT_OVERSPEED rule triggered (+15).',
      acknowledged_at: hoursFromBase(16.1),
      acknowledged_by: 'Operations Manager',
      acknowledged_comment: 'Driver counseled, monitoring continues',
    },
  ];
}
