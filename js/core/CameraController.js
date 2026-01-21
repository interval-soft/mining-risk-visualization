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

        // Rotation and zoom speeds
        this.rotateSpeed = 0.1; // radians per step
        this.zoomSpeed = 50;    // distance per step
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

    /**
     * Rotate camera horizontally around target
     * @param {number} direction - positive for right, negative for left
     */
    rotateHorizontal(direction) {
        const angle = this.rotateSpeed * direction;
        const offset = this.camera.position.clone().sub(this.controls.target);

        // Rotate around Y axis
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = offset.x * cos - offset.z * sin;
        const z = offset.x * sin + offset.z * cos;

        offset.x = x;
        offset.z = z;

        this.camera.position.copy(this.controls.target).add(offset);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
    }

    /**
     * Rotate camera vertically around target
     * @param {number} direction - positive for up, negative for down
     */
    rotateVertical(direction) {
        const angle = this.rotateSpeed * direction;
        const offset = this.camera.position.clone().sub(this.controls.target);
        const distance = offset.length();

        // Calculate current polar angle
        const currentPolar = Math.acos(offset.y / distance);
        let newPolar = currentPolar - angle;

        // Clamp to avoid flipping
        newPolar = Math.max(0.1, Math.min(Math.PI * 0.85, newPolar));

        // Calculate new position
        const azimuth = Math.atan2(offset.x, offset.z);
        offset.y = distance * Math.cos(newPolar);
        const horizontalDist = distance * Math.sin(newPolar);
        offset.x = horizontalDist * Math.sin(azimuth);
        offset.z = horizontalDist * Math.cos(azimuth);

        this.camera.position.copy(this.controls.target).add(offset);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
    }

    /**
     * Zoom camera in or out
     * @param {number} direction - positive for zoom in, negative for zoom out
     */
    zoom(direction) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const distance = offset.length();
        const newDistance = Math.max(
            this.controls.minDistance,
            Math.min(this.controls.maxDistance, distance - this.zoomSpeed * direction)
        );

        offset.normalize().multiplyScalar(newDistance);
        this.camera.position.copy(this.controls.target).add(offset);
        this.controls.update();
    }

    /**
     * Set camera to a preset view
     * @param {string} view - 'top', 'front', 'side', 'isometric'
     */
    setPresetView(view) {
        const target = this.controls.target.clone();
        const distance = 800;

        switch (view) {
            case 'top':
                this.camera.position.set(target.x, target.y + distance, target.z + 1);
                break;
            case 'front':
                this.camera.position.set(target.x, target.y, target.z + distance);
                break;
            case 'side':
                this.camera.position.set(target.x + distance, target.y, target.z);
                break;
            case 'isometric':
            default:
                this.camera.position.copy(this.defaultPosition);
                break;
        }

        this.camera.lookAt(target);
        this.controls.update();
    }

    /**
     * Focus on a specific position with smooth transition
     * @param {THREE.Vector3} position - target position to focus on
     */
    focusOn(position) {
        this.controls.target.copy(position);
        this.controls.update();
    }
}
