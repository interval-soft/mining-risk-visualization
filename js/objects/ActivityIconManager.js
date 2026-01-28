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

// CSS color strings for each risk level (baked into textures)
const RISK_CSS = {
    high: '#F44336',
    medium: '#FFC107',
    low: '#4CAF50'
};

function resolveIcon(activityName) {
    const lower = activityName.toLowerCase();
    for (const entry of ICON_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) return entry.icon;
    }
    return FALLBACK_ICON;
}

function renderIconTexture(iconName, riskCSSColor) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark circle background for contrast
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 58, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();

    // Colored ring border matching risk
    ctx.strokeStyle = riskCSSColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Icon glyph in risk color
    ctx.font = '64px "Material Symbols Rounded"';
    ctx.fillStyle = riskCSSColor;
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
        await document.fonts.load('64px "Material Symbols Rounded"');

        // Pre-render textures for every icon × risk combination
        const allIcons = ICON_MAP.map(e => e.icon).concat(FALLBACK_ICON);
        for (const icon of allIcons) {
            for (const [risk, css] of Object.entries(RISK_CSS)) {
                const key = `${icon}-${risk}`;
                if (!this.textureCache.has(key)) {
                    this.textureCache.set(key, renderIconTexture(icon, css));
                }
            }
        }
    }

    _getTexture(iconName, risk) {
        const key = `${iconName}-${risk || 'low'}`;
        return this.textureCache.get(key) || this.textureCache.get(`${FALLBACK_ICON}-low`);
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
        const texture = this._getTexture(iconName, activity.risk);

        const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(32, 32, 1);
        sprite.renderOrder = 999;
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

        const existingSprites = this.sprites.filter(
            s => s.userData.levelNumber === levelNumber
        );

        levelData.activities.forEach((activity, index) => {
            const sprite = existingSprites[index];
            if (sprite) {
                const risk = activity.risk || this.scoreToRisk(activity.riskScore);
                const iconName = resolveIcon(activity.name || '');
                const texture = this._getTexture(iconName, risk);

                // Swap texture to reflect new risk color
                sprite.material.map = texture;
                sprite.material.needsUpdate = true;

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
