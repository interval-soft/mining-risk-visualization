// js/core/CameraController.js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, domElement);

        this.defaultPosition = new THREE.Vector3(...CONFIG.CAMERA_POSITION);
        this.defaultTarget = new THREE.Vector3(...CONFIG.CAMERA_TARGET);

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 200;
        this.controls.maxDistance = 1500;
        this.controls.maxPolarAngle = Math.PI * 0.85;

        this.controls.target.copy(this.defaultTarget);
    }

    reset() {
        this.camera.position.copy(this.defaultPosition);
        this.controls.target.copy(this.defaultTarget);
        this.controls.update();
    }

    focusOnLevel(levelY) {
        this.controls.target.setY(levelY);
    }

    update() {
        this.controls.update();
    }
}
