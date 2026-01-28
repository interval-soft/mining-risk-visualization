// babylon/core/SceneManager.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';
import { PostProcessing } from './PostProcessing.js';

/**
 * Manages the Babylon.js scene, engine, camera, and lighting.
 * Equivalent to the Three.js SceneManager but using Babylon.js APIs.
 */
export class SceneManager {
    constructor(container) {
        this.container = container;

        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        container.appendChild(this.canvas);

        // Create engine with WebGL2
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });

        // Create scene
        this.scene = new BABYLON.Scene(this.engine);

        // Track custom background color
        this.customBgColor = localStorage.getItem('bgColor');

        // Set initial background based on saved color or theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.setBackgroundColor(isDark);

        // Create camera
        this.camera = this.createCamera();

        // Setup lighting
        this.setupLighting();

        // Setup environment (fog, ground)
        this.setupEnvironment();

        // Initialize post-processing pipeline
        this.postProcessing = new PostProcessing(this.scene, this.camera);
        this.postProcessing.setTheme(isDark);

        // Handle resize
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        // Listen for theme changes
        window.addEventListener('themechange', (e) => this.onThemeChange(e.detail.theme));

        // Listen for background color changes
        window.addEventListener('bgcolorchange', (e) => this.onBgColorChange(e.detail.color));
    }

    /**
     * Set background color from hex string or theme default.
     */
    setBackgroundColor(isDark) {
        let color;
        if (this.customBgColor) {
            color = BABYLON.Color3.FromHexString(this.customBgColor);
        } else {
            const hex = isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT;
            color = BABYLON.Color3.FromHexString('#' + hex.toString(16).padStart(6, '0'));
        }
        this.scene.clearColor = new BABYLON.Color4(color.r, color.g, color.b, 1);
    }

    onThemeChange(theme) {
        const isDark = theme === 'dark';

        // Only use theme colors if no custom background is set
        if (!this.customBgColor) {
            this.setBackgroundColor(isDark);

            // Update fog color
            if (this.scene.fogColor) {
                const hex = isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT;
                this.scene.fogColor = BABYLON.Color3.FromHexString('#' + hex.toString(16).padStart(6, '0'));
            }
        }

        // Update fog density
        this.scene.fogDensity = isDark ? 0.0006 : 0.00025;

        // Update ground plane
        if (this.groundPlane) {
            const groundColor = isDark ? 0x0d0d1a : 0xd8dce0;
            this.groundPlane.material.diffuseColor = BABYLON.Color3.FromHexString(
                '#' + groundColor.toString(16).padStart(6, '0')
            );
        }

        // Update post-processing for theme
        if (this.postProcessing) {
            this.postProcessing.setTheme(isDark);
        }

        // Update color picker to match theme default if no custom color
        if (!this.customBgColor) {
            const picker = document.getElementById('bg-color-picker');
            if (picker) {
                picker.value = isDark ? '#1a1a2e' : '#e8eaed';
            }
        }
    }

    onBgColorChange(color) {
        this.customBgColor = color;
        const bgColor = BABYLON.Color3.FromHexString(color);
        this.scene.clearColor = new BABYLON.Color4(bgColor.r, bgColor.g, bgColor.b, 1);

        // Update fog to match background for seamless depth fade
        this.scene.fogColor = bgColor;
    }

    /**
     * Create ArcRotateCamera (combines PerspectiveCamera + OrbitControls).
     */
    createCamera() {
        const [px, py, pz] = CONFIG.CAMERA_POSITION;
        const [tx, ty, tz] = CONFIG.CAMERA_TARGET;

        // ArcRotateCamera: alpha (azimuth), beta (elevation), radius, target
        // We need to convert from position/target to spherical coordinates
        const target = new BABYLON.Vector3(tx, ty, tz);
        const position = new BABYLON.Vector3(px, py, pz);

        // Calculate radius (distance from target to position)
        const radius = BABYLON.Vector3.Distance(position, target);

        // Calculate alpha (azimuth angle in XZ plane)
        const dx = position.x - target.x;
        const dz = position.z - target.z;
        const alpha = Math.atan2(dx, dz);

        // Calculate beta (elevation angle from Y axis)
        const dy = position.y - target.y;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const beta = Math.atan2(horizontalDist, dy);

        const camera = new BABYLON.ArcRotateCamera(
            'camera',
            alpha,
            beta,
            radius,
            target,
            this.scene
        );

        // Attach controls to canvas
        camera.attachControl(this.canvas, true);

        // Configure camera properties (similar to OrbitControls)
        camera.lowerRadiusLimit = 200;
        camera.upperRadiusLimit = 2500;
        camera.upperBetaLimit = Math.PI * 0.85;
        camera.lowerBetaLimit = 0.1;

        // Damping / inertia
        camera.inertia = 0.9;
        camera.panningInertia = 0.9;

        // FOV
        camera.fov = CONFIG.CAMERA_FOV * (Math.PI / 180);

        // Near/far clipping
        camera.minZ = CONFIG.CAMERA_NEAR;
        camera.maxZ = CONFIG.CAMERA_FAR;

        return camera;
    }

    /**
     * Setup scene lighting.
     */
    setupLighting() {
        // Ambient light (HemisphericLight in Babylon.js)
        this.ambientLight = new BABYLON.HemisphericLight(
            'ambient',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        this.ambientLight.intensity = 0.3;
        this.ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.15);

        // Key light - main shadow-casting light
        this.keyLight = new BABYLON.DirectionalLight(
            'keyLight',
            new BABYLON.Vector3(-150, -400, -250).normalize(),
            this.scene
        );
        this.keyLight.position = new BABYLON.Vector3(150, 400, 250);
        this.keyLight.intensity = 0.9;

        // Configure shadow casting
        const shadowGenerator = new BABYLON.ShadowGenerator(2048, this.keyLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        shadowGenerator.bias = 0.0005;
        shadowGenerator.normalBias = 0.02;
        this.shadowGenerator = shadowGenerator;

        // Fill light - softer, from opposite side
        this.fillLight = new BABYLON.DirectionalLight(
            'fillLight',
            new BABYLON.Vector3(150, -150, 150).normalize(),
            this.scene
        );
        this.fillLight.intensity = 0.25;

        // Rim light - adds depth separation
        this.rimLight = new BABYLON.DirectionalLight(
            'rimLight',
            new BABYLON.Vector3(0, 100, 200).normalize(),
            this.scene
        );
        this.rimLight.intensity = 0.15;
        this.rimLight.diffuse = new BABYLON.Color3(0.4, 0.4, 1.0);
    }

    /**
     * Setup environment (fog, ground plane).
     */
    setupEnvironment() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        // Exponential fog (FOGMODE_EXP2)
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        const fogHex = this.customBgColor || (isDark ? CONFIG.COLORS.BACKGROUND : CONFIG.COLORS.BACKGROUND_LIGHT);
        let fogColor;
        if (typeof fogHex === 'string') {
            fogColor = BABYLON.Color3.FromHexString(fogHex);
        } else {
            fogColor = BABYLON.Color3.FromHexString('#' + fogHex.toString(16).padStart(6, '0'));
        }
        this.scene.fogColor = fogColor;
        this.scene.fogDensity = isDark ? 0.0006 : 0.00025;

        // Ground plane to receive shadows
        this.groundPlane = BABYLON.MeshBuilder.CreateGround('ground', {
            width: 2500,
            height: 2500
        }, this.scene);
        this.groundPlane.position.y = -1100; // Below all 7 mine levels

        const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
        const groundColor = isDark ? 0x0d0d1a : 0xd8dce0;
        groundMaterial.diffuseColor = BABYLON.Color3.FromHexString(
            '#' + groundColor.toString(16).padStart(6, '0')
        );
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        groundMaterial.roughness = 0.95;
        this.groundPlane.material = groundMaterial;
        this.groundPlane.receiveShadows = true;
    }

    /**
     * Handle window resize.
     */
    handleResize() {
        this.engine.resize();
    }

    /**
     * Add a mesh to shadow casting.
     */
    addShadowCaster(mesh) {
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(mesh);
        }
    }

    /**
     * Add object to scene.
     */
    add(node) {
        // In Babylon.js, nodes are added to scene automatically on creation
        // This method exists for API compatibility
        if (node.parent === null) {
            node.parent = null; // Ensures it's at scene root
        }
    }

    /**
     * Remove object from scene.
     */
    remove(node) {
        if (node.dispose) {
            node.dispose();
        }
    }

    /**
     * Render the scene (called from animation loop).
     */
    render() {
        this.scene.render();
    }

    /**
     * Set bloom intensity for risk visualization.
     */
    setBloomIntensity(intensity) {
        this.postProcessing.setBloomIntensity(intensity);
    }

    /**
     * Get the Babylon.js scene.
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the main camera.
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the canvas element.
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Dispose all resources.
     */
    dispose() {
        this.postProcessing.dispose();
        this.scene.dispose();
        this.engine.dispose();
    }
}
