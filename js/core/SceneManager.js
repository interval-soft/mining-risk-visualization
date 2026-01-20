// js/core/SceneManager.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();

        // Set initial background based on current theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.scene.background = new THREE.Color(isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT);

        this.camera = this.createCamera();
        this.renderer = this.createRenderer();

        this.setupLighting();
        this.handleResize();

        window.addEventListener('resize', () => this.handleResize());

        // Listen for theme changes
        window.addEventListener('themechange', (e) => this.onThemeChange(e.detail.theme));
    }

    onThemeChange(theme) {
        const isDark = theme === 'dark';
        const targetColor = isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT;
        this.scene.background = new THREE.Color(targetColor);
    }

    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA_FOV,
            aspect,
            CONFIG.CAMERA_NEAR,
            CONFIG.CAMERA_FAR
        );
        camera.position.set(...CONFIG.CAMERA_POSITION);
        camera.lookAt(...CONFIG.CAMERA_TARGET);
        return camera;
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(renderer.domElement);
        return renderer;
    }

    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        // Key light
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(100, 200, 150);
        this.scene.add(keyLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-100, 100, -100);
        this.scene.add(fillLight);
    }

    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}
