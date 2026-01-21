import type { Knex } from 'knex';

/**
 * Migration: Multi-Structure Mine Site Architecture
 *
 * Introduces a structure hierarchy above levels, allowing:
 * - Multiple structures per site (pits, underground sections, processing plants)
 * - Independent 3D positioning for each structure
 * - Site-level risk aggregation across structures
 */

// Default structure UUID for data migration
const DEFAULT_STRUCTURE_ID = '00000000-0000-0000-0000-000000000001';

export async function up(knex: Knex): Promise<void> {
  // Task 1.1: Create structures table
  await knex.schema.createTable('structures', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('site_id').defaultTo(knex.fn.uuid());
    table.string('code', 50).unique().notNullable();
    table.string('name', 200).notNullable();
    table.string('type', 50).notNullable(); // 'open_pit', 'underground', 'processing', 'stockpile'
    table.decimal('position_x', 10, 2).defaultTo(0);
    table.decimal('position_z', 10, 2).defaultTo(0);
    table.decimal('rotation_y', 5, 2).defaultTo(0);
    table.boolean('enabled').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    table.index('site_id', 'idx_structures_site');
    table.index('code', 'idx_structures_code');
  });

  // Task 1.2: Create structure_levels table
  await knex.schema.createTable('structure_levels', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('structure_id').references('id').inTable('structures').onDelete('CASCADE');
    table.integer('level_number').notNullable();
    table.string('name', 200).notNullable();
    table.decimal('depth_meters', 10, 2);
    table.boolean('enabled').defaultTo(true);

    table.unique(['structure_id', 'level_number']);
    table.index('structure_id', 'idx_structure_levels_structure');
  });

  // Task 1.3: Add structure_id to existing tables
  await knex.schema.alterTable('snapshot_levels', (table) => {
    table.uuid('structure_id').references('id').inTable('structures').nullable();
  });

  await knex.schema.alterTable('events', (table) => {
    table.uuid('structure_id').references('id').inTable('structures').nullable();
  });

  await knex.schema.alterTable('measurements', (table) => {
    table.uuid('structure_id').references('id').inTable('structures').nullable();
  });

  await knex.schema.alterTable('alerts', (table) => {
    table.uuid('structure_id').references('id').inTable('structures').nullable();
  });

  // Create indexes for the new columns
  await knex.schema.alterTable('snapshot_levels', (table) => {
    table.index('structure_id', 'idx_snapshot_levels_structure');
  });

  await knex.schema.alterTable('events', (table) => {
    table.index('structure_id', 'idx_events_structure');
  });

  await knex.schema.alterTable('alerts', (table) => {
    table.index('structure_id', 'idx_alerts_structure');
  });

  // Task 1.4: Seed default structure and migrate existing data
  await knex('structures').insert({
    id: DEFAULT_STRUCTURE_ID,
    code: 'NEWMAN_MAIN',
    name: 'Newman Iron Operations',
    type: 'mixed',
    position_x: 0,
    position_z: 0,
    rotation_y: 0,
    enabled: true,
    display_order: 0,
    metadata: JSON.stringify({
      description: 'Primary mixed operations site with open pit and underground sections',
      levelCount: 7
    })
  });

  // Seed structure_levels for the default structure
  const levels = [
    { level_number: 1, name: 'ROM Pad & Primary Crushing', depth_meters: 0 },
    { level_number: 2, name: 'Active Pit Face', depth_meters: -75 },
    { level_number: 3, name: 'Haulage Ramp', depth_meters: -150 },
    { level_number: 4, name: 'Grade Control', depth_meters: -225 },
    { level_number: 5, name: 'Pit Floor', depth_meters: -300 },
    { level_number: 6, name: 'Underground Decline', depth_meters: -375 },
    { level_number: 7, name: 'Deep Services', depth_meters: -450 },
  ];

  for (const level of levels) {
    await knex('structure_levels').insert({
      structure_id: DEFAULT_STRUCTURE_ID,
      level_number: level.level_number,
      name: level.name,
      depth_meters: level.depth_meters,
      enabled: true,
    });
  }

  // Update existing data to reference the default structure
  await knex('snapshot_levels')
    .whereNull('structure_id')
    .update({ structure_id: DEFAULT_STRUCTURE_ID });

  await knex('events')
    .whereNull('structure_id')
    .update({ structure_id: DEFAULT_STRUCTURE_ID });

  await knex('measurements')
    .whereNull('structure_id')
    .update({ structure_id: DEFAULT_STRUCTURE_ID });

  await knex('alerts')
    .whereNull('structure_id')
    .update({ structure_id: DEFAULT_STRUCTURE_ID });
}

export async function down(knex: Knex): Promise<void> {
  // Remove indexes first
  await knex.schema.alterTable('alerts', (table) => {
    table.dropIndex('structure_id', 'idx_alerts_structure');
  });

  await knex.schema.alterTable('events', (table) => {
    table.dropIndex('structure_id', 'idx_events_structure');
  });

  await knex.schema.alterTable('snapshot_levels', (table) => {
    table.dropIndex('structure_id', 'idx_snapshot_levels_structure');
  });

  // Remove structure_id columns
  await knex.schema.alterTable('alerts', (table) => {
    table.dropColumn('structure_id');
  });

  await knex.schema.alterTable('measurements', (table) => {
    table.dropColumn('structure_id');
  });

  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('structure_id');
  });

  await knex.schema.alterTable('snapshot_levels', (table) => {
    table.dropColumn('structure_id');
  });

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('structure_levels');
  await knex.schema.dropTableIfExists('structures');
}
