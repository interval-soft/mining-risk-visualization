// js/core/SceneManager.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PostProcessing } from './PostProcessing.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();

        // Track custom background color
        this.customBgColor = localStorage.getItem('bgColor');

        // Set initial background based on saved color or theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        if (this.customBgColor) {
            this.scene.background = new THREE.Color(this.customBgColor);
        } else {
            this.scene.background = new THREE.Color(isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT);
        }

        this.camera = this.createCamera();
        this.renderer = this.createRenderer();

        this.setupLighting();
        this.setupEnvironment();

        // Initialize post-processing pipeline with theme
        this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
        this.postProcessing.setTheme(isDark);

        this.handleResize();

        window.addEventListener('resize', () => this.handleResize());

        // Listen for theme changes
        window.addEventListener('themechange', (e) => this.onThemeChange(e.detail.theme));

        // Listen for background color changes
        window.addEventListener('bgcolorchange', (e) => this.onBgColorChange(e.detail.color));
    }

    onThemeChange(theme) {
        const isDark = theme === 'dark';

        // Only use theme colors if no custom background is set
        if (!this.customBgColor) {
            const targetColor = isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT;
            this.scene.background = new THREE.Color(targetColor);

            // Update fog color
            if (this.scene.fog) {
                this.scene.fog.color = new THREE.Color(targetColor);
            }
        }

        // Update fog density (reduced for deeper mine)
        if (this.scene.fog) {
            this.scene.fog.density = isDark ? 0.0006 : 0.00025;
        }

        // Update ground plane - subtle in light mode
        if (this.groundPlane) {
            this.groundPlane.material.color.setHex(isDark ? 0x0d0d1a : 0xd8dce0);
        }

        // Update post-processing for theme
        if (this.postProcessing) {
            this.postProcessing.setTheme(isDark);
        }

        // Update color picker to match theme default if no custom color
        if (!this.customBgColor) {
            const picker = document.getElementById('bg-color-picker');
            if (picker) {
                picker.value = isDark ? '#0d1117' : '#e8eaed';
            }
        }
    }

    onBgColorChange(color) {
        this.customBgColor = color;
        this.scene.background = new THREE.Color(color);

        // Update fog to match background for seamless depth fade
        if (this.scene.fog) {
            this.scene.fog.color = new THREE.Color(color);
        }
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
        
        // Enable shadow mapping for realistic depth
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // ACES filmic tone mapping for cinematic look
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        this.container.appendChild(renderer.domElement);
        return renderer;
    }

    setupLighting() {
        // Ambient light - provides base illumination
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);

        // Key light - main shadow-casting light
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        keyLight.position.set(150, 400, 250);
        
        // Configure shadow casting
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 10;
        keyLight.shadow.camera.far = 2000;
        
        // Shadow frustum - covers all 7 mine levels (down to -900)
        keyLight.shadow.camera.left = -600;
        keyLight.shadow.camera.right = 600;
        keyLight.shadow.camera.top = 500;
        keyLight.shadow.camera.bottom = -1200;
        
        // Soft shadow bias to prevent artifacts
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
        
        this.scene.add(keyLight);

        // Fill light - softer, from opposite side
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
        fillLight.position.set(-150, 150, -150);
        this.scene.add(fillLight);
        
        // Rim light - adds depth separation
        const rimLight = new THREE.DirectionalLight(0x6666ff, 0.15);
        rimLight.position.set(0, -100, -200);
        this.scene.add(rimLight);
    }

    setupEnvironment() {
        // Exponential fog for depth atmosphere
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        // Use custom background color for fog if set, otherwise use theme color
        const fogColor = this.customBgColor || (isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT);
        // Reduced fog density for deeper 7-level mine
        this.scene.fog = new THREE.FogExp2(fogColor, isDark ? 0.0006 : 0.00025);

        // Ground plane to receive shadows - below all 7 levels
        const groundGeometry = new THREE.PlaneGeometry(2500, 2500);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0d0d1a : 0xd8dce0,
            roughness: 0.95,
            metalness: 0.0
        });
        
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = -1100; // Below all 7 mine levels
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
    }

    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        
        // Update post-processing composer size
        if (this.postProcessing) {
            this.postProcessing.setSize(width, height);
        }
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    /**
     * Render the scene with post-processing effects.
     */
    render() {
        this.postProcessing.render();
    }

    /**
     * Set bloom intensity for risk visualization.
     * @param {number} intensity - Bloom strength (0.0 to 1.5)
     */
    setBloomIntensity(intensity) {
        this.postProcessing.setBloomIntensity(intensity);
    }
}
