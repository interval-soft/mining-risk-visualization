export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    const { comment } = req.body || {};

    // In a real app, this would update the database
    // For mock purposes, we just return success
    const acknowledgedAlert = {
        id,
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: 'API User',
        acknowledgedComment: comment || null
    };

    res.status(200).json(acknowledgedAlert);
}
