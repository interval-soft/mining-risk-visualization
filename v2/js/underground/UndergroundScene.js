/**
 * UndergroundScene — schematic 3D view of the Hugo North block cave.
 *
 * Built from public NI 43-101 facts: 5 shafts to ~1.4 km, block-cave levels
 * (undercut → extraction → ventilation → haulage), 2,231 drawpoints in an
 * El Teniente layout, conveyor decline to surface. Real meters (1 unit = 1 m),
 * positions derived from surveyed shaft coordinates.
 *
 * Lazy-instantiated on first entry; owns its own RAF loop, paused on exit.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ugStatusOf } from '../sim/FleetSimulator.js';

// Local frame: origin at Shaft #1 collar, x = east (m), z = south (m), y = up.
const M_LAT = 111320, M_LNG = 111320 * Math.cos(43.035 * Math.PI / 180);
const ORIGIN = [106.8558, 43.0342]; // Shaft #1
function toLocal([lng, lat]) {
    return [(lng - ORIGIN[0]) * M_LNG, -(lat - ORIGIN[1]) * M_LAT];
}

/** Surveyed + approximated shaft collars (3 & 4 cluster near #2, unmapped in OSM).
 *  Only #1/#2/#5 get labels — the cluster would collide at overview distance. */
const SHAFTS = [
    { name: 'Shaft #1', lngLat: [106.8558, 43.0342], depth: 1385, dia: 6.7, label: true, labelDy: 80 },
    { name: 'Shaft #2', lngLat: [106.8458, 43.0380], depth: 1284, dia: 10, label: true, labelDy: 170 },
    { name: 'Shaft #3', lngLat: [106.8447, 43.0372], depth: 1148, dia: 10 },
    { name: 'Shaft #4', lngLat: [106.8468, 43.0390], depth: 1209, dia: 11 },
    { name: 'Shaft #5', lngLat: [106.8472, 43.0357], depth: 1178, dia: 6.7, label: true, labelDy: 40 }
];

const LEVELS = [
    { name: 'Undercut −1,283 m', y: -1283, labelDy: 60 },
    { name: 'Extraction −1,300 m', y: -1300, labelDy: 0 },
    { name: 'Exhaust −1,322 m', y: -1322, labelDy: -60 },
    { name: 'Haulage −1,344 m', y: -1344, labelDy: -120 }
];

const INK = 0x8d99a4, INK_DIM = 0x3a4148, ACCENT = 0xb7c2cc;
const STATUS = { operating: 0x4caf7d, standby: 0xd9a441, down: 0xd95757, maintenance: 0x5b8dbe };

/** Deterministic underground fleet (Sandvik LHDs on extraction drifts). */
const UG_FLEET = [
    { id: 'LH-501', drift: 2, offsetFrac: 0.0 },
    { id: 'LH-502', drift: 8, offsetFrac: 0.3 },
    { id: 'LH-503', drift: 14, offsetFrac: 0.6 },
    { id: 'LH-504', drift: 20, offsetFrac: 0.85 }
];

export class UndergroundScene {
    constructor(container) {
        this.container = container;
        this.running = false;

        const w = container.clientWidth, h = container.clientHeight;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0e1012);
        this.scene.fog = new THREE.Fog(0x0e1012, 5000, 12000);

        this.camera = new THREE.PerspectiveCamera(50, w / h, 1, 20000);
        this.camera.position.set(1800, 600, 1800);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(w, h);
        this.labelRenderer.domElement.className = 'ug-labels';
        container.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
        this.controls.target.set(-400, -1000, -300);
        this.controls.maxDistance = 8000;
        this.controls.enableDamping = true;

        this.labels = [];
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(1500, 2000, 800);
        this.scene.add(sun);

        this._buildSurface();
        this._buildShafts();
        this._buildOreBody();
        this._buildCave();
        this._buildConveyor();
        this._buildLHDs();

        window.addEventListener('resize', () => this._onResize());
    }

    /**
     * @param {number|null} maxDist - hide the label beyond this camera
     *   distance (m); declutters overlapping text at overview range.
     */
    _label(text, pos, cls = '', maxDist = null) {
        const el = document.createElement('div');
        el.className = 'ug-label ' + cls;
        el.textContent = text;
        const obj = new CSS2DObject(el);
        obj.position.set(...pos);
        this.scene.add(obj);
        if (maxDist) this.labels.push({ obj, el, maxDist });
        return obj;
    }

    /** Distance-based label culling — runs throttled from the render loop. */
    _cullLabels() {
        for (const { obj, el, maxDist } of this.labels) {
            el.classList.toggle('ug-hidden', this.camera.position.distanceTo(obj.position) > maxDist);
        }
    }

    /** Translucent surface plane + grid + pit marker for orientation. */
    _buildSurface() {
        const grid = new THREE.GridHelper(6000, 60, INK_DIM, 0x23282d);
        this.scene.add(grid);

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(6000, 6000),
            new THREE.MeshBasicMaterial({ color: 0x1e2226, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);

        // Open pit: schematic terraced cone at its real position, ~466 m deep
        const [px, pz] = toLocal([106.8516, 43.0085]);
        const pit = new THREE.Mesh(
            new THREE.ConeGeometry(900, 466, 48, 6, true),
            new THREE.MeshStandardMaterial({ color: INK_DIM, roughness: 0.9, side: THREE.DoubleSide, wireframe: true })
        );
        pit.rotation.x = Math.PI;
        pit.position.set(px, -233, pz);
        this.scene.add(pit);
        this._label('OPEN PIT (−466 m)', [px, 40, pz], 'ug-label-dim', 7000);
        this._label('SURFACE 0 m', [-2400, 30, 0], 'ug-label-dim');
    }

    _buildShafts() {
        for (const s of SHAFTS) {
            const [x, z] = toLocal(s.lngLat);
            const shaft = new THREE.Mesh(
                new THREE.CylinderGeometry(Math.max(s.dia, 8), Math.max(s.dia, 8), s.depth, 12),
                new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.6, transparent: true, opacity: 0.85 })
            );
            shaft.position.set(x, -s.depth / 2, z);
            this.scene.add(shaft);

            // headframe marker at collar
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(30, 45, 30),
                new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.5 })
            );
            head.position.set(x, 22, z);
            this.scene.add(head);
            if (s.label) this._label(`${s.name} · ${s.depth} m`, [x, s.labelDy ?? 80, z]);
        }
    }

    /** Hugo North deposit: elongated NNE, schematic translucent volume. */
    _buildOreBody() {
        const ore = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 16),
            new THREE.MeshStandardMaterial({ color: 0x7a6a4f, transparent: true, opacity: 0.22, roughness: 1 })
        );
        ore.scale.set(320, 140, 950);
        ore.rotation.y = -0.35; // NNE strike
        ore.position.set(-750, -1120, -650);
        this.scene.add(ore);
        this._label('HUGO NORTH DEPOSIT', [-750, -930, -650], 'ug-label-dim', 6500);
    }

    /**
     * Block cave: level slabs + extraction drifts + 2,231 drawpoints
     * (El Teniente layout — instanced, one draw call).
     */
    _buildCave() {
        const FOOT_W = 500, FOOT_L = 1000; // cave footprint (m)
        const CX = -750, CZ = -650, ROT = -0.35;
        const group = new THREE.Group();
        group.position.set(CX, 0, CZ);
        group.rotation.y = ROT;

        for (const lv of LEVELS) {
            const slab = new THREE.Mesh(
                new THREE.BoxGeometry(FOOT_W, 2, FOOT_L),
                new THREE.MeshBasicMaterial({ color: INK_DIM, transparent: true, opacity: 0.35 })
            );
            slab.position.y = lv.y;
            group.add(slab);
            // labels fan out to the left of the cave, staggered to avoid collisions
            const p = new THREE.Vector3(-FOOT_W / 2 - 220, lv.y, FOOT_L / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), ROT);
            this._label(lv.name, [CX + p.x, lv.y + lv.labelDy, CZ + p.z], 'ug-label-dim', 5200);
        }

        // 52 extraction drifts, ~19 m apart
        this.driftLines = [];
        const driftMat = new THREE.MeshBasicMaterial({ color: INK });
        for (let i = 0; i < 52; i++) {
            const z = -FOOT_L / 2 + i * (FOOT_L / 51);
            const drift = new THREE.Mesh(new THREE.BoxGeometry(FOOT_W, 4, 5), driftMat);
            drift.position.set(0, -1300 + 3, z);
            group.add(drift);
            this.driftLines.push(z);
        }

        // 2,231 drawpoints, staggered herringbone
        const COUNT = 2231;
        const dp = new THREE.InstancedMesh(
            new THREE.BoxGeometry(8, 8, 8),
            new THREE.MeshStandardMaterial({ color: INK, roughness: 0.8 }),
            COUNT
        );
        const m = new THREE.Matrix4();
        const perDrift = Math.ceil(COUNT / 52);
        let n = 0;
        for (let i = 0; i < 52 && n < COUNT; i++) {
            const z = this.driftLines[i];
            for (let j = 0; j < perDrift && n < COUNT; j++, n++) {
                const x = -FOOT_W / 2 + (j + (i % 2) * 0.5) * (FOOT_W / perDrift);
                m.setPosition(x, -1300 + 8, z + (j % 2 ? 6 : -6));
                dp.setMatrixAt(n, m);
            }
        }
        group.add(dp);
        this.scene.add(group);
        this.caveGroup = group;

        this._label('EXTRACTION — 2,231 DRAWPOINTS · 52 DRIFTS', [CX, -1210, CZ + 320], 'ug-label-title', 5800);
    }

    /** Conveyor decline: haulage level → surface (13.2 km total, shown schematically). */
    _buildConveyor() {
        const from = new THREE.Vector3(-400, -1344, -200);
        const to = new THREE.Vector3(2600, 0, 1800);
        const dir = to.clone().sub(from);
        const conveyor = new THREE.Mesh(
            new THREE.CylinderGeometry(6, 6, dir.length(), 8),
            new THREE.MeshBasicMaterial({ color: 0x9d8fc4, transparent: true, opacity: 0.8 })
        );
        conveyor.position.copy(from.clone().add(dir.clone().multiplyScalar(0.5)));
        conveyor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        this.scene.add(conveyor);
        this._label('CONVEYOR TO SURFACE · 13.2 km', [800, -600, 700], 'ug-label-dim', 7000);
    }

    /** 4 Sandvik LHDs tramming on extraction drifts — deterministic, status-coloured. */
    _buildLHDs() {
        this.lhds = [];
        for (const u of UG_FLEET) {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(11, 6, 22),
                new THREE.MeshStandardMaterial({ color: STATUS.operating, roughness: 0.4 })
            );
            this.scene.add(mesh);
            const label = this._label(u.id, [0, 0, 0], 'ug-label-unit', 3000);
            this.lhds.push({ ...u, mesh, label });
        }
    }

    /** Deterministic LHD state at t — mirrors FleetSimulator's f(t) philosophy. */
    _updateLHDs(tMs) {
        const FOOT_W = 500, CX = -750, CZ = -650, ROT = -0.35;
        const CYCLE_S = 95; // muck → ore pass → return
        for (const u of this.lhds) {
            const status = ugStatusOf(u.id, tMs);
            const tc = ((tMs / 1000 + u.offsetFrac * CYCLE_S) % CYCLE_S) / CYCLE_S;
            // triangle wave: out and back along the drift
            const f = status === 'operating' ? (tc < 0.5 ? tc * 2 : 2 - tc * 2) : 0.05;
            const x = -FOOT_W / 2 + f * FOOT_W;
            const z = this.driftLines[u.drift];
            const p = new THREE.Vector3(x, -1300 + 8, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), ROT);
            u.mesh.position.set(CX + p.x, p.y, CZ + p.z);
            u.mesh.rotation.y = ROT + (tc < 0.5 ? 0 : Math.PI);
            u.mesh.material.color.setHex(STATUS[status]);
            u.label.position.set(CX + p.x, p.y + 26, CZ + p.z);
        }
    }

    _onResize() {
        if (!this.running) return;
        const w = this.container.clientWidth, h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.labelRenderer.setSize(w, h);
    }

    enter() {
        this.running = true;
        this._onResize();
        // oblique framing: shafts + full cave depth fill the viewport
        this.camera.position.set(1300, 250, 1600);
        this.controls.target.set(-550, -1050, -450);
        let frame = 0;
        const loop = () => {
            if (!this.running) return;
            this._updateLHDs(Date.now());
            if (frame++ % 15 === 0) this._cullLabels();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.scene, this.camera);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    exit() {
        this.running = false;
    }
}
