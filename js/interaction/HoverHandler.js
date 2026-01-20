// js/interaction/HoverHandler.js
export class HoverHandler {
    constructor(raycasterManager, materialSystem, tooltipManager) {
        this.raycaster = raycasterManager;
        this.materials = materialSystem;
        this.tooltip = tooltipManager;
        this.currentHovered = null;
    }

    onMouseMove(event, canvas) {
        this.raycaster.updateMousePosition(event, canvas);
        const intersected = this.raycaster.getIntersectedObject();

        // Clear previous hover
        if (this.currentHovered && this.currentHovered !== intersected) {
            if (this.currentHovered.userData.type === 'level') {
                this.materials.setHoverState(this.currentHovered, false);
            }
            this.tooltip.hide();
        }

        // Set new hover
        if (intersected) {
            if (intersected.userData.type === 'level') {
                this.materials.setHoverState(intersected, true);
            }
            this.tooltip.show(intersected.userData, event.clientX, event.clientY);
            this.currentHovered = intersected;
            canvas.style.cursor = 'pointer';
        } else {
            this.currentHovered = null;
            canvas.style.cursor = 'default';
        }
    }
}
