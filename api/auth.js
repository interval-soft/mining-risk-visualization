// Password authentication endpoint

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password } = req.body;
    const sitePassword = process.env.SITE_PASSWORD;

    if (!sitePassword) {
        console.error('SITE_PASSWORD environment variable not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (password === sitePassword) {
        // Set authentication cookie (7 days expiry)
        res.setHeader('Set-Cookie', [
            `site_auth=authenticated; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
        ]);
        return res.status(200).json({ success: true });
    }

    return res.status(401).json({ error: 'Invalid password' });
}
