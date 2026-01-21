// js/geometry/LevelFactory.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';
import { MineGeometry } from './MineGeometry.js';

/**
 * Factory for creating level meshes within a mine structure.
 * Can add levels to scene directly or to a parent group (for multi-structure support).
 */
export class LevelFactory {
    /**
     * Create a new LevelFactory.
     * @param {THREE.Scene|THREE.Group} parent - Parent to add levels to (scene or structure group)
     * @param {MaterialSystem} materialSystem - Material system for creating level materials
     */
    constructor(parent, materialSystem) {
        this.parent = parent;
        this.materialSystem = materialSystem;
        this.levels = new Map();
        this.pillars = []; // Track pillar groups for cleanup
        this.structureCode = null; // Set when creating levels for a specific structure
    }

    /**
     * Create all levels from level data.
     * @param {Array} levelData - Array of level objects
     * @param {string} structureCode - Optional structure code to associate with levels
     */
    createLevels(levelData, structureCode = null) {
        this.structureCode = structureCode;

        levelData.forEach((level, index) => {
            const mesh = this.createLevelMesh(level, index, structureCode);
            this.levels.set(level.level, mesh);
            this.parent.add(mesh);

            // Add support pillars between levels (not above first level)
            if (index > 0) {
                const pillars = MineGeometry.createPillars(
                    CONFIG.LEVEL_WIDTH,
                    CONFIG.LEVEL_DEPTH,
                    4, // 4 pillars per edge
                    CONFIG.LEVEL_SPACING - CONFIG.LEVEL_HEIGHT
                );

                // Position pillars below the current level
                pillars.position.y = mesh.position.y + CONFIG.LEVEL_HEIGHT / 2;
                pillars.userData = {
                    type: 'pillars',
                    structureCode: structureCode
                };
                this.parent.add(pillars);
                this.pillars.push(pillars);
            }
        });
    }

    /**
     * Create a single level mesh.
     * @param {Object} levelData - Level data object
     * @param {number} index - Index of level (for vertical positioning)
     * @param {string} structureCode - Optional structure code
     * @returns {THREE.Mesh}
     */
    createLevelMesh(levelData, index, structureCode = null) {
        // Use beveled geometry for polished look
        const geometry = MineGeometry.createLevel(
            CONFIG.LEVEL_WIDTH,
            CONFIG.LEVEL_HEIGHT,
            CONFIG.LEVEL_DEPTH,
            3 // bevel size
        );

        const risk = RiskResolver.resolveLevelRisk(levelData.activities);
        const material = this.materialSystem.createLevelMaterial(risk);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -index * CONFIG.LEVEL_SPACING;

        // Enable shadow casting and receiving
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Store level metadata including structure context
        mesh.userData = {
            type: 'level',
            levelNumber: levelData.level,
            levelName: levelData.name,
            structureCode: structureCode || levelData.structureCode || null,
            structureName: levelData.structureName || null,
            activities: levelData.activities,
            risk: risk
        };

        return mesh;
    }

    /**
     * Get a level mesh by number.
     * @param {number} levelNumber - Level number
     * @returns {THREE.Mesh|undefined}
     */
    getLevelMesh(levelNumber) {
        return this.levels.get(levelNumber);
    }

    /**
     * Get all level meshes.
     * @returns {Array<THREE.Mesh>}
     */
    getAllLevels() {
        return Array.from(this.levels.values());
    }

    /**
     * Update a level's risk display (material color).
     * @param {number} levelNumber - The level to update
     * @param {string} riskBand - New risk band: 'low', 'medium', or 'high'
     */
    updateLevelRisk(levelNumber, riskBand) {
        const mesh = this.levels.get(levelNumber);
        if (!mesh) return;

        // Update material color
        const newMaterial = this.materialSystem.createLevelMaterial(riskBand);

        // Preserve opacity if in focus mode
        if (mesh.material.transparent) {
            newMaterial.transparent = true;
            newMaterial.opacity = mesh.material.opacity;
        }

        mesh.material.dispose();
        mesh.material = newMaterial;

        // Update userData
        mesh.userData.risk = riskBand;
    }

    /**
     * Update level data (activities, name, etc.) without recreating mesh.
     * @param {number} levelNumber - Level number
     * @param {Object} levelData - Updated level data
     */
    updateLevelData(levelNumber, levelData) {
        const mesh = this.levels.get(levelNumber);
        if (!mesh) return;

        mesh.userData.levelName = levelData.name;
        mesh.userData.activities = levelData.activities;

        // Update risk if changed
        if (levelData.riskBand && levelData.riskBand !== mesh.userData.risk) {
            this.updateLevelRisk(levelNumber, levelData.riskBand);
        }
    }

    /**
     * Set visibility for all levels.
     * @param {boolean} visible
     */
    setAllVisible(visible) {
        this.levels.forEach(mesh => {
            mesh.visible = visible;
        });
        this.pillars.forEach(pillarGroup => {
            pillarGroup.visible = visible;
        });
    }

    /**
     * Set opacity for all levels (for focus mode).
     * @param {number} opacity - Opacity value (0-1)
     */
    setAllOpacity(opacity) {
        this.levels.forEach(mesh => {
            if (mesh.material) {
                mesh.material.transparent = opacity < 1;
                mesh.material.opacity = opacity;
                mesh.material.needsUpdate = true;
            }
        });
    }

    /**
     * Dispose all resources (meshes, materials, geometries).
     */
    dispose() {
        // Dispose level meshes
        this.levels.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            this.parent.remove(mesh);
        });
        this.levels.clear();

        // Dispose pillars
        this.pillars.forEach(pillarGroup => {
            pillarGroup.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
            this.parent.remove(pillarGroup);
        });
        this.pillars = [];
    }
}
