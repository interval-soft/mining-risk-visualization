// babylon/core/PostProcessing.js
import * as BABYLON from '@babylonjs/core';

/**
 * Post-processing pipeline for Babylon.js using DefaultRenderingPipeline.
 * Provides bloom, anti-aliasing, and other effects.
 *
 * Babylon.js simplifies selective bloom through rendering groups,
 * unlike Three.js which requires manual material swapping.
 */
export const BLOOM_RENDERING_GROUP = 1;

export class PostProcessing {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.setupPipeline();
    }

    /**
     * Setup the DefaultRenderingPipeline.
     */
    setupPipeline() {
        // DefaultRenderingPipeline combines bloom, AA, tone mapping, etc.
        this.pipeline = new BABYLON.DefaultRenderingPipeline(
            'defaultPipeline',
            true, // HDR
            this.scene,
            [this.camera]
        );

        // Enable bloom
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomThreshold = 0.4;
        this.pipeline.bloomWeight = 0.6;
        this.pipeline.bloomKernel = 64;
        this.pipeline.bloomScale = 0.5;

        // Enable FXAA (fast anti-aliasing)
        this.pipeline.fxaaEnabled = true;

        // Image processing (tone mapping, exposure)
        this.pipeline.imageProcessingEnabled = true;
        this.pipeline.imageProcessing.toneMappingEnabled = true;
        this.pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        this.pipeline.imageProcessing.exposure = 1.0;
        this.pipeline.imageProcessing.contrast = 1.1;

        // Note: Babylon.js handles selective bloom differently than Three.js.
        // Objects with emissive materials on certain rendering groups can be
        // targeted. For now, we use uniform bloom on emissive materials.
    }

    /**
     * Set bloom intensity.
     */
    setBloomIntensity(intensity) {
        this.pipeline.bloomWeight = intensity;
    }

    /**
     * Update bloom settings for theme.
     */
    setTheme(isDark) {
        if (isDark) {
            this.pipeline.bloomWeight = 0.6;
            this.pipeline.bloomThreshold = 0.4;
            this.pipeline.imageProcessing.exposure = 1.0;
        } else {
            this.pipeline.bloomWeight = 0.3;
            this.pipeline.bloomThreshold = 0.6;
            this.pipeline.imageProcessing.exposure = 1.1;
        }
    }

    /**
     * Get current bloom settings.
     */
    getBloomSettings() {
        return {
            weight: this.pipeline.bloomWeight,
            threshold: this.pipeline.bloomThreshold,
            kernel: this.pipeline.bloomKernel,
            scale: this.pipeline.bloomScale
        };
    }

    /**
     * Enable or disable the pipeline.
     */
    setEnabled(enabled) {
        this.pipeline.bloomEnabled = enabled;
        this.pipeline.fxaaEnabled = enabled;
    }

    /**
     * Dispose resources.
     */
    dispose() {
        if (this.pipeline) {
            this.pipeline.dispose();
        }
    }
}
