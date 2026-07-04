/**
 * DigitalTwin v3 — ePTW Console entry point.
 * HMCCP Control of Work, Padeswood.
 *
 * Milestone 1: shell + map + CWA zones.
 * Milestone 2 brings the permit engine (DB-backed), 3 the workflow,
 * 4 SIMOPS detection, 5 isolations/ICC, 6 the AI CoW assistant.
 */

import { SITE, PERMIT_TYPES, ROLES } from './config.js';
import { MapManager } from './map/MapManager.js';

class ControlOfWorkConsole {
    constructor() {
        this.mapManager = null;
        this.persona = 'PI';

        try {
            this.mapManager = new MapManager('map', (f) => this.showCwaDetail(f));
        } catch (err) {
            console.error('Map initialisation failed:', err);
            this.showMapError();
        }

        this.buildPersonaSwitcher();
        this.buildBoardLegend();
        this.bindControls();
        this.setClock();
    }

    showMapError() {
        document.getElementById('map').innerHTML = `
            <div class="map-error">
                <i class="ph-duotone ph-warning-octagon"></i>
                <div>Map unavailable — WebGL could not be initialised.</div>
            </div>`;
    }

    /** Persona switcher — the PTW roles walk permits through the lifecycle. */
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

    /** Board legend seeded from the form's own colour coding. */
    buildBoardLegend() {
        const el = document.getElementById('board-legend');
        for (const [key, t] of Object.entries(PERMIT_TYPES)) {
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `
                <span class="legend-swatch" style="background:${t.color}"></span>
                <span class="legend-label">${t.label}</span>
                <span class="legend-validity">${t.validity}</span>`;
            el.appendChild(row);
        }
    }

    showCwaDetail(feature) {
        const p = feature.properties;
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
            <div class="detail-row"><span>Active permits</span><span class="detail-muted">— milestone 2</span></div>
            <div class="detail-row"><span>Area Authority</span><span class="detail-muted">— unassigned</span></div>
            <div class="detail-row detail-note">Zone schematic — traced from PTW Procedure RevB, Appendix H. Replace with client GIS.</div>`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
        this.mapManager?.flyToCwa(feature);
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

    /** Site local time (UK). */
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
