// js/geometry/MaterialSystem.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';
import { TextureGenerator } from '../core/TextureGenerator.js';

export class MaterialSystem {
    constructor() {
        this.baseMaterials = new Map();
        this.textureCache = new Map(); // Cache textures per risk level
        this.createBaseMaterials();
    }

    createBaseMaterials() {
        // Generate base rock textures (shared across risk levels)
        const baseTextures = TextureGenerator.createRockTextureSet(0x555555);
        
        ['high', 'medium', 'low'].forEach(risk => {
            const riskColor = RiskResolver.getRiskColor(risk);
            
            // Create tinted rock texture for this risk level
            const tintedTexture = TextureGenerator.createRockTexture(512, riskColor, 0.12);
            this.textureCache.set(risk, tintedTexture);
            
            const material = new THREE.MeshStandardMaterial({
                map: tintedTexture,
                normalMap: baseTextures.normalMap,
                normalScale: new THREE.Vector2(0.5, 0.5),
                roughnessMap: baseTextures.roughnessMap,
                roughness: 0.75,
                metalness: 0.2,
                transparent: true,
                opacity: 1.0
            });
            
            this.baseMaterials.set(risk, material);
        });
    }

    createLevelMaterial(risk) {
        return this.baseMaterials.get(risk).clone();
    }

    setHoverState(mesh, isHovered) {
        if (isHovered) {
            mesh.material.emissive.setHex(CONFIG.COLORS.HOVER_EMISSIVE);
            mesh.material.emissiveIntensity = 0.4;
        } else {
            mesh.material.emissive.setHex(0x000000);
            mesh.material.emissiveIntensity = 0;
        }
    }

    setIsolationMode(allLevels, isolatedMesh) {
        allLevels.forEach(mesh => {
            // Always keep transparent:true to avoid render order issues
            // Only change opacity
            if (isolatedMesh === null || mesh === isolatedMesh) {
                mesh.material.opacity = 1.0;
            } else {
                mesh.material.opacity = CONFIG.ISOLATION_FADE_OPACITY;
            }
        });
    }
}
