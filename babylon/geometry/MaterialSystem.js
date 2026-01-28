// babylon/geometry/MaterialSystem.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';
import { RiskResolver } from '../../js/data/RiskResolver.js';

/**
 * Material system for Babylon.js.
 * Creates risk-colored materials for level visualization.
 */
export class MaterialSystem {
    constructor(scene) {
        this.scene = scene;
        this.baseMaterials = new Map();
        this.createBaseMaterials();
    }

    /**
     * Create base materials for each risk level.
     */
    createBaseMaterials() {
        ['high', 'medium', 'low'].forEach(risk => {
            const material = this.createMaterial(risk);
            this.baseMaterials.set(risk, material);
        });
    }

    /**
     * Create a StandardMaterial with risk-appropriate color.
     */
    createMaterial(risk) {
        const riskColor = RiskResolver.getRiskColor(risk);
        const hexStr = '#' + riskColor.toString(16).padStart(6, '0');
        const color = BABYLON.Color3.FromHexString(hexStr);

        const material = new BABYLON.StandardMaterial(`levelMat_${risk}`, this.scene);

        // Set the diffuse color (main visible color)
        material.diffuseColor = color;

        // Slight specular highlight
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.specularPower = 32;

        // Emissive for glow effect (start at zero)
        material.emissiveColor = new BABYLON.Color3(0, 0, 0);

        // Enable transparency for isolation mode
        material.alpha = 1.0;

        // Backface culling
        material.backFaceCulling = true;

        return material;
    }

    /**
     * Create a new level material for the given risk level.
     * Returns a clone to allow per-mesh modifications.
     */
    createLevelMaterial(risk) {
        const baseMaterial = this.baseMaterials.get(risk);
        if (baseMaterial) {
            return baseMaterial.clone(`levelMat_${risk}_${Date.now()}`);
        }
        // Fallback to low risk material
        return this.baseMaterials.get('low').clone(`levelMat_low_${Date.now()}`);
    }

    /**
     * Set hover state on a mesh's material.
     */
    setHoverState(mesh, isHovered) {
        if (!mesh.material) return;

        if (isHovered) {
            // Set emissive for highlight
            mesh.material.emissiveColor = new BABYLON.Color3(0.15, 0.15, 0.15);
        } else {
            // Reset emissive
            mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
        }
    }

    /**
     * Set isolation mode - fade non-selected levels.
     */
    setIsolationMode(allLevels, isolatedMesh) {
        allLevels.forEach(mesh => {
            if (!mesh.material) return;

            if (isolatedMesh === null) {
                // Reset all to full opacity
                mesh.material.alpha = 1.0;
            } else if (mesh === isolatedMesh) {
                // Selected mesh at full opacity
                mesh.material.alpha = 1.0;
            } else {
                // Fade non-selected meshes
                mesh.material.alpha = CONFIG.ISOLATION_FADE_OPACITY;
            }
        });
    }

    /**
     * Get material for a specific risk level (for external use).
     */
    getMaterial(risk) {
        return this.baseMaterials.get(risk);
    }

    /**
     * Dispose all materials.
     */
    dispose() {
        this.baseMaterials.forEach(material => material.dispose());
        this.baseMaterials.clear();
    }
}
