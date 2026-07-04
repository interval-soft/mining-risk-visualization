/**
 * DigitalTwin v3 — ePTW Console entry point.
 * HMCCP Control of Work, Padeswood.
 *
 * Milestone 2: permit engine — board, map pins, live detail, KPIs, audit feed.
 * Milestone 3 adds workflow actions, 4 SIMOPS, 5 isolations UI, 6 the AI.
 */

import { SITE, PERMIT_TYPES, PERMIT_STATUS, ROLES } from './config.js';
import { MapManager } from './map/MapManager.js';
import { PermitStore } from './data/PermitStore.js';

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
        this.renderEvents(state.events);
        this.mapManager?.updatePermits(state.permits, TYPE_COLORS);
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
            ${p.description ? `<div class="detail-note">${p.description}</div>` : ''}`;
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
        for (const role of ROLES) {
            const opt = document.createElement('option');
            opt.value = role.id;
            opt.textContent = `${role.id} — ${role.name}`;
            sel.appendChild(opt);
        }
        sel.value = this.persona;
        sel.addEventListener('change', () => { this.persona = sel.value; });
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
        const cwaBtn = document.getElementById('btn-cwa');
        cwaBtn.addEventListener('click', () => {
            const on = this.mapManager?.toggleCwa();
            cwaBtn.classList.toggle('active', !!on);
        });
        cwaBtn.classList.add('active');
        document.getElementById('btn-reset').addEventListener('click', () =>
            this.mapManager?.resetView());
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
