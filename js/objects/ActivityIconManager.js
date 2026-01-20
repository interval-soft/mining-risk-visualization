// js/objects/ActivityIconManager.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';

export class ActivityIconManager {
    constructor(scene) {
        this.scene = scene;
        this.sprites = [];
        this.textureLoader = new THREE.TextureLoader();
        this.defaultTexture = null;
    }

    async loadTextures() {
        // Create a simple colored circle texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        this.defaultTexture = new THREE.CanvasTexture(canvas);
    }

    createActivityIcons(levelData, levelMesh) {
        const activities = levelData.activities;
        const levelY = levelMesh.position.y;
        const spacing = CONFIG.LEVEL_WIDTH / (activities.length + 1);

        activities.forEach((activity, index) => {
            const sprite = this.createSprite(activity);

            sprite.position.set(
                -CONFIG.LEVEL_WIDTH / 2 + spacing * (index + 1),
                levelY + CONFIG.ICON_OFFSET_Y,
                0
            );

            sprite.userData = {
                type: 'activity',
                activity: activity,
                levelNumber: levelData.level,
                activityIndex: index
            };

            this.sprites.push(sprite);
            this.scene.add(sprite);
        });
    }

    createSprite(activity) {
        const color = RiskResolver.getRiskColor(activity.risk);

        const material = new THREE.SpriteMaterial({
            map: this.defaultTexture,
            color: color,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(25, 25, 1);
        return sprite;
    }

    setVisibilityForLevel(levelNumber, visible) {
        this.sprites
            .filter(s => s.userData.levelNumber === levelNumber)
            .forEach(s => s.visible = visible);
    }

    setAllVisible(visible) {
        this.sprites.forEach(s => s.visible = visible);
    }

    getAllSprites() {
        return this.sprites;
    }

    /**
     * Update activity icons for a level based on new data.
     * @param {Object} levelData - Level data with activities array
     * @param {THREE.Mesh} levelMesh - The level mesh (for positioning)
     */
    updateActivityIcons(levelData, levelMesh) {
        const levelNumber = levelData.level;

        // Get existing sprites for this level
        const existingSprites = this.sprites.filter(
            s => s.userData.levelNumber === levelNumber
        );

        // Update colors based on new risk values
        levelData.activities.forEach((activity, index) => {
            const sprite = existingSprites[index];
            if (sprite) {
                // Update color based on risk
                const risk = activity.risk || this.scoreToRisk(activity.riskScore);
                const color = RiskResolver.getRiskColor(risk);
                sprite.material.color.setHex(color);

                // Update userData
                sprite.userData.activity = activity;
            }
        });
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
}
