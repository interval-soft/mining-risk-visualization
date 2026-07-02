/**
 * Newman Iron Operations - Multi-Structure Mine Site
 *
 * Serves the current mine state. Levels carry time-varying risk scores
 * simulating a 24-hour cycle across multiple structures. The procedural
 * data generators live in the shared `_lib/mockData.js` module so the AI
 * grounding layer can reuse the exact same mine state.
 */

import { getMockStructures, flattenToLegacyLevels } from '../_lib/mockData.js';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export default function handler(req, res) {
    const now = new Date();

    // Check for structure filter
    const structureCode = req.query.structure;

    // Get all structures with their levels
    let structures = getMockStructures(now);

    // Filter by structure if specified
    if (structureCode) {
        structures = structures.filter(s => s.code === structureCode);
    }

    // Generate flattened levels for backward compatibility
    const levels = flattenToLegacyLevels(structures);

    const response = {
        id: generateUUID(),
        timestamp: now.toISOString(),
        // New multi-structure format
        structures: structures,
        // Backward-compatible flat levels array
        levels: levels
    };

    res.status(200).json(response);
}
