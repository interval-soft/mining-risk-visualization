import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            max: 1 // Serverless functions should use minimal connections
        });
    }
    return pool;
}

export async function query(text, params) {
    const pool = getPool();
    const result = await pool.query(text, params);
    return result.rows;
}
