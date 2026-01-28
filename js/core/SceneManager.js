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

        // Set initial background
        if (this.customBgColor) {
            this.scene.background = new THREE.Color(this.customBgColor);
        } else {
            this.scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);
        }

        this.camera = this.createCamera();
        this.renderer = this.createRenderer();

        this.setupLighting();
        this.setupEnvironment();

        // Initialize post-processing pipeline
        this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

        this.handleResize();

        window.addEventListener('resize', () => this.handleResize());

        // Listen for background color changes
        window.addEventListener('bgcolorchange', (e) => this.onBgColorChange(e.detail.color));
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
        const fogColor = this.customBgColor || CONFIG.COLORS.BACKGROUND;
        this.scene.fog = new THREE.FogExp2(fogColor, 0.00022);

        // Ground plane to receive shadows - below all 7 levels
        const groundGeometry = new THREE.PlaneGeometry(2500, 2500);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0d0d1a,
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
