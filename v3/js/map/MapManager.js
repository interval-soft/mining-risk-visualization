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
        this._layersReady = true;
        if (this._pendingPermits) this.updatePermits(...this._pendingPermits);
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
