/**
 * Server-side input hardening for the v3 write endpoints.
 *
 * The client's maxlength/selects are cosmetic — a direct POST bypasses them.
 * These helpers bound length and coerce shape so nothing unbounded or
 * mistyped reaches the database (defence in depth behind the render-time
 * HTML escaping; the API is CORS-open).
 */

/** Trim + collapse to a bounded plain string. */
export function clampStr(v, max) {
    return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** CWA identifier: accept only the "CWA-0000" shape. */
export function cleanCwa(v) {
    const s = String(v ?? '').trim().toUpperCase();
    return /^CWA-\d{4}$/.test(s) ? s : null;
}

/** Finite number in range, else null (bad lng/lat must not reach the map). */
export function cleanNum(v, min, max) {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Attachments → flat { knownKey: boolean } only. */
const ATT_KEYS = ['rams', 'tra', 'lift_plan', 'utility_drawings', 'gas_test'];
export function cleanAttachments(v) {
    const src = (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    const out = {};
    for (const k of ATT_KEYS) if (k in src) out[k] = !!src[k];
    return out;
}

/** Known persona/role codes. */
const ROLE_CODES = new Set(['WA', 'AA', 'PI', 'PA', 'SAP', 'PR']);
export function cleanRole(v) {
    const s = String(v ?? '').trim().toUpperCase();
    return ROLE_CODES.has(s) ? s : null;
}
