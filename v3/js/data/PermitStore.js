/**
 * PermitStore — console state + transactional actions.
 *
 * Reads /api/v3/permits (falls back to the shared seed when the API is
 * unreachable). Actions run through the SAME state machine as the server
 * (permitFlow.js): applied optimistically for instant UI, then persisted
 * via POST /api/v3/action when a database is configured. Once a local
 * mutation exists without persistence, polling stops overwriting state.
 */

import { buildSeed } from './permitSeed.js';
import { applyTransition } from './permitFlow.js';
import { PERMIT_TYPES } from '../config.js';
import { detectConflicts } from './simops.js';
import { applyIsolationTransition } from './isolationFlow.js';

export class PermitStore {
    constructor() {
        this.state = { permits: [], isolations: [], events: [], kpis: {}, source: 'loading' };
        this.listeners = new Set();
        this.localMutations = false;
    }

    subscribe(fn) { this.listeners.add(fn); }
    _emit() { for (const fn of this.listeners) fn(this.state); }

    async start() {
        await this.refresh();
        setInterval(() => this.refresh(), 30_000);
    }

    async refresh() {
        if (this.localMutations) return;   // don't wipe unpersisted demo state
        try {
            const res = await fetch('/api/v3/permits');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // A local action may have landed while this fetch was in flight —
            // re-check before clobbering, or the optimistic state is lost.
            if (this.localMutations) return;
            this.state = data;
        } catch {
            if (this.localMutations) return;
            const seed = buildSeed(Date.now());
            this.state = { ...seed, source: 'local-seed', kpis: {} };
            this._recomputeKpis();
        }
        this._emit();
    }

    _recomputeKpis() {
        const now = Date.now();
        const s = this.state;
        const issued = s.permits.filter(p => p.status === 'issued');
        s.conflicts = detectConflicts(s.permits);
        s.kpis = {
            active: issued.length,
            pending: s.permits.filter(p => ['requested', 'reviewed', 'verified'].includes(p.status)).length,
            expiringSoon: issued.filter(p => new Date(p.valid_to).getTime() - now < 2 * 3600e3).length,
            conflicts: s.conflicts.filter(c => c.severity === 'high').length,
            isolationsLive: s.isolations.filter(i => ['applied', 'sanction_to_test'].includes(i.status)).length
        };
    }

    byNo(permitNo) {
        return this.state.permits.find(p => p.permit_no === permitNo);
    }

    /**
     * Run a lifecycle action. Throws (with the §-referenced rule message)
     * when the transition is illegal — callers surface it to the user.
     */
    async applyAction(permitNo, actionId, { role, name, reason } = {}) {
        const current = this.byNo(permitNo);
        if (!current) throw new Error(`Unknown permit ${permitNo}`);

        // Same rules as the server — throws before any state change
        const { permit, event } = applyTransition(current, actionId, { role, name, reason });

        Object.assign(current, permit);
        this.state.events.unshift(event);
        this.localMutations = true;
        this._recomputeKpis();
        this._emit();

        try {
            const res = await fetch('/api/v3/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permit_no: permitNo, action: actionId, actor_role: role, actor_name: name, reason })
            });
            const data = await res.json().catch(() => ({}));
            if (data.persisted) {
                this.localMutations = false;
                await this.refresh();
            }
        } catch { /* offline/static dev — optimistic state stands */ }
    }

    /** Demo reset — re-seeds the DB (when present) and re-anchors to today. */
    async resetScenario() {
        try {
            await fetch('/api/v3/seed', { method: 'POST' });
        } catch { /* no API (static dev) — local reset below is enough */ }
        this.localMutations = false;   // allow refresh to overwrite everything
        await this.refresh();
    }

    /** Isolation action (SAP) — §8 rules incl. the §8.1.1 de-isolation guard. */
    async applyIsolationAction(iccNo, actionId, { role } = {}) {
        const iso = this.state.isolations.find(i => i.icc_no === iccNo);
        if (!iso) throw new Error(`Unknown ICC ${iccNo}`);

        const { isolation, event } = applyIsolationTransition(iso, actionId,
            { role, permits: this.state.permits });

        Object.assign(iso, isolation);
        this.state.events.unshift(event);
        this.localMutations = true;
        this._recomputeKpis();
        this._emit();

        try {
            const res = await fetch('/api/v3/isolation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ icc_no: iccNo, action: actionId, actor_role: role })
            });
            const data = await res.json().catch(() => ({}));
            if (data.persisted) { this.localMutations = false; await this.refresh(); }
        } catch { /* optimistic state stands */ }
    }

    /** Digital Appendix I submission. Throws on explicit server rejection. */
    async createPermit(fields) {
        let template = null;
        try {
            const res = await fetch('/api/v3/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                if (data.persisted) { await this.refresh(); return data.permit.permit_no; }
                template = data.template || null;   // no-DB path (200 + template) → local mint below
            } else if (res.status === 400 || res.status === 422) {
                // The deployed API validated and refused — surface it, don't
                // mint a phantom. (404/5xx = no API route in static dev → fall
                // through to the offline local mint below.)
                throw new Error(data.error || 'Permit request rejected.');
            }
        } catch (e) {
            if (e instanceof TypeError) { /* network/offline — fall through to local mint */ }
            else throw e;
        }

        // Local mint (no DB): same shape, next sequential number
        const maxN = Math.max(149, ...this.state.permits.map(p => parseInt(p.permit_no.slice(-4)) || 0));
        const permitNo = `PTW-2026-${String(maxN + 1).padStart(4, '0')}`;
        const validityH = PERMIT_TYPES[fields.type]?.validityH ?? 168;
        const fromMs = Date.now() + 24 * 3600e3;   // §4.3.3: ≥24 h notice
        const validFrom = template?.valid_from || new Date(fromMs).toISOString();
        const validTo = template?.valid_to || new Date(fromMs + validityH * 3600e3).toISOString();
        this.state.permits.push({
            permit_no: permitNo, status: 'requested',
            type: fields.type, cwa: fields.cwa, title: fields.title,
            contractor: fields.contractor || 'Contractor',
            performing_authority: fields.performing_authority || '—',
            lng: fields.lng ?? null, lat: fields.lat ?? null,
            valid_from: validFrom, valid_to: validTo,
            requested_by: fields.contractor || 'Contractor',
            signatures: {}, attachments: fields.attachments || {},
            icc_no: null, revalidated_at: null, description: null
        });
        this.state.events.unshift({
            ts: Date.now(), permit_no: permitNo, actor_role: 'PR',
            action: 'permit requested — Appendix I form submitted (§5.2)'
        });
        this.localMutations = true;
        this._recomputeKpis();
        this._emit();
        return permitNo;
    }
}
