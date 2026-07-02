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

class OperationsConsole {
    constructor() {
        this.mapManager = null;
        this.selectedAssetId = null;

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
                <span class="asset-name">${asset.name}</span>
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
            ${asset.underground ? '<button class="detail-action" disabled>Enter underground view (milestone 4)</button>' : ''}`;
        panel.classList.add('open');
        panel.querySelector('.detail-close').addEventListener('click', () => panel.classList.remove('open'));
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
