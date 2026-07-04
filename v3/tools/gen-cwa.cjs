// Génère v3/data/cwa.geojson — les 17 Construction Work Areas du plot plan
// Worley (Appendix H, 215000-00190-000-HS-PRO-00002 RevB).
// Tracé SCHÉMATIQUE : rectangles en grille locale "plant north" (019° vrai),
// à remplacer par le GIS client.
//
// GÉORÉFÉRENCEMENT (2026-07-04) : coins dérivés du DNS "Volume 3, Figure 1.2
// Site Masterplan" (RSK, REV 11, British National Grid sur le cadre, 1:5000)
// via le bassin d'orage (65.5 x 83.9 m, rot grille 18.8°) + validation AGI
// (dessin eni 70116227-PW.2.2.2-LAY-Sheet14). Échelle raster : 0.3545 m/px.
// Les coins ci-dessous sont ceux du raster site-plan.png (958x1080 px) ;
// la grille locale 625x675 s'y projette par parallélogramme (exact pour une
// similitude). GARDER EN SYNC avec PLOT_PLAN dans v3/js/config.js.
const fs = require('fs');

const CORNERS = {                       // raster site-plan.png, WGS84
    TL: [-3.066518, 53.153166],         // px (0, 0)
    TR: [-3.061687, 53.152226],         // px (958, 0)
    BR: [-3.063452, 53.148952],         // px (958, 1080)
    BL: [-3.068282, 53.149893]          // px (0, 1080)
};

function toLngLat([x, y]) {
    const fx = x / 625;                 // fraction le long de l'axe est-plot (image x)
    const fy = y / 675;                 // fraction depuis le bas (image y inversé)
    const lng = CORNERS.BL[0] + fx * (CORNERS.BR[0] - CORNERS.BL[0]) + fy * (CORNERS.TL[0] - CORNERS.BL[0]);
    const lat = CORNERS.BL[1] + fx * (CORNERS.BR[1] - CORNERS.BL[1]) + fy * (CORNERS.TL[1] - CORNERS.BL[1]);
    return [+lng.toFixed(6), +lat.toFixed(6)];
}
function rect(x1, y1, x2, y2) {
    return [[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]].map(toLngLat)];
}

// [id, nom, couleur légende, x1,y1,x2,y2] — grille m, origine SW, x→est-plot, y→nord-plot
const CWA = [
    ['CWA-0100','Off-plot infrastructure (AGI compound, access road, car park, laydown)','#c8c8c8', 137, 34, 175,621],
    ['CWA-0200','CCU road infrastructure, drainage, underground piping','#8f8f8f',                 175,533, 575,560],
    ['CWA-0300','CO2 AGI compound','#fa8072',                                                      187,391, 262,520],
    ['CWA-0400','Regeneration area','#7fffd4',                                                     262,418, 325,520],
    ['CWA-0500','Future SCR','#00e5ee',                                                            475,472, 519,520],
    ['CWA-0600','CCU, FGD and flue gas stack','#9370db',                                           325,418, 475,520],
    ['CWA-0620','Absorber','#8a5fc0',                                                              362,391, 425,452],
    ['CWA-0630','Quencher','#8b2323',                                                              394,364, 437,391],
    ['CWA-0640','Treated gas wash tower','#add8e6',                                                331,452, 362,500],
    ['CWA-0650','Gas gas heater','#8b8b00',                                                        437,391, 456,472],
    ['CWA-0700','East-West main piperack — onsite','#ffd700',                                      250,358, 475,378],
    ['CWA-0701','North-South main piperack — onsite','#f5e050',                                    412,189, 437,358],
    ['CWA-0710','East-West main piperack — offsite','#ffec8b',                                     475,358, 575,378],
    ['CWA-0711','North-South main piperack — offsite','#fff2a8',                                   412, 54, 437,189],
    ['CWA-0800','CHP plant and steam turbine','#ff8c00',                                           462,283, 575,472],
    ['CWA-0900','CO2 compression area — onsite','#da70d6',                                         187,189, 325,358],
    ['CWA-0910','CO2 compression area — offsite','#c98fc9',                                        187,203, 250,297],
    ['CWA-1000','Ancillary process area — onsite','#4169e1',                                       325,203, 412,358],
    ['CWA-1010','Ancillary process area — offsite','#27408b',                                      344,230, 394,331],
    ['CWA-1100','Main substation / local equipment room','#00e000',                                437,203, 550,270],
    ['CWA-1200','Cooling water tower','#ffb6c1',                                                   437,122, 562,203],
    ['CWA-1300','Storm water holding pond','#ff9999',                                              187, 54, 275,175],
    ['CWA-1400','Tank farm and utilities','#dda0dd',                                               287, 47, 412,189],
    ['CWA-1500','Existing cement plant brownfield tie-ins & flue gas ducting','#20b2aa',           575,439, 619,472],
    ['CWA-1600','Central control room','#ff00ff',                                                  362,587, 519,655],
    ['CWA-1700','Water treatment plant','#4682b4',                                                 437, 47, 562,122]
];

const features = CWA.map(([id, name, color, x1, y1, x2, y2]) => ({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: rect(x1, y1, x2, y2) },
    properties: { id, name, color, kind: 'cwa' }
}));

fs.writeFileSync(require('path').join(__dirname, '..', 'data', 'cwa.geojson'),
    JSON.stringify({ type: 'FeatureCollection', features }));
console.log('cwa.geojson:', features.length, 'zones CWA générées');

// Centroïdes pour la table PIN de permitSeed.js
const cent = {};
CWA.forEach(([id,,,x1,y1,x2,y2]) => { cent[id] = toLngLat([(x1+x2)/2, (y1+y2)/2]); });
console.log(Object.entries(cent).map(([k,v]) => `    "${k}": [${v[0]}, ${v[1]}],`).join('\n'));
