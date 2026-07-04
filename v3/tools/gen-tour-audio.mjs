/**
 * Pre-generates the tour narration MP3s.
 *
 *   GEMINI_API_KEY=... node v3/tools/gen-tour-audio.mjs [--only stepId] [--voice Kore]
 *
 * Reads the narration texts from v3/js/tour/tourSteps.js (single source of
 * truth). Two backends:
 *  - PREFERRED: Google AI Studio direct (env GEMINI_API_KEY) — Gemini TTS
 *    (gemini-3.1-flash-tts-preview, voice Kore), natural delivery. The key
 *    is NEVER stored in the repo; pass it via the environment.
 *  - Fallback: the deployed POST /api/v3/tts (OpenRouter gpt-audio family).
 * Writes v3/assets/tour/<id>.mp3 — commit the files: the wizard plays
 * static audio, no runtime AI dependency.
 */

import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { TOUR_STEPS } from '../js/tour/tourSteps.js';

const ENDPOINT = process.env.TTS_ENDPOINT || 'https://mining-risk-viz.vercel.app/api/v3/tts';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'tour');

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
// Gemini default female voice; for the fallback endpoint leave undefined
// (it picks the right voice for whichever model answers).
const voice = args.includes('--voice') ? args[args.indexOf('--voice') + 1]
    : (GEMINI_KEY ? 'Kore' : undefined);

const STYLE = 'Speak in a warm, natural, unhurried professional tone — a friendly control-room guide. ' +
    'Read the following narration verbatim, without adding anything:\n\n';

/** Google AI Studio direct: returns { buf: <pcm16 Buffer>, rate } */
async function geminiTts(text) {
    const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: STYLE + text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
                }
            })
        });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `HTTP ${r.status}`);
    const blob = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!blob?.data) throw new Error('no inlineData in response');
    const rate = /rate=(\d+)/.exec(blob.mimeType || '')?.[1] || '24000';
    return { buf: Buffer.from(blob.data, 'base64'), rate };
}

await mkdir(OUT_DIR, { recursive: true });

let ok = 0, fail = 0;
for (const step of TOUR_STEPS) {
    if (only && step.id !== only) continue;
    process.stdout.write(`${step.id.padEnd(14)} `);
    const target = join(OUT_DIR, `${step.id}.mp3`);
    try {
        const t0 = Date.now();
        if (GEMINI_KEY) {
            const { buf, rate } = await geminiTts(step.narration);
            const tmp = join(OUT_DIR, `${step.id}.tmp.raw`);
            await writeFile(tmp, buf);
            execFileSync('ffmpeg', ['-y', '-v', 'quiet', '-f', 's16le', '-ar', rate, '-ac', '1',
                '-i', tmp, '-b:a', '64k', target]);
            await unlink(tmp);
            console.log(`OK  ${(buf.length / 1024).toFixed(0)} kB pcm → mp3  (${GEMINI_MODEL}/${voice}, ${Date.now() - t0} ms)`);
        } else {
            const r = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: step.narration, voice })
            });
            const data = await r.json();
            if (!r.ok || !data.audio) throw new Error(data.error || `HTTP ${r.status}`);
            const buf = Buffer.from(data.audio, 'base64');
            if (data.format === 'mp3') {
                await writeFile(target, buf);
            } else {
                // wav (pcm16) → mp3, mono voice 64k is plenty and keeps the repo light
                const tmp = join(OUT_DIR, `${step.id}.tmp.${data.format}`);
                await writeFile(tmp, buf);
                execFileSync('ffmpeg', ['-y', '-v', 'quiet', '-i', tmp, '-ac', '1', '-b:a', '64k', target]);
                await unlink(tmp);
            }
            console.log(`OK  ${(buf.length / 1024).toFixed(0)} kB ${data.format} → mp3  (${data.model}, ${data.latencyMs} ms)`);
        }
        ok++;
    } catch (e) {
        console.log('FAIL', e.message);
        fail++;
    }
}
console.log(`\n${ok} generated, ${fail} failed → ${OUT_DIR}`);
if (fail) process.exit(1);
