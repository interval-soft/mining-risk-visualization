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
