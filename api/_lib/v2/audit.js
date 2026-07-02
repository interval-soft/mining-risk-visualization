/**
 * V2 AI audit trail — persistence layer (Supabase/Postgres).
 *
 * Self-provisioning: the table is created on first use, so pointing
 * DATABASE_URL at any Postgres is the only setup step. Without it, logging
 * is silently skipped — persistence must NEVER break a live request
 * (post-Supabase-pause resilience rule).
 */

import { query } from '../db.js';

let ensured = false;

async function ensureTable() {
    if (ensured) return;
    await query(`
        CREATE TABLE IF NOT EXISTS v2_ai_queries (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            ts TIMESTAMPTZ NOT NULL DEFAULT now(),
            query TEXT NOT NULL,
            answer TEXT,
            model TEXT,
            latency_ms INTEGER,
            ok BOOLEAN NOT NULL DEFAULT true,
            error TEXT
        )`);
    ensured = true;
}

/**
 * Log one AI interaction. Awaitable (call before responding — serverless
 * may freeze after the response is sent) but failure-proof.
 */
export async function logAIQuery({ question, answer, model, latencyMs, ok, error }) {
    if (!process.env.DATABASE_URL) return;
    try {
        await ensureTable();
        await query(
            `INSERT INTO v2_ai_queries (query, answer, model, latency_ms, ok, error)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [question, answer ?? null, model ?? null, latencyMs ?? null, ok, error ?? null]
        );
    } catch (e) {
        console.warn('AI audit logging skipped:', e.message);
    }
}
