// js/geometry/MaterialSystem.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';

export class MaterialSystem {
    constructor() {
        this.baseMaterials = new Map();
        this.createBaseMaterials();
    }

    createBaseMaterials() {
        ['high', 'medium', 'low'].forEach(risk => {
            const material = new THREE.MeshStandardMaterial({
                color: RiskResolver.getRiskColor(risk),
                metalness: 0.3,
                roughness: 0.7,
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
            if (isolatedMesh === null) {
                mesh.material.opacity = 1.0;
            } else if (mesh === isolatedMesh) {
                mesh.material.opacity = 1.0;
            } else {
                mesh.material.opacity = CONFIG.ISOLATION_FADE_OPACITY;
            }
        });
    }
}
