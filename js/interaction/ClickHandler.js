// js/interaction/ClickHandler.js
/**
 * Handles click interactions for levels and structures.
 * Supports both single-structure (legacy) and multi-structure modes.
 */
export class ClickHandler {
    /**
     * Create a new ClickHandler.
     * @param {RaycasterManager} raycasterManager - Raycaster for hit detection
     * @param {LevelFactory|StructureManager} levelSource - LevelFactory or StructureManager
     * @param {MaterialSystem} materialSystem - Material system for visual effects
     * @param {IconManager} iconManager - Icon visibility control
     * @param {CameraController} cameraController - Camera control
     * @param {LabelRenderer} labelRenderer - Label visibility control
     */
    constructor(raycasterManager, levelSource, materialSystem, iconManager, cameraController, labelRenderer) {
        this.raycaster = raycasterManager;
        this.levelSource = levelSource;
        this.materials = materialSystem;
        this.icons = iconManager;
        this.camera = cameraController;
        this.labels = labelRenderer;

        // Isolation state
        this.isolatedLevel = null;
        this.isolatedStructure = null;

        // Callbacks
        this.onLevelSelect = null;      // (levelNumber, structureCode) => void
        this.onStructureSelect = null;  // (structureCode) => void
        this.onBackgroundClick = null;  // () => void

        // Double-click detection for structure focus
        this.lastClickTime = 0;
        this.lastClickedMesh = null;
        this.doubleClickThreshold = 300; // ms
    }

    /**
     * Set callback for when a level is selected.
     * @param {Function} callback - Function that receives (levelNumber, structureCode)
     */
    setLevelSelectHandler(callback) {
        this.onLevelSelect = callback;
    }

    /**
     * Set callback for when a structure is selected (double-click).
     * @param {Function} callback - Function that receives structureCode
     */
    setStructureSelectHandler(callback) {
        this.onStructureSelect = callback;
    }

    /**
     * Set callback for background clicks (deselection).
     * @param {Function} callback - Function called on background click
     */
    setBackgroundClickHandler(callback) {
        this.onBackgroundClick = callback;
    }

    /**
     * Handle click event on canvas.
     * @param {MouseEvent} event - Click event
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    onClick(event, canvas) {
        // Skip if temporarily disabled (during structure focus changes)
        if (this.disabled) {
            return;
        }

        this.raycaster.updateMousePosition(event, canvas);
        const intersected = this.raycaster.getIntersectedObject();

        // Check for double-click
        const now = performance.now();
        const isDoubleClick = (
            intersected &&
            intersected === this.lastClickedMesh &&
            (now - this.lastClickTime) < this.doubleClickThreshold
        );
        this.lastClickTime = now;
        this.lastClickedMesh = intersected;

        // Background click - exit isolation
        if (!intersected || intersected.userData.type !== 'level') {
            if (this.isolatedLevel || this.isolatedStructure) {
                this.exitIsolation();
            }
            if (this.onBackgroundClick) {
                this.onBackgroundClick();
            }
            return;
        }

        const clickedMesh = intersected;
        const structureCode = clickedMesh.userData.structureCode || null;
        const levelNumber = clickedMesh.userData.levelNumber;

        // Double-click on level: focus on its structure
        if (isDoubleClick && structureCode && this.onStructureSelect) {
            this.onStructureSelect(structureCode);
            return;
        }

        // Single click: toggle isolation for level
        if (this.isolatedLevel === clickedMesh) {
            this.exitIsolation();
        } else {
            this.enterIsolation(clickedMesh);
        }
    }

    /**
     * Enter isolation mode for a level.
     * @param {THREE.Mesh} levelMesh - The level mesh to isolate
     */
    enterIsolation(levelMesh) {
        this.isolatedLevel = levelMesh;
        this.isolatedStructure = levelMesh.userData.structureCode || null;

        const allLevels = this.getAllLevels();

        this.materials.setIsolationMode(allLevels, levelMesh);

        // Hide all icons first, then show only the isolated level's icons
        this.icons.setAllVisible(false);
        this.icons.setVisibilityForLevel(
            levelMesh.userData.levelNumber,
            true,
            levelMesh.userData.structureCode
        );

        // Update label visibility
        allLevels.forEach(mesh => {
            const isIsolated = mesh === levelMesh;
            this.labels.setLabelVisibility(mesh.userData.levelNumber, isIsolated);
        });

        this.camera.focusOnLevel(levelMesh.position.y);

        // Trigger level select callback with structure context
        if (this.onLevelSelect) {
            this.onLevelSelect(
                levelMesh.userData.levelNumber,
                levelMesh.userData.structureCode || null
            );
        }
    }

    /**
     * Exit isolation mode.
     */
    exitIsolation() {
        this.isolatedLevel = null;
        this.isolatedStructure = null;

        const allLevels = this.getAllLevels();

        this.materials.setIsolationMode(allLevels, null);

        // Show all icons
        this.icons.setAllVisible(true);

        // Show all labels
        allLevels.forEach(mesh => {
            this.labels.setLabelVisibility(mesh.userData.levelNumber, true);
        });
    }

    /**
     * Get all level meshes from the level source.
     * Supports both LevelFactory and StructureManager.
     * @returns {Array<THREE.Mesh>}
     */
    getAllLevels() {
        // StructureManager has getAllLevelMeshes()
        if (typeof this.levelSource.getAllLevelMeshes === 'function') {
            return this.levelSource.getAllLevelMeshes();
        }
        // LevelFactory has getAllLevels()
        if (typeof this.levelSource.getAllLevels === 'function') {
            return this.levelSource.getAllLevels();
        }
        return [];
    }

    /**
     * Get levels for a specific structure.
     * @param {string} structureCode - Structure code
     * @returns {Array<THREE.Mesh>}
     */
    getStructureLevels(structureCode) {
        // StructureManager: get levels from specific structure
        if (typeof this.levelSource.getLevelFactory === 'function') {
            const factory = this.levelSource.getLevelFactory(structureCode);
            return factory ? factory.getAllLevels() : [];
        }
        // LevelFactory: return all levels (single structure)
        return this.getAllLevels();
    }

    /**
     * Programmatically select a level.
     * @param {number} levelNumber - Level number
     * @param {string} structureCode - Optional structure code
     */
    selectLevel(levelNumber, structureCode = null) {
        let mesh = null;

        if (structureCode && typeof this.levelSource.getLevelMesh === 'function') {
            // StructureManager
            mesh = this.levelSource.getLevelMesh(structureCode, levelNumber);
        } else if (typeof this.levelSource.getLevelMesh === 'function') {
            // LevelFactory
            mesh = this.levelSource.getLevelMesh(levelNumber);
        }

        if (mesh) {
            this.enterIsolation(mesh);
        }
    }

    /**
     * Clear current selection.
     */
    clearSelection() {
        if (this.isolatedLevel) {
            this.exitIsolation();
        }
    }

    /**
     * Check if currently in isolation mode.
     * @returns {boolean}
     */
    isInIsolation() {
        return this.isolatedLevel !== null;
    }

    /**
     * Get the currently isolated level info.
     * @returns {Object|null} { levelNumber, structureCode } or null
     */
    getIsolatedLevelInfo() {
        if (!this.isolatedLevel) return null;
        return {
            levelNumber: this.isolatedLevel.userData.levelNumber,
            structureCode: this.isolatedLevel.userData.structureCode || null
        };
    }
}
