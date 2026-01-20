import { db } from '../db.js';
import type { EventRow, MeasurementRow } from '../db.js';

export interface EventInput {
  timestamp: Date;
  levelNumber: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface MeasurementInput {
  timestamp: Date;
  levelNumber: number;
  sensorType: string;
  value: number;
  unit: string;
}

export class DataIngestionService {
  /**
   * Ingest a new event into the database.
   * Events are discrete operational occurrences like blast_scheduled, gas_reading, etc.
   */
  async ingestEvent(event: EventInput): Promise<EventRow> {
    const [inserted] = await db('events')
      .insert({
        id: db.fn.uuid(),
        timestamp: event.timestamp,
        level_number: event.levelNumber,
        event_type: event.eventType,
        severity: event.severity,
        metadata: JSON.stringify(event.metadata || {}),
      })
      .returning('*');

    return this.rowToEvent(inserted);
  }

  /**
   * Ingest multiple events in a batch.
   */
  async ingestEvents(events: EventInput[]): Promise<EventRow[]> {
    if (events.length === 0) return [];

    const rows = events.map((event) => ({
      id: db.fn.uuid(),
      timestamp: event.timestamp,
      level_number: event.levelNumber,
      event_type: event.eventType,
      severity: event.severity,
      metadata: JSON.stringify(event.metadata || {}),
    }));

    const inserted = await db('events').insert(rows).returning('*');
    return inserted.map(this.rowToEvent);
  }

  /**
   * Ingest a new measurement (sensor reading) into the database.
   */
  async ingestMeasurement(measurement: MeasurementInput): Promise<MeasurementRow> {
    const [inserted] = await db('measurements')
      .insert({
        id: db.fn.uuid(),
        timestamp: measurement.timestamp,
        level_number: measurement.levelNumber,
        sensor_type: measurement.sensorType,
        value: measurement.value,
        unit: measurement.unit,
      })
      .returning('*');

    return this.rowToMeasurement(inserted);
  }

  /**
   * Ingest multiple measurements in a batch.
   */
  async ingestMeasurements(measurements: MeasurementInput[]): Promise<MeasurementRow[]> {
    if (measurements.length === 0) return [];

    const rows = measurements.map((m) => ({
      id: db.fn.uuid(),
      timestamp: m.timestamp,
      level_number: m.levelNumber,
      sensor_type: m.sensorType,
      value: m.value,
      unit: m.unit,
    }));

    const inserted = await db('measurements').insert(rows).returning('*');
    return inserted.map(this.rowToMeasurement);
  }

  /**
   * Get events for a specific level within a time range.
   */
  async getEventsForLevel(
    levelNumber: number,
    from: Date,
    to: Date
  ): Promise<EventRow[]> {
    const rows = await db('events')
      .where('level_number', levelNumber)
      .whereBetween('timestamp', [from, to])
      .orderBy('timestamp', 'desc');

    return rows.map(this.rowToEvent);
  }

  /**
   * Get the most recent measurements for a level.
   */
  async getLatestMeasurementsForLevel(levelNumber: number): Promise<MeasurementRow[]> {
    // Get the latest measurement for each sensor type
    const subquery = db('measurements')
      .select('sensor_type')
      .max('timestamp as max_ts')
      .where('level_number', levelNumber)
      .groupBy('sensor_type');

    const rows = await db('measurements as m')
      .join(subquery.as('latest'), function () {
        this.on('m.sensor_type', '=', 'latest.sensor_type').andOn(
          'm.timestamp',
          '=',
          'latest.max_ts'
        );
      })
      .where('m.level_number', levelNumber)
      .select('m.*');

    return rows.map(this.rowToMeasurement);
  }

  /**
   * Get measurements within a time window.
   */
  async getMeasurementsForLevel(
    levelNumber: number,
    from: Date,
    to: Date
  ): Promise<MeasurementRow[]> {
    const rows = await db('measurements')
      .where('level_number', levelNumber)
      .whereBetween('timestamp', [from, to])
      .orderBy('timestamp', 'desc');

    return rows.map(this.rowToMeasurement);
  }

  private rowToEvent(row: Record<string, unknown>): EventRow {
    return {
      id: row.id as string,
      timestamp: new Date(row.timestamp as string),
      level_number: row.level_number as number,
      event_type: row.event_type as string,
      severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      created_at: new Date(row.created_at as string),
    };
  }

  private rowToMeasurement(row: Record<string, unknown>): MeasurementRow {
    return {
      id: row.id as string,
      timestamp: new Date(row.timestamp as string),
      level_number: row.level_number as number,
      sensor_type: row.sensor_type as string,
      value: parseFloat(row.value as string),
      unit: row.unit as string,
    };
  }
}
