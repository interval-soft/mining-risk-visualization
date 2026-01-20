export default async function handler(req, res) {
    const debug = {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 25) : null,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };

    try {
        const { query } = await import('./_lib/db.js');
        const result = await query('SELECT COUNT(*) as count FROM alerts');
        debug.dbConnection = 'success';
        debug.alertCount = parseInt(result[0]?.count || 0);
    } catch (error) {
        debug.dbConnection = 'failed';
        debug.dbError = error.message;
    }

    res.status(200).json(debug);
}
