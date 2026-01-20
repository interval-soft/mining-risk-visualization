// js/interaction/RaycasterManager.js
import * as THREE from 'three';

export class RaycasterManager {
    constructor(camera) {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.camera = camera;
        this.interactables = [];
    }

    setInteractables(objects) {
        this.interactables = objects;
    }

    updateMousePosition(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    getIntersectedObject() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }
}
