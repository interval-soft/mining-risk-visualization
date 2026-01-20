import { query } from './_lib/db.js';

export default async function handler(req, res) {
    const debug = {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : null,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };

    try {
        // Test database connection
        const result = await query('SELECT COUNT(*) as count FROM alerts');
        debug.dbConnection = 'success';
        debug.alertCount = result[0]?.count;
    } catch (error) {
        debug.dbConnection = 'failed';
        debug.dbError = error.message;
    }

    res.status(200).json(debug);
}
