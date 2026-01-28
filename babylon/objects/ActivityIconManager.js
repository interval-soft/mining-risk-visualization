// babylon/objects/ActivityIconManager.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';

/**
 * Manages activity icons for each level using Babylon.js Sprites.
 * Creates icons with Material Symbols using DynamicTexture.
 */
export class ActivityIconManager {
    constructor(scene) {
        this.scene = scene;
        this.spriteManagers = new Map(); // Key: iconType-risk
        this.sprites = new Map();         // Key: levelNumber-structureCode-activityName
        this.iconTextureCache = new Map();
        this.initialized = false;

        // Icon mapping from activity names to Material Symbols
        this.iconMap = {
            'Drilling': 'construction',
            'Blasting': 'explosion',
            'Hauling': 'local_shipping',
            'Ventilation': 'air',
            'Pumping': 'water_pump',
            'Maintenance': 'build',
            'Survey': 'explore',
            'Excavation': 'terrain',
            'Support': 'architecture',
            'Loading': 'inventory',
            'Transport': 'directions_car',
            'default': 'radio_button_checked'
        };

        // Risk colors
        this.riskColors = {
            high: '#F44336',
            medium: '#FFC107',
            low: '#4CAF50'
        };
    }

    /**
     * Initialize the icon manager.
     */
    async initialize() {
        // Pre-create textures for all icon-risk combinations
        await this.preloadTextures();
        this.initialized = true;
    }

    /**
     * Pre-create textures for common icon-risk combinations.
     */
    async preloadTextures() {
        const iconTypes = Object.keys(this.iconMap);
        const risks = ['high', 'medium', 'low'];

        for (const iconType of iconTypes) {
            for (const risk of risks) {
                await this.getOrCreateTexture(iconType, risk);
            }
        }
    }

    /**
     * Get or create a texture for an icon-risk combination.
     */
    async getOrCreateTexture(iconType, risk) {
        const key = `${iconType}-${risk}`;

        if (this.iconTextureCache.has(key)) {
            return this.iconTextureCache.get(key);
        }

        // Create DynamicTexture for this icon
        const size = 128;
        const texture = new BABYLON.DynamicTexture(`icon_${key}`, size, this.scene, false);

        const ctx = texture.getContext();

        // Clear with transparent
        ctx.clearRect(0, 0, size, size);

        // Draw background circle
        const color = this.riskColors[risk] || this.riskColors.low;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Draw icon symbol
        const iconChar = this.getIconCharacter(iconType);
        ctx.font = '60px "Material Symbols Rounded"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(iconChar, size / 2, size / 2);

        texture.update();
        texture.hasAlpha = true;

        this.iconTextureCache.set(key, texture);
        return texture;
    }

    /**
     * Get the Material Symbol character for an icon type.
     */
    getIconCharacter(iconType) {
        const symbolName = this.iconMap[iconType] || this.iconMap.default;
        // Return the symbol name - Material Symbols uses ligatures
        return symbolName;
    }

    /**
     * Create activity icons for a level.
     */
    createActivityIcons(levelData, levelMesh) {
        if (!this.initialized) {
            console.warn('ActivityIconManager not initialized');
            return;
        }

        const activities = levelData.activities || [];
        const levelNumber = levelData.level;
        const structureCode = levelMesh.metadata?.structureCode || 'default';

        // Remove existing icons for this level
        this.removeIconsForLevel(levelNumber, structureCode);

        // Calculate positions for icons
        const iconCount = activities.length;
        if (iconCount === 0) return;

        // Spread icons across the level width
        const startX = -CONFIG.LEVEL_WIDTH / 3;
        const spacing = (CONFIG.LEVEL_WIDTH * 2 / 3) / Math.max(iconCount - 1, 1);

        activities.forEach((activity, index) => {
            const risk = activity.risk || 'low';
            const iconType = this.getActivityIconType(activity.name);

            // Create sprite for this activity
            const sprite = this.createSprite(iconType, risk, activity.name);
            if (!sprite) return;

            // Position relative to level mesh
            // Get world position of level mesh
            const worldPos = levelMesh.getAbsolutePosition();
            const x = worldPos.x + startX + index * spacing;
            const y = worldPos.y + CONFIG.LEVEL_HEIGHT + CONFIG.ICON_OFFSET_Y;
            const z = worldPos.z;

            sprite.position = new BABYLON.Vector3(x, y, z);

            // Store sprite metadata
            sprite.metadata = {
                type: 'activityIcon',
                levelNumber: levelNumber,
                structureCode: structureCode,
                activityName: activity.name,
                risk: risk
            };

            // Store reference
            const key = `${levelNumber}-${structureCode}-${activity.name}`;
            this.sprites.set(key, sprite);
        });
    }

    /**
     * Create a sprite for an activity icon.
     */
    createSprite(iconType, risk, name) {
        const managerKey = `${iconType}-${risk}`;

        // Get or create SpriteManager for this icon type
        let manager = this.spriteManagers.get(managerKey);

        if (!manager) {
            const texture = this.iconTextureCache.get(managerKey);
            if (!texture) {
                console.warn(`Texture not found for ${managerKey}`);
                return null;
            }

            // Create SpriteManager using the DynamicTexture
            // We need to render the texture to a data URL for the SpriteManager
            manager = new BABYLON.SpriteManager(
                `spriteManager_${managerKey}`,
                '', // We'll set cellRef manually
                100, // Max sprites
                { width: 128, height: 128 },
                this.scene
            );

            // Use the texture directly
            manager.texture = texture;

            this.spriteManagers.set(managerKey, manager);
        }

        // Create sprite
        const sprite = new BABYLON.Sprite(`sprite_${name}`, manager);
        sprite.width = 32;
        sprite.height = 32;

        return sprite;
    }

    /**
     * Get icon type from activity name.
     */
    getActivityIconType(activityName) {
        // Check if we have a direct mapping
        if (this.iconMap[activityName]) {
            return activityName;
        }

        // Try to match partial names
        const lowerName = activityName.toLowerCase();
        for (const [key, value] of Object.entries(this.iconMap)) {
            if (lowerName.includes(key.toLowerCase())) {
                return key;
            }
        }

        return 'default';
    }

    /**
     * Update activity icons for a level.
     */
    updateActivityIcons(levelData, levelMesh) {
        // Simply recreate icons for the level
        this.createActivityIcons(levelData, levelMesh);
    }

    /**
     * Remove icons for a specific level.
     */
    removeIconsForLevel(levelNumber, structureCode) {
        const keysToRemove = [];

        this.sprites.forEach((sprite, key) => {
            if (key.startsWith(`${levelNumber}-${structureCode}-`)) {
                sprite.dispose();
                keysToRemove.push(key);
            }
        });

        keysToRemove.forEach(key => this.sprites.delete(key));
    }

    /**
     * Get all sprites.
     */
    getAllSprites() {
        return Array.from(this.sprites.values());
    }

    /**
     * Set visibility for all sprites.
     */
    setVisible(visible) {
        this.sprites.forEach(sprite => {
            sprite.isVisible = visible;
        });
    }

    /**
     * Filter visibility by risk level.
     */
    setVisibleByRisk(riskLevels) {
        this.sprites.forEach(sprite => {
            const risk = sprite.metadata?.risk;
            sprite.isVisible = !riskLevels || riskLevels.includes(risk);
        });
    }

    /**
     * Set visibility for icons of a specific level.
     * Used by FilterPanel for compatibility with Three.js API.
     */
    setVisibilityForLevel(levelNumber, visible) {
        this.sprites.forEach(sprite => {
            if (sprite.metadata?.levelNumber === levelNumber) {
                sprite.isVisible = visible;
            }
        });
    }

    /**
     * Dispose all resources.
     */
    dispose() {
        this.sprites.forEach(sprite => sprite.dispose());
        this.sprites.clear();

        this.spriteManagers.forEach(manager => manager.dispose());
        this.spriteManagers.clear();

        this.iconTextureCache.forEach(texture => texture.dispose());
        this.iconTextureCache.clear();
    }
}
