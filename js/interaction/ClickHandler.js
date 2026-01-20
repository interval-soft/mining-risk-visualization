// js/interaction/ClickHandler.js
export class ClickHandler {
    constructor(raycasterManager, levelFactory, materialSystem, iconManager, cameraController, labelRenderer) {
        this.raycaster = raycasterManager;
        this.levels = levelFactory;
        this.materials = materialSystem;
        this.icons = iconManager;
        this.camera = cameraController;
        this.labels = labelRenderer;
        this.isolatedLevel = null;
        this.onLevelSelect = null; // Callback for level selection
    }

    /**
     * Set callback for when a level is selected.
     * @param {Function} callback - Function that receives level number
     */
    setLevelSelectHandler(callback) {
        this.onLevelSelect = callback;
    }

    onClick(event, canvas) {
        this.raycaster.updateMousePosition(event, canvas);
        const intersected = this.raycaster.getIntersectedObject();

        if (!intersected || intersected.userData.type !== 'level') {
            if (this.isolatedLevel) {
                this.exitIsolation();
            }
            return;
        }

        const clickedMesh = intersected;

        if (this.isolatedLevel === clickedMesh) {
            this.exitIsolation();
        } else {
            this.enterIsolation(clickedMesh);
        }
    }

    enterIsolation(levelMesh) {
        this.isolatedLevel = levelMesh;
        const allLevels = this.levels.getAllLevels();

        this.materials.setIsolationMode(allLevels, levelMesh);

        allLevels.forEach(mesh => {
            const isIsolated = mesh === levelMesh;
            this.icons.setVisibilityForLevel(mesh.userData.levelNumber, isIsolated);
            this.labels.setLabelVisibility(mesh.userData.levelNumber, isIsolated);
        });

        this.camera.focusOnLevel(levelMesh.position.y);

        // Trigger level select callback
        if (this.onLevelSelect) {
            this.onLevelSelect(levelMesh.userData.levelNumber);
        }
    }

    exitIsolation() {
        this.isolatedLevel = null;
        const allLevels = this.levels.getAllLevels();

        this.materials.setIsolationMode(allLevels, null);

        allLevels.forEach(mesh => {
            this.icons.setVisibilityForLevel(mesh.userData.levelNumber, true);
            this.labels.setLabelVisibility(mesh.userData.levelNumber, true);
        });
    }
}
