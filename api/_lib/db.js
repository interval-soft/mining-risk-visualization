import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

export function getPool() {
    if (!pool && process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            max: 1
        });
    }
    return pool;
}

export async function query(text, params) {
    const p = getPool();
    if (!p) {
        throw new Error('No database connection configured');
    }
    const result = await p.query(text, params);
    return result.rows;
}
