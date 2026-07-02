/**
 * DigitalTwin v2 — App entry point.
 * Operations console for the Oyu Tolgoi site.
 *
 * Milestone 1: map + immovable assets + shell.
 * Milestone 2 adds the fleet (deck.gl), 3 the live KPI/event feeds,
 * 4 the underground scene, 5 the AI assistant.
 */

import { KEY_ASSETS } from './config.js';
import { MapManager } from './map/MapManager.js';
import { FleetSimulator } from './sim/FleetSimulator.js';
import { FleetLayer } from './map/FleetLayer.js';

class OperationsConsole {
    constructor() {
        this.mapManager = null;
        this.fleetSim = null;
        this.fleetLayer = null;
        this.selectedAssetId = null;
        this.selectedUnitId = null;

        // The shell (rail, clock, controls) must work even if the map fails
        // (e.g. WebGL unavailable) — degrade gracefully, never die silently.
        try {
            this.mapManager = new MapManager('map', (feature) => this.showFeatureDetail(feature));
        } catch (err) {
            console.error('Map initialisation failed:', err);
            this.showMapError();
        }

        this.buildAssetRail();
        this.bindControls();
        this.setClock();
        this.initFleet();
    }

    /** Fleet simulation runs with or without a map (rail + KPIs still live). */
    async initFleet() {
        try {
            const routes = await (await fetch('/v2/data/routes.json')).json();
            this.fleetSim = new FleetSimulator(routes);
        } catch (err) {
            console.error('Fleet init failed:', err);
            return;
        }

        this.buildFleetRail();
        this.backfillEvents();

        if (this.mapManager) {
            const attach = () => {
                this.fleetLayer = new FleetLayer(this.mapManager.map,
                    (unit) => this.selectUnit(unit.id, { flyTo: false }));
            };
            if (this.mapManager.map.loaded()) attach();
            else this.mapManager.map.on('load', attach);
        }

        // Animation loop: fleet layer ~15 fps; KPIs / rail / feed at 1 Hz.
        let lastKpi = 0, lastFrame = 0, lastEventCheck = Date.now();
        const tick = (ts) => {
            const now = Date.now();
            if (ts - lastFrame > 66) {
                lastFrame = ts;
                const fleet = this.fleetSim.getFleetState(now);
                if (this.fleetLayer) {
                    const trails = fleet
                        .filter(u => u.status === 'operating' && u.position)
                        .map(u => ({ ...this.fleetSim.getTrail(u.id, now), status: u.status, unitId: u.id }));
                    this.fleetLayer.update(fleet, trails, now / 1000);
                }
                if (now - lastKpi > 1000) {
                    lastKpi = now;
                    this.updateKPIs();
                    this.updateFleetRail(fleet);
                    this.updateShiftBar();
                    this.refreshUnitDetail(fleet);
                    const events = this.fleetSim.getEventsBetween(lastEventCheck, now, 30);
                    if (events.length) this.prependEvents(events);
                    lastEventCheck = now;
                }
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    showMapError() {
        const container = document.getElementById('map');
        container.innerHTML = `
            <div class="map-error">
                <i class="ph-duotone ph-warning-octagon"></i>
                <div>Map unavailable — WebGL could not be initialised.</div>
                <div class="map-error-hint">Check GPU/driver support or try another browser.</div>
            </div>`;
    }

    /** Left rail: curated immovable assets, grouped by type. */
    buildAssetRail() {
        const groups = {
            pit: 'Mining areas', shaft: 'Shafts', underground: 'Underground',
            plant: 'Processing', tsf: 'Tailings', camp: 'Site services', airport: 'Site services'
        };
        const rail = document.getElementById('asset-list');
        const seen = new Set();

        for (const asset of KEY_ASSETS) {
            const groupName = groups[asset.type] || 'Other';
            if (!seen.has(groupName)) {
                seen.add(groupName);
                const h = document.createElement('div');
                h.className = 'rail-group';
                h.textContent = groupName;
                rail.appendChild(h);
            }
            const row = document.createElement('button');
            row.className = 'asset-row';
            row.dataset.assetId = asset.id;
            row.innerHTML = `
                <i class="ph-duotone ${asset.icon}"></i>
                <span class="asset-id">${asset.id}</span>
                <span class="asset-name" title="${asset.name}">${asset.name}</span>
                <span class="status-dot status-none" title="No telemetry yet"></span>`;
            row.addEventListener('click', () => this.selectAsset(asset));
            rail.appendChild(row);
        }
    }

    selectAsset(asset) {
        this.selectedAssetId = asset.id;
        document.querySelectorAll('.asset-row').forEach(el =>
            el.classList.toggle('selected', el.dataset.assetId === asset.id));

        this.mapManager?.flyToAsset(asset);
        this.showAssetDetail(asset);
    }

    /** Detail panel for a curated asset (rail click). */
    showAssetDetail(asset) {
        const panel = document.getElementById('detail-panel');
        const rows = Object.entries(asset.facts || {})
            .map(([k, v]) => `<div class="detail-row"><span>${k}</span><span>${v}</span></div>`)
            .join('');
        panel.innerHTML = `
            <div class="detail-header">
                <i class="ph-duotone ${asset.icon}"></i>
                <div>
                    <div class="detail-id">${asset.id}</div>
                    <div class="detail-name">${asset.name}</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            ${rows}
            <div class="detail-row detail-placeholder"><span>Status</span><span>— awaiting telemetry</span></div>
            ${asset.underground ? '<button class="detail-action detail-action-enabled" id="btn-enter-ug"><i class="ph-duotone ph-stack"></i> Enter underground view</button>' : ''}`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
        panel.querySelector('#btn-enter-ug')?.addEventListener('click', () => this.enterUnderground());
    }

    /** Fleet section in the rail — grouped by unit type, live status dots. */
    buildFleetRail() {
        const groups = { haul: 'Haul trucks', water: 'Support', grader: 'Support', bus: 'Shuttles', service: 'Shuttles', lhd: 'Underground fleet' };
        const rail = document.getElementById('asset-list');
        const header = document.createElement('div');
        header.className = 'rail-title rail-fleet-title';
        header.textContent = 'Fleet';
        rail.appendChild(header);

        const seen = new Set();
        for (const unit of this.fleetSim.getFleetState()) {
            const groupName = groups[unit.type] || 'Other';
            if (!seen.has(groupName)) {
                seen.add(groupName);
                const h = document.createElement('div');
                h.className = 'rail-group';
                h.textContent = groupName;
                rail.appendChild(h);
            }
            const row = document.createElement('button');
            row.className = 'asset-row fleet-row';
            row.dataset.unitId = unit.id;
            row.innerHTML = `
                <i class="ph-duotone ${unit.type === 'haul' ? 'ph-truck' : unit.type === 'bus' ? 'ph-van' : unit.type === 'lhd' ? 'ph-stack' : 'ph-truck-trailer'}"></i>
                <span class="asset-id">${unit.id}</span>
                <span class="asset-name fleet-phase" title="${unit.model}">${unit.phase}</span>
                <span class="status-dot status-${unit.status}"></span>`;
            row.addEventListener('click', () => {
                if (unit.underground) { this.enterUnderground(); this.selectUnit(unit.id, { flyTo: false }); }
                else this.selectUnit(unit.id, { flyTo: true });
            });
            rail.appendChild(row);
        }
    }

    /** 1 Hz refresh of dots + phase text in the fleet rail. */
    updateFleetRail(fleet) {
        for (const unit of fleet) {
            const row = document.querySelector(`.fleet-row[data-unit-id="${unit.id}"]`);
            if (!row) continue;
            row.querySelector('.fleet-phase').textContent = unit.phase;
            row.querySelector('.status-dot').className = `status-dot status-${unit.status}`;
        }
    }

    selectUnit(unitId, { flyTo }) {
        this.selectedUnitId = unitId;
        this.selectedAssetId = null;
        document.querySelectorAll('.asset-row').forEach(el =>
            el.classList.toggle('selected', el.dataset.unitId === unitId));

        const unit = this.fleetSim.getFleetState().find(u => u.id === unitId);
        if (!unit) return;
        if (flyTo && this.mapManager) {
            this.mapManager.map.flyTo({ center: unit.position, zoom: 15, duration: 1200 });
        }
        this.showUnitDetail(unit);
    }

    showUnitDetail(unit) {
        const panel = document.getElementById('detail-panel');
        panel.innerHTML = `
            <div class="detail-header">
                <i class="ph-duotone ph-truck"></i>
                <div>
                    <div class="detail-id">${unit.id} · <span class="unit-status-text status-text-${unit.status}">${unit.status.toUpperCase()}</span></div>
                    <div class="detail-name">${unit.model}</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            <div class="detail-row"><span>Assignment</span><span>${unit.routeName}</span></div>
            <div class="detail-row"><span>Phase</span><span data-live="phase">${unit.phase}</span></div>
            <div class="detail-row"><span>Speed</span><span data-live="speed">${unit.speedKmh} km/h</span></div>
            <div class="detail-row"><span>Payload</span><span data-live="payload">${unit.payloadT} t</span></div>
            <div class="detail-row"><span>${unit.type === 'lhd' ? 'Cycle progress' : 'Route progress'}</span><span data-live="progress">${Math.round(unit.distAlongM / unit.routeLengthM * 100)}%</span></div>`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => {
            panel.classList.remove('open');
            this.selectedUnitId = null;
        });
    }

    /** Live-update the open unit panel without rebuilding the DOM. */
    refreshUnitDetail(fleet) {
        if (!this.selectedUnitId) return;
        const unit = fleet.find(u => u.id === this.selectedUnitId);
        const panel = document.getElementById('detail-panel');
        if (!unit || !panel.classList.contains('open')) return;
        const set = (k, v) => {
            const el = panel.querySelector(`[data-live="${k}"]`);
            if (el) el.textContent = v;
        };
        set('phase', unit.phase);
        set('speed', `${unit.speedKmh} km/h`);
        set('payload', `${unit.payloadT} t`);
        set('progress', `${Math.round(unit.distAlongM / unit.routeLengthM * 100)}%`);
        const st = panel.querySelector('.unit-status-text');
        if (st) { st.textContent = unit.status.toUpperCase(); st.className = `unit-status-text status-text-${unit.status}`; }
    }

    updateKPIs() {
        const k = this.fleetSim.getKPIs();
        const set = (id, html) => { document.getElementById(id).innerHTML = html; };
        set('kpi-throughput', `${k.throughputTph.toLocaleString('en')}<span class="unit">t/h</span>`);
        set('kpi-fleet', `${k.operating}/${k.total}`);
        set('kpi-util', `${k.utilisationPct}<span class="unit">%</span>`);
        const alertsEl = document.getElementById('kpi-alerts');
        alertsEl.innerHTML = `${k.activeAlerts}`;
        alertsEl.classList.toggle('kpi-alert-active', k.activeAlerts > 0);
        document.querySelectorAll('.kpi').forEach(el => el.classList.remove('kpi-placeholder'));
    }

    /** Shift bar: day shift 07:00–19:00 ULN, else night shift. */
    updateShiftBar() {
        const hULN = (new Date().getUTCHours() + 8) % 24;
        const mULN = new Date().getUTCMinutes();
        const t = hULN + mULN / 60;
        const day = t >= 7 && t < 19;
        const progress = day ? (t - 7) / 12 : ((t + 24 - 19) % 24) / 12;
        document.getElementById('shift-label').textContent = day ? 'DAY SHIFT 07:00–19:00' : 'NIGHT SHIFT 19:00–07:00';
        document.querySelector('.shift-progress').style.width = `${Math.round(progress * 100)}%`;
    }

    /** Seed the feed with the last 2 h of deterministic history. */
    backfillEvents() {
        const now = Date.now();
        const events = this.fleetSim.getEventsBetween(now - 2 * 3600 * 1000, now, 60);
        this.prependEvents(events.slice(0, 20), { silent: true });
    }

    prependEvents(events, { silent = false } = {}) {
        const feed = document.getElementById('event-list');
        document.querySelector('#event-feed .feed-empty')?.remove();
        for (const ev of [...events].reverse()) {
            const el = document.createElement('div');
            el.className = `event-entry severity-${ev.severity}${silent ? '' : ' event-new'}`;
            const time = new Date(ev.timeMs).toLocaleTimeString('en-GB',
                { timeZone: 'Asia/Ulaanbaatar', hour12: false, hour: '2-digit', minute: '2-digit' });
            el.innerHTML = `
                <span class="event-time">${time}</span>
                <span class="event-unit">${ev.unitId}</span>
                <span class="event-text">${ev.from} → <b class="status-text-${ev.to}">${ev.to}</b></span>`;
            feed.prepend(el);
        }
        // keep the feed bounded
        while (feed.children.length > 40) feed.lastChild.remove();
    }

    /** Detail panel for a raw map feature (building click). */
    showFeatureDetail(feature) {
        const p = feature.properties;
        const panel = document.getElementById('detail-panel');
        panel.innerHTML = `
            <div class="detail-header">
                <i class="ph-duotone ${p.kind === 'mineshaft' ? 'ph-elevator' : 'ph-warehouse'}"></i>
                <div>
                    <div class="detail-id">${p.kind === 'mineshaft' ? 'SHAFT' : 'STRUCTURE'}</div>
                    <div class="detail-name">${p.name || 'Unnamed structure'}</div>
                </div>
                <button class="detail-close" aria-label="Close">×</button>
            </div>
            <div class="detail-row"><span>Type</span><span>${p.building || p.kind}</span></div>
            <div class="detail-row"><span>Height</span><span>${Math.round(p.height)} m</span></div>
            <div class="detail-row detail-placeholder"><span>Status</span><span>— awaiting telemetry</span></div>`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
    }

    bindControls() {
        const terrainBtn = document.getElementById('btn-terrain');
        terrainBtn.addEventListener('click', () => {
            const on = this.mapManager?.toggleTerrain();
            terrainBtn.classList.toggle('active', !!on);
        });
        document.getElementById('btn-reset').addEventListener('click', () =>
            this.mapManager?.resetView());
        document.getElementById('btn-underground').addEventListener('click', () =>
            this.enterUnderground());
        document.getElementById('btn-surface').addEventListener('click', () =>
            this.exitUnderground());
        this.bindAskAI();
    }

    /** Ask AI — grounded on the same deterministic state the console renders. */
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

        // Suggested questions — the built-in demo script
        document.querySelectorAll('.ask-chip').forEach(chip =>
            chip.addEventListener('click', () => {
                input.value = chip.dataset.q;
                form.requestSubmit();
            }));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = input.value.trim();
            if (query.length < 3) return;

            submit.disabled = true;
            answerBox.hidden = false;
            body.innerHTML = '<span class="thinking">Querying live site state…</span>';
            meta.textContent = '';

            try {
                const res = await fetch('/api/v2/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                // minimal safe rendering: escape HTML, then **bold** only
                const escaped = data.answer
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                body.innerHTML = escaped.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
                meta.textContent = `${data.model || 'AI'} · ${((data.latencyMs || 0) / 1000).toFixed(1)}s`;
            } catch (err) {
                body.textContent = 'AI unavailable. The query API is a serverless function — '
                    + 'run via `vercel dev` locally or use the deployed environment.';
                meta.textContent = String(err.message || err);
            } finally {
                submit.disabled = false;
                input.select();
            }
        });
    }

    /** Fly to the shafts, then crossfade into the Three.js block-cave scene. */
    async enterUnderground() {
        const view = document.getElementById('underground-view');
        if (view.classList.contains('open')) return;

        if (this.mapManager) {
            this.mapManager.map.flyTo({
                center: [106.8465, 43.0370], zoom: 14.5, pitch: 0, duration: 1400, essential: true
            });
            await new Promise(r => setTimeout(r, 1450));
        }

        // Lazy-load Three.js + scene on first entry only
        if (!this.underground) {
            try {
                const { UndergroundScene } = await import('./underground/UndergroundScene.js?v=20260703');
                this.underground = new UndergroundScene(document.getElementById('underground-canvas'));
            } catch (err) {
                console.error('Underground scene failed to load:', err);
                return;
            }
        }

        view.classList.add('open');
        this.underground.enter();
    }

    exitUnderground() {
        document.getElementById('underground-view').classList.remove('open');
        this.underground?.exit();
    }

    /** Header clock — site local time (UTC+8, Ulaanbaatar). */
    setClock() {
        const el = document.getElementById('site-clock');
        const tick = () => {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour12: false })
                + ' ULN';
        };
        tick();
        setInterval(tick, 1000);
    }
}

new OperationsConsole();
