// babylon/interaction/ClickHandler.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';

/**
 * Handles click interactions for level selection and isolation mode.
 * Supports single-click for selection and double-click for structure focus.
 */
export class ClickHandler {
    constructor(scene, levelSource, materialSystem, iconManager, cameraController, labelRenderer) {
        this.scene = scene;
        this.levelSource = levelSource;
        this.materialSystem = materialSystem;
        this.iconManager = iconManager;
        this.cameraController = cameraController;
        this.labelRenderer = labelRenderer;

        // Selection state
        this.selectedMesh = null;
        this.isolationMode = false;

        // Double-click detection
        this.lastClickTime = 0;
        this.lastClickMesh = null;
        this.doubleClickThreshold = 300; // ms

        // Handlers
        this.levelSelectHandler = null;
        this.structureSelectHandler = null;
        this.backgroundClickHandler = null;

        this.setupObservable();
    }

    /**
     * Setup pointer observable for click detection.
     */
    setupObservable() {
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
                this.onPointerPick(pointerInfo);
            }
        });
    }

    /**
     * Handle pointer pick (click) event.
     */
    onPointerPick(pointerInfo) {
        const pickResult = pointerInfo.pickInfo;

        // Check for sprite click first
        const spriteResult = this.scene.pickSprite(
            this.scene.pointerX,
            this.scene.pointerY
        );

        if (spriteResult.hit && spriteResult.pickedSprite) {
            this.handleSpriteClick(spriteResult.pickedSprite);
            return;
        }

        // Check for mesh click
        if (pickResult.hit && pickResult.pickedMesh) {
            const metadata = pickResult.pickedMesh.metadata;

            if (metadata?.type === 'level') {
                this.handleLevelClick(pickResult.pickedMesh);
                return;
            }
        }

        // Background click
        this.handleBackgroundClick();
    }

    /**
     * Handle click on a level mesh.
     */
    handleLevelClick(mesh) {
        const now = Date.now();
        const isDoubleClick = (
            this.lastClickMesh === mesh &&
            (now - this.lastClickTime) < this.doubleClickThreshold
        );

        this.lastClickTime = now;
        this.lastClickMesh = mesh;

        if (isDoubleClick) {
            // Double-click: focus on structure
            this.handleDoubleClick(mesh);
        } else {
            // Single-click: select level
            this.handleSingleClick(mesh);
        }
    }

    /**
     * Handle single-click on a level (selection).
     */
    handleSingleClick(mesh) {
        const metadata = mesh.metadata;
        if (!metadata) return;

        // Toggle selection
        if (this.selectedMesh === mesh) {
            // Deselect
            this.clearSelection();
        } else {
            // Select this level
            this.selectLevel(mesh);
        }
    }

    /**
     * Handle double-click on a level (structure focus).
     */
    handleDoubleClick(mesh) {
        const metadata = mesh.metadata;
        if (!metadata) return;

        const structureCode = metadata.structureCode;
        if (structureCode && this.structureSelectHandler) {
            this.structureSelectHandler(structureCode);
        }
    }

    /**
     * Select a level mesh.
     */
    selectLevel(mesh) {
        // Clear previous selection
        this.clearSelection();

        this.selectedMesh = mesh;
        this.isolationMode = true;

        // Get all level meshes
        const allLevels = this.levelSource.getAllLevelMeshes
            ? this.levelSource.getAllLevelMeshes()
            : this.levelSource.getAllLevels();

        // Apply isolation mode (fade non-selected)
        this.materialSystem.setIsolationMode(allLevels, mesh);

        // Focus camera on selected level
        this.cameraController.focusOn(mesh.position.clone());

        // Notify handler
        const metadata = mesh.metadata;
        if (this.levelSelectHandler) {
            this.levelSelectHandler(metadata.levelNumber, metadata.structureCode);
        }
    }

    /**
     * Clear selection and exit isolation mode.
     */
    clearSelection() {
        if (!this.selectedMesh) return;

        this.selectedMesh = null;
        this.isolationMode = false;

        // Get all level meshes
        const allLevels = this.levelSource.getAllLevelMeshes
            ? this.levelSource.getAllLevelMeshes()
            : this.levelSource.getAllLevels();

        // Reset all opacities
        this.materialSystem.setIsolationMode(allLevels, null);
    }

    /**
     * Handle click on activity sprite.
     */
    handleSpriteClick(sprite) {
        const metadata = sprite.metadata;
        if (!metadata) return;

        // Find the level mesh for this sprite
        const levelMesh = this.findLevelMesh(metadata.levelNumber, metadata.structureCode);
        if (levelMesh) {
            this.selectLevel(levelMesh);
        }
    }

    /**
     * Handle click on background (no object).
     */
    handleBackgroundClick() {
        if (this.isolationMode) {
            this.clearSelection();
        }

        if (this.backgroundClickHandler) {
            this.backgroundClickHandler();
        }
    }

    /**
     * Find a level mesh by number and structure code.
     */
    findLevelMesh(levelNumber, structureCode) {
        if (this.levelSource.getLevelMesh) {
            // StructureManager or LevelFactory
            if (structureCode && this.levelSource.getLevelMesh.length > 1) {
                // StructureManager.getLevelMesh(code, number)
                return this.levelSource.getLevelMesh(structureCode, levelNumber);
            }
            // LevelFactory.getLevelMesh(number)
            return this.levelSource.getLevelMesh(levelNumber);
        }
        return null;
    }

    /**
     * Set handler for level selection.
     */
    setLevelSelectHandler(handler) {
        this.levelSelectHandler = handler;
    }

    /**
     * Set handler for structure selection (double-click).
     */
    setStructureSelectHandler(handler) {
        this.structureSelectHandler = handler;
    }

    /**
     * Set handler for background clicks.
     */
    setBackgroundClickHandler(handler) {
        this.backgroundClickHandler = handler;
    }

    /**
     * Get currently selected mesh.
     */
    getSelectedMesh() {
        return this.selectedMesh;
    }

    /**
     * Check if in isolation mode.
     */
    isInIsolationMode() {
        return this.isolationMode;
    }

    /**
     * Programmatically select a level.
     */
    selectLevelByNumber(levelNumber, structureCode = null) {
        const mesh = this.findLevelMesh(levelNumber, structureCode);
        if (mesh) {
            this.selectLevel(mesh);
        }
    }
}
