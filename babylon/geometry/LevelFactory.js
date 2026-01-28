// babylon/geometry/LevelFactory.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';
import { RiskResolver } from '../../js/data/RiskResolver.js';
import { MineGeometry } from './MineGeometry.js';

/**
 * Factory for creating level meshes within a mine structure.
 * Babylon.js version that adds levels to scene or parent TransformNode.
 */
export class LevelFactory {
    /**
     * Create a new LevelFactory.
     * @param {BABYLON.Scene|BABYLON.TransformNode} parent - Parent to add levels to
     * @param {MaterialSystem} materialSystem - Material system for creating level materials
     * @param {SceneManager} sceneManager - Scene manager for shadow casting
     */
    constructor(parent, materialSystem, sceneManager = null) {
        this.parent = parent;
        this.scene = parent.getScene ? parent.getScene() : parent;
        this.materialSystem = materialSystem;
        this.sceneManager = sceneManager;
        this.levels = new Map();
        this.pillars = [];
        this.structureCode = null;
    }

    /**
     * Create all levels from level data.
     * @param {Array} levelData - Array of level objects
     * @param {string} structureCode - Optional structure code
     */
    createLevels(levelData, structureCode = null) {
        this.structureCode = structureCode;

        levelData.forEach((level, index) => {
            const mesh = this.createLevelMesh(level, index, structureCode);
            this.levels.set(level.level, mesh);

            // Set parent
            if (this.parent.getScene) {
                // Parent is a TransformNode
                mesh.parent = this.parent;
            }
            // If parent is scene, mesh is automatically added

            // Add support pillars for levels below the first
            if (index > 0) {
                const pillars = MineGeometry.createPillars(
                    this.scene,
                    CONFIG.LEVEL_WIDTH,
                    CONFIG.LEVEL_DEPTH,
                    4,
                    CONFIG.LEVEL_SPACING - CONFIG.LEVEL_HEIGHT
                );

                // Position pillar group at the top surface of current level
                // Box is centered, so top surface is at position.y + LEVEL_HEIGHT/2
                pillars.position.y = mesh.position.y + CONFIG.LEVEL_HEIGHT / 2;
                pillars.metadata = {
                    type: 'pillars',
                    structureCode: structureCode
                };

                if (this.parent.getScene) {
                    pillars.parent = this.parent;
                }

                this.pillars.push(pillars);
            }
        });
    }

    /**
     * Create a single level mesh.
     */
    createLevelMesh(levelData, index, structureCode = null) {
        const meshName = `level_${levelData.level}_${structureCode || 'default'}`;

        // Create level geometry
        const mesh = MineGeometry.createLevel(
            this.scene,
            meshName,
            CONFIG.LEVEL_WIDTH,
            CONFIG.LEVEL_HEIGHT,
            CONFIG.LEVEL_DEPTH,
            3
        );

        // Position vertically based on index
        // Box is centered at origin, so offset by half height to align bottom at the target Y
        mesh.position.y = -index * CONFIG.LEVEL_SPACING;

        // Apply risk-based material
        const risk = RiskResolver.resolveLevelRisk(levelData.activities);
        const material = this.materialSystem.createLevelMaterial(risk);
        mesh.material = material;

        // Enable shadows
        mesh.receiveShadows = true;
        if (this.sceneManager) {
            this.sceneManager.addShadowCaster(mesh);
        }

        // Store level metadata
        mesh.metadata = {
            type: 'level',
            levelNumber: levelData.level,
            levelName: levelData.name,
            structureCode: structureCode || levelData.structureCode || null,
            structureName: levelData.structureName || null,
            activities: levelData.activities,
            risk: risk
        };

        // Add userData proxy for Three.js UI compatibility
        // Three.js uses mesh.userData, Babylon.js uses mesh.metadata
        Object.defineProperty(mesh, 'userData', {
            get: function() { return this.metadata; },
            set: function(value) { this.metadata = value; }
        });

        // Add visible property proxy for Three.js UI compatibility
        // Three.js uses mesh.visible, Babylon.js uses mesh.isVisible
        if (!('visible' in mesh)) {
            Object.defineProperty(mesh, 'visible', {
                get: function() { return this.isVisible; },
                set: function(value) { this.isVisible = value; }
            });
        }

        // Set rendering group for selective bloom
        mesh.renderingGroupId = 1;

        return mesh;
    }

    /**
     * Get a level mesh by number.
     */
    getLevelMesh(levelNumber) {
        return this.levels.get(levelNumber);
    }

    /**
     * Get all level meshes.
     */
    getAllLevels() {
        return Array.from(this.levels.values());
    }

    /**
     * Update a level's risk display (material color).
     */
    updateLevelRisk(levelNumber, riskBand) {
        const mesh = this.levels.get(levelNumber);
        if (!mesh) return;

        // Store current opacity if in focus mode
        const currentAlpha = mesh.material ? mesh.material.alpha : 1.0;

        // Create new material with updated risk color
        const newMaterial = this.materialSystem.createLevelMaterial(riskBand);

        // Preserve opacity
        newMaterial.alpha = currentAlpha;

        // Dispose old material and assign new
        if (mesh.material) {
            mesh.material.dispose();
        }
        mesh.material = newMaterial;

        // Update metadata
        if (mesh.metadata) {
            mesh.metadata.risk = riskBand;
        }
    }

    /**
     * Update level data without recreating mesh.
     */
    updateLevelData(levelNumber, levelData) {
        const mesh = this.levels.get(levelNumber);
        if (!mesh) return;

        if (mesh.metadata) {
            mesh.metadata.levelName = levelData.name;
            mesh.metadata.activities = levelData.activities;
        }

        // Update risk if changed
        if (levelData.riskBand && mesh.metadata.risk !== levelData.riskBand) {
            this.updateLevelRisk(levelNumber, levelData.riskBand);
        }
    }

    /**
     * Set visibility for all levels.
     */
    setAllVisible(visible) {
        this.levels.forEach(mesh => {
            mesh.isVisible = visible;
        });
        this.pillars.forEach(pillarGroup => {
            pillarGroup.setEnabled(visible);
        });
    }

    /**
     * Set opacity for all levels (for focus mode).
     */
    setAllOpacity(opacity) {
        this.levels.forEach(mesh => {
            if (mesh.material) {
                mesh.material.alpha = opacity;
            }
        });
    }

    /**
     * Dispose all resources.
     */
    dispose() {
        // Dispose level meshes
        this.levels.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });
        this.levels.clear();

        // Dispose pillars
        this.pillars.forEach(pillarGroup => {
            pillarGroup.getChildMeshes().forEach(child => {
                if (child.material) {
                    child.material.dispose();
                }
                child.dispose();
            });
            pillarGroup.dispose();
        });
        this.pillars = [];
    }
}
