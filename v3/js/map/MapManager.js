/**
 * MapManager v3 — Padeswood basemap + Construction Work Areas.
 *
 * CWA polygons are schematic (traced from Appendix H of the Worley PTW
 * procedure, plant north 341°) — to be replaced by client GIS data.
 * Permit pins/zones arrive in milestone 2 (deck.gl overlay).
 */

import { SITE, TILES, DATA_URLS } from '../config.js';

export class MapManager {
    constructor(containerId, onCwaClick) {
        this.onCwaClick = onCwaClick;
        this.cwaVisible = true;

        this.map = new maplibregl.Map({
            container: containerId,
            center: SITE.center,
            zoom: SITE.defaultZoom,
            minZoom: SITE.minZoom,
            maxZoom: SITE.maxZoom,
            maxPitch: 60,
            attributionControl: { compact: true },
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: { satellite: { type: 'raster', ...TILES.satellite } },
                layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
            }
        });

        this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        this.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
        this.map.on('load', () => {
            this._addLayers();
            document.getElementById('map-veil')?.classList.add('lifted');
        });
    }

    _addLayers() {
        const m = this.map;
        for (const [key, url] of Object.entries(DATA_URLS)) {
            m.addSource(key, { type: 'geojson', data: url });
        }


        // Existing plant context — subtle building footprints
        m.addLayer({
            id: 'buildings', type: 'fill', source: 'buildings',
            paint: { 'fill-color': '#8d99a4', 'fill-opacity': 0.25 }
        });

        // Construction Work Areas — the client's own zoning, their colours
        m.addLayer({
            id: 'cwa-fill', type: 'fill', source: 'cwa',
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.30
            }
        });
        m.addLayer({
            id: 'cwa-outline', type: 'line', source: 'cwa',
            paint: {
                'line-color': ['get', 'color'],
                'line-width': 1.6,
                'line-opacity': 0.9
            }
        });
        m.addLayer({
            id: 'cwa-labels', type: 'symbol', source: 'cwa',
            minzoom: 14.2,
            layout: {
                'text-field': ['get', 'id'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 10.5
            },
            paint: {
                'text-color': '#e8ecef',
                'text-halo-color': 'rgba(0,0,0,0.8)',
                'text-halo-width': 1.2
            }
        });


        m.on('click', 'cwa-fill', (e) => {
            if (e.features?.length) this.onCwaClick(e.features[0]);
        });
        m.on('mouseenter', 'cwa-fill', () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', 'cwa-fill', () => { m.getCanvas().style.cursor = ''; });

        // ---- Permit pins (data injected by updatePermits) ----
        m.addSource('permits', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({
            id: 'permit-pins', type: 'circle', source: 'permits',
            paint: {
                'circle-radius': ['case', ['==', ['get', 'status'], 'issued'], 8, 6],
                'circle-color': ['get', 'color'],
                'circle-opacity': ['case', ['in', ['get', 'status'], ['literal', ['closed', 'withdrawn', 'expired']]], 0.35, 0.95],
                'circle-stroke-width': 2,
                'circle-stroke-color': ['match', ['get', 'status'],
                    'issued', '#4caf7d',
                    'suspended', '#d95757',
                    'authorised', '#d9a441',
                    'rgba(232,236,239,0.5)']
            }
        });
        m.addLayer({
            id: 'permit-labels', type: 'symbol', source: 'permits',
            minzoom: 15.4,
            layout: {
                'text-field': ['get', 'shortNo'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 10,
                'text-offset': [0, -1.3],
                'text-anchor': 'bottom',
                'text-allow-overlap': false
            },
            paint: {
                'text-color': '#e8ecef',
                'text-halo-color': 'rgba(0,0,0,0.85)',
                'text-halo-width': 1.2
            }
        });
        m.on('click', 'permit-pins', (e) => {
            if (e.features?.length) this.onPermitClick?.(e.features[0].properties.permit_no);
        });
        m.on('mouseenter', 'permit-pins', () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', 'permit-pins', () => { m.getCanvas().style.cursor = ''; });
        // ---- SIMOPS conflicts (data injected by updateConflicts) ----
        m.addSource('conflicts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({
            id: 'conflict-links', type: 'line', source: 'conflicts',
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: {
                'line-color': ['match', ['get', 'severity'], 'high', '#d95757', '#d9a441'],
                'line-width': 2.5,
                'line-dasharray': [2, 1.5]
            }
        });
        m.addLayer({
            id: 'conflict-markers', type: 'circle', source: 'conflicts',
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
                'circle-radius': 13,
                'circle-color': 'rgba(0,0,0,0)',
                'circle-stroke-width': 2.5,
                'circle-stroke-color': ['match', ['get', 'severity'], 'high', '#d95757', '#d9a441']
            }
        });
        m.addLayer({
            id: 'conflict-glyphs', type: 'symbol', source: 'conflicts',
            filter: ['==', ['geometry-type'], 'Point'],
            layout: {
                'text-field': '!',
                'text-font': ['Noto Sans Regular'],
                'text-size': 15,
                'text-allow-overlap': true
            },
            paint: {
                'text-color': ['match', ['get', 'severity'], 'high', '#d95757', '#d9a441']
            }
        });
        m.on('click', 'conflict-markers', (e) => {
            if (e.features?.length) this.onConflictClick?.(e.features[0].properties.conflictId);
        });

        // ---- Isolation points (§8.9 tag colour code) ----
        m.addSource('isolations', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({
            id: 'isolation-points', type: 'circle', source: 'isolations',
            paint: {
                'circle-radius': 5.5,
                'circle-color': ['match', ['get', 'tag'],
                    'red', '#d95757', 'green', '#4caf7d', 'blue', '#5b8dbe', 'yellow', '#d9a441',
                    '#8d99a4'],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#0e1012',
                'circle-opacity': ['case', ['==', ['get', 'live'], 1], 1, 0.35]
            }
        });
        m.addLayer({
            id: 'isolation-labels', type: 'symbol', source: 'isolations',
            minzoom: 16,
            layout: {
                'text-field': ['get', 'label'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 9,
                'text-offset': [0, 1.1],
                'text-anchor': 'top'
            },
            paint: {
                'text-color': '#c8cfd6',
                'text-halo-color': 'rgba(0,0,0,0.85)',
                'text-halo-width': 1.1
            }
        });
        m.on('click', 'isolation-points', (e) => {
            if (e.features?.length) this.onIsolationClick?.(e.features[0].properties.icc);
        });
        m.on('mouseenter', 'isolation-points', () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', 'isolation-points', () => { m.getCanvas().style.cursor = ''; });

        this._layersReady = true;
        if (this._pendingPermits) this.updatePermits(...this._pendingPermits);
        if (this._pendingConflicts) this.updateConflicts(this._pendingConflicts);
        if (this._pendingIsolations) this.updateIsolations(this._pendingIsolations);
    }

    /** Refresh isolation point markers. */
    updateIsolations(isolations) {
        if (!this._layersReady) { this._pendingIsolations = isolations; return; }
        const features = [];
        for (const iso of isolations) {
            const points = typeof iso.points === 'string' ? JSON.parse(iso.points) : (iso.points || []);
            for (const pt of points) {
                if (pt.lng == null) continue;
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
                    properties: {
                        icc: iso.icc_no,
                        tag: pt.tag_color,
                        label: `${iso.icc_no} · pt ${pt.no}`,
                        live: ['applied', 'sanction_to_test'].includes(iso.status) ? 1 : 0
                    }
                });
            }
        }
        this.map.getSource('isolations').setData({ type: 'FeatureCollection', features });
    }

    /** Refresh conflict overlays: dashed link + warning ring at midpoint. */
    updateConflicts(conflicts) {
        if (!this._layersReady) { this._pendingConflicts = conflicts; return; }
        const features = [];
        for (const c of conflicts) {
            if (c.pins?.length === 2 && c.pins[0][0] != null && c.pins[1][0] != null) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: c.pins },
                    properties: { severity: c.severity, conflictId: c.id }
                });
            }
            if (c.midpoint) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: c.midpoint },
                    properties: { severity: c.severity, conflictId: c.id }
                });
            }
        }
        this.map.getSource('conflicts').setData({ type: 'FeatureCollection', features });
    }

    flyToConflict(c) {
        if (!c.midpoint) return;
        this.map.flyTo({ center: c.midpoint, zoom: 17.2, duration: 1100 });
    }

    /** Refresh permit pins. Small jitter separates same-CWA pins. */
    updatePermits(permits, typeColors) {
        if (!this._layersReady) { this._pendingPermits = [permits, typeColors]; return; }
        const seen = {};
        const features = permits
            .filter(p => p.lng != null && !['closed', 'withdrawn'].includes(p.status))
            .map(p => {
                const n = (seen[p.cwa] = (seen[p.cwa] || 0) + 1) - 1;
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [p.lng + n * 0.00028, p.lat - n * 0.00012] },
                    properties: {
                        permit_no: p.permit_no,
                        shortNo: p.permit_no.replace('PTW-2026-', 'PTW '),
                        status: p.status,
                        color: typeColors[p.type] || '#8d99a4'
                    }
                };
            });
        this.map.getSource('permits').setData({ type: 'FeatureCollection', features });
    }

    flyToPermit(p) {
        if (p.lng == null) return;
        this.map.flyTo({ center: [p.lng, p.lat], zoom: 17, duration: 1100 });
    }

    toggleCwa() {
        this.cwaVisible = !this.cwaVisible;
        const vis = this.cwaVisible ? 'visible' : 'none';
        for (const id of ['cwa-fill', 'cwa-outline', 'cwa-labels']) {
            this.map.setLayoutProperty(id, 'visibility', vis);
        }
        return this.cwaVisible;
    }

    flyToCwa(feature) {
        const coords = feature.geometry.coordinates[0];
        let x = 0, y = 0;
        for (const c of coords) { x += c[0]; y += c[1]; }
        this.map.flyTo({ center: [x / coords.length, y / coords.length], zoom: 16.6, duration: 1200 });
    }

    resetView() {
        this.map.flyTo({ center: SITE.center, zoom: SITE.defaultZoom, pitch: 0, bearing: 0, duration: 1200 });
    }
}
