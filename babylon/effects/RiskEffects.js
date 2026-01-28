// babylon/effects/RiskEffects.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';

/**
 * Manages visual effects for risk visualization.
 * Provides pulsing animations for high-risk levels.
 */
export class RiskEffects {
    constructor(scene, levelSource) {
        this.scene = scene;
        this.levelSource = levelSource;

        // Animation state
        this.time = 0;
        this.highRiskLevels = new Set();
        this.mediumRiskLevels = new Set();

        // Pulse parameters
        this.pulseSpeed = 2.0;
        this.pulseIntensity = 0.15;
    }

    /**
     * Update risk effects (called from render loop).
     */
    update(deltaTime) {
        this.time += deltaTime;

        // Update pulsing effect for high-risk levels
        this.updatePulseEffects();
    }

    /**
     * Update pulsing emissive for risk levels.
     */
    updatePulseEffects() {
        // Calculate pulse value (0 to 1)
        const pulse = (Math.sin(this.time * this.pulseSpeed * Math.PI) + 1) / 2;

        // Update high-risk levels with strong pulse
        this.highRiskLevels.forEach(levelNumber => {
            const mesh = this.getLevelMesh(levelNumber);
            if (mesh && mesh.material) {
                const intensity = pulse * this.pulseIntensity;
                mesh.material.emissiveColor = new BABYLON.Color3(
                    intensity,
                    intensity * 0.3,
                    intensity * 0.3
                );
            }
        });

        // Update medium-risk levels with subtle pulse
        this.mediumRiskLevels.forEach(levelNumber => {
            const mesh = this.getLevelMesh(levelNumber);
            if (mesh && mesh.material) {
                const intensity = pulse * this.pulseIntensity * 0.5;
                mesh.material.emissiveColor = new BABYLON.Color3(
                    intensity,
                    intensity * 0.8,
                    intensity * 0.2
                );
            }
        });
    }

    /**
     * Get level mesh from level source.
     */
    getLevelMesh(levelNumber) {
        if (this.levelSource.getLevelMesh) {
            return this.levelSource.getLevelMesh(levelNumber);
        }
        return null;
    }

    /**
     * Update effects based on level data.
     */
    updateEffects(levels) {
        // Clear previous tracking
        this.highRiskLevels.clear();
        this.mediumRiskLevels.clear();

        // Track risk levels
        levels.forEach(levelData => {
            const riskBand = levelData.riskBand || this.computeRiskBand(levelData);

            if (riskBand === 'high') {
                this.highRiskLevels.add(levelData.level);
            } else if (riskBand === 'medium') {
                this.mediumRiskLevels.add(levelData.level);
            } else {
                // Low risk - reset emissive
                const mesh = this.getLevelMesh(levelData.level);
                if (mesh && mesh.material) {
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                }
            }
        });
    }

    /**
     * Compute risk band from level data.
     */
    computeRiskBand(levelData) {
        if (levelData.riskBand) return levelData.riskBand;
        if (levelData.riskScore !== undefined) {
            if (levelData.riskScore <= 30) return 'low';
            if (levelData.riskScore <= 70) return 'medium';
            return 'high';
        }
        // Compute from activities
        const activities = levelData.activities || [];
        const priority = { low: 1, medium: 2, high: 3 };
        let maxRisk = 'low';
        for (const activity of activities) {
            const risk = activity.risk || 'low';
            if (priority[risk] > priority[maxRisk]) {
                maxRisk = risk;
            }
        }
        return maxRisk;
    }

    /**
     * Trigger a flash effect on a specific level.
     */
    flashLevel(levelNumber, duration = 500) {
        const mesh = this.getLevelMesh(levelNumber);
        if (!mesh || !mesh.material) return;

        const originalEmissive = mesh.material.emissiveColor.clone();
        mesh.material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);

        setTimeout(() => {
            mesh.material.emissiveColor = originalEmissive;
        }, duration);
    }

    /**
     * Set pulse intensity.
     */
    setPulseIntensity(intensity) {
        this.pulseIntensity = intensity;
    }

    /**
     * Set pulse speed.
     */
    setPulseSpeed(speed) {
        this.pulseSpeed = speed;
    }

    /**
     * Enable or disable pulse effects.
     */
    setEnabled(enabled) {
        if (!enabled) {
            // Reset all emissives
            this.highRiskLevels.forEach(levelNumber => {
                const mesh = this.getLevelMesh(levelNumber);
                if (mesh && mesh.material) {
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                }
            });
            this.mediumRiskLevels.forEach(levelNumber => {
                const mesh = this.getLevelMesh(levelNumber);
                if (mesh && mesh.material) {
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                }
            });
        }
    }
}
