// js/objects/LabelRenderer.js
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG } from '../config.js';

export class LabelRenderer {
    constructor(container) {
        this.renderer = new CSS2DRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.renderer.domElement);

        this.labels = new Map();
    }

    createLevelLabel(levelData, levelMesh) {
        const div = document.createElement('div');
        div.className = 'level-label';
        div.innerHTML = `
            <div class="level-number">L${levelData.level}</div>
            <div class="level-name">${levelData.name}</div>
            <div class="level-depth">${CONFIG.DEPTHS[levelData.level]}</div>
        `;

        const label = new CSS2DObject(div);
        label.position.set(
            CONFIG.LABEL_OFFSET_X,
            0,
            CONFIG.LEVEL_DEPTH / 2 + 20
        );

        levelMesh.add(label);
        this.labels.set(levelData.level, label);
    }

    setLabelVisibility(levelNumber, visible) {
        const label = this.labels.get(levelNumber);
        if (label) {
            label.element.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Update a level's label with new data.
     * @param {Object} levelData - Level data with name, riskScore, etc.
     */
    updateLevelLabel(levelData) {
        const label = this.labels.get(levelData.level);
        if (!label) return;

        const div = label.element;

        // Update name
        const nameEl = div.querySelector('.level-name');
        if (nameEl) {
            nameEl.textContent = levelData.name;
        }

        // Update or add risk score display
        let scoreEl = div.querySelector('.level-risk-score');
        if (levelData.riskScore !== undefined) {
            if (!scoreEl) {
                scoreEl = document.createElement('div');
                scoreEl.className = 'level-risk-score';
                div.appendChild(scoreEl);
            }
            const riskBand = levelData.riskBand || 'low';
            scoreEl.textContent = `Risk: ${levelData.riskScore}`;
            scoreEl.className = `level-risk-score risk-${riskBand}`;
        }
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    resize(width, height) {
        this.renderer.setSize(width, height);
    }
}
