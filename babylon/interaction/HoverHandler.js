// babylon/interaction/HoverHandler.js
import * as BABYLON from '@babylonjs/core';

/**
 * Handles hover interactions for level meshes and activity icons.
 * Uses Babylon.js scene.pick() for ray intersection.
 */
export class HoverHandler {
    constructor(scene, materialSystem, tooltipManager, levelMeshes, sprites) {
        this.scene = scene;
        this.materialSystem = materialSystem;
        this.tooltipManager = tooltipManager;
        this.levelMeshes = levelMeshes;
        this.sprites = sprites;

        this.hoveredMesh = null;
        this.hoveredSprite = null;

        this.setupObservable();
    }

    /**
     * Setup pointer observable for hover detection.
     */
    setupObservable() {
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.onPointerMove(pointerInfo);
            }
        });
    }

    /**
     * Handle pointer move event.
     */
    onPointerMove(pointerInfo) {
        // Check for mesh intersection
        const pickResult = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => this.isInteractable(mesh)
        );

        // Also check sprites
        const spriteResult = this.scene.pickSprite(
            this.scene.pointerX,
            this.scene.pointerY
        );

        // Determine what we're hovering over
        let newHoveredMesh = null;
        let newHoveredSprite = null;

        if (spriteResult.hit && spriteResult.pickedSprite) {
            newHoveredSprite = spriteResult.pickedSprite;
        } else if (pickResult.hit && pickResult.pickedMesh) {
            const metadata = pickResult.pickedMesh.metadata;
            if (metadata?.type === 'level') {
                newHoveredMesh = pickResult.pickedMesh;
            }
        }

        // Update hover states
        this.updateHoverState(newHoveredMesh, newHoveredSprite, pointerInfo.event);
    }

    /**
     * Check if a mesh is interactable.
     */
    isInteractable(mesh) {
        const metadata = mesh.metadata;
        if (!metadata) return false;
        return metadata.type === 'level';
    }

    /**
     * Update hover states and tooltip.
     */
    updateHoverState(newMesh, newSprite, event) {
        // Handle mesh hover change
        if (newMesh !== this.hoveredMesh) {
            // Clear previous mesh hover
            if (this.hoveredMesh) {
                this.materialSystem.setHoverState(this.hoveredMesh, false);
                this.scene.getEngine().getRenderingCanvas().style.cursor = 'default';
            }

            // Set new mesh hover
            if (newMesh) {
                this.materialSystem.setHoverState(newMesh, true);
                this.scene.getEngine().getRenderingCanvas().style.cursor = 'pointer';
            }

            this.hoveredMesh = newMesh;
        }

        // Handle sprite hover change
        if (newSprite !== this.hoveredSprite) {
            if (newSprite) {
                this.scene.getEngine().getRenderingCanvas().style.cursor = 'pointer';
            } else if (!newMesh) {
                this.scene.getEngine().getRenderingCanvas().style.cursor = 'default';
            }

            this.hoveredSprite = newSprite;
        }

        // Update tooltip
        this.updateTooltip(newMesh, newSprite, event);
    }

    /**
     * Update tooltip based on hover state.
     */
    updateTooltip(mesh, sprite, event) {
        if (sprite) {
            // Show sprite tooltip
            const metadata = sprite.metadata;
            if (metadata) {
                this.tooltipManager.show(
                    metadata.activityName,
                    event.clientX,
                    event.clientY,
                    `Risk: ${metadata.risk}`
                );
            }
        } else if (mesh) {
            // Show mesh tooltip
            const metadata = mesh.metadata;
            if (metadata) {
                const activityCount = metadata.activities?.length || 0;
                this.tooltipManager.show(
                    metadata.levelName || `Level ${metadata.levelNumber}`,
                    event.clientX,
                    event.clientY,
                    `${activityCount} activities - Risk: ${metadata.risk}`
                );
            }
        } else {
            // Hide tooltip
            this.tooltipManager.hide();
        }
    }

    /**
     * Update the list of interactable meshes.
     */
    setInteractables(meshes, sprites) {
        this.levelMeshes = meshes;
        this.sprites = sprites;
    }

    /**
     * Get currently hovered mesh.
     */
    getHoveredMesh() {
        return this.hoveredMesh;
    }

    /**
     * Get currently hovered sprite.
     */
    getHoveredSprite() {
        return this.hoveredSprite;
    }
}
