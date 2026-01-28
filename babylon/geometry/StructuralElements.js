// babylon/geometry/StructuralElements.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';

/**
 * Creates structural elements like shafts, ramps, and elevator cages.
 * Connects levels visually to show the mine's vertical structure.
 */
export class StructuralElements {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.parent = null;
    }

    /**
     * Create all structural elements for a set of levels.
     * @param {BABYLON.Mesh[]} levelMeshes - Array of level meshes
     * @param {BABYLON.TransformNode} parent - Optional parent node
     */
    createStructure(levelMeshes, parent = null) {
        this.parent = parent;

        if (levelMeshes.length < 2) return;

        // Get Y extents
        const yPositions = levelMeshes.map(m => m.position.y);
        const maxY = Math.max(...yPositions) + CONFIG.LEVEL_HEIGHT;
        const minY = Math.min(...yPositions);
        const totalHeight = maxY - minY;

        // Create main shaft
        this.createMainShaft(maxY, totalHeight);

        // Create secondary shaft on opposite side
        this.createSecondaryShaft(maxY, totalHeight);

        // Create ramp system
        this.createRampSystem(levelMeshes);

        // Create elevator cage (visual detail)
        this.createElevatorCage(maxY, minY);
    }

    /**
     * Create the main vertical shaft.
     */
    createMainShaft(topY, height) {
        const shaftRadius = 25;
        const x = -CONFIG.LEVEL_WIDTH / 2 - 40;
        const z = 0;

        // Create a tube (hollow cylinder) instead of CSG
        const shaft = BABYLON.MeshBuilder.CreateTube('mainShaft', {
            path: [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, height, 0)
            ],
            radius: shaftRadius,
            tessellation: 16,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            cap: BABYLON.Mesh.CAP_ALL
        }, this.scene);

        shaft.position.set(x, topY - height, z);

        const shaftMaterial = new BABYLON.PBRMaterial('shaftMat', this.scene);
        shaftMaterial.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.18);
        shaftMaterial.roughness = 0.9;
        shaftMaterial.metallic = 0.3;
        shaft.material = shaftMaterial;

        shaft.receiveShadows = true;

        if (this.parent) {
            shaft.parent = this.parent;
        }

        this.elements.push(shaft);

        // Shaft headframe (above ground)
        this.createHeadframe(x, topY, z);
    }

    /**
     * Create shaft headframe structure.
     */
    createHeadframe(x, topY, z) {
        const frameHeight = 80;
        const frameWidth = 40;

        // Main frame legs
        const legMaterial = new BABYLON.PBRMaterial('frameMat', this.scene);
        legMaterial.albedoColor = new BABYLON.Color3(0.3, 0.25, 0.2);
        legMaterial.roughness = 0.8;
        legMaterial.metallic = 0.6;

        const legGeometry = { width: 6, depth: 6, height: frameHeight };

        const positions = [
            [x - frameWidth / 2, topY + frameHeight / 2, z - frameWidth / 2],
            [x + frameWidth / 2, topY + frameHeight / 2, z - frameWidth / 2],
            [x - frameWidth / 2, topY + frameHeight / 2, z + frameWidth / 2],
            [x + frameWidth / 2, topY + frameHeight / 2, z + frameWidth / 2]
        ];

        positions.forEach((pos, i) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`frameLeg${i}`, legGeometry, this.scene);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.material = legMaterial;
            leg.receiveShadows = true;

            if (this.parent) {
                leg.parent = this.parent;
            }

            this.elements.push(leg);
        });

        // Top platform
        const platform = BABYLON.MeshBuilder.CreateBox('framePlatform', {
            width: frameWidth + 10,
            height: 4,
            depth: frameWidth + 10
        }, this.scene);
        platform.position.set(x, topY + frameHeight, z);
        platform.material = legMaterial;
        platform.receiveShadows = true;

        if (this.parent) {
            platform.parent = this.parent;
        }

        this.elements.push(platform);
    }

    /**
     * Create secondary shaft.
     */
    createSecondaryShaft(topY, height) {
        const shaftRadius = 18;
        const x = CONFIG.LEVEL_WIDTH / 2 + 35;
        const z = -CONFIG.LEVEL_DEPTH / 4;

        const shaft = BABYLON.MeshBuilder.CreateCylinder('secondaryShaft', {
            diameter: shaftRadius * 2,
            height: height,
            tessellation: 12
        }, this.scene);

        shaft.position.set(x, topY - height / 2, z);

        const shaftMaterial = new BABYLON.PBRMaterial('secondaryShaftMat', this.scene);
        shaftMaterial.albedoColor = new BABYLON.Color3(0.2, 0.2, 0.22);
        shaftMaterial.roughness = 0.85;
        shaftMaterial.metallic = 0.2;
        shaft.material = shaftMaterial;

        shaft.receiveShadows = true;

        if (this.parent) {
            shaft.parent = this.parent;
        }

        this.elements.push(shaft);
    }

    /**
     * Create ramp system connecting levels.
     */
    createRampSystem(levelMeshes) {
        if (levelMeshes.length < 2) return;

        const rampMaterial = new BABYLON.PBRMaterial('rampMat', this.scene);
        rampMaterial.albedoColor = new BABYLON.Color3(0.25, 0.22, 0.2);
        rampMaterial.roughness = 0.9;
        rampMaterial.metallic = 0.1;
        rampMaterial.backFaceCulling = false; // Render both sides to prevent disappearing

        // Sort levels by Y position (top to bottom)
        const sortedLevels = [...levelMeshes].sort((a, b) => b.position.y - a.position.y);

        // Create ramps between consecutive levels
        for (let i = 0; i < sortedLevels.length - 1; i++) {
            // Calculate actual surface positions (boxes are centered)
            const upperLevelBottom = sortedLevels[i].position.y - CONFIG.LEVEL_HEIGHT / 2;
            const lowerLevelTop = sortedLevels[i + 1].position.y + CONFIG.LEVEL_HEIGHT / 2;

            const rampHeight = upperLevelBottom - lowerLevelTop;
            if (rampHeight <= 0) continue;

            // Diagonal ramp
            const rampLength = Math.sqrt(rampHeight * rampHeight + 100 * 100);
            const rampAngle = Math.atan2(rampHeight, 100);

            const ramp = BABYLON.MeshBuilder.CreateBox(`ramp${i}`, {
                width: 30,
                height: 3,
                depth: rampLength,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.scene);

            // Position ramp at center X to avoid pillar overlap
            // Pillars are at X margins (~±140, ±47), so X=0 is clear
            // Z: ramp extends ±50 after rotation, center at LEVEL_DEPTH/2 - 50
            const x = 0;
            const z = CONFIG.LEVEL_DEPTH / 2 - 50;
            const midY = (upperLevelBottom + lowerLevelTop) / 2;

            ramp.position.set(x, midY, z);
            ramp.rotation.x = -rampAngle;
            ramp.material = rampMaterial;
            ramp.receiveShadows = true;

            if (this.parent) {
                ramp.parent = this.parent;
            }

            this.elements.push(ramp);
        }
    }

    /**
     * Create elevator cage visual.
     */
    createElevatorCage(topY, bottomY) {
        const x = -CONFIG.LEVEL_WIDTH / 2 - 40;
        const z = 0;

        // Simple cage representation
        const cage = BABYLON.MeshBuilder.CreateBox('elevatorCage', {
            width: 20,
            height: 25,
            depth: 20
        }, this.scene);

        // Position cage at a middle level
        const midY = (topY + bottomY) / 2;
        cage.position.set(x, midY, z);

        const cageMaterial = new BABYLON.PBRMaterial('cageMat', this.scene);
        cageMaterial.albedoColor = new BABYLON.Color3(0.4, 0.35, 0.1);
        cageMaterial.roughness = 0.6;
        cageMaterial.metallic = 0.7;

        // Make it slightly transparent to look like a cage
        cageMaterial.alpha = 0.8;

        cage.material = cageMaterial;

        if (this.parent) {
            cage.parent = this.parent;
        }

        this.elements.push(cage);
    }

    /**
     * Dispose all structural elements.
     */
    dispose() {
        this.elements.forEach(element => {
            if (element.material) {
                element.material.dispose();
            }
            element.dispose();
        });
        this.elements = [];
    }
}
