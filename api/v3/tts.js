/**
 * V3 tour narration TTS — POST /api/v3/tts
 *
 * Turns a short English narration text into speech via OpenRouter.
 * Used at BUILD TIME by v3/tools/gen-tour-audio.mjs to pre-generate the
 * static narration files shipped in v3/assets/tour/ — the wizard never
 * depends on this endpoint at demo time (demo must never break).
 *
 * OpenRouter serves audio output only with stream:true (SSE) — we
 * accumulate the base64 audio deltas server-side and hand back one blob.
 * Response: { audio: <base64>, format: 'mp3'|'wav', model, latencyMs }
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Preferred first. The Gemini TTS preview is kept for the day OpenRouter
// serves it; as of 2026-07 the audio-capable models there are OpenAI's
// gpt-audio family (checked via /api/v1/models).
const TTS_MODELS = [
    'google/gemini-3.1-flash-tts-preview',
    'openai/gpt-audio-mini',
    'openai/gpt-audio'
];

// Female English voice per model family.
const VOICE_BY_FAMILY = { google: 'Kore', openai: 'nova' };

/** Wrap raw pcm16 mono samples in a WAV header. */
function pcm16ToWav(pcm, sampleRate = 24000) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);            // PCM
    header.writeUInt16LE(1, 22);            // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
}

async function streamAudio(apiKey, model, voice, format, text) {
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
            stream: true,
            modalities: ['text', 'audio'],
            audio: { voice, format },
            messages: [{
                role: 'user',
                content: `Read the following control-room tour narration aloud, verbatim. Calm, clear, professional female voice, measured pace. Do not add any words of your own:\n\n${text}`
            }]
        })
    });
    if (!r.ok) {
        const err = await r.text();
        throw new Error(`HTTP ${r.status} ${err.slice(0, 200)}`);
    }
    // accumulate SSE
    const chunks = [];
    let usedModel = model;
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
            if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
            try {
                const j = JSON.parse(line.slice(6));
                usedModel = j.model || usedModel;
                const d = j.choices?.[0]?.delta;
                if (d?.audio?.data) chunks.push(Buffer.from(d.audio.data, 'base64'));
            } catch { /* keep-alive comments etc. */ }
        }
    }
    if (!chunks.length) throw new Error('stream produced no audio deltas');
    return { buf: Buffer.concat(chunks), model: usedModel };
}

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
        const v = voice || VOICE_BY_FAMILY[model.split('/')[0]] || 'nova';
        for (const format of ['mp3', 'pcm16']) {
            try {
                const { buf, model: usedModel } = await streamAudio(apiKey, model, v, format, text.trim());
                const out = format === 'pcm16' ? pcm16ToWav(buf) : buf;
                return res.status(200).json({
                    audio: out.toString('base64'),
                    format: format === 'pcm16' ? 'wav' : 'mp3',
                    model: usedModel,
                    latencyMs: Date.now() - t0
                });
            } catch (e) {
                errors.push(`${model}/${format}: ${e.message}`);
                if (!/format|pcm/i.test(e.message)) break;  // format retry only when format is the complaint
            }
        }
    }
    return res.status(502).json({ error: 'All TTS models failed', detail: errors });
}
