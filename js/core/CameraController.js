// js/core/CameraController.js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import gsap from 'gsap';
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
        this.controls.maxDistance = 2500; // Increased for site view
        this.controls.maxPolarAngle = Math.PI * 0.85;

        this.controls.target.copy(this.defaultTarget);

        // Rotation and zoom speeds
        this.rotateSpeed = 0.1; // radians per step
        this.zoomSpeed = 50;    // distance per step

        // Animation state
        this.isAnimating = false;
        this._tween = null;
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
     * Pan camera (move camera and target together)
     * @param {number} dx - horizontal direction (positive = right)
     * @param {number} dy - vertical direction (positive = up)
     */
    pan(dx, dy) {
        const offset = this.camera.position.clone().sub(this.controls.target);
        const distance = offset.length();
        const panSpeed = distance * 0.05;

        // Get camera's local axes
        const forward = offset.clone().normalize().negate();
        const right = new THREE.Vector3().crossVectors(this.camera.up, forward).normalize();
        const up = new THREE.Vector3().crossVectors(forward, right).normalize();

        const delta = right.multiplyScalar(dx * panSpeed).add(up.multiplyScalar(dy * panSpeed));

        this.camera.position.add(delta);
        this.controls.target.add(delta);
        this.controls.update();
    }

    /**
     * Set camera to a preset view
     * @param {string} view - 'top', 'front', 'side', 'isometric', 'site', 'structure'
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
            case 'site':
                // Use site preset from config
                if (CONFIG.CAMERA_PRESETS?.site) {
                    const preset = CONFIG.CAMERA_PRESETS.site;
                    this.animateTo(
                        new THREE.Vector3(...preset.position),
                        new THREE.Vector3(...preset.target)
                    );
                    return;
                }
                break;
            case 'structure':
                // Use structure preset from config
                if (CONFIG.CAMERA_PRESETS?.structure) {
                    const preset = CONFIG.CAMERA_PRESETS.structure;
                    this.animateTo(
                        new THREE.Vector3(...preset.position),
                        new THREE.Vector3(...preset.target)
                    );
                    return;
                }
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

    /**
     * Focus on a structure with animated camera movement.
     * @param {THREE.Vector3} structurePosition - World position of structure center
     * @param {Object} options - Optional settings
     */
    focusOnStructure(structurePosition, options = {}) {
        const {
            distance = 750,
            height = 200,
            duration = CONFIG.CAMERA_TRANSITION_DURATION || 1000
        } = options;

        // Calculate camera position relative to structure
        const targetPosition = structurePosition.clone();

        // Offset camera from structure
        const cameraPosition = new THREE.Vector3(
            structurePosition.x,
            structurePosition.y + height,
            structurePosition.z + distance
        );

        this.animateTo(cameraPosition, targetPosition, duration);
    }

    /**
     * Switch to site overview (all structures visible).
     * @param {THREE.Vector3} siteCenter - Optional center point of site
     */
    showSiteOverview(siteCenter = null) {
        const preset = CONFIG.CAMERA_PRESETS?.site || {
            position: [0, 800, 1200],
            target: [0, -200, 0]
        };

        let targetPos = new THREE.Vector3(...preset.target);
        let cameraPos = new THREE.Vector3(...preset.position);

        // Adjust for site center if provided
        if (siteCenter) {
            const offset = cameraPos.clone().sub(targetPos);
            targetPos = siteCenter.clone();
            cameraPos = siteCenter.clone().add(offset);
        }

        this.animateTo(cameraPos, targetPos);
    }

    /**
     * Animate camera to new position and target.
     * @param {THREE.Vector3} newPosition - Target camera position
     * @param {THREE.Vector3} newTarget - Target look-at point
     * @param {number} duration - Animation duration in ms
     */
    animateTo(newPosition, newTarget, duration = CONFIG.CAMERA_TRANSITION_DURATION || 1000) {
        // Cancel any ongoing animation
        if (this._tween) {
            this._tween.kill();
        }

        this.isAnimating = true;

        // Animate camera position and orbit target simultaneously
        const tl = gsap.timeline({
            onUpdate: () => this.controls.update(),
            onComplete: () => {
                this.isAnimating = false;
                this._tween = null;
            }
        });

        tl.to(this.camera.position, {
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z,
            duration: duration / 1000,
            ease: 'power3.out'
        }, 0);

        tl.to(this.controls.target, {
            x: newTarget.x,
            y: newTarget.y,
            z: newTarget.z,
            duration: duration / 1000,
            ease: 'power3.out'
        }, 0);

        this._tween = tl;
    }

    /**
     * Stop any ongoing camera animation.
     */
    stopAnimation() {
        if (this._tween) {
            this._tween.kill();
            this._tween = null;
            this.isAnimating = false;
        }
    }

    /**
     * Check if camera is currently animating.
     * @returns {boolean}
     */
    getIsAnimating() {
        return this.isAnimating;
    }
}
