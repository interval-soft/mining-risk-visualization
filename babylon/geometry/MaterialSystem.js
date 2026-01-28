// babylon/geometry/MaterialSystem.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';
import { RiskResolver } from '../../js/data/RiskResolver.js';

/**
 * Material system for Babylon.js using PBRMaterial.
 * Creates risk-colored materials with procedural textures.
 */
export class MaterialSystem {
    constructor(scene) {
        this.scene = scene;
        this.baseMaterials = new Map();
        this.textureCache = new Map();
        this.createBaseMaterials();
    }

    /**
     * Create base materials for each risk level.
     */
    createBaseMaterials() {
        ['high', 'medium', 'low'].forEach(risk => {
            const material = this.createPBRMaterial(risk);
            this.baseMaterials.set(risk, material);
        });
    }

    /**
     * Create a PBRMaterial with risk-appropriate color and rock texture.
     */
    createPBRMaterial(risk) {
        const riskColor = RiskResolver.getRiskColor(risk);
        const color = BABYLON.Color3.FromHexString('#' + riskColor.toString(16).padStart(6, '0'));

        const material = new BABYLON.PBRMaterial(`levelMat_${risk}`, this.scene);

        // Base color with risk tint
        material.albedoColor = color;

        // Create procedural rock texture
        const rockTexture = this.createRockTexture(risk, color);
        if (rockTexture) {
            material.albedoTexture = rockTexture;
        }

        // PBR properties
        material.roughness = 0.75;
        material.metallic = 0.2;

        // Enable transparency for isolation mode
        material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
        material.alpha = 1.0;

        // Emissive for hover state and bloom
        material.emissiveColor = new BABYLON.Color3(0, 0, 0);

        // Enable backface culling
        material.backFaceCulling = true;

        // Two-sided lighting for better appearance
        material.twoSidedLighting = true;

        return material;
    }

    /**
     * Create a procedural rock texture using DynamicTexture.
     */
    createRockTexture(risk, baseColor) {
        const cacheKey = risk;
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey);
        }

        const size = 256;
        const texture = new BABYLON.DynamicTexture(`rockTexture_${risk}`, size, this.scene, false);
        const ctx = texture.getContext();

        // Fill with base color
        const r = Math.floor(baseColor.r * 255);
        const g = Math.floor(baseColor.g * 255);
        const b = Math.floor(baseColor.b * 255);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, size, size);

        // Add rock-like noise pattern
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Random noise for rock texture
            const noise = (Math.random() - 0.5) * 40;

            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }

        // Add some larger variations for rock-like appearance
        for (let y = 0; y < size; y += 16) {
            for (let x = 0; x < size; x += 16) {
                const variation = (Math.random() - 0.5) * 20;
                for (let dy = 0; dy < 16 && y + dy < size; dy++) {
                    for (let dx = 0; dx < 16 && x + dx < size; dx++) {
                        const idx = ((y + dy) * size + (x + dx)) * 4;
                        data[idx] = Math.max(0, Math.min(255, data[idx] + variation));
                        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + variation));
                        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + variation));
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        texture.update();

        this.textureCache.set(cacheKey, texture);
        return texture;
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
            mesh.material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
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
     * Dispose all materials and textures.
     */
    dispose() {
        this.baseMaterials.forEach(material => material.dispose());
        this.textureCache.forEach(texture => texture.dispose());
        this.baseMaterials.clear();
        this.textureCache.clear();
    }
}
