// js/geometry/StructuralElements.js
// Creates structural mine elements: shafts, ramps, and connectors

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class StructuralElements {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.shafts = [];
        this.ramps = [];
    }

    /**
     * Create all structural elements based on level data.
     * @param {Array} levels - Array of level meshes
     */
    createStructure(levels) {
        if (levels.length < 2) return;

        // Create ramps between adjacent levels
        for (let i = 0; i < levels.length - 1; i++) {
            this.createRamp(levels[i], levels[i + 1], i);
        }
    }

    /**
     * Create the main vertical shaft connecting all levels.
     */
    createMainShaft(levels) {
        const topLevel = levels[0];
        const bottomLevel = levels[levels.length - 1];

        const topY = topLevel.position.y + CONFIG.LEVEL_HEIGHT / 2;
        const bottomY = bottomLevel.position.y - CONFIG.LEVEL_HEIGHT / 2;
        const shaftHeight = topY - bottomY;

        // Main shaft geometry (cylinder)
        const geometry = new THREE.CylinderGeometry(
            15, 15, shaftHeight, 16
        );

        const material = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            transparent: true,
            opacity: 0.6,
            roughness: 0.8,
            metalness: 0.2
        });

        const shaft = new THREE.Mesh(geometry, material);

        // Position at left side of levels
        shaft.position.set(
            -CONFIG.LEVEL_WIDTH / 2 - 30,
            topY - shaftHeight / 2,
            0
        );

        shaft.userData = {
            type: 'shaft',
            name: 'Main Shaft',
            description: 'Primary access shaft'
        };

        this.scene.add(shaft);
        this.shafts.push(shaft);
        this.elements.push(shaft);

        // Add shaft cage/elevator indicator
        this.createShaftCage(shaft.position.clone(), shaftHeight);
    }

    /**
     * Create a secondary shaft (ventilation/service).
     */
    createSecondaryShaft(levels) {
        const topLevel = levels[0];
        const bottomLevel = levels[levels.length - 1];

        const topY = topLevel.position.y + CONFIG.LEVEL_HEIGHT / 2;
        const bottomY = bottomLevel.position.y - CONFIG.LEVEL_HEIGHT / 2;
        const shaftHeight = topY - bottomY;

        // Secondary shaft (smaller)
        const geometry = new THREE.CylinderGeometry(
            8, 8, shaftHeight, 12
        );

        const material = new THREE.MeshStandardMaterial({
            color: 0x4a4a5a,
            transparent: true,
            opacity: 0.4,
            roughness: 0.9,
            metalness: 0.1
        });

        const shaft = new THREE.Mesh(geometry, material);

        // Position at right rear
        shaft.position.set(
            CONFIG.LEVEL_WIDTH / 2 + 20,
            topY - shaftHeight / 2,
            -CONFIG.LEVEL_DEPTH / 2 - 20
        );

        shaft.userData = {
            type: 'shaft',
            name: 'Service Shaft',
            description: 'Ventilation and service shaft'
        };

        this.scene.add(shaft);
        this.shafts.push(shaft);
        this.elements.push(shaft);
    }

    /**
     * Create a cage/elevator indicator within the shaft.
     */
    createShaftCage(shaftPosition, shaftHeight) {
        const cageGeometry = new THREE.BoxGeometry(12, 20, 12);
        const cageMaterial = new THREE.MeshStandardMaterial({
            color: 0x666677,
            transparent: true,
            opacity: 0.8,
            roughness: 0.6,
            metalness: 0.4
        });

        const cage = new THREE.Mesh(cageGeometry, cageMaterial);
        cage.position.copy(shaftPosition);
        cage.position.y = shaftPosition.y + shaftHeight / 4; // Start near top

        cage.userData = {
            type: 'cage',
            name: 'Shaft Cage',
            description: 'Personnel and equipment elevator'
        };

        this.scene.add(cage);
        this.elements.push(cage);
    }

    /**
     * Create a ramp between two adjacent levels.
     */
    createRamp(upperLevel, lowerLevel, index) {
        // Level geometry (ExtrudeGeometry + rotateX) spans local Y from 0 to LEVEL_HEIGHT,
        // NOT centered at ±LEVEL_HEIGHT/2. Connect ramp to the flat faces.
        const upperY = upperLevel.position.y;                    // flat bottom face of upper level
        const lowerY = lowerLevel.position.y + CONFIG.LEVEL_HEIGHT; // flat top face of lower level
        const verticalDrop = upperY - lowerY;

        // Ramp dimensions
        const rampLength = Math.sqrt(
            Math.pow(verticalDrop, 2) + Math.pow(60, 2)
        );
        const rampAngle = Math.atan2(verticalDrop, 60);

        const geometry = new THREE.BoxGeometry(
            20, 8, rampLength
        );

        const material = new THREE.MeshStandardMaterial({
            color: 0x4a4a5a,
            transparent: true,
            opacity: 0.5,
            roughness: 0.85,
            metalness: 0.15,
            side: THREE.DoubleSide  // Render both sides
        });

        const ramp = new THREE.Mesh(geometry, material);

        // Position ramp at center of level (X=0, Z=0) for proper connection
        const midY = (upperY + lowerY) / 2;
        ramp.position.set(
            0,  // Center X
            midY,
            0   // Center Z - ramp will be fully inside level footprint
        );

        // Rotate to create slope
        ramp.rotation.x = -rampAngle;

        ramp.userData = {
            type: 'ramp',
            name: `Decline ${index + 1}`,
            description: `Access ramp between L${upperLevel.userData.levelNumber} and L${lowerLevel.userData.levelNumber}`,
            connectsLevels: [
                upperLevel.userData.levelNumber,
                lowerLevel.userData.levelNumber
            ]
        };

        this.scene.add(ramp);
        this.ramps.push(ramp);
        this.elements.push(ramp);
    }

    /**
     * Set visibility of all structural elements.
     */
    setVisible(visible) {
        this.elements.forEach(el => {
            el.visible = visible;
        });
    }

    /**
     * Set opacity of all structural elements (for focus effects).
     */
    setOpacity(opacity) {
        this.elements.forEach(el => {
            if (el.material) {
                el.material.opacity = opacity;
            }
        });
    }

    /**
     * Highlight a specific shaft.
     */
    highlightShaft(index) {
        this.shafts.forEach((shaft, i) => {
            shaft.material.emissive.setHex(i === index ? 0x222233 : 0x000000);
        });
    }

    /**
     * Highlight a specific ramp.
     */
    highlightRamp(index) {
        this.ramps.forEach((ramp, i) => {
            ramp.material.emissive.setHex(i === index ? 0x222233 : 0x000000);
        });
    }

    /**
     * Clear all highlights.
     */
    clearHighlights() {
        this.elements.forEach(el => {
            if (el.material && el.material.emissive) {
                el.material.emissive.setHex(0x000000);
            }
        });
    }

    /**
     * Get all structural element meshes.
     */
    getAllElements() {
        return this.elements;
    }

    /**
     * Dispose of all geometry and materials.
     */
    dispose() {
        this.elements.forEach(el => {
            if (el.geometry) el.geometry.dispose();
            if (el.material) el.material.dispose();
            this.scene.remove(el);
        });
        this.elements = [];
        this.shafts = [];
        this.ramps = [];
    }
}
