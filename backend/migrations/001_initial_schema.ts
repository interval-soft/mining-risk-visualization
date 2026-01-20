import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Snapshots: Immutable state captures
  await knex.schema.createTable('snapshots', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('timestamp', 'idx_snapshots_timestamp');
  });

  // Snapshot Levels: Level state within snapshot
  await knex.schema.createTable('snapshot_levels', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('snapshot_id').references('id').inTable('snapshots').onDelete('CASCADE');
    table.integer('level_number').notNullable();
    table.string('level_name', 100).notNullable();
    table.integer('risk_score').checkBetween([0, 100]);
    table.string('risk_band', 10).checkIn(['low', 'medium', 'high']);
    table.text('risk_explanation');
    table.jsonb('rule_triggers');

    table.unique(['snapshot_id', 'level_number']);
  });

  // Snapshot Activities: Activities within levels
  await knex.schema.createTable('snapshot_activities', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('snapshot_level_id').references('id').inTable('snapshot_levels').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('status', 20).checkIn(['planned', 'active', 'completed']);
    table.integer('risk_score');
    table.jsonb('metadata');
  });

  // Events: Discrete operational events
  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.integer('level_number').notNullable();
    table.string('event_type', 50).notNullable();
    table.string('severity', 10).checkIn(['low', 'medium', 'high', 'critical']);
    table.jsonb('metadata');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('timestamp', 'idx_events_timestamp');
    table.index('level_number', 'idx_events_level');
  });

  // Measurements: Sensor readings
  await knex.schema.createTable('measurements', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.integer('level_number').notNullable();
    table.string('sensor_type', 50).notNullable();
    table.decimal('value', 14, 4).notNullable();
    table.string('unit', 20).notNullable();

    table.index('timestamp', 'idx_measurements_timestamp');
  });

  // Alerts: Derived risk conditions
  await knex.schema.createTable('alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.integer('level_number').notNullable();
    table.integer('risk_score').notNullable();
    table.string('status', 20).defaultTo('active').checkIn(['active', 'acknowledged', 'resolved']);
    table.string('cause', 500).notNullable();
    table.text('explanation').notNullable();
    table.timestamp('acknowledged_at', { useTz: true });
    table.string('acknowledged_by', 100);
    table.text('acknowledged_comment');
    table.timestamp('resolved_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('status', 'idx_alerts_status');
  });

  // Risk Rules: Configurable rules
  await knex.schema.createTable('risk_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('rule_code', 50).unique().notNullable();
    table.string('category', 50).notNullable();
    table.string('name', 200).notNullable();
    table.text('description').notNullable();
    table.string('impact_type', 20).checkIn(['additive', 'force']);
    table.integer('impact_value').notNullable();
    table.jsonb('condition_config').notNullable();
    table.integer('evaluation_order').notNullable();
    table.boolean('enabled').defaultTo(true);
    table.integer('version').defaultTo(1);
  });

  // Risk Audit: Audit trail for risk calculations
  await knex.schema.createTable('risk_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.uuid('snapshot_id').references('id').inTable('snapshots').onDelete('SET NULL');
    table.integer('level_number').notNullable();
    table.jsonb('rules_applied').notNullable();
    table.jsonb('inputs_used').notNullable();
    table.integer('final_score').notNullable();
    table.text('explanation').notNullable();
    table.string('rule_version_hash', 64).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('risk_audit');
  await knex.schema.dropTableIfExists('risk_rules');
  await knex.schema.dropTableIfExists('alerts');
  await knex.schema.dropTableIfExists('measurements');
  await knex.schema.dropTableIfExists('events');
  await knex.schema.dropTableIfExists('snapshot_activities');
  await knex.schema.dropTableIfExists('snapshot_levels');
  await knex.schema.dropTableIfExists('snapshots');
}
