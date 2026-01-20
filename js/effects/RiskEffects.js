// js/effects/RiskEffects.js
// Visual effects for risk visualization: pulsing, glowing, lockout indicators

import * as THREE from 'three';

export class RiskEffects {
    constructor(scene, levelFactory) {
        this.scene = scene;
        this.levelFactory = levelFactory;

        this.activeEffects = new Map(); // levelNumber -> effect state
        this.animationCallbacks = [];
        this.time = 0;

        // Effect configuration
        this.config = {
            highRiskPulseSpeed: 2.0,
            highRiskPulseIntensity: 0.3,
            lockoutPulseSpeed: 4.0,
            lockoutPulseIntensity: 0.5,
            transitionDuration: 500 // ms
        };
    }

    /**
     * Update effects based on current risk state.
     * @param {Array} levels - Array of level data with riskScore/riskBand
     */
    updateEffects(levels) {
        levels.forEach(levelData => {
            const levelNumber = levelData.level;
            const riskScore = levelData.riskScore ?? 0;
            const riskBand = levelData.riskBand || this.scoreToRisk(riskScore);

            const mesh = this.levelFactory.getLevelMesh(levelNumber);
            if (!mesh) return;

            const currentEffect = this.activeEffects.get(levelNumber);
            const newEffectType = this.determineEffectType(riskScore, riskBand, levelData);

            // Only update if effect type changed
            if (!currentEffect || currentEffect.type !== newEffectType) {
                this.applyEffect(levelNumber, mesh, newEffectType, levelData);
            }
        });
    }

    /**
     * Determine which effect type to apply based on risk.
     */
    determineEffectType(riskScore, riskBand, levelData) {
        // Check for lockout (force-100)
        if (riskScore === 100) {
            return 'lockout';
        }

        // High risk pulse
        if (riskBand === 'high' || riskScore >= 71) {
            return 'highRisk';
        }

        // Medium risk - subtle glow
        if (riskBand === 'medium' || riskScore >= 31) {
            return 'medium';
        }

        // Low risk - no effect
        return 'none';
    }

    /**
     * Apply a visual effect to a level.
     */
    applyEffect(levelNumber, mesh, effectType, levelData) {
        // Clear existing effect
        this.clearEffect(levelNumber);

        const effect = {
            type: effectType,
            mesh: mesh,
            startTime: Date.now(),
            baseEmissive: mesh.material.emissive.getHex()
        };

        switch (effectType) {
            case 'lockout':
                this.setupLockoutEffect(effect, levelData);
                break;
            case 'highRisk':
                this.setupHighRiskEffect(effect);
                break;
            case 'medium':
                this.setupMediumRiskEffect(effect);
                break;
            default:
                // Reset to no effect
                mesh.material.emissive.setHex(0x000000);
                mesh.material.emissiveIntensity = 0;
                return;
        }

        this.activeEffects.set(levelNumber, effect);
    }

    /**
     * Setup lockout effect (red pulsing with warning).
     */
    setupLockoutEffect(effect, levelData) {
        const mesh = effect.mesh;

        // Set base lockout color
        mesh.material.emissive.setHex(0x440000);
        mesh.material.emissiveIntensity = 0.3;

        // Create lockout indicator (floating warning sign)
        const warningGeometry = new THREE.PlaneGeometry(30, 30);
        const warningMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        const warning = new THREE.Mesh(warningGeometry, warningMaterial);
        warning.position.copy(mesh.position);
        warning.position.y += 40;
        warning.position.z += 50;

        // Add warning to scene
        this.scene.add(warning);
        effect.warningMesh = warning;

        // Animation function
        effect.animate = (deltaTime) => {
            const t = Date.now() * 0.001 * this.config.lockoutPulseSpeed;
            const pulse = (Math.sin(t) + 1) * 0.5;

            mesh.material.emissiveIntensity = 0.2 + pulse * this.config.lockoutPulseIntensity;

            // Pulsing warning
            if (warning) {
                warning.material.opacity = 0.5 + pulse * 0.4;
                warning.position.y = mesh.position.y + 40 + Math.sin(t * 0.5) * 3;
            }
        };
    }

    /**
     * Setup high risk effect (orange/red pulsing).
     */
    setupHighRiskEffect(effect) {
        const mesh = effect.mesh;

        mesh.material.emissive.setHex(0x331100);
        mesh.material.emissiveIntensity = 0.1;

        effect.animate = (deltaTime) => {
            const t = Date.now() * 0.001 * this.config.highRiskPulseSpeed;
            const pulse = (Math.sin(t) + 1) * 0.5;

            mesh.material.emissiveIntensity = 0.05 + pulse * this.config.highRiskPulseIntensity;
        };
    }

    /**
     * Setup medium risk effect (subtle yellow glow).
     */
    setupMediumRiskEffect(effect) {
        const mesh = effect.mesh;

        mesh.material.emissive.setHex(0x222200);
        mesh.material.emissiveIntensity = 0.05;

        // No animation for medium - just static subtle glow
        effect.animate = null;
    }

    /**
     * Clear effect from a level.
     */
    clearEffect(levelNumber) {
        const effect = this.activeEffects.get(levelNumber);
        if (!effect) return;

        // Remove warning mesh if exists
        if (effect.warningMesh) {
            this.scene.remove(effect.warningMesh);
            effect.warningMesh.geometry.dispose();
            effect.warningMesh.material.dispose();
        }

        // Reset material
        if (effect.mesh && effect.mesh.material) {
            effect.mesh.material.emissive.setHex(0x000000);
            effect.mesh.material.emissiveIntensity = 0;
        }

        this.activeEffects.delete(levelNumber);
    }

    /**
     * Animate a smooth color transition.
     * @param {THREE.Mesh} mesh - The mesh to transition
     * @param {string} fromBand - Starting risk band
     * @param {string} toBand - Target risk band
     */
    transitionColor(mesh, fromBand, toBand) {
        const fromColor = this.getRiskColor(fromBand);
        const toColor = this.getRiskColor(toBand);

        const startTime = Date.now();
        const duration = this.config.transitionDuration;

        const fromVec = new THREE.Color(fromColor);
        const toVec = new THREE.Color(toColor);
        const currentColor = new THREE.Color();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out interpolation
            const eased = 1 - Math.pow(1 - progress, 3);

            currentColor.copy(fromVec).lerp(toVec, eased);
            mesh.material.color.copy(currentColor);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Get color for risk band.
     */
    getRiskColor(band) {
        switch (band) {
            case 'high': return 0xF44336;
            case 'medium': return 0xFFC107;
            case 'low':
            default: return 0x4CAF50;
        }
    }

    /**
     * Convert numeric score to risk band.
     */
    scoreToRisk(score) {
        if (score == null) return 'low';
        if (score <= 30) return 'low';
        if (score <= 70) return 'medium';
        return 'high';
    }

    /**
     * Update animation loop (call this from render loop).
     */
    update(deltaTime) {
        this.time += deltaTime;

        this.activeEffects.forEach((effect, levelNumber) => {
            if (effect.animate) {
                effect.animate(deltaTime);
            }
        });
    }

    /**
     * Flash a level briefly (for attention).
     */
    flashLevel(levelNumber, color = 0xffffff, duration = 300) {
        const mesh = this.levelFactory.getLevelMesh(levelNumber);
        if (!mesh) return;

        const originalEmissive = mesh.material.emissive.getHex();
        const originalIntensity = mesh.material.emissiveIntensity;

        mesh.material.emissive.setHex(color);
        mesh.material.emissiveIntensity = 0.5;

        setTimeout(() => {
            mesh.material.emissive.setHex(originalEmissive);
            mesh.material.emissiveIntensity = originalIntensity;
        }, duration);
    }

    /**
     * Clear all effects.
     */
    clearAll() {
        this.activeEffects.forEach((effect, levelNumber) => {
            this.clearEffect(levelNumber);
        });
    }

    /**
     * Dispose of all resources.
     */
    dispose() {
        this.clearAll();
        this.animationCallbacks = [];
    }
}
