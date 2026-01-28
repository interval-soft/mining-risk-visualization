// babylon/core/CameraController.js
import * as BABYLON from '@babylonjs/core';
import gsap from 'gsap';
import { CONFIG } from '../../js/config.js';

/**
 * Camera controller for Babylon.js ArcRotateCamera.
 * Provides animation methods and preset views.
 */
export class CameraController {
    constructor(camera, canvas) {
        this.camera = camera;
        this.canvas = canvas;

        // Store default state for reset
        this.defaultAlpha = camera.alpha;
        this.defaultBeta = camera.beta;
        this.defaultRadius = camera.radius;
        this.defaultTarget = camera.target.clone();

        // Rotation and zoom speeds
        this.rotateSpeed = 0.1; // radians per step
        this.zoomSpeed = 50;    // distance per step

        // Animation state
        this.isAnimating = false;
        this._tween = null;
    }

    /**
     * Reset camera to default position.
     */
    reset() {
        this.animateTo(
            { alpha: this.defaultAlpha, beta: this.defaultBeta, radius: this.defaultRadius },
            this.defaultTarget.clone()
        );
    }

    /**
     * Focus camera target on a specific Y level.
     */
    focusOnLevel(levelY) {
        const newTarget = this.camera.target.clone();
        newTarget.y = levelY;
        this.animateTo(null, newTarget, 500);
    }

    /**
     * Update camera (called from animation loop).
     * ArcRotateCamera handles its own updates, but this provides
     * compatibility with the existing animation loop pattern.
     */
    update() {
        // ArcRotateCamera updates automatically when attached to canvas
    }

    /**
     * Rotate camera horizontally around target.
     */
    rotateHorizontal(direction) {
        const angle = this.rotateSpeed * direction;
        this.camera.alpha += angle;
    }

    /**
     * Rotate camera vertically around target.
     */
    rotateVertical(direction) {
        const angle = this.rotateSpeed * direction;
        let newBeta = this.camera.beta - angle;

        // Clamp to limits
        newBeta = Math.max(this.camera.lowerBetaLimit, Math.min(this.camera.upperBetaLimit, newBeta));
        this.camera.beta = newBeta;
    }

    /**
     * Zoom camera in or out.
     */
    zoom(direction) {
        let newRadius = this.camera.radius - this.zoomSpeed * direction;

        // Clamp to limits
        newRadius = Math.max(this.camera.lowerRadiusLimit, Math.min(this.camera.upperRadiusLimit, newRadius));
        this.camera.radius = newRadius;
    }

    /**
     * Set camera to a preset view.
     */
    setPresetView(view) {
        const target = this.camera.target.clone();
        const distance = 800;

        switch (view) {
            case 'top':
                // Looking straight down
                this.animateTo(
                    { alpha: 0, beta: 0.01, radius: distance },
                    target
                );
                break;
            case 'front':
                // Looking from front
                this.animateTo(
                    { alpha: 0, beta: Math.PI / 2, radius: distance },
                    target
                );
                break;
            case 'side':
                // Looking from side
                this.animateTo(
                    { alpha: Math.PI / 2, beta: Math.PI / 2, radius: distance },
                    target
                );
                break;
            case 'site':
                if (CONFIG.CAMERA_PRESETS?.site) {
                    const preset = CONFIG.CAMERA_PRESETS.site;
                    this.animateToPosition(
                        new BABYLON.Vector3(...preset.position),
                        new BABYLON.Vector3(...preset.target)
                    );
                }
                break;
            case 'structure':
                if (CONFIG.CAMERA_PRESETS?.structure) {
                    const preset = CONFIG.CAMERA_PRESETS.structure;
                    this.animateToPosition(
                        new BABYLON.Vector3(...preset.position),
                        new BABYLON.Vector3(...preset.target)
                    );
                }
                break;
            case 'isometric':
            default:
                this.reset();
                break;
        }
    }

    /**
     * Focus on a specific position with smooth transition.
     */
    focusOn(position) {
        this.animateTo(null, position.clone(), 500);
    }

    /**
     * Focus on a structure with animated camera movement.
     */
    focusOnStructure(structurePosition, options = {}) {
        const {
            distance = 750,
            height = 200,
            duration = CONFIG.CAMERA_TRANSITION_DURATION || 1000
        } = options;

        // Calculate camera position relative to structure
        const cameraPosition = new BABYLON.Vector3(
            structurePosition.x,
            structurePosition.y + height,
            structurePosition.z + distance
        );

        this.animateToPosition(cameraPosition, structurePosition.clone(), duration);
    }

    /**
     * Switch to site overview (all structures visible).
     */
    showSiteOverview(siteCenter = null) {
        const preset = CONFIG.CAMERA_PRESETS?.site || {
            position: [0, 800, 1200],
            target: [0, -200, 0]
        };

        let targetPos = new BABYLON.Vector3(...preset.target);
        let cameraPos = new BABYLON.Vector3(...preset.position);

        // Adjust for site center if provided
        if (siteCenter) {
            const offset = cameraPos.subtract(targetPos);
            targetPos = siteCenter.clone();
            cameraPos = siteCenter.add(offset);
        }

        this.animateToPosition(cameraPos, targetPos);
    }

    /**
     * Animate camera to new position and target using Cartesian coordinates.
     * This calculates the spherical coordinates from the given positions.
     */
    animateToPosition(newPosition, newTarget, duration = CONFIG.CAMERA_TRANSITION_DURATION || 1000) {
        // Calculate spherical coordinates from position/target
        const dx = newPosition.x - newTarget.x;
        const dy = newPosition.y - newTarget.y;
        const dz = newPosition.z - newTarget.z;

        const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const alpha = Math.atan2(dx, dz);
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const beta = Math.atan2(horizontalDist, dy);

        this.animateTo({ alpha, beta, radius }, newTarget, duration);
    }

    /**
     * Animate camera using spherical coordinates.
     */
    animateTo(spherical, newTarget, duration = CONFIG.CAMERA_TRANSITION_DURATION || 1000) {
        // Cancel any ongoing animation
        if (this._tween) {
            this._tween.kill();
        }

        this.isAnimating = true;

        // Build animation timeline
        const tl = gsap.timeline({
            onComplete: () => {
                this.isAnimating = false;
                this._tween = null;
            }
        });

        // Animate spherical coordinates if provided
        if (spherical) {
            tl.to(this.camera, {
                alpha: spherical.alpha,
                beta: spherical.beta,
                radius: spherical.radius,
                duration: duration / 1000,
                ease: 'power3.out'
            }, 0);
        }

        // Animate target if provided
        if (newTarget) {
            tl.to(this.camera.target, {
                x: newTarget.x,
                y: newTarget.y,
                z: newTarget.z,
                duration: duration / 1000,
                ease: 'power3.out'
            }, 0);
        }

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
     */
    getIsAnimating() {
        return this.isAnimating;
    }

    /**
     * Get camera's current target position.
     */
    getTarget() {
        return this.camera.target.clone();
    }

    /**
     * Get camera's current position (in Cartesian coordinates).
     */
    getPosition() {
        // Convert from spherical to Cartesian
        const x = this.camera.target.x + this.camera.radius * Math.sin(this.camera.beta) * Math.sin(this.camera.alpha);
        const y = this.camera.target.y + this.camera.radius * Math.cos(this.camera.beta);
        const z = this.camera.target.z + this.camera.radius * Math.sin(this.camera.beta) * Math.cos(this.camera.alpha);

        return new BABYLON.Vector3(x, y, z);
    }
}
