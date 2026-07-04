/**
 * PermitStore — fetches console state from /api/v3/permits, falling back
 * to the shared seed module when the API is unreachable (static local dev).
 * Notifies subscribers on refresh (poll every 30 s — permit state changes
 * slowly; countdowns tick client-side between refreshes).
 */

import { buildSeed } from './permitSeed.js';

export class PermitStore {
    constructor() {
        this.state = { permits: [], isolations: [], events: [], kpis: {}, source: 'loading' };
        this.listeners = new Set();
    }

    subscribe(fn) { this.listeners.add(fn); }
    _emit() { for (const fn of this.listeners) fn(this.state); }

    async start() {
        await this.refresh();
        setInterval(() => this.refresh(), 30_000);
    }

    async refresh() {
        try {
            const res = await fetch('/api/v3/permits');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.state = await res.json();
        } catch {
            // Static dev / API down — same scenario, computed locally
            const seed = buildSeed(Date.now());
            const issued = seed.permits.filter(p => p.status === 'issued');
            this.state = {
                ...seed,
                source: 'local-seed',
                kpis: {
                    active: issued.length,
                    pending: seed.permits.filter(p => ['requested', 'reviewed', 'verified'].includes(p.status)).length,
                    expiringSoon: issued.filter(p => new Date(p.valid_to).getTime() - Date.now() < 2 * 3600e3).length,
                    conflicts: null,
                    isolationsLive: seed.isolations.length
                }
            };
        }
        this._emit();
    }

    byNo(permitNo) {
        return this.state.permits.find(p => p.permit_no === permitNo);
    }
}
