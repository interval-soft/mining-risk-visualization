// babylon/objects/LabelRenderer.js
import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { CONFIG } from '../../js/config.js';

/**
 * Label renderer using Babylon.js AdvancedDynamicTexture for level and structure labels.
 * Labels are linked to meshes and automatically follow their positions.
 */
export class LabelRenderer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.labels = new Map();          // Key: levelNumber-structureCode
        this.structureLabels = new Map(); // Key: structureCode

        // Create fullscreen UI for all labels
        this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('labelUI', true, scene);

        // Click handler for structure labels
        this.structureClickHandler = null;
        this.focusedStructure = null;
    }

    /**
     * Create a label for a level.
     */
    createLevelLabel(levelData, levelMesh, structureCode = null) {
        const levelNumber = levelData.level;
        const key = `${levelNumber}-${structureCode || 'default'}`;

        // Remove existing label if any
        this.removeLevelLabel(levelNumber, structureCode);

        // Create container rectangle
        const container = new GUI.Rectangle(`labelContainer_${key}`);
        container.width = '120px';
        container.height = '50px';
        container.cornerRadius = 5;
        container.color = 'white';
        container.thickness = 1;
        container.background = 'rgba(0, 0, 0, 0.7)';
        container.paddingLeft = '5px';
        container.paddingRight = '5px';

        // Create text block for level name
        const nameText = new GUI.TextBlock(`labelName_${key}`);
        nameText.text = levelData.name || `Level ${levelNumber}`;
        nameText.color = 'white';
        nameText.fontSize = 14;
        nameText.fontFamily = 'Roboto Mono, monospace';
        nameText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        nameText.paddingTop = '5px';
        container.addControl(nameText);

        // Create text block for depth
        const depthText = new GUI.TextBlock(`labelDepth_${key}`);
        depthText.text = CONFIG.DEPTHS[levelNumber] || '';
        depthText.color = '#888888';
        depthText.fontSize = 11;
        depthText.fontFamily = 'Roboto Mono, monospace';
        depthText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        depthText.paddingBottom = '5px';
        container.addControl(depthText);

        // Add to fullscreen UI
        this.advancedTexture.addControl(container);

        // Link to level mesh with offset
        container.linkWithMesh(levelMesh);
        container.linkOffsetX = CONFIG.LABEL_OFFSET_X;
        container.linkOffsetY = 0;

        // Store reference
        this.labels.set(key, {
            container,
            nameText,
            depthText,
            levelData,
            mesh: levelMesh,
            structureCode
        });
    }

    /**
     * Update a level label's text.
     */
    updateLevelLabel(levelData, structureCode = null) {
        const key = `${levelData.level}-${structureCode || 'default'}`;
        const label = this.labels.get(key);

        if (label) {
            label.nameText.text = levelData.name || `Level ${levelData.level}`;
            label.levelData = levelData;
        }
    }

    /**
     * Remove a level label.
     */
    removeLevelLabel(levelNumber, structureCode = null) {
        const key = `${levelNumber}-${structureCode || 'default'}`;
        const label = this.labels.get(key);

        if (label) {
            label.container.dispose();
            this.labels.delete(key);
        }
    }

    /**
     * Set click handler for structure labels.
     */
    setStructureClickHandler(handler) {
        this.structureClickHandler = handler;
    }

    /**
     * Create a label for a structure (above the structure).
     */
    createStructureLabel(structureData, structureGroup, topY) {
        const code = structureData.code;

        // Remove existing label
        this.removeStructureLabel(code);

        // Create container
        const container = new GUI.Rectangle(`structureLabel_${code}`);
        container.width = '180px';
        container.height = '40px';
        container.cornerRadius = 8;
        container.color = '#4a9eff';
        container.thickness = 2;
        container.background = 'rgba(0, 0, 0, 0.8)';

        // Create text
        const text = new GUI.TextBlock(`structureText_${code}`);
        text.text = structureData.name || code;
        text.color = 'white';
        text.fontSize = 16;
        text.fontWeight = 'bold';
        text.fontFamily = 'Roboto Mono, monospace';
        container.addControl(text);

        // Make clickable
        container.onPointerClickObservable.add(() => {
            if (this.structureClickHandler) {
                this.structureClickHandler(code, this.focusedStructure === code);
            }
        });

        // Hover effects
        container.onPointerEnterObservable.add(() => {
            container.background = 'rgba(74, 158, 255, 0.3)';
            container.color = '#ffffff';
        });

        container.onPointerOutObservable.add(() => {
            this.updateStructureLabelStyle(code);
        });

        // Add to UI
        this.advancedTexture.addControl(container);

        // Create anchor mesh for positioning
        const anchorMesh = new BABYLON.TransformNode(`structureLabelAnchor_${code}`, this.scene);
        anchorMesh.position = new BABYLON.Vector3(0, topY + 100, 0);
        anchorMesh.parent = structureGroup;

        // Link container to anchor
        container.linkWithMesh(anchorMesh);

        // Store reference
        this.structureLabels.set(code, {
            container,
            text,
            anchorMesh,
            data: structureData
        });
    }

    /**
     * Remove a structure label.
     */
    removeStructureLabel(code) {
        const label = this.structureLabels.get(code);

        if (label) {
            label.container.dispose();
            label.anchorMesh.dispose();
            this.structureLabels.delete(code);
        }
    }

    /**
     * Update structure label style based on focus.
     */
    updateStructureLabelStyle(code) {
        const label = this.structureLabels.get(code);
        if (!label) return;

        if (this.focusedStructure === code) {
            // Focused structure
            label.container.background = 'rgba(74, 158, 255, 0.5)';
            label.container.color = '#ffffff';
            label.container.thickness = 3;
        } else if (this.focusedStructure === null) {
            // No focus - all normal
            label.container.background = 'rgba(0, 0, 0, 0.8)';
            label.container.color = '#4a9eff';
            label.container.thickness = 2;
        } else {
            // Another structure is focused - fade this one
            label.container.background = 'rgba(0, 0, 0, 0.4)';
            label.container.color = '#666666';
            label.container.thickness = 1;
        }
    }

    /**
     * Set the focused structure (affects all structure label styles).
     */
    setStructureFocus(structureCode) {
        this.focusedStructure = structureCode;

        // Update all structure label styles
        this.structureLabels.forEach((label, code) => {
            this.updateStructureLabelStyle(code);
        });

        // Update level label visibility
        this.labels.forEach((label, key) => {
            if (structureCode === null) {
                // Show all labels
                label.container.isVisible = true;
            } else {
                // Only show labels for focused structure
                const isVisible = label.structureCode === structureCode;
                label.container.isVisible = isVisible;
            }
        });
    }

    /**
     * Update labels (called from render loop if needed).
     */
    update() {
        // AdvancedDynamicTexture handles updates automatically
        // This method exists for API compatibility
    }

    /**
     * Resize handler.
     */
    resize(width, height) {
        // AdvancedDynamicTexture handles resize automatically
    }

    /**
     * Set visibility for all labels.
     */
    setVisible(visible) {
        this.labels.forEach(label => {
            label.container.isVisible = visible;
        });
        this.structureLabels.forEach(label => {
            label.container.isVisible = visible;
        });
    }

    /**
     * Dispose all resources.
     */
    dispose() {
        this.labels.forEach(label => {
            label.container.dispose();
        });
        this.labels.clear();

        this.structureLabels.forEach(label => {
            label.container.dispose();
            label.anchorMesh.dispose();
        });
        this.structureLabels.clear();

        this.advancedTexture.dispose();
    }
}
