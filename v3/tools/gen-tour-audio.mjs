/**
 * Pre-generates the tour narration MP3s — run AFTER deploying /api/v3/tts.
 *
 *   node v3/tools/gen-tour-audio.mjs [--only stepId] [--voice Kore]
 *
 * Reads the narration texts from v3/js/tour/tourSteps.js (single source of
 * truth) and calls the PRODUCTION endpoint (the OpenRouter key only exists
 * there, marked Sensitive in Vercel). Writes v3/assets/tour/<id>.mp3 —
 * commit the files: the wizard plays static audio, no runtime AI dependency.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOUR_STEPS } from '../js/tour/tourSteps.js';

const ENDPOINT = process.env.TTS_ENDPOINT || 'https://mining-risk-viz.vercel.app/api/v3/tts';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'tour');

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const voice = args.includes('--voice') ? args[args.indexOf('--voice') + 1] : 'Kore';

await mkdir(OUT_DIR, { recursive: true });

let ok = 0, fail = 0;
for (const step of TOUR_STEPS) {
    if (only && step.id !== only) continue;
    process.stdout.write(`${step.id.padEnd(14)} `);
    try {
        const r = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: step.narration, voice })
        });
        const data = await r.json();
        if (!r.ok || !data.audio) throw new Error(data.error || `HTTP ${r.status}`);
        const buf = Buffer.from(data.audio, 'base64');
        await writeFile(join(OUT_DIR, `${step.id}.mp3`), buf);
        console.log(`OK  ${(buf.length / 1024).toFixed(0)} kB  (${data.model}, ${data.latencyMs} ms)`);
        ok++;
    } catch (e) {
        console.log('FAIL', e.message);
        fail++;
    }
}
console.log(`\n${ok} generated, ${fail} failed → ${OUT_DIR}`);
if (fail) process.exit(1);
