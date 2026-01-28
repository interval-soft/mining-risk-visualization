// js/core/PostProcessing.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Selective bloom: only objects on BLOOM_LAYER (1) receive bloom.
 * Everything else renders cleanly without glow artifacts.
 *
 * Pipeline:
 *   1. bloomComposer: renders only bloom-layer objects → bloom texture
 *   2. finalComposer: renders full scene + additively blends bloom on top
 */
export const BLOOM_LAYER = 1;

// Additive blending shader: base scene + bloom texture
const AdditiveBlendShader = {
    uniforms: {
        tBase: { value: null },
        tBloom: { value: null }
    },
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tBase;
        uniform sampler2D tBloom;
        varying vec2 vUv;
        void main() {
            gl_FragColor = texture2D(tBase, vUv) + texture2D(tBloom, vUv);
        }
    `
};

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Materials cache: object -> original material (for darkening non-bloom objects)
        this._darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this._materialsCache = new Map();

        // Bloom layer mask
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set(BLOOM_LAYER);

        this.setupPasses();
    }

    setupPasses() {
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;

        // --- Bloom composer (renders only bloom-layer objects) ---
        this.bloomComposer = new EffectComposer(this.renderer);
        this.bloomComposer.renderToScreen = false;

        const bloomRenderPass = new RenderPass(this.scene, this.camera);
        this.bloomComposer.addPass(bloomRenderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.6,    // strength
            0.5,    // radius
            0.4     // threshold
        );
        this.bloomComposer.addPass(this.bloomPass);

        // --- Final composer (full scene + bloom overlay) ---
        this.finalComposer = new EffectComposer(this.renderer);

        const finalRenderPass = new RenderPass(this.scene, this.camera);
        this.finalComposer.addPass(finalRenderPass);

        // Blend bloom texture on top
        this.blendPass = new ShaderPass(AdditiveBlendShader);
        this.blendPass.uniforms.tBloom.value = this.bloomComposer.renderTarget2.texture;
        this.finalComposer.addPass(this.blendPass);

        // FXAA anti-aliasing
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.fxaaPass.material.uniforms['resolution'].value.set(
            1 / width,
            1 / height
        );
        this.finalComposer.addPass(this.fxaaPass);

        // Output pass for correct color space
        const outputPass = new OutputPass();
        this.finalComposer.addPass(outputPass);
    }

    /**
     * Update composer size on window resize.
     */
    setSize(width, height) {
        this.bloomComposer.setSize(width, height);
        this.finalComposer.setSize(width, height);

        this.fxaaPass.material.uniforms['resolution'].value.set(
            1 / width,
            1 / height
        );
    }

    /**
     * Adjust bloom intensity based on scene risk state.
     */
    setBloomIntensity(intensity) {
        this.bloomPass.strength = intensity;
    }

    /**
     * Update bloom settings for theme.
     */
    setTheme(isDark) {
        if (isDark) {
            this.bloomPass.strength = 0.6;
            this.bloomPass.threshold = 0.4;
        } else {
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
     * Render with selective bloom.
     * 1. Darken non-bloom objects, render bloom pass
     * 2. Restore materials, render final scene with bloom overlay
     */
    render() {
        // Step 1: hide non-bloom objects by swapping their materials to black
        this._darkenNonBloom();
        this.bloomComposer.render();
        this._restoreMaterials();

        // Step 2: render full scene and blend bloom on top
        this.finalComposer.render();
    }

    /**
     * Swap materials of objects NOT on the bloom layer to black,
     * so only bloom-layer objects contribute to the bloom pass.
     */
    _darkenNonBloom() {
        this._materialsCache.clear();

        this.scene.traverse((obj) => {
            if (obj.isMesh || obj.isSprite) {
                if (!this.bloomLayer.test(obj.layers)) {
                    this._materialsCache.set(obj, obj.material);
                    obj.material = this._darkMaterial;
                }
            }
        });
    }

    /**
     * Restore original materials after bloom pass.
     */
    _restoreMaterials() {
        this._materialsCache.forEach((material, obj) => {
            obj.material = material;
        });
        this._materialsCache.clear();
    }

    /**
     * Dispose of all resources.
     */
    dispose() {
        this.bloomComposer.dispose();
        this.finalComposer.dispose();
        this._darkMaterial.dispose();
    }
}
