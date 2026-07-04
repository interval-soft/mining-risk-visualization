/**
 * V3 tour narration TTS — POST /api/v3/tts
 *
 * Turns a short English narration text into speech via OpenRouter
 * (Gemini TTS, female voice). Used at BUILD TIME by
 * v3/tools/gen-tour-audio.mjs to pre-generate the static MP3s shipped in
 * v3/assets/tour/ — the wizard never depends on this endpoint at demo
 * time (demo must never break). Kept deployed as a fallback for
 * regenerating narration.
 *
 * Response: { audio: <base64>, format, model, latencyMs }
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Model candidates, most preferred first. IDs drift while Gemini TTS is in
// preview, so we walk the list until one accepts the request.
const TTS_MODELS = [
    'google/gemini-3.1-flash-tts-preview',
    'google/gemini-2.5-flash-preview-tts',
    'google/gemini-2.5-pro-preview-tts'
];

const DEFAULT_VOICE = 'Kore'; // female English voice (Gemini prebuilt)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured' });
    }
    const { text, voice } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
        return res.status(400).json({ error: 'Missing or too-short field: text' });
    }
    if (text.length > 800) {
        return res.status(400).json({ error: 'Text too long (max 800 characters)' });
    }

    const t0 = Date.now();
    const errors = [];
    for (const model of TTS_MODELS) {
        try {
            const r = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://mining-risk-viz.vercel.app',
                    'X-Title': 'DigitalTwin v3 tour TTS'
                },
                body: JSON.stringify({
                    model,
                    modalities: ['text', 'audio'],
                    audio: { voice: voice || DEFAULT_VOICE, format: 'mp3' },
                    messages: [{
                        role: 'user',
                        content: `Read the following control-room tour narration aloud. Calm, clear, professional female voice, measured pace:\n\n${text.trim()}`
                    }]
                })
            });
            const data = await r.json();
            if (!r.ok) {
                errors.push(`${model}: HTTP ${r.status} ${JSON.stringify(data?.error?.message || data).slice(0, 200)}`);
                continue;
            }
            const audio = data.choices?.[0]?.message?.audio;
            if (!audio?.data) {
                errors.push(`${model}: no audio in response (${JSON.stringify(data.choices?.[0]?.message || {}).slice(0, 150)})`);
                continue;
            }
            return res.status(200).json({
                audio: audio.data,
                format: audio.format || 'mp3',
                model: data.model || model,
                latencyMs: Date.now() - t0
            });
        } catch (e) {
            errors.push(`${model}: ${e.message}`);
        }
    }
    return res.status(502).json({ error: 'All TTS models failed', detail: errors });
}
