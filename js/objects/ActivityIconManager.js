// js/objects/ActivityIconManager.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RiskResolver } from '../data/RiskResolver.js';

const ICON_MAP = [
    { keywords: ['truck', 'haul'], icon: 'local_shipping' },
    { keywords: ['crusher', 'jaw'], icon: 'settings' },
    { keywords: ['workshop', 'vehicle'], icon: 'build' },
    { keywords: ['fuel'], icon: 'local_gas_station' },
    { keywords: ['drill'], icon: 'hardware' },
    { keywords: ['blast', 'shot', 'firing', 'explosive'], icon: 'bomb' },
    { keywords: ['inspect', 'sump'], icon: 'search' },
    { keywords: ['lhd', 'mucking', 'loader'], icon: 'front_loader' },
    { keywords: ['grader', 'road'], icon: 'road' },
    { keywords: ['water', 'dust', 'dewater'], icon: 'water_drop' },
    { keywords: ['sample', 'geological', 'assay'], icon: 'science' },
    { keywords: ['survey'], icon: 'straighten' },
    { keywords: ['drainage', 'channel'], icon: 'waves' },
    { keywords: ['stope'], icon: 'construction' },
    { keywords: ['decline', 'development'], icon: 'trending_down' },
    { keywords: ['ground', 'support', 'shotcrete', 'scaling'], icon: 'foundation' },
    { keywords: ['bogger', 'extraction'], icon: 'precision_manufacturing' },
    { keywords: ['ore pass'], icon: 'diamond' },
    { keywords: ['confined', 'space'], icon: 'meeting_room' },
    { keywords: ['ventilation', 'fan', 'air'], icon: 'air' },
    { keywords: ['refuge', 'emergency'], icon: 'emergency' },
    { keywords: ['escape'], icon: 'exit_to_app' },
    { keywords: ['electrical', 'substation'], icon: 'bolt' },
    { keywords: ['screen', 'grizzly'], icon: 'filter_alt' },
    { keywords: ['feeder', 'apron'], icon: 'input' },
    { keywords: ['conveyor'], icon: 'sync_alt' },
    { keywords: ['stacker'], icon: 'layers' },
    { keywords: ['reclaimer'], icon: 'unarchive' },
    { keywords: ['train', 'loadout'], icon: 'train' },
];

const FALLBACK_ICON = 'warning';

function resolveIcon(activityName) {
    const lower = activityName.toLowerCase();
    for (const entry of ICON_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) return entry.icon;
    }
    return FALLBACK_ICON;
}

function renderIconTexture(iconName) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // White filled circle background
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 60, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Dark icon glyph
    ctx.font = '72px "Material Symbols Rounded"';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconName, size / 2, size / 2);

    return new THREE.CanvasTexture(canvas);
}

export class ActivityIconManager {
    constructor(scene) {
        this.scene = scene;
        this.sprites = [];
        this.textureCache = new Map();
    }

    async loadTextures() {
        // Explicitly load the Material Symbols font before rendering to canvas
        await document.fonts.load('72px "Material Symbols Rounded"');

        // Pre-render all icon textures
        const allIcons = ICON_MAP.map(e => e.icon).concat(FALLBACK_ICON);
        for (const icon of allIcons) {
            if (!this.textureCache.has(icon)) {
                this.textureCache.set(icon, renderIconTexture(icon));
            }
        }
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
        const iconName = resolveIcon(activity.name || '');
        const texture = this.textureCache.get(iconName) || this.textureCache.get(FALLBACK_ICON);
        const color = RiskResolver.getRiskColor(activity.risk);

        const material = new THREE.SpriteMaterial({
            map: texture,
            color: color,
            transparent: true,
            depthTest: false,
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
