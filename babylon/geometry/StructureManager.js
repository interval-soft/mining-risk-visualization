// babylon/geometry/StructureManager.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';
import { LevelFactory } from './LevelFactory.js';
import { StructuralElements } from './StructuralElements.js';

/**
 * Manages multiple mine structures in the scene.
 * Each structure is a TransformNode containing its own LevelFactory.
 */
export class StructureManager {
    /**
     * Create a new StructureManager.
     * @param {BABYLON.Scene} scene - Babylon.js scene
     * @param {MaterialSystem} materialSystem - Material system
     * @param {SceneManager} sceneManager - For shadow casting
     */
    constructor(scene, materialSystem, sceneManager = null) {
        this.scene = scene;
        this.materialSystem = materialSystem;
        this.sceneManager = sceneManager;
        this.structures = new Map();
        this.focusedStructure = null;
    }

    /**
     * Create all structures from data.
     * @param {Array} structuresData - Array of structure objects
     */
    createStructures(structuresData) {
        structuresData.forEach((structureData, index) => {
            this.createStructure(structureData, index);
        });
    }

    /**
     * Create a single structure.
     */
    createStructure(structureData, index = 0) {
        const code = structureData.code;

        // Create root TransformNode for this structure
        const group = new BABYLON.TransformNode(`structure_${code}`, this.scene);

        // Position structure based on data or default spacing
        const position = structureData.position || { x: index * 600, z: 0 };
        group.position.x = position.x;
        group.position.z = position.z;

        // Apply rotation if specified
        if (structureData.rotation) {
            group.rotation.y = structureData.rotation * (Math.PI / 180);
        }

        // Create LevelFactory for this structure
        const levelFactory = new LevelFactory(
            group,
            this.materialSystem,
            this.sceneManager
        );
        levelFactory.createLevels(structureData.levels, code);

        // Create structural elements (shafts, ramps)
        const structuralElements = new StructuralElements(this.scene);
        structuralElements.createStructure(levelFactory.getAllLevels(), group);

        // Store structure info
        this.structures.set(code, {
            data: structureData,
            group: group,
            levelFactory: levelFactory,
            structuralElements: structuralElements
        });
    }

    /**
     * Get structure info by code.
     */
    getStructure(code) {
        return this.structures.get(code);
    }

    /**
     * Get a level mesh by structure code and level number.
     */
    getLevelMesh(structureCode, levelNumber) {
        const structure = this.structures.get(structureCode);
        if (!structure) return null;
        return structure.levelFactory.getLevelMesh(levelNumber);
    }

    /**
     * Get all level meshes from all structures.
     */
    getAllLevelMeshes() {
        const meshes = [];
        this.structures.forEach(structure => {
            meshes.push(...structure.levelFactory.getAllLevels());
        });
        return meshes;
    }

    /**
     * Get world position of a structure's center.
     */
    getStructureWorldPosition(structureCode) {
        const structure = this.structures.get(structureCode);
        if (!structure) return null;

        // Get center Y position (middle of all levels)
        const levels = structure.levelFactory.getAllLevels();
        if (levels.length === 0) return structure.group.position.clone();

        const minY = Math.min(...levels.map(l => l.position.y));
        const maxY = Math.max(...levels.map(l => l.position.y + CONFIG.LEVEL_HEIGHT));
        const centerY = (minY + maxY) / 2;

        return new BABYLON.Vector3(
            structure.group.position.x,
            centerY,
            structure.group.position.z
        );
    }

    /**
     * Set focus mode - highlight one structure, fade others.
     * @param {string|null} structureCode - Structure to focus, or null for all
     */
    setFocusMode(structureCode) {
        this.focusedStructure = structureCode;

        this.structures.forEach((structure, code) => {
            const opacity = structureCode === null || code === structureCode
                ? 1.0
                : CONFIG.ISOLATION_FADE_OPACITY;

            structure.levelFactory.setAllOpacity(opacity);
        });
    }

    /**
     * Update structures from new state data.
     */
    updateFromState(structuresData) {
        structuresData.forEach(structureData => {
            const structure = this.structures.get(structureData.code);
            if (!structure) return;

            structureData.levels.forEach(levelData => {
                structure.levelFactory.updateLevelData(levelData.level, levelData);
            });
        });
    }

    /**
     * Get all structure codes.
     */
    getStructureCodes() {
        return Array.from(this.structures.keys());
    }

    /**
     * Dispose all structures.
     */
    dispose() {
        this.structures.forEach(structure => {
            structure.levelFactory.dispose();
            structure.structuralElements.dispose();
            structure.group.dispose();
        });
        this.structures.clear();
    }
}
