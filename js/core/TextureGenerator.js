// js/core/TextureGenerator.js
import * as THREE from 'three';

/**
 * Procedural texture generator for mine materials.
 * Creates rock textures and normal maps using canvas rendering.
 */
export class TextureGenerator {
    /**
     * Create a procedural rock/stone texture.
     * @param {number} size - Texture size (power of 2, e.g., 512)
     * @param {number} baseColor - Base color as hex (e.g., 0x666666)
     * @param {number} variation - Color variation amount (0-1)
     * @returns {THREE.CanvasTexture}
     */
    static createRockTexture(size = 512, baseColor = 0x666666, variation = 0.15) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Convert hex to RGB
        const r = (baseColor >> 16) & 255;
        const g = (baseColor >> 8) & 255;
        const b = baseColor & 255;
        
        // Fill with base color
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, size, size);
        
        // Add noise layers for rock texture
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Multiple noise passes for layered detail
        this.addNoise(data, size, variation * 0.6, 4);   // Large scale variation
        this.addNoise(data, size, variation * 0.3, 8);   // Medium detail
        this.addNoise(data, size, variation * 0.2, 16);  // Fine grain
        
        // Add subtle crack lines
        this.addCracks(ctx, size, 8, baseColor);
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }

    /**
     * Add noise to image data.
     * @param {Uint8ClampedArray} data - Image data array
     * @param {number} size - Image size
     * @param {number} intensity - Noise intensity (0-1)
     * @param {number} scale - Noise scale (larger = smoother)
     */
    static addNoise(data, size, intensity, scale) {
        const amount = intensity * 255;
        
        for (let y = 0; y < size; y += scale) {
            for (let x = 0; x < size; x += scale) {
                const noise = (Math.random() - 0.5) * amount;
                
                // Apply to block of pixels
                for (let dy = 0; dy < scale && y + dy < size; dy++) {
                    for (let dx = 0; dx < scale && x + dx < size; dx++) {
                        const i = ((y + dy) * size + (x + dx)) * 4;
                        data[i] = Math.max(0, Math.min(255, data[i] + noise));
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
                    }
                }
            }
        }
    }

    /**
     * Add crack lines to texture.
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} size - Canvas size
     * @param {number} count - Number of cracks
     * @param {number} baseColor - Base color for crack darkness
     */
    static addCracks(ctx, size, count, baseColor) {
        const r = ((baseColor >> 16) & 255) * 0.7;
        const g = ((baseColor >> 8) & 255) * 0.7;
        const b = (baseColor & 255) * 0.7;
        
        ctx.strokeStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, 0.3)`;
        ctx.lineWidth = 1;
        
        for (let i = 0; i < count; i++) {
            ctx.beginPath();
            let x = Math.random() * size;
            let y = Math.random() * size;
            ctx.moveTo(x, y);
            
            // Random walk for crack path
            const segments = 3 + Math.floor(Math.random() * 5);
            for (let j = 0; j < segments; j++) {
                x += (Math.random() - 0.5) * size * 0.2;
                y += (Math.random() - 0.5) * size * 0.2;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    /**
     * Create a normal map from a height map texture.
     * @param {number} size - Texture size
     * @param {number} bumpScale - Normal map intensity
     * @returns {THREE.CanvasTexture}
     */
    static createNormalMap(size = 512, bumpScale = 0.5) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Generate height map first
        const heightData = this.generateHeightMap(size);
        
        // Convert height map to normal map
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Sample neighboring heights
                const left = heightData[y * size + ((x - 1 + size) % size)];
                const right = heightData[y * size + ((x + 1) % size)];
                const up = heightData[((y - 1 + size) % size) * size + x];
                const down = heightData[((y + 1) % size) * size + x];
                
                // Calculate normal from height differences
                const dx = (left - right) * bumpScale;
                const dy = (up - down) * bumpScale;
                
                // Normalize and convert to RGB
                const length = Math.sqrt(dx * dx + dy * dy + 1);
                const nx = (dx / length + 1) * 0.5;
                const ny = (dy / length + 1) * 0.5;
                const nz = (1 / length + 1) * 0.5;
                
                const i = (y * size + x) * 4;
                data[i] = Math.floor(nx * 255);
                data[i + 1] = Math.floor(ny * 255);
                data[i + 2] = Math.floor(nz * 255);
                data[i + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }

    /**
     * Generate a height map array.
     * @param {number} size - Map size
     * @returns {Float32Array}
     */
    static generateHeightMap(size) {
        const data = new Float32Array(size * size);
        
        // Multiple octaves of noise for natural look
        for (let octave = 0; octave < 4; octave++) {
            const scale = Math.pow(2, octave + 2);
            const amplitude = 1 / Math.pow(2, octave);
            
            for (let y = 0; y < size; y += scale) {
                for (let x = 0; x < size; x += scale) {
                    const value = Math.random() * amplitude;
                    
                    // Apply to block
                    for (let dy = 0; dy < scale && y + dy < size; dy++) {
                        for (let dx = 0; dx < scale && x + dx < size; dx++) {
                            data[(y + dy) * size + (x + dx)] += value;
                        }
                    }
                }
            }
        }
        
        return data;
    }

    /**
     * Create a roughness map with variation.
     * @param {number} size - Texture size
     * @param {number} baseRoughness - Base roughness value (0-1)
     * @param {number} variation - Roughness variation (0-1)
     * @returns {THREE.CanvasTexture}
     */
    static createRoughnessMap(size = 256, baseRoughness = 0.7, variation = 0.2) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Roughness is grayscale (white = rough, black = smooth)
        const baseValue = Math.floor(baseRoughness * 255);
        ctx.fillStyle = `rgb(${baseValue}, ${baseValue}, ${baseValue})`;
        ctx.fillRect(0, 0, size, size);
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Add variation
        this.addNoise(data, size, variation, 8);
        
        ctx.putImageData(imageData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }

    /**
     * Create a complete rock material texture set.
     * @param {number} baseColor - Base rock color
     * @returns {Object} Object with map, normalMap, roughnessMap
     */
    static createRockTextureSet(baseColor = 0x666666) {
        return {
            map: this.createRockTexture(512, baseColor, 0.15),
            normalMap: this.createNormalMap(512, 0.5),
            roughnessMap: this.createRoughnessMap(256, 0.75, 0.15)
        };
    }
}
