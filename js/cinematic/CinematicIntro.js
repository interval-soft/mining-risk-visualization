// js/cinematic/CinematicIntro.js
// Cinematic opening sequence — hides all 3D/UI elements, then reveals them
// with a choreographed GSAP master timeline.

import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Orchestrates a ~27-second cinematic reveal of the mine visualization.
 *
 * Approach: the app initializes normally (all meshes, icons, UI created),
 * then this class hides everything and plays a GSAP timeline that reveals
 * each element dramatically.
 */
export class CinematicIntro {
    /**
     * @param {Object} refs - References to app subsystems
     * @param {Object} refs.sceneManager       - SceneManager (camera, scene)
     * @param {Object} refs.cameraController   - CameraController (controls, animateTo)
     * @param {Object} refs.levelFactory       - LevelFactory (getAllLevels, pillars) — may be null
     * @param {Object} refs.structureManager   - StructureManager — may be null
     * @param {Object} refs.structuralElements - StructuralElements (getAllElements) — may be null
     * @param {Object} refs.iconManager        - ActivityIconManager (getAllSprites)
     * @param {Object} refs.labelRenderer      - LabelRenderer (setAllLabelsVisible)
     * @param {Object} refs.riskEffects        - RiskEffects (clearAll, updateEffects)
     * @param {Object} refs.materialSystem     - MaterialSystem
     * @param {Object} refs.stateManager       - StateManager (for level data after reveal)
     */
    constructor(refs) {
        this.refs = refs;
        this.masterTimeline = null;
        this._onKeyDown = null;
        this._skipHandler = null;
        this._resolve = null;

        // Snapshot original materials so we can swap to gray then restore
        this._originalMaterials = new Map();
    }

    /**
     * Run the full cinematic sequence.
     * Returns a Promise that resolves when complete (or skipped).
     */
    play() {
        return new Promise((resolve) => {
            this._resolve = resolve;

            // Step 1 — Hide all 3D objects and UI
            this._hideObjects();

            // Step 2 — Build the GSAP master timeline
            this._buildTimeline();

            // Step 3 — Wire up skip controls
            this._setupSkip();

            // Step 4 — Play
            this.masterTimeline.play();
        });
    }

    // ─── Hide everything ────────────────────────────────

    _hideObjects() {
        const {
            sceneManager,
            cameraController,
            iconManager,
            labelRenderer,
            riskEffects
        } = this.refs;

        // --- Camera: dramatic high angle ---
        const camera = sceneManager.camera;
        camera.position.set(800, 1200, 1600);
        cameraController.controls.target.set(0, -200, 0);
        cameraController.controls.enabled = false;
        cameraController.controls.update();

        // --- Levels: scale to 0, swap to neutral gray material ---
        const levels = this._getLevels();
        const neutralColor = new THREE.Color(0x555555);

        levels.forEach((mesh) => {
            // Store original material
            this._originalMaterials.set(mesh.uuid, mesh.material);

            // Clone current material and make it neutral gray
            const grayMat = mesh.material.clone();
            grayMat.color.copy(neutralColor);
            grayMat.map = null;           // remove risk-tinted texture
            grayMat.emissive.setHex(0x000000);
            grayMat.emissiveIntensity = 0;
            grayMat.transparent = true;
            grayMat.opacity = 1.0;
            grayMat.needsUpdate = true;
            mesh.material = grayMat;

            mesh.scale.set(0, 0, 0);
        });

        // --- Pillars: scale to 0 ---
        this._getPillars().forEach((pillar) => {
            pillar.scale.set(0, 0, 0);
        });

        // --- Structural elements (shafts, ramps): hide ---
        this._getStructuralElements().forEach((el) => {
            el.visible = false;
            if (el.material) {
                el.material.transparent = true;
                el.material.opacity = 0;
            }
        });

        // --- Icons (sprites): scale to 0, transparent ---
        iconManager.getAllSprites().forEach((sprite) => {
            sprite.scale.set(0, 0, 0);
            sprite.material.opacity = 0;
        });

        // --- Labels: hide ---
        labelRenderer.setAllLabelsVisible(false);

        // --- Risk effects: clear ---
        riskEffects.clearAll();
    }

    // ─── Build the master GSAP timeline ─────────────────

    _buildTimeline() {
        const tl = gsap.timeline({
            paused: true,
            onComplete: () => this._onComplete()
        });

        this.masterTimeline = tl;

        const overlay = document.getElementById('cinematic-overlay');
        const titleMain = overlay?.querySelector('.cinematic-title-main');
        const titleSub = overlay?.querySelector('.cinematic-title-sub');
        const titleSite = overlay?.querySelector('.cinematic-title-site');
        const clientLogo = overlay?.querySelector('.cinematic-logo-client');
        const credits = overlay?.querySelector('.cinematic-credits');
        const skipBtn = document.getElementById('cinematic-skip');

        // ── Phase 1: Title card fade in (0 – 1.8s) ──
        // Client logo fades in first
        if (clientLogo) {
            tl.to(clientLogo, {
                opacity: 1, duration: 1.0, ease: 'power2.out'
            }, 0.1);
        }
        if (titleMain) {
            tl.to(titleMain, {
                opacity: 1, duration: 1.2, ease: 'power2.out'
            }, 0.3);
        }
        if (titleSub) {
            tl.to(titleSub, {
                opacity: 1, duration: 1.0, ease: 'power2.out'
            }, 0.7);
        }
        if (titleSite) {
            tl.to(titleSite, {
                opacity: 1, duration: 0.8, ease: 'power2.out'
            }, 1.0);
        }
        // Credits (RevDev) fade in last
        if (credits) {
            tl.to(credits, {
                opacity: 1, duration: 0.8, ease: 'power2.out'
            }, 1.2);
        }
        // Show skip button
        if (skipBtn) {
            tl.to(skipBtn, {
                opacity: 1, duration: 0.5, ease: 'power2.out'
            }, 1.0);
        }

        // ── Phase 2: Title hold (1.8 – 3.5s) ──
        // (nothing — titles remain visible)

        // ── Phase 3: Title fade out (3.5 – 4.5s) ──
        const titleEls = [clientLogo, titleMain, titleSub, titleSite, credits].filter(Boolean);
        titleEls.forEach((el) => {
            tl.to(el, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 3.5);
        });

        // ── Phase 4: Overlay dissolve (4.5 – 6.0s) ──
        if (overlay) {
            tl.to(overlay, {
                opacity: 0,
                duration: 1.5,
                ease: 'power2.inOut',
                onComplete: () => {
                    overlay.style.pointerEvents = 'none';
                }
            }, 4.5);
        }

        // ── Phase 5: Levels materialize (5.0 – 8.5s) ──
        const levels = this._getLevels();
        levels.forEach((mesh, i) => {
            tl.to(mesh.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.7,
                ease: 'back.out(1.4)'
            }, 5.0 + i * 0.5);
        });

        // ── Phase 6: Pillars build (6.0 – 10s) ──
        const pillars = this._getPillars();
        pillars.forEach((pillar, i) => {
            tl.to(pillar.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.6,
                ease: 'back.out(1.2)'
            }, 6.0 + i * 0.4);
        });

        // ── Phase 7: Ramps / structural elements fade in (9 – 11s) ──
        const structElements = this._getStructuralElements();
        structElements.forEach((el, i) => {
            tl.call(() => { el.visible = true; }, [], 9.0 + i * 0.15);
            if (el.material) {
                tl.to(el.material, {
                    opacity: 0.5,
                    duration: 1.0,
                    ease: 'power2.out'
                }, 9.0 + i * 0.15);
            }
        });

        // ── Phase 8: Icons pop in (11 – 14s) ──
        const sprites = this.refs.iconManager.getAllSprites();
        sprites.forEach((sprite, i) => {
            // Store original scale (icons may have varying sizes)
            const origScale = sprite.userData._cinematicOrigScale ||
                { x: sprite.scale.x || 1, y: sprite.scale.y || 1, z: sprite.scale.z || 1 };
            // Since we set scale to 0 earlier, we need to know the target
            // Icons are typically uniform — check if userData stored the intended scale
            const targetScale = sprite.userData.originalScale ||
                { x: 30, y: 30, z: 1 }; // default sprite scale

            tl.to(sprite.scale, {
                x: targetScale.x || 30,
                y: targetScale.y || 30,
                z: targetScale.z || 1,
                duration: 0.5,
                ease: 'elastic.out(1, 0.5)'
            }, 11.0 + i * 0.06);

            tl.to(sprite.material, {
                opacity: 1,
                duration: 0.3,
                ease: 'power2.out'
            }, 11.0 + i * 0.06);
        });

        // ── Phase 9: Risk colors activate (14 – 17s) ──
        levels.forEach((mesh, i) => {
            const originalMat = this._originalMaterials.get(mesh.uuid);
            if (!originalMat) return;

            // Lerp from gray to the original risk color
            const grayColor = new THREE.Color(0x555555);
            const targetColor = originalMat.color.clone();
            const targetMap = originalMat.map;

            tl.to({}, {
                duration: 0.6,
                ease: 'power2.inOut',
                onUpdate: function () {
                    const progress = this.progress();
                    mesh.material.color.copy(grayColor).lerp(targetColor, progress);
                    mesh.material.needsUpdate = true;
                },
                onComplete: () => {
                    // Restore the original material fully
                    mesh.material = originalMat;
                    mesh.material.transparent = true;
                    mesh.material.opacity = 1.0;
                    mesh.material.needsUpdate = true;
                }
            }, 14.0 + i * 0.3);
        });

        // ── Phase 10: Camera sweep (5 – 20s, concurrent) ──
        const camera = this.refs.sceneManager.camera;
        const controls = this.refs.cameraController.controls;

        tl.to(camera.position, {
            x: 0, y: 400, z: 1100,
            duration: 15,
            ease: 'power2.inOut',
            onUpdate: () => controls.update()
        }, 5.0);

        tl.to(controls.target, {
            x: 0, y: -300, z: 0,
            duration: 15,
            ease: 'power2.inOut'
        }, 5.0);

        // ── Phase 11: Labels appear (20 – 21s) ──
        tl.call(() => {
            this.refs.labelRenderer.setAllLabelsVisible(true);
        }, [], 20.0);

        // ── Phase 12: UI panels slide in (20.5 – 23s) ──
        const uiPanels = [
            '#top-bar',
            '#client-logo',
            '#left-sidebar',
            '#right-sidebar',
            '#timeline-container',
            '#branding',
            '#query-container'
        ];

        uiPanels.forEach((selector, i) => {
            const el = document.querySelector(selector);
            if (!el) return;
            tl.to(el, {
                opacity: 1,
                x: 0, y: 0,
                duration: 0.7,
                ease: 'power3.out',
                clearProps: 'transform,opacity'  // remove inline styles when done
            }, 20.5 + i * 0.15);
        });

        // ── Phase 13: Risk effects activate (23.5s) ──
        tl.call(() => {
            this._reactivateRiskEffects();
        }, [], 23.5);

        // ── Phase 14: LIVE indicator pulse (24.5s) ──
        tl.call(() => {
            const indicator = document.getElementById('mode-indicator');
            if (indicator) {
                indicator.classList.add('live');
            }
        }, [], 24.5);

        // ── Phase 15: Cleanup (25.5s — timeline end) ──
        // onComplete callback handles this
    }

    // ─── Skip handling ──────────────────────────────────

    _setupSkip() {
        const skipBtn = document.getElementById('cinematic-skip');

        this._onKeyDown = (e) => {
            if (e.key === 'Escape') {
                this._skip();
            }
        };
        document.addEventListener('keydown', this._onKeyDown);

        if (skipBtn) {
            this._skipHandler = () => this._skip();
            skipBtn.addEventListener('click', this._skipHandler);
        }
    }

    _skip() {
        if (!this.masterTimeline) return;
        // Jump to end — GSAP will fire all intermediate callbacks
        this.masterTimeline.progress(1);
    }

    // ─── Completion / cleanup ───────────────────────────

    _onComplete() {
        // Ensure everything is in final state

        // Restore all original materials
        const levels = this._getLevels();
        levels.forEach((mesh) => {
            const originalMat = this._originalMaterials.get(mesh.uuid);
            if (originalMat) {
                mesh.material = originalMat;
                mesh.material.transparent = true;
                mesh.material.opacity = 1.0;
                mesh.material.needsUpdate = true;
            }
            mesh.scale.set(1, 1, 1);
        });

        // Ensure pillars are visible
        this._getPillars().forEach((p) => p.scale.set(1, 1, 1));

        // Ensure structural elements visible
        this._getStructuralElements().forEach((el) => {
            el.visible = true;
            if (el.material) {
                el.material.opacity = 0.5;
            }
        });

        // Ensure icons are visible at correct scale
        this.refs.iconManager.getAllSprites().forEach((sprite) => {
            const ts = sprite.userData.originalScale || { x: 30, y: 30, z: 1 };
            sprite.scale.set(ts.x || 30, ts.y || 30, ts.z || 1);
            sprite.material.opacity = 1;
        });

        // Labels visible
        this.refs.labelRenderer.setAllLabelsVisible(true);

        // Re-enable orbit controls
        this.refs.cameraController.controls.enabled = true;

        // Final camera position
        const camera = this.refs.sceneManager.camera;
        const controls = this.refs.cameraController.controls;
        camera.position.set(0, 400, 1100);
        controls.target.set(0, -300, 0);
        controls.update();

        // Reactivate risk effects
        this._reactivateRiskEffects();

        // UI cleanup
        const overlay = document.getElementById('cinematic-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
        }

        const skipBtn = document.getElementById('cinematic-skip');
        if (skipBtn) skipBtn.style.display = 'none';

        // Ensure all UI panels are fully visible and cleared of cinematic transforms
        const uiPanels = [
            '#top-bar', '#client-logo', '#left-sidebar', '#right-sidebar',
            '#timeline-container', '#branding', '#query-container'
        ];
        uiPanels.forEach((sel) => {
            const el = document.querySelector(sel);
            if (el) {
                el.style.opacity = '';
                el.style.transform = '';
                el.style.pointerEvents = '';
            }
        });

        // Remove cinematic-active class (CSS hidden states)
        document.body.classList.remove('cinematic-active');

        // Remove listeners
        if (this._onKeyDown) {
            document.removeEventListener('keydown', this._onKeyDown);
        }
        if (this._skipHandler && skipBtn) {
            skipBtn.removeEventListener('click', this._skipHandler);
        }

        // Kill the timeline
        if (this.masterTimeline) {
            this.masterTimeline.kill();
            this.masterTimeline = null;
        }

        // Dispose gray materials
        this._originalMaterials.forEach((origMat, uuid) => {
            // The gray clone is no longer referenced, GC will collect
        });
        this._originalMaterials.clear();

        // Resolve the play() promise
        if (this._resolve) {
            this._resolve();
            this._resolve = null;
        }
    }

    // ─── Helpers ─────────────────────────────────────────

    _getLevels() {
        const { levelFactory, structureManager } = this.refs;
        if (structureManager && structureManager.getAllLevelMeshes) {
            return structureManager.getAllLevelMeshes();
        }
        if (levelFactory) {
            return levelFactory.getAllLevels();
        }
        return [];
    }

    _getStructuralElements() {
        const { structuralElements, structureManager } = this.refs;

        let elements = [];

        if (structureManager && typeof structureManager.getAllStructures === 'function') {
            // Multi-structure: each structure has its own StructuralElements
            const structures = structureManager.getAllStructures();
            structures.forEach((s) => {
                if (s.structuralElements) {
                    elements.push(...s.structuralElements.getAllElements());
                }
            });
        } else if (structuralElements) {
            elements = structuralElements.getAllElements();
        }

        return elements;
    }

    _getPillars() {
        const { levelFactory, structureManager } = this.refs;

        // Collect pillar groups from the appropriate source
        let pillarGroups = [];

        if (structureManager && typeof structureManager.getAllStructures === 'function') {
            // Multi-structure: each structure has its own LevelFactory with pillars
            const structures = structureManager.getAllStructures();
            structures.forEach((s) => {
                if (s.levelFactory && s.levelFactory.pillars) {
                    pillarGroups.push(...s.levelFactory.pillars);
                }
            });
        } else if (levelFactory && levelFactory.pillars) {
            pillarGroups = levelFactory.pillars;
        }

        return pillarGroups;
    }

    _reactivateRiskEffects() {
        const { riskEffects, stateManager } = this.refs;
        if (!riskEffects || !stateManager) return;

        const state = stateManager.currentState;
        if (!state) return;

        // Build levels array from current state
        let levels = [];
        if (state.structures) {
            state.structures.forEach((s) => {
                if (s.levels) levels.push(...s.levels);
            });
        } else if (state.levels) {
            levels = state.levels;
        }

        if (levels.length > 0) {
            riskEffects.updateEffects(levels);
        }
    }
}
