// js/geometry/LevelFactory.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';

export class LevelFactory {
    constructor(scene, materialSystem) {
        this.scene = scene;
        this.materialSystem = materialSystem;
        this.levels = new Map();
    }

    createLevels(levelData) {
        levelData.forEach((level, index) => {
            const mesh = this.createLevelMesh(level, index);
            this.levels.set(level.level, mesh);
            this.scene.add(mesh);
        });
    }

    createLevelMesh(levelData, index) {
        const geometry = new THREE.BoxGeometry(
            CONFIG.LEVEL_WIDTH,
            CONFIG.LEVEL_HEIGHT,
            CONFIG.LEVEL_DEPTH
        );

        const risk = RiskResolver.resolveLevelRisk(levelData.activities);
        const material = this.materialSystem.createLevelMaterial(risk);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -index * CONFIG.LEVEL_SPACING;

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
}
