// js/geometry/StructureManager.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LevelFactory } from './LevelFactory.js';
import { MineGeometry } from './MineGeometry.js';
import { StructuralElements } from './StructuralElements.js';

/**
 * Manages multiple mine structures in 3D space.
 * Each structure is a THREE.Group containing its levels, positioned independently.
 */
export class StructureManager {
    constructor(scene, materialSystem) {
        this.scene = scene;
        this.materialSystem = materialSystem;

        // Map: structure code -> { group, levelFactory, data }
        this.structures = new Map();

        // Focus state
        this.focusedStructure = null;
        this.unfocusedOpacity = CONFIG.ISOLATION_FADE_OPACITY || 0.15;

        // Animation state for focus transitions
        this.isAnimating = false;
    }

    /**
     * Create all structures from API data.
     * @param {Array} structuresData - Array of structure objects with levels
     */
    createStructures(structuresData) {
        // Clear existing structures
        this.clearStructures();

        structuresData.forEach((structureData, index) => {
            this.createStructure(structureData, index);
        });
    }

    /**
     * Create a single structure with its levels.
     * @param {Object} structureData - Structure data including levels
     * @param {number} index - Structure index for display order
     */
    createStructure(structureData, index = 0) {
        const { code, name, type, position, rotation, levels } = structureData;

        // Create parent group for this structure
        const group = new THREE.Group();
        group.name = `structure-${code}`;
        group.userData = {
            type: 'structure',
            structureCode: code,
            structureName: name,
            structureType: type,
            index: index
        };

        // Position the structure in world space
        group.position.set(
            position?.x || 0,
            0,
            position?.z || 0
        );

        // Apply rotation if specified
        if (rotation) {
            group.rotation.y = rotation * (Math.PI / 180); // Convert degrees to radians
        }

        // Create level factory for this structure (uses group as parent)
        const levelFactory = new LevelFactory(group, this.materialSystem);
        levelFactory.createLevels(levels, code);

        // Create structural elements (shafts, ramps, elevator) for this structure
        const structuralElements = new StructuralElements(group);
        structuralElements.createStructure(levelFactory.getAllLevels());

        // Add structure group to scene
        this.scene.add(group);

        // Store reference
        this.structures.set(code, {
            group,
            levelFactory,
            structuralElements,
            data: structureData
        });

        return group;
    }

    /**
     * Clear all structures from the scene.
     */
    clearStructures() {
        this.structures.forEach(({ group, levelFactory, structuralElements }) => {
            // Dispose level meshes
            levelFactory.dispose();

            // Dispose structural elements
            if (structuralElements) {
                structuralElements.dispose();
            }

            // Remove group from scene
            this.scene.remove(group);
        });

        this.structures.clear();
        this.focusedStructure = null;
    }

    /**
     * Get a structure by code.
     * @param {string} code - Structure code
     * @returns {Object|null} { group, levelFactory, data } or null
     */
    getStructure(code) {
        return this.structures.get(code) || null;
    }

    /**
     * Get all structures.
     * @returns {Array} Array of { code, group, levelFactory, data }
     */
    getAllStructures() {
        return Array.from(this.structures.entries()).map(([code, value]) => ({
            code,
            ...value
        }));
    }

    /**
     * Get all level meshes across all structures.
     * @returns {Array<THREE.Mesh>} All level meshes
     */
    getAllLevelMeshes() {
        const meshes = [];
        this.structures.forEach(({ levelFactory }) => {
            meshes.push(...levelFactory.getAllLevels());
        });
        return meshes;
    }

    /**
     * Get level factory for a specific structure.
     * @param {string} code - Structure code
     * @returns {LevelFactory|null}
     */
    getLevelFactory(code) {
        const structure = this.structures.get(code);
        return structure?.levelFactory || null;
    }

    /**
     * Get a specific level mesh.
     * @param {string} structureCode - Structure code
     * @param {number} levelNumber - Level number within structure
     * @returns {THREE.Mesh|null}
     */
    getLevelMesh(structureCode, levelNumber) {
        const structure = this.structures.get(structureCode);
        if (!structure) return null;
        return structure.levelFactory.getLevelMesh(levelNumber);
    }

    /**
     * Set focus mode - show only the focused structure, hide others.
     * @param {string|null} focusCode - Structure code to focus, or null for site view
     */
    setFocusMode(focusCode) {
        // Prevent duplicate calls
        if (this.focusedStructure === focusCode) {
            return;
        }
        this.focusedStructure = focusCode;

        // Site view (focusCode is null): show all structures at full opacity
        if (focusCode === null) {
            this.structures.forEach(({ group, levelFactory }, code) => {
                // Make group visible
                group.visible = true;

                // Reset each level to fully opaque (MUST set transparent=false)
                levelFactory.getAllLevels().forEach(mesh => {
                    mesh.material.opacity = 1.0;
                    mesh.material.transparent = false;
                    mesh.material.needsUpdate = true;
                    mesh.visible = true;
                });
            });
            return;
        }

        // Structure focus mode: hide other structures
        this.structures.forEach(({ group, levelFactory }, code) => {
            const isFocused = code === focusCode;
            group.visible = isFocused;

            if (isFocused) {
                levelFactory.getAllLevels().forEach(mesh => {
                    mesh.material.opacity = 1.0;
                    mesh.material.needsUpdate = true;
                });
            }
        });
    }

    /**
     * Get the world position of a structure's center.
     * @param {string} code - Structure code
     * @returns {THREE.Vector3|null}
     */
    getStructureWorldPosition(code) {
        const structure = this.structures.get(code);
        if (!structure) return null;

        const worldPos = new THREE.Vector3();
        structure.group.getWorldPosition(worldPos);

        // Adjust Y to center of the structure (middle of its levels)
        const levels = structure.levelFactory.getAllLevels();
        if (levels.length > 0) {
            const minY = Math.min(...levels.map(m => m.position.y));
            const maxY = Math.max(...levels.map(m => m.position.y));
            worldPos.y = (minY + maxY) / 2;
        }

        return worldPos;
    }

    /**
     * Get the bounding box of a structure.
     * @param {string} code - Structure code
     * @returns {THREE.Box3|null}
     */
    getStructureBounds(code) {
        const structure = this.structures.get(code);
        if (!structure) return null;

        const box = new THREE.Box3();
        box.setFromObject(structure.group);
        return box;
    }

    /**
     * Update level risk displays across all structures.
     * @param {Array} structuresData - Updated structures data
     */
    updateFromState(structuresData) {
        structuresData.forEach(structureData => {
            const structure = this.structures.get(structureData.code);
            if (!structure) return;

            // Update each level's risk display
            structureData.levels.forEach(levelData => {
                structure.levelFactory.updateLevelRisk(
                    levelData.level,
                    levelData.riskBand
                );
            });
        });
    }

    /**
     * Dispose all resources.
     */
    dispose() {
        this.clearStructures();
    }
}
