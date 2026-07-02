/**
 * FleetLayer — deck.gl overlay for the moving fleet.
 *
 * Interleaved with MapLibre's WebGL context so trucks occlude correctly
 * against extruded buildings and terrain. Rebuilds its layers each tick
 * (12 units — negligible cost).
 */

const STATUS_RGB = {
    operating: [76, 175, 125],
    standby: [217, 164, 65],
    down: [217, 87, 87],
    maintenance: [91, 141, 190]
};

// Oriented arrow glyph (mask → tinted by getColor)
const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">
<path d="M24 4 L38 42 L24 33 L10 42 Z" fill="#fff"/></svg>`;
const ICON_ATLAS = 'data:image/svg+xml;base64,' + btoa(ARROW_SVG);
const ICON_MAPPING = { arrow: { x: 0, y: 0, width: 48, height: 48, mask: true } };

export class FleetLayer {
    /**
     * @param {maplibregl.Map} map
     * @param {(unit: Object) => void} onUnitClick
     */
    constructor(map, onUnitClick) {
        this.onUnitClick = onUnitClick;
        this.overlay = new deck.MapboxOverlay({ interleaved: true, layers: [] });
        map.addControl(this.overlay);
    }

    /**
     * @param {Array} fleet - snapshot from FleetSimulator.getFleetState()
     * @param {Array} trails - [{unitId, path, timestamps}] for TripsLayer
     * @param {number} nowS - current sim time in seconds (TripsLayer clock)
     */
    update(fleet, trails, nowS) {
        this.overlay.setProps({
            layers: [
                new deck.TripsLayer({
                    id: 'fleet-trails',
                    data: trails,
                    getPath: d => d.path,
                    getTimestamps: d => d.timestamps,
                    getColor: d => STATUS_RGB[d.status] || [200, 200, 200],
                    currentTime: nowS,
                    trailLength: 120,
                    fadeTrail: true,
                    widthMinPixels: 3,
                    opacity: 0.55,
                    capRounded: true,
                    jointRounded: true
                }),
                new deck.IconLayer({
                    id: 'fleet-icons',
                    data: fleet,
                    pickable: true,
                    iconAtlas: ICON_ATLAS,
                    iconMapping: ICON_MAPPING,
                    getIcon: () => 'arrow',
                    getPosition: d => d.position,
                    getAngle: d => -d.heading, // deck: CCW, heading: CW
                    getColor: d => STATUS_RGB[d.status] || [200, 200, 200],
                    getSize: d => d.type === 'haul' ? 26 : 20,
                    sizeUnits: 'pixels',
                    billboard: false,
                    onClick: info => { if (info.object) this.onUnitClick(info.object); }
                }),
                new deck.TextLayer({
                    id: 'fleet-labels',
                    data: fleet,
                    getPosition: d => d.position,
                    getText: d => d.id,
                    getColor: [232, 236, 239, 230],
                    getSize: 11,
                    sizeUnits: 'pixels',
                    getPixelOffset: [0, -20],
                    fontFamily: 'Roboto Mono, monospace',
                    outlineWidth: 4,
                    outlineColor: [0, 0, 0, 180],
                    fontSettings: { sdf: true }
                })
            ]
        });
    }
}
