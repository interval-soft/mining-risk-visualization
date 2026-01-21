// js/core/PostProcessing.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * PostProcessing manager for visual effects.
 * Handles bloom (glow), anti-aliasing, and tone mapping.
 */
export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        this.composer = new EffectComposer(renderer);
        this.setupPasses();
    }

    setupPasses() {
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;

        // Base render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass for glow effects on high-risk areas
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.6,    // strength - visible glow on risk areas
            0.5,    // radius - spread of glow
            0.4     // threshold - catch emissive materials
        );
        this.composer.addPass(this.bloomPass);

        // FXAA anti-aliasing
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.fxaaPass.material.uniforms['resolution'].value.set(
            1 / width,
            1 / height
        );
        this.composer.addPass(this.fxaaPass);

        // Output pass for correct color space
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    /**
     * Update composer size on window resize.
     */
    setSize(width, height) {
        this.composer.setSize(width, height);
        
        // Update FXAA resolution uniform
        this.fxaaPass.material.uniforms['resolution'].value.set(
            1 / width,
            1 / height
        );
    }

    /**
     * Adjust bloom intensity based on scene risk state.
     * @param {number} intensity - Bloom strength (0.0 to 1.5)
     */
    setBloomIntensity(intensity) {
        this.bloomPass.strength = intensity;
    }

    /**
     * Update bloom settings for theme.
     * @param {boolean} isDark - Whether dark mode is active
     */
    setTheme(isDark) {
        if (isDark) {
            this.bloomPass.strength = 0.6;
            this.bloomPass.threshold = 0.4;
        } else {
            // Reduce bloom in light mode to prevent washed-out appearance
            this.bloomPass.strength = 0.3;
            this.bloomPass.threshold = 0.6;
        }
    }

    /**
     * Get current bloom settings for debugging.
     */
    getBloomSettings() {
        return {
            strength: this.bloomPass.strength,
            radius: this.bloomPass.radius,
            threshold: this.bloomPass.threshold
        };
    }

    /**
     * Render the scene with all post-processing effects.
     */
    render() {
        this.composer.render();
    }

    /**
     * Dispose of all resources.
     */
    dispose() {
        this.composer.dispose();
    }
}
