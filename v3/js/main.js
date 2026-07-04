/**
 * DigitalTwin v3 — ePTW Console entry point.
 * HMCCP Control of Work, Padeswood.
 *
 * Milestone 2: permit engine — board, map pins, live detail, KPIs, audit feed.
 * Milestone 3 adds workflow actions, 4 SIMOPS, 5 isolations UI, 6 the AI.
 */

import { SITE, PERMIT_TYPES, PERMIT_STATUS, ROLES, PERSONAS } from './config.js';
import { MapManager } from './map/MapManager.js';
import { PermitStore } from './data/PermitStore.js';
import { actionsFor, awaitingRole } from './data/permitFlow.js';
import { ISOLATION_ACTIONS, openLinkedPermits } from './data/isolationFlow.js';

const TYPE_COLORS = Object.fromEntries(
    Object.entries(PERMIT_TYPES).map(([k, v]) => [k, v.color]));

const BOARD_GROUPS = [
    { title: 'Issued · Active', statuses: ['issued'] },
    { title: 'Authorised — awaiting PA', statuses: ['authorised'] },
    { title: 'In approval (§5)', statuses: ['requested', 'reviewed', 'verified'] },
    { title: 'Suspended', statuses: ['suspended'] },
    { title: 'Closed — recent', statuses: ['closed', 'withdrawn', 'expired'] }
];

class ControlOfWorkConsole {
    constructor() {
        this.mapManager = null;
        this.persona = 'PI';
        this.selectedPermitNo = null;
        this.store = new PermitStore();

        try {
            this.mapManager = new MapManager('map', (f) => this.showCwaDetail(f));
            this.mapManager.onPermitClick = (no) => this.selectPermit(no, { flyTo: false });
        } catch (err) {
            console.error('Map initialisation failed:', err);
            this.showMapError();
        }

        this.buildPersonaSwitcher();
        this.buildBoardLegend();
        this.bindControls();
        this.setClock();

        this.store.subscribe((s) => this.render(s));
        this.store.start();
        setInterval(() => this.tickCountdowns(), 1000);
    }

    // ---------- rendering ----------

    render(state) {
        this.renderKpis(state.kpis, state.source);
        this.renderBoard(state.permits);
        this.renderApprovals(state.permits);
        this.renderEvents(state.events);
        this.mapManager?.updatePermits(state.permits, TYPE_COLORS);
        this.mapManager?.updateConflicts(state.conflicts || []);
        this.mapManager?.updateIsolations(state.isolations || []);
        const badge = document.getElementById('simops-count');
        const n = (state.conflicts || []).length;
        badge.hidden = n === 0;
        badge.textContent = n;
        if (this.selectedPermitNo) {
            const p = this.store.byNo(this.selectedPermitNo);
            if (p) this.showPermitDetail(p);
        }
    }

    renderKpis(k, source) {
        const set = (id, v) => { document.getElementById(id).textContent = v ?? '—'; };
        set('kpi-active', k.active);
        set('kpi-pending', k.pending);
        set('kpi-expiring', k.expiringSoon);
        set('kpi-conflicts', k.conflicts ?? '—');
        set('kpi-isolations', k.isolationsLive);
        document.getElementById('kpi-expiring').classList.toggle('kpi-alert-active', k.expiringSoon > 0);
        document.getElementById('kpi-conflicts').classList.toggle('kpi-alert-active', (k.conflicts ?? 0) > 0);
        document.querySelectorAll('.kpi').forEach(el => el.classList.remove('kpi-placeholder'));
        document.getElementById('data-source').textContent =
            source === 'db' ? 'Supabase · live' : 'SEED · deterministic (no DB)';
    }

    renderBoard(permits) {
        const board = document.getElementById('permit-board');
        board.innerHTML = '';
        for (const group of BOARD_GROUPS) {
            const items = permits.filter(p => group.statuses.includes(p.status));
            if (!items.length) continue;
            const h = document.createElement('div');
            h.className = 'rail-group';
            h.textContent = `${group.title} (${items.length})`;
            board.appendChild(h);
            for (const p of items) {
                const row = document.createElement('button');
                row.className = 'asset-row permit-row';
                row.dataset.permitNo = p.permit_no;
                if (p.permit_no === this.selectedPermitNo) row.classList.add('selected');
                row.innerHTML = `
                    <span class="permit-type-chip" style="background:${TYPE_COLORS[p.type]}"></span>
                    <span class="asset-id">${p.permit_no.replace('PTW-2026-', '')}</span>
                    <span class="asset-name" title="${p.title}">${p.cwa.replace('CWA-', 'C')} · ${p.title}</span>
                    <span class="permit-countdown" data-valid-to="${p.valid_to}" data-status="${p.status}"></span>`;
                row.addEventListener('click', () => this.selectPermit(p.permit_no, { flyTo: true }));
                board.appendChild(row);
            }
        }
        this.tickCountdowns();
    }

    /** "My approvals" — permits awaiting an action from the current persona. */
    renderApprovals(permits) {
        const box = document.getElementById('approvals-list');
        const waiting = awaitingRole(this.persona);
        const items = permits.filter(p => waiting.has(p.status));
        box.innerHTML = '';
        if (!items.length) {
            box.innerHTML = '<div class="board-empty">Nothing awaiting ' + this.persona + '.</div>';
            return;
        }
        for (const p of items) {
            const row = document.createElement('button');
            row.className = 'asset-row approval-row';
            row.innerHTML = `
                <span class="permit-type-chip" style="background:${TYPE_COLORS[p.type]}"></span>
                <span class="asset-id">${p.permit_no.replace('PTW-2026-', '')}</span>
                <span class="asset-name" title="${p.title}">${PERMIT_STATUS[p.status].label} · ${p.title}</span>`;
            row.addEventListener('click', () => this.selectPermit(p.permit_no, { flyTo: true }));
            box.appendChild(row);
        }
    }

    async runAction(permitNo, actionId, reason = null) {
        const errEl = document.getElementById('detail-error');
        try {
            await this.store.applyAction(permitNo, actionId,
                { role: this.persona, reason });
        } catch (e) {
            if (errEl) { errEl.textContent = e.message; }
            return;
        }
        const p = this.store.byNo(permitNo);
        if (p) this.showPermitDetail(p);
    }

    renderEvents(events) {
        const feed = document.getElementById('event-list');
        document.querySelector('#event-feed .feed-empty')?.remove();
        feed.innerHTML = '';
        for (const ev of events.slice(0, 30)) {
            const el = document.createElement('div');
            el.className = 'event-entry';
            const time = new Date(ev.ts).toLocaleTimeString('en-GB',
                { timeZone: SITE.timeZone, hour12: false, hour: '2-digit', minute: '2-digit' });
            const day = new Date(ev.ts).toLocaleDateString('en-GB',
                { timeZone: SITE.timeZone, day: '2-digit', month: '2-digit' });
            el.innerHTML = `
                <span class="event-time">${day} ${time}</span>
                <span class="event-unit">${ev.actor_role || '—'}</span>
                <span class="event-text">${ev.permit_no.replace('PTW-2026-', 'PTW ')} — ${ev.action}</span>`;
            feed.appendChild(el);
        }
    }

    /** Live validity countdowns (client-side tick between refreshes). */
    tickCountdowns() {
        const now = Date.now();
        document.querySelectorAll('.permit-countdown').forEach(el => {
            const status = el.dataset.status;
            if (!['issued', 'authorised'].includes(status)) { el.textContent = ''; return; }
            const left = new Date(el.dataset.validTo).getTime() - now;
            if (left <= 0) { el.textContent = 'EXPIRED'; el.className = 'permit-countdown cd-danger'; return; }
            const h = Math.floor(left / 3600e3), m = Math.floor((left % 3600e3) / 60e3);
            el.textContent = h > 48 ? `${Math.floor(h / 24)} d` : h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
            el.className = 'permit-countdown' + (left < 2 * 3600e3 ? ' cd-danger' : left < 6 * 3600e3 ? ' cd-warn' : '');
        });
    }

    // ---------- selection & detail ----------

    selectPermit(no, { flyTo }) {
        this.selectedPermitNo = no;
        document.querySelectorAll('.permit-row').forEach(el =>
            el.classList.toggle('selected', el.dataset.permitNo === no));
        const p = this.store.byNo(no);
        if (!p) return;
        if (flyTo) this.mapManager?.flyToPermit(p);
        this.showPermitDetail(p);
    }

    showPermitDetail(p) {
        const t = PERMIT_TYPES[p.type];
        const st = PERMIT_STATUS[p.status];
        const sigs = typeof p.signatures === 'string' ? JSON.parse(p.signatures) : (p.signatures || {});
        const atts = typeof p.attachments === 'string' ? JSON.parse(p.attachments) : (p.attachments || {});

        const chain = ROLES.map(r => {
            const s = sigs[r.id.toLowerCase()];
            return `<span class="sig ${s ? 'sig-done' : 'sig-pending'}" title="${s ? s.name : 'pending'}">${r.id}</span>`;
        }).join('<span class="sig-arrow">→</span>');

        const attRows = Object.entries(atts).map(([k, v]) =>
            `<span class="att ${v ? 'att-ok' : 'att-missing'}">
                <i class="ph-duotone ${v ? 'ph-check-circle' : 'ph-x-circle'}"></i>${k.replace(/_/g, ' ')}</span>`
        ).join('');

        const fmt = (iso) => new Date(iso).toLocaleString('en-GB',
            { timeZone: SITE.timeZone, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

        const panel = document.getElementById('detail-panel');
        panel.innerHTML = `
            <div class="detail-header">
                <span class="cwa-chip" style="background:${t.color}"></span>
                <div>
                    <div class="detail-id">${p.permit_no} · <span class="status-badge status-tone-${st.tone}">${st.label.toUpperCase()}</span></div>
                    <div class="detail-name">${p.title}</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            <div class="detail-row"><span>Type</span><span>${t.label} · ${t.validity}</span></div>
            <div class="detail-row"><span>Area</span><span>${p.cwa}</span></div>
            <div class="detail-row"><span>Contractor / PA</span><span>${p.contractor} · ${p.performing_authority}</span></div>
            <div class="detail-row"><span>Validity</span><span>${fmt(p.valid_from)} → ${fmt(p.valid_to)}
                <span class="permit-countdown" data-valid-to="${p.valid_to}" data-status="${p.status}"></span></span></div>
            ${p.revalidated_at ? `<div class="detail-row"><span>Revalidated</span><span>${fmt(p.revalidated_at)} (§6.2.2)</span></div>` : ''}
            ${p.icc_no ? `<div class="detail-row"><span>Isolation</span><span>${p.icc_no}</span></div>` : ''}
            <div class="detail-row"><span>Approval chain</span><span class="sig-chain">${chain}</span></div>
            <div class="detail-atts">${attRows}</div>
            ${p.description ? `<div class="detail-note">${p.description}</div>` : ''}
            <div class="detail-actions" id="detail-actions"></div>
            <div class="detail-error" id="detail-error"></div>`;
        const actionsBox = panel.querySelector('#detail-actions');
        const actions = actionsFor(p.status, this.persona);
        if (!actions.length) {
            actionsBox.innerHTML = `<span class="detail-muted">No ${this.persona} action for status "${p.status}"</span>`;
        }
        for (const a of actions) {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.innerHTML = `<i class="ph-duotone ${a.icon}"></i>${a.label}`;
            btn.addEventListener('click', () => {
                if (!a.needsReason) return this.runAction(p.permit_no, a.id);
                let row = panel.querySelector('.reason-row');
                if (row) { row.remove(); return; }
                row = document.createElement('div');
                row.className = 'reason-row';
                row.innerHTML = `<input type="text" maxlength="120" placeholder="Reason (§6.2.4) — required">
                                 <button class="action-btn">Confirm</button>`;
                row.querySelector('button').addEventListener('click', () => {
                    const reason = row.querySelector('input').value.trim();
                    if (reason) this.runAction(p.permit_no, a.id, reason);
                });
                actionsBox.after(row);
                row.querySelector('input').focus();
            });
            actionsBox.appendChild(btn);
        }
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => {
            panel.classList.remove('open');
            this.selectedPermitNo = null;
            document.querySelectorAll('.permit-row').forEach(el => el.classList.remove('selected'));
        });
        this.tickCountdowns();
    }

    showCwaDetail(feature) {
        const p = feature.properties;
        const active = this.store.state.permits.filter(x =>
            x.cwa === p.id && !['closed', 'withdrawn', 'expired'].includes(x.status));
        const rows = active.map(x =>
            `<div class="detail-row"><span>${x.permit_no.replace('PTW-2026-', 'PTW ')}</span>
             <span>${PERMIT_TYPES[x.type].label} · ${PERMIT_STATUS[x.status].label}</span></div>`).join('');
        const panel = document.getElementById('detail-panel');
        panel.innerHTML = `
            <div class="detail-header">
                <span class="cwa-chip" style="background:${p.color}"></span>
                <div>
                    <div class="detail-id">${p.id}</div>
                    <div class="detail-name">${p.name}</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            <div class="detail-row"><span>Live permits</span><span>${active.length}</span></div>
            ${rows || ''}
            <div class="detail-note">Zone schematic — traced from PTW Procedure RevB, Appendix H.</div>`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
        this.mapManager?.flyToCwa(feature);
    }

    // ---------- shell ----------

    showMapError() {
        document.getElementById('map').innerHTML = `
            <div class="map-error">
                <i class="ph-duotone ph-warning-octagon"></i>
                <div>Map unavailable — WebGL could not be initialised.</div>
            </div>`;
    }

    buildPersonaSwitcher() {
        const sel = document.getElementById('persona-select');
        for (const role of PERSONAS) {
            const opt = document.createElement('option');
            opt.value = role.id;
            opt.textContent = `${role.id} — ${role.name}`;
            sel.appendChild(opt);
        }
        sel.value = this.persona;
        sel.addEventListener('change', () => {
            this.persona = sel.value;
            this.render(this.store.state);
        });
    }

    buildBoardLegend() {
        const el = document.getElementById('board-legend');
        for (const t of Object.values(PERMIT_TYPES)) {
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `
                <span class="legend-swatch" style="background:${t.color}"></span>
                <span class="legend-label">${t.label}</span>
                <span class="legend-validity">${t.validity}</span>`;
            el.appendChild(row);
        }
    }

    bindControls() {
        const planBtn = document.getElementById('btn-plan');
        planBtn.classList.add('active');
        planBtn.addEventListener('click', () => {
            const on = this.mapManager?.togglePlotPlan();
            planBtn.classList.toggle('active', !!on);
        });
        const cwaBtn = document.getElementById('btn-cwa');
        cwaBtn.addEventListener('click', () => {
            const on = this.mapManager?.toggleCwa();
            cwaBtn.classList.toggle('active', !!on);
        });
        cwaBtn.classList.add('active');
        document.getElementById('btn-reset').addEventListener('click', () =>
            this.mapManager?.resetView());
        document.getElementById('btn-simops').addEventListener('click', () => this.showSimopsPanel());
        document.getElementById('btn-isolations').addEventListener('click', () => this.showIsolationPanel());
        if (this.mapManager) {
            this.mapManager.onConflictClick = (id) => this.showSimopsPanel(id);
            this.mapManager.onIsolationClick = (icc) => this.showIsolationPanel(icc);
        }
        this.bindPermitForm();
        this.bindAskAI();
        this.bindResetScenario();
    }

    /** AI Control of Work — grounded on live state + the procedure itself. */
    bindAskAI() {
        const form = document.getElementById('ask-form');
        const input = document.getElementById('ask-input');
        const submit = document.getElementById('ask-submit');
        const answerBox = document.getElementById('ask-answer');
        const body = document.getElementById('ask-answer-body');
        const meta = document.getElementById('ask-answer-meta');

        document.getElementById('ask-answer-close').addEventListener('click', () => {
            answerBox.hidden = true;
        });
        document.querySelectorAll('.ask-chip').forEach(chip =>
            chip.addEventListener('click', () => {
                input.value = chip.dataset.q;
                form.requestSubmit();
            }));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const q = input.value.trim();
            if (q.length < 3) return;
            submit.disabled = true;
            answerBox.hidden = false;
            body.innerHTML = '<span class="thinking">Checking live permits, SIMOPS and the procedure…</span>';
            meta.textContent = '';
            try {
                const res = await fetch('/api/v3/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: q })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const escaped = data.answer
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                body.innerHTML = escaped
                    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
                    .replace(/\((§[\d.]+[^)]*)\)/g, '<span class="sref">($1)</span>');
                meta.textContent = `${data.model || 'AI'} · ${((data.latencyMs || 0) / 1000).toFixed(1)}s · grounded on live state + PTW Procedure RevB`;
            } catch (err) {
                body.textContent = 'AI unavailable. The query API is a serverless function — use the deployed environment.';
                meta.textContent = String(err.message || err);
            } finally {
                submit.disabled = false;
                input.select();
            }
        });
    }

    /** Demo reset — two-step confirm so a stray click can't wipe a live walkthrough. */
    bindResetScenario() {
        const resetBtn = document.getElementById('btn-reset-scenario');
        let armed = null;
        resetBtn.addEventListener('click', async () => {
            if (!armed) {
                resetBtn.innerHTML = '<i class="ph-duotone ph-warning"></i> Confirm reset?';
                resetBtn.classList.add('mini-btn-armed');
                armed = setTimeout(() => {
                    resetBtn.innerHTML = '<i class="ph-duotone ph-arrow-counter-clockwise"></i> Reset scenario';
                    resetBtn.classList.remove('mini-btn-armed');
                    armed = null;
                }, 4000);
                return;
            }
            clearTimeout(armed); armed = null;
            resetBtn.innerHTML = '<i class="ph-duotone ph-hourglass"></i> Resetting…';
            resetBtn.disabled = true;
            this.selectedPermitNo = null;
            document.getElementById('detail-panel').classList.remove('open');
            await this.store.resetScenario();
            resetBtn.innerHTML = '<i class="ph-duotone ph-arrow-counter-clockwise"></i> Reset scenario';
            resetBtn.classList.remove('mini-btn-armed');
            resetBtn.disabled = false;
        });
    }

    /** Isolation register (§8) — ICC cards with lockbox and linked permits. */
    showIsolationPanel(focusIcc = null) {
        const isolations = this.store.state.isolations || [];
        const permits = this.store.state.permits || [];
        const panel = document.getElementById('detail-panel');

        const TAG = { red: '#d95757', green: '#4caf7d', blue: '#5b8dbe', yellow: '#d9a441' };
        const cards = isolations.map(iso => {
            const points = typeof iso.points === 'string' ? JSON.parse(iso.points) : (iso.points || []);
            const linked = openLinkedPermits(iso, permits);
            const live = ['applied', 'sanction_to_test'].includes(iso.status);
            const ptRows = points.map(pt => `
                <div class="iso-point">
                    <span class="iso-tag" style="background:${TAG[pt.tag_color] || '#8d99a4'}"></span>
                    <span>pt ${pt.no} · ${pt.equipment}</span>
                    <span class="detail-muted">${pt.method}</span>
                </div>`).join('');
            const actions = Object.entries(ISOLATION_ACTIONS)
                .filter(([, a]) => a.from.includes(iso.status) && a.roles.includes(this.persona))
                .map(([id, a]) =>
                    `<button class="action-btn iso-action" data-icc="${iso.icc_no}" data-action="${id}">
                        <i class="ph-duotone ${a.icon}"></i>${a.label}</button>`).join('');
            return `
            <div class="conflict-card iso-card${iso.icc_no === focusIcc ? ' conflict-focus' : ''}">
                <div class="conflict-head">
                    <span class="conflict-sev ${live ? 'iso-live' : ''}">${iso.status.toUpperCase().replace('_', ' ')}</span>
                    <span>${iso.icc_no} · ${iso.type}</span>
                </div>
                <div class="conflict-meta">${iso.description || ''}</div>
                ${ptRows}
                ${iso.lockbox_key ? `<div class="conflict-meta"><i class="ph-duotone ph-key"></i>
                    Lockbox ${iso.lockbox_key} · key with ${iso.key_holder} (§8.3)</div>` : ''}
                <div class="conflict-permits">${
                    linked.length
                        ? linked.map(p => `<button class="sig conflict-chip" data-permit="${p.permit_no}">${p.permit_no.replace('PTW-2026-', 'PTW ')}</button>`).join(' ')
                        : '<span class="detail-muted">no open linked permits</span>'}</div>
                <div class="detail-actions iso-actions">${actions ||
                    `<span class="detail-muted">No ${this.persona} action — isolations are SAP-controlled (§8.1.1)</span>`}</div>
            </div>`;
        }).join('');

        panel.innerHTML = `
            <div class="detail-header">
                <i class="ph-duotone ph-lock-key"></i>
                <div>
                    <div class="detail-id">ISOLATION REGISTER · ICC (§8)</div>
                    <div class="detail-name">${isolations.filter(i => ['applied', 'sanction_to_test'].includes(i.status)).length} live isolation(s) · lockbox keys at permit office</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            ${cards || '<div class="detail-note">No isolations registered.</div>'}
            <div class="detail-error" id="detail-error"></div>`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
        panel.querySelectorAll('.conflict-chip').forEach(chip =>
            chip.addEventListener('click', () => this.selectPermit(chip.dataset.permit, { flyTo: true })));
        panel.querySelectorAll('.iso-action').forEach(btn =>
            btn.addEventListener('click', async () => {
                try {
                    await this.store.applyIsolationAction(btn.dataset.icc, btn.dataset.action,
                        { role: this.persona });
                    this.showIsolationPanel(btn.dataset.icc);
                } catch (e) {
                    document.getElementById('detail-error').textContent = e.message;
                }
            }));
    }

    /** Daily SIMOPS / Line of Sight view (§6.4) — conflicts with advice. */
    showSimopsPanel(focusId = null) {
        const conflicts = this.store.state.conflicts || [];
        const live = this.store.state.permits.filter(p => p.status === 'issued').length;
        const panel = document.getElementById('detail-panel');
        const today = new Date().toLocaleDateString('en-GB',
            { timeZone: SITE.timeZone, weekday: 'short', day: '2-digit', month: 'short' });

        const cards = conflicts.map(c => `
            <div class="conflict-card conflict-${c.severity}${c.id === focusId ? ' conflict-focus' : ''}" data-conflict="${c.id}">
                <div class="conflict-head">
                    <span class="conflict-sev">${c.severity.toUpperCase()}</span>
                    <span>${c.label}</span>
                </div>
                <div class="conflict-meta">${c.cwa}${c.distanceM !== null ? ' · ' + c.distanceM + ' m apart' : ''}</div>
                <div class="conflict-permits">${c.permits.map(no =>
                    `<button class="sig conflict-chip" data-permit="${no}">${no.replace('PTW-2026-', 'PTW ')}</button>`).join(' ')}</div>
                <div class="conflict-advice">${c.advice}</div>
            </div>`).join('');

        panel.innerHTML = `
            <div class="detail-header">
                <i class="ph-duotone ph-warning-diamond"></i>
                <div>
                    <div class="detail-id">DAILY SIMOPS · LINE OF SIGHT — ${today}</div>
                    <div class="detail-name">${live} live permits · ${conflicts.length} interaction${conflicts.length !== 1 ? 's' : ''} flagged (§6.4)</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            ${cards || '<div class="detail-note">No simultaneous-operation interactions detected among live and upcoming permits.</div>'}`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
        panel.querySelectorAll('.conflict-chip').forEach(chip =>
            chip.addEventListener('click', () => this.selectPermit(chip.dataset.permit, { flyTo: true })));
        panel.querySelectorAll('.conflict-card').forEach(card =>
            card.addEventListener('click', (e) => {
                if (e.target.closest('.conflict-chip')) return;
                const c = conflicts.find(x => x.id === card.dataset.conflict);
                if (c) this.mapManager?.flyToConflict(c);
            }));
    }

    /** Digital Appendix I — request form with map-pick location. */
    bindPermitForm() {
        const form = document.getElementById('permit-form');
        const typeSel = document.getElementById('pf-type');
        const cwaSel = document.getElementById('pf-cwa');
        for (const [k, t] of Object.entries(PERMIT_TYPES)) {
            typeSel.add(new Option(`${t.label} (${t.validity})`, k));
        }
        fetch('/v3/data/cwa.geojson').then(r => r.json()).then(g => {
            for (const f of g.features) {
                cwaSel.add(new Option(`${f.properties.id} — ${f.properties.name.slice(0, 40)}`, f.properties.id));
            }
        });

        document.getElementById('btn-new-permit').addEventListener('click', () => {
            form.hidden = !form.hidden;
        });
        document.getElementById('form-close').addEventListener('click', () => { form.hidden = true; });

        this.pickedLngLat = null;
        document.getElementById('pf-pick').addEventListener('click', () => {
            document.body.classList.add('pick-mode');
            const once = (e) => {
                this.pickedLngLat = [e.lngLat.lng, e.lngLat.lat];
                document.getElementById('pf-loc').textContent =
                    `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`;
                document.body.classList.remove('pick-mode');
            };
            this.mapManager?.map.once('click', once);
        });

        document.getElementById('pf-submit').addEventListener('click', async () => {
            const errEl = document.getElementById('pf-error');
            const title = document.getElementById('pf-title').value.trim();
            if (!title) { errEl.textContent = 'Description of work is required.'; return; }
            const attachments = {};
            document.querySelectorAll('#pf-atts input').forEach(cb => {
                attachments[cb.dataset.att] = cb.checked;
            });
            errEl.textContent = '';
            const no = await this.store.createPermit({
                type: typeSel.value,
                cwa: cwaSel.value,
                title,
                contractor: document.getElementById('pf-contractor').value.trim() || 'Contractor',
                performing_authority: document.getElementById('pf-pa').value.trim() || '—',
                lng: this.pickedLngLat?.[0] ?? null,
                lat: this.pickedLngLat?.[1] ?? null,
                attachments
            });
            form.hidden = true;
            document.getElementById('pf-title').value = '';
            this.selectPermit(no, { flyTo: !!this.pickedLngLat });
            this.pickedLngLat = null;
            document.getElementById('pf-loc').textContent = '— not set';
        });
    }

    setClock() {
        const el = document.getElementById('site-clock');
        const tick = () => {
            el.textContent = new Date().toLocaleTimeString('en-GB',
                { timeZone: SITE.timeZone, hour12: false }) + ' ' + SITE.timeLabel;
        };
        tick();
        setInterval(tick, 1000);
    }
}

new ControlOfWorkConsole();
