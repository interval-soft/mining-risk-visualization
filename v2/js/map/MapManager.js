/**
 * MapManager — MapLibre GL initialisation and site layers.
 *
 * Owns the map instance, the basemap (Esri satellite + AWS terrain),
 * and the OSM-derived site layers (pit, buildings, shafts, infrastructure).
 * Fleet layers (deck.gl) arrive in milestone 2 and will interleave here.
 */

import { SITE, TILES, COLORS, DATA_URLS } from '../config.js';

export class MapManager {
    /**
     * @param {string} containerId - DOM id of the map container
     * @param {(feature: Object) => void} onFeatureClick - callback with clicked feature
     */
    constructor(containerId, onFeatureClick) {
        this.onFeatureClick = onFeatureClick;
        this.terrainEnabled = false;

        // Sober intro: single fly-in from a country-scale view (v1 convention:
        // ?skip-intro=true bypasses it).
        const skipIntro = new URLSearchParams(location.search).has('skip-intro');

        this.map = new maplibregl.Map({
            container: containerId,
            center: skipIntro ? SITE.center : [103.5, 46.5],
            zoom: skipIntro ? SITE.defaultZoom : 4.2,
            minZoom: 3,
            maxZoom: SITE.maxZoom,
            pitch: 0,
            bearing: 0,
            maxPitch: 70,
            attributionControl: { compact: true },
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: {
                    satellite: { type: 'raster', ...TILES.satellite },
                    terrain: { type: 'raster-dem', ...TILES.terrain }
                },
                layers: [
                    { id: 'satellite', type: 'raster', source: 'satellite' }
                ]
            }
        });

        this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        this.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

        this.map.on('load', () => {
            this._addSiteLayers();
            document.getElementById('map-veil')?.classList.add('lifted');
            if (!skipIntro) {
                this.map.flyTo({
                    center: SITE.center,
                    zoom: SITE.defaultZoom,
                    duration: 3500,
                    essential: true
                });
            }
            // restore the operational zoom floor once the intro has landed
            setTimeout(() => this.map.setMinZoom(SITE.minZoom), skipIntro ? 0 : 3600);
        });
    }

    _addSiteLayers() {
        const m = this.map;

        // --- GeoJSON sources (static files, versioned in repo) ---
        for (const [key, url] of Object.entries(DATA_URLS)) {
            m.addSource(key, { type: 'geojson', data: url });
        }

        // --- Areas: pit outline + industrial zones ---
        m.addLayer({
            id: 'pit-outline', type: 'line', source: 'areas',
            filter: ['==', ['get', 'kind'], 'quarry'],
            paint: {
                'line-color': COLORS.pitOutline,
                'line-width': 2,
                'line-dasharray': [3, 2]
            }
        });
        m.addLayer({
            id: 'industrial-outline', type: 'line', source: 'areas',
            filter: ['==', ['get', 'kind'], 'industrial'],
            paint: {
                'line-color': COLORS.inkDim,
                'line-width': 1,
                'line-dasharray': [2, 3]
            }
        });

        // --- Infrastructure lines ---
        m.addLayer({
            id: 'roads', type: 'line', source: 'infrastructure',
            filter: ['==', ['get', 'kind'], 'road'],
            paint: {
                'line-color': COLORS.roadLine,
                'line-width': ['match', ['get', 'class'],
                    'tertiary', 2.5,
                    'unclassified', 2,
                    1]
            }
        });
        m.addLayer({
            id: 'conveyors', type: 'line', source: 'infrastructure',
            filter: ['==', ['get', 'kind'], 'conveyor'],
            paint: {
                'line-color': COLORS.conveyorLine,
                'line-width': 3,
                'line-dasharray': [1.5, 1]
            }
        });
        m.addLayer({
            id: 'runway', type: 'line', source: 'infrastructure',
            filter: ['in', ['get', 'kind'], ['literal', ['aeroway-runway', 'aeroway-taxiway']]],
            paint: { 'line-color': COLORS.inkDim, 'line-width': 3 }
        });

        // --- Buildings: real OSM footprints, extruded with real heights ---
        m.addLayer({
            id: 'buildings-3d', type: 'fill-extrusion', source: 'buildings',
            paint: {
                'fill-extrusion-color': ['match', ['get', 'kind'],
                    'mineshaft', COLORS.shaftFill,
                    COLORS.buildingFill],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 0.85
            }
        });

        // --- Labels: shafts + named areas ---
        m.addLayer({
            id: 'shaft-labels', type: 'symbol', source: 'points',
            filter: ['==', ['get', 'kind'], 'mineshaft'],
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 12,
                'text-offset': [0, -1.2],
                'text-anchor': 'bottom'
            },
            paint: {
                'text-color': COLORS.ink,
                'text-halo-color': 'rgba(0,0,0,0.75)',
                'text-halo-width': 1.2
            }
        });
        m.addLayer({
            id: 'area-labels', type: 'symbol', source: 'points',
            filter: ['==', ['get', 'kind'], 'named-area'],
            maxzoom: 14,
            layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 11,
                'text-transform': 'uppercase',
                'text-letter-spacing': 0.15
            },
            paint: {
                'text-color': COLORS.inkDim,
                'text-halo-color': 'rgba(0,0,0,0.6)',
                'text-halo-width': 1
            }
        });

        // --- Interactions ---
        for (const layerId of ['buildings-3d']) {
            m.on('click', layerId, (e) => {
                if (e.features?.length) this.onFeatureClick(e.features[0]);
            });
            m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer'; });
            m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = ''; });
        }
    }

    /** Toggle 3D terrain + tilt. Returns new state. */
    toggleTerrain() {
        this.terrainEnabled = !this.terrainEnabled;
        if (this.terrainEnabled) {
            this.map.setTerrain({ source: 'terrain', exaggeration: 1.3 });
            // Clamp zoom when enabling terrain: at high zoom the camera can end
            // up below the terrain surface (MapLibre #1542) → black screen.
            this.map.easeTo({
                pitch: 55,
                zoom: Math.min(this.map.getZoom(), 14.2),
                duration: 800
            });
        } else {
            this.map.setTerrain(null);
            this.map.easeTo({ pitch: 0, duration: 800 });
        }
        return this.terrainEnabled;
    }

    /** Smooth fly-to for an asset from KEY_ASSETS. */
    flyToAsset(asset) {
        this.map.flyTo({
            center: asset.lngLat,
            zoom: asset.zoom,
            pitch: this.terrainEnabled ? (asset.pitch ?? 45) : 0,
            bearing: 0,
            duration: 1600,
            essential: true
        });
    }

    resetView() {
        this.map.flyTo({
            center: SITE.center,
            zoom: SITE.defaultZoom,
            pitch: this.terrainEnabled ? 45 : 0,
            bearing: 0,
            duration: 1200
        });
    }
}
