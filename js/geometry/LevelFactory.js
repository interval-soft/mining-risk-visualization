// js/geometry/LevelFactory.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';
import { MineGeometry } from './MineGeometry.js';

export class LevelFactory {
    constructor(scene, materialSystem) {
        this.scene = scene;
        this.materialSystem = materialSystem;
        this.levels = new Map();
        this.pillars = []; // Track pillar groups for cleanup
    }

    createLevels(levelData) {
        levelData.forEach((level, index) => {
            const mesh = this.createLevelMesh(level, index);
            this.levels.set(level.level, mesh);
            this.scene.add(mesh);
            
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
                this.scene.add(pillars);
                this.pillars.push(pillars);
            }
        });
    }

    createLevelMesh(levelData, index) {
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

        mesh.userData = {
            type: 'level',
            levelNumber: levelData.level,
            levelName: levelData.name,
            activities: levelData.activities,
            risk: risk
        };

        return mesh;
    }

    getLevelMesh(levelNumber) {
        return this.levels.get(levelNumber);
    }

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
        mesh.material.dispose();
        mesh.material = newMaterial;

        // Update userData
        mesh.userData.risk = riskBand;
    }
}
