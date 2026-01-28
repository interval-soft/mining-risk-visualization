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
        this.structureLabels = new Map();
        this.onStructureClick = null; // Callback for structure label clicks
    }

    /**
     * Set click handler for structure labels.
     * @param {Function} handler - Callback receiving (structureCode, isFocused)
     */
    setStructureClickHandler(handler) {
        this.onStructureClick = handler;
    }

    /**
     * Create a clickable label for a structure.
     * @param {Object} structureData - Structure data with code, name, type
     * @param {THREE.Group} structureGroup - The structure's 3D group
     * @param {number} topY - Y position of the topmost level (for label placement)
     */
    createStructureLabel(structureData, structureGroup, topY = 0) {
        const div = document.createElement('div');
        div.className = 'structure-label';
        div.dataset.structureCode = structureData.code;
        div.innerHTML = `
            <div class="structure-name">${structureData.name}</div>
            <div class="structure-type">${this.formatStructureType(structureData.type)}</div>
        `;

        // Enable pointer events for clicking
        div.style.pointerEvents = 'auto';
        div.style.cursor = 'pointer';

        // Handle click to toggle focus
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (this.onStructureClick) {
                const isFocused = div.classList.contains('focused');
                this.onStructureClick(structureData.code, isFocused);
            }
        });

        const label = new CSS2DObject(div);
        // Position above the structure (top level + offset)
        label.position.set(0, topY + 160, 0);

        structureGroup.add(label);
        this.structureLabels.set(structureData.code, label);
    }

    /**
     * Format structure type for display.
     */
    formatStructureType(type) {
        const typeMap = {
            'open_pit': 'Open Pit',
            'underground': 'Underground',
            'processing': 'Processing',
            'stockpile': 'Stockpile',
            'mixed': 'Mixed Operations'
        };
        return typeMap[type] || type;
    }

    /**
     * Update structure label focus state and show/hide level labels.
     * @param {string|null} focusedCode - The focused structure code, or null for site view
     */
    setStructureFocus(focusedCode) {
        // Update structure labels
        this.structureLabels.forEach((label, code) => {
            const div = label.element;
            if (focusedCode === null) {
                // Site view - all labels normal and visible
                div.classList.remove('focused', 'unfocused');
            } else if (code === focusedCode) {
                // This structure is focused
                div.classList.add('focused');
                div.classList.remove('unfocused');
            } else {
                // Other structures are unfocused (hidden)
                div.classList.remove('focused');
                div.classList.add('unfocused');
            }
        });

        // Update level labels visibility
        this.labels.forEach((label, key) => {
            // Parse structure code from composite key (e.g., "PIT_MAIN:1" -> "PIT_MAIN")
            // or use the stored structureCode property
            let labelStructureCode = label.structureCode || '';
            if (!labelStructureCode && typeof key === 'string' && key.includes(':')) {
                labelStructureCode = key.split(':')[0];
            }

            const shouldShow = focusedCode === null || labelStructureCode === focusedCode;

            // Use Three.js visible property AND DOM display
            label.visible = shouldShow;
            if (label.element) {
                label.element.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }

    /**
     * Create a level label with structure context.
     * @param {Object} levelData - Level data
     * @param {THREE.Mesh} levelMesh - The level mesh to attach label to
     * @param {string} structureCode - Optional structure code for multi-structure sites
     */
    createLevelLabel(levelData, levelMesh, structureCode = null) {
        const div = document.createElement('div');
        div.className = 'level-label';
        div.innerHTML = `
            <div class="level-header">
                <span class="level-number">L${levelData.level}</span>
                <span class="level-depth">${CONFIG.DEPTHS[levelData.level]}</span>
            </div>
        `;

        // Click on label triggers level isolation (same as clicking the level mesh)
        div.style.cursor = 'pointer';
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onLevelLabelClick) {
                this.onLevelLabelClick(levelMesh);
            }
        });

        const label = new CSS2DObject(div);
        // Store structure code directly on the label object
        label.structureCode = structureCode || '';
        label.position.set(
            CONFIG.LABEL_OFFSET_X,
            0,
            CONFIG.LEVEL_DEPTH / 2 + 20
        );

        levelMesh.add(label);

        // Use composite key for multi-structure support
        const key = structureCode ? `${structureCode}:${levelData.level}` : levelData.level;
        this.labels.set(key, label);
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

    /**
     * Toggle visibility of all labels (structure and level labels).
     * @param {boolean} visible - Whether labels should be visible
     */
    setAllLabelsVisible(visible) {
        // Toggle structure labels
        this.structureLabels.forEach((label) => {
            label.visible = visible;
            if (label.element) {
                label.element.style.display = visible ? 'block' : 'none';
            }
        });

        // Toggle level labels
        this.labels.forEach((label) => {
            label.visible = visible;
            if (label.element) {
                label.element.style.display = visible ? 'block' : 'none';
            }
        });

        this.labelsVisible = visible;
    }

    /**
     * Check if labels are currently visible.
     */
    areLabelsVisible() {
        return this.labelsVisible !== false;
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    resize(width, height) {
        this.renderer.setSize(width, height);
    }
}
