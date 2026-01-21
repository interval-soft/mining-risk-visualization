import type { Knex } from 'knex';

/**
 * Newman Iron Operations Demo Data Generator
 *
 * Generates 24 hours of realistic iron ore mining operation data for a 7-level mine:
 * - Level 1: ROM Pad & Primary Crushing (surface)
 * - Level 2: Active Pit Face (-75m) - blasting sequence around 10:00-12:00
 * - Level 3: Haulage Ramp (-150m)
 * - Level 4: Grade Control (-225m)
 * - Level 5: Pit Floor (-300m)
 * - Level 6: Underground Decline (-375m) - high risk, confined space
 * - Level 7: Deep Services (-450m) - air quality spike around 14:00
 */

// Base timestamp: 24 hours ago from "now"
const BASE_TIME = new Date();
BASE_TIME.setHours(BASE_TIME.getHours() - 24);

function hoursFromBase(hours: number): Date {
  return new Date(BASE_TIME.getTime() + hours * 60 * 60 * 1000);
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

  console.log('Newman Iron Operations demo data seeding complete');
}

function generateEvents(): EventSeed[] {
  const events: EventSeed[] = [];

  // === Level 1: ROM Pad & Primary Crushing (Surface) ===
  events.push({
    timestamp: hoursFromBase(6),
    level_number: 1,
    event_type: 'shift_start',
    severity: 'low',
    metadata: { shift: 'Day', area: 'ROM Pad', crewCount: 6 },
  });

  events.push({
    timestamp: hoursFromBase(7),
    level_number: 1,
    event_type: 'equipment_start',
    severity: 'low',
    metadata: { equipmentId: 'JAW-CRUSH-01', operator: 'K. Murray' },
  });

  events.push({
    timestamp: hoursFromBase(18),
    level_number: 1,
    event_type: 'shift_change',
    severity: 'low',
    metadata: { outgoingShift: 'Day', incomingShift: 'Night' },
  });

  // === Level 2: Active Pit Face - Blasting sequence (hours 9-12) ===
  events.push({
    timestamp: hoursFromBase(9),
    level_number: 2,
    event_type: 'blast_scheduled',
    severity: 'high',
    metadata: { scheduledTime: hoursFromBase(10.5).toISOString(), area: 'West Wall', chargeKg: 450 },
  });

  events.push({
    timestamp: hoursFromBase(9.5),
    level_number: 2,
    event_type: 'explosive_magazine_access',
    severity: 'high',
    metadata: { authorizedBy: 'D. Thompson', magazineId: 'MAG-PIT-01', quantity: '120 units ANFO' },
  });

  events.push({
    timestamp: hoursFromBase(10),
    level_number: 2,
    event_type: 'area_evacuation',
    severity: 'medium',
    metadata: { area: 'West Wall 500m radius', personnelCount: 18 },
  });

  events.push({
    timestamp: hoursFromBase(10.5),
    level_number: 2,
    event_type: 'blast_fired',
    severity: 'critical',
    metadata: { area: 'West Wall', chargeKg: 450, success: true, benchHeight: 15 },
  });

  events.push({
    timestamp: hoursFromBase(12),
    level_number: 2,
    event_type: 'reentry_cleared',
    severity: 'low',
    metadata: { area: 'West Wall', clearedBy: 'Blast Supervisor M. Chen' },
  });

  // === Level 3: Haulage Ramp ===
  events.push({
    timestamp: hoursFromBase(6),
    level_number: 3,
    event_type: 'shift_start',
    severity: 'low',
    metadata: { shift: 'Day', crewCount: 12 },
  });

  events.push({
    timestamp: hoursFromBase(8),
    level_number: 3,
    event_type: 'proximity_alarm',
    severity: 'medium',
    metadata: { vehicleA: 'CAT793-05', vehicleB: 'LOADER-02', distance: 4.5, unit: 'm' },
  });

  events.push({
    timestamp: hoursFromBase(15),
    level_number: 3,
    event_type: 'equipment_overspeed',
    severity: 'medium',
    metadata: { equipmentId: 'CAT793-05', speed: 42, limit: 35, unit: 'km/h' },
  });

  // === Level 4: Grade Control ===
  events.push({
    timestamp: hoursFromBase(7),
    level_number: 4,
    event_type: 'sampling_start',
    severity: 'low',
    metadata: { samplingGrid: 'GC-2024-W12', samples: 45 },
  });

  events.push({
    timestamp: hoursFromBase(14),
    level_number: 4,
    event_type: 'sampling_complete',
    severity: 'low',
    metadata: { samplingGrid: 'GC-2024-W12', samples: 45, avgFe: 62.3 },
  });

  // === Level 5: Pit Floor ===
  events.push({
    timestamp: hoursFromBase(5),
    level_number: 5,
    event_type: 'pump_start',
    severity: 'low',
    metadata: { pumpId: 'DEWATER-03', flowRate: 850, unit: 'L/min' },
  });

  events.push({
    timestamp: hoursFromBase(11),
    level_number: 5,
    event_type: 'water_level_check',
    severity: 'low',
    metadata: { sumpId: 'SUMP-MAIN', level: 2.3, unit: 'm', status: 'normal' },
  });

  // === Level 6: Underground Decline (high risk) ===
  events.push({
    timestamp: hoursFromBase(6),
    level_number: 6,
    event_type: 'confined_space_permit',
    severity: 'medium',
    metadata: { permitId: 'CSP-2024-0287', crew: ['R. Santos', 'T. Nguyen', 'P. Williams'], validUntil: hoursFromBase(18).toISOString() },
  });

  events.push({
    timestamp: hoursFromBase(6.5),
    level_number: 6,
    event_type: 'confined_space_entry',
    severity: 'high',
    metadata: { permitId: 'CSP-2024-0287', location: 'Decline heading -375m' },
  });

  events.push({
    timestamp: hoursFromBase(8),
    level_number: 6,
    event_type: 'ground_support_install',
    severity: 'medium',
    metadata: { type: 'Split set bolts', count: 24, heading: 'Decline -375m' },
  });

  events.push({
    timestamp: hoursFromBase(12),
    level_number: 6,
    event_type: 'bogger_operation',
    severity: 'medium',
    metadata: { equipmentId: 'BOGGER-06', location: 'Decline face', loadsTons: 145 },
  });

  events.push({
    timestamp: hoursFromBase(16),
    level_number: 6,
    event_type: 'shotcrete_scheduled',
    severity: 'low',
    metadata: { area: 'Decline -375m walls', volume: 12, unit: 'm3' },
  });

  // === Level 7: Deep Services ===
  events.push({
    timestamp: hoursFromBase(0),
    level_number: 7,
    event_type: 'ventilation_check',
    severity: 'low',
    metadata: { fanId: 'VENT-MAIN-01', airflow: 45, unit: 'm3/s', status: 'normal' },
  });

  events.push({
    timestamp: hoursFromBase(8),
    level_number: 7,
    event_type: 'refuge_check',
    severity: 'low',
    metadata: { refugeId: 'REFUGE-L7', capacity: 20, suppliesOk: true, oxygenHours: 72 },
  });

  events.push({
    timestamp: hoursFromBase(14),
    level_number: 7,
    event_type: 'air_quality_alert',
    severity: 'medium',
    metadata: { parameter: 'dust_particulates', reading: 85, unit: 'µg/m³', threshold: 50 },
  });

  events.push({
    timestamp: hoursFromBase(14.5),
    level_number: 7,
    event_type: 'ventilation_increased',
    severity: 'low',
    metadata: { previousFlow: 45, newFlow: 62, unit: 'm3/s' },
  });

  events.push({
    timestamp: hoursFromBase(16),
    level_number: 7,
    event_type: 'air_quality_normal',
    severity: 'low',
    metadata: { parameter: 'dust_particulates', reading: 38, unit: 'µg/m³' },
  });

  return events;
}

function generateMeasurements(): MeasurementSeed[] {
  const measurements: MeasurementSeed[] = [];

  // Generate hourly measurements for each level
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = hoursFromBase(hour);

    // Level 2: Seismic (spike during blasting 10-11)
    const seismicValue = hour >= 10 && hour <= 11 ? 3.2 + Math.random() * 0.8 : 0.4 + Math.random() * 0.2;
    measurements.push({
      timestamp,
      level_number: 2,
      sensor_type: 'seismic',
      value: parseFloat(seismicValue.toFixed(2)),
      unit: 'mm/s',
    });

    // Level 3: Temperature (haul trucks generate heat)
    const tempValue = 32 + Math.random() * 6 + (hour >= 12 && hour <= 16 ? 4 : 0);
    measurements.push({
      timestamp,
      level_number: 3,
      sensor_type: 'temperature',
      value: parseFloat(tempValue.toFixed(1)),
      unit: '°C',
    });

    // Level 5: Pump flow rate (dewatering)
    const pumpFlow = 800 + Math.random() * 100;
    measurements.push({
      timestamp,
      level_number: 5,
      sensor_type: 'pump_flow',
      value: parseFloat(pumpFlow.toFixed(0)),
      unit: 'L/min',
    });

    // Level 5: Water level
    const waterLevel = 2.0 + Math.random() * 0.8;
    measurements.push({
      timestamp,
      level_number: 5,
      sensor_type: 'water_level',
      value: parseFloat(waterLevel.toFixed(2)),
      unit: 'm',
    });

    // Level 6: Ground movement (decline development)
    const groundMove = 0.5 + Math.random() * 0.3;
    measurements.push({
      timestamp,
      level_number: 6,
      sensor_type: 'ground_movement',
      value: parseFloat(groundMove.toFixed(2)),
      unit: 'mm',
    });

    // Level 7: Airflow (dip at hour 14 during dust event)
    let airflow = 45 + Math.random() * 5;
    if (hour === 14) airflow = 38;
    if (hour >= 15) airflow = 55 + Math.random() * 8;
    measurements.push({
      timestamp,
      level_number: 7,
      sensor_type: 'airflow',
      value: parseFloat(airflow.toFixed(1)),
      unit: 'm3/s',
    });

    // Level 7: Dust particulates (spike at hour 14)
    let dust = 25 + Math.random() * 15;
    if (hour === 14) dust = 85;
    if (hour === 15) dust = 52;
    measurements.push({
      timestamp,
      level_number: 7,
      sensor_type: 'dust_particulates',
      value: parseFloat(dust.toFixed(0)),
      unit: 'µg/m³',
    });

    // Level 7: Oxygen level
    const oxygen = 20.5 + Math.random() * 0.4;
    measurements.push({
      timestamp,
      level_number: 7,
      sensor_type: 'oxygen',
      value: parseFloat(oxygen.toFixed(2)),
      unit: '%',
    });
  }

  return measurements;
}

function generateAlerts(): AlertSeed[] {
  return [
    // Active alert: Level 2 blasting preparation
    {
      timestamp: hoursFromBase(22),
      level_number: 2,
      risk_score: 85,
      status: 'active',
      cause: 'Production drilling active with explosive magazine access',
      explanation: 'Level 2 (Active Pit Face) has reached HIGH risk (85) due to concurrent drilling and explosive handling. PRODUCTION_DRILLING (+30) and EXPLOSIVE_MAGAZINE (+35) rules triggered.',
    },

    // Active alert: Level 6 confined space
    {
      timestamp: hoursFromBase(6.5),
      level_number: 6,
      risk_score: 82,
      status: 'acknowledged',
      cause: 'Active decline development with confined space entry',
      explanation: 'Level 6 (Underground Decline) HIGH risk (82) due to decline development, ground support work, and confined space entry. DECLINE_DEV (+35), GROUND_SUPPORT (+25), CONFINED_SPACE (+30) rules triggered.',
      acknowledged_at: hoursFromBase(7),
      acknowledged_by: 'Underground Supervisor',
      acknowledged_comment: 'Permits verified, gas monitors on all personnel, bogger operator briefed',
    },

    // Resolved alert: Level 2 post-blast lockout
    {
      timestamp: hoursFromBase(10.5),
      level_number: 2,
      risk_score: 100,
      status: 'resolved',
      cause: 'Post-blast lockout active',
      explanation: 'Level 2 (Active Pit Face) LOCKOUT (100) - West Wall blast fired, re-entry not yet cleared. BLAST_NO_REENTRY rule force=100.',
      acknowledged_at: hoursFromBase(10.6),
      acknowledged_by: 'Blast Supervisor M. Chen',
      acknowledged_comment: 'Standard post-blast protocol, monitoring dust and fumes clearance',
      resolved_at: hoursFromBase(12),
    },

    // Resolved alert: Level 7 air quality
    {
      timestamp: hoursFromBase(14),
      level_number: 7,
      risk_score: 62,
      status: 'resolved',
      cause: 'Air quality reading elevated',
      explanation: 'Level 7 (Deep Services) MEDIUM-HIGH risk (62) due to elevated dust particulates at 85 µg/m³. AIR_QUALITY_ALERT rule triggered (+20).',
      acknowledged_at: hoursFromBase(14.1),
      acknowledged_by: 'Ventilation Officer',
      acknowledged_comment: 'Increasing main fan output, monitoring levels',
      resolved_at: hoursFromBase(16),
    },

    // Acknowledged alert: Level 3 overspeed
    {
      timestamp: hoursFromBase(15),
      level_number: 3,
      risk_score: 48,
      status: 'acknowledged',
      cause: 'Haul truck overspeed violation',
      explanation: 'Level 3 (Haulage Ramp) MEDIUM risk (48) due to CAT793-05 exceeding speed limit (42 km/h in 35 km/h zone). EQUIPMENT_OVERSPEED rule triggered (+18).',
      acknowledged_at: hoursFromBase(15.2),
      acknowledged_by: 'Pit Supervisor',
      acknowledged_comment: 'Operator counseled, incident logged, monitoring continues',
    },
  ];
}
