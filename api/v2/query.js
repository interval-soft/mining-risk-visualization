/**
 * V2 AI Query — POST /api/v2/query
 *
 * Natural-language questions about the live Oyu Tolgoi console state.
 * Grounded on the deterministic fleet simulation (identical to what the
 * browser renders) plus static site-asset facts. No database dependency.
 */

import { callOpenRouter } from '../_lib/openrouter.js';
import { getFleetState, getKPIs } from '../_lib/v2/fleetSim.js';

/** Compact site-asset facts (mirrors v2/js/config.js KEY_ASSETS). */
const SITE_ASSETS = [
    'PIT-SW Open Pit (Southwest Oyu): 2.56 x 1.74 km, ~466 m deep, 15 m benches',
    'SH-01 Shaft #1: 6.7 m dia, 1,385 m deep, production/services',
    'SH-02 Shaft #2 (winding): 10 m dia, 1,284 m deep, ore hoisting',
    'SH-05 Shaft #5 (ventilation): 6.7 m dia, 1,178 m deep, exhaust',
    'CON-01 Concentrator: 100,000 t/day throughput, 6 levels',
    'DOM-01 Coarse Ore Stockpile Dome: 45 m high, fed by overland conveyor',
    'TSF-01 Tailings Storage Facility: multiple cells east of plant',
    'CMP-01 Camp & Administration',
    'APT-01 Khanbumbat Airport (ZMKB): 2nd busiest in Mongolia',
    'UG-HN Hugo North Block Cave: 1,300 m deep, 2,231 drawpoints, 52 drifts, 95,000 t/day capacity, ~200 km of tunnels, ore reaches surface via a 13.2 km conveyor'
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query } = req.body || {};
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
        return res.status(400).json({ error: 'Missing or too-short field: query' });
    }
    if (query.length > 300) {
        return res.status(400).json({ error: 'Query too long (max 300 characters)' });
    }

    const now = Date.now();
    const fleet = getFleetState(now);
    const kpis = getKPIs(now);
    const timeULN = new Date(now).toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Ulaanbaatar', hour12: false
    });

    const fleetLines = fleet.map(u =>
        `- ${u.id} (${u.model}, ${u.type}): ${u.status.toUpperCase()}, ${u.phase}, ${u.location}` +
        (u.speedKmh ? `, ${u.speedKmh} km/h` : '') +
        (u.payloadT ? `, carrying ${u.payloadT} t` : '')
    ).join('\n');

    const systemPrompt = `You are the operations AI assistant for the Oyu Tolgoi mine control room (Ömnögovi, Mongolia).

RULES:
1. Answer ONLY from the provided live data and site facts — never invent numbers.
2. Reference units by their ID (e.g. HT-103). Keep answers concise and operational.
3. If the data cannot answer the question, say exactly what is missing.
4. Site local time is ULN (UTC+8). Current time: ${timeULN} ULN.`;

    const userPrompt = `Question: ${query.trim()}

LIVE KPIs:
- Throughput: ${kpis.throughputTph} t/h
- Fleet operating: ${kpis.operating}/${kpis.total}
- Utilisation: ${kpis.utilisationPct}%
- Active alerts (units down): ${kpis.activeAlerts}

LIVE FLEET (${fleet.length} units):
${fleetLines}

SITE ASSETS:
${SITE_ASSETS.map(a => '- ' + a).join('\n')}

Answer the question from this data.`;

    try {
        const response = await callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], { temperature: 0.2, maxTokens: 500 });

        return res.status(200).json({
            answer: response.content,
            model: response.model,
            latencyMs: response.latencyMs,
            timestamp: new Date(now).toISOString()
        });
    } catch (error) {
        console.error('V2 query failed:', error);
        return res.status(500).json({
            error: 'AI query failed',
            message: error.message
        });
    }
}
