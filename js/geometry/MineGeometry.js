// js/geometry/MineGeometry.js
import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Factory for creating mine-specific geometry with enhanced visual details.
 * Provides beveled level geometry, support pillars, and tunnel entrances.
 */
export class MineGeometry {
    /**
     * Create a beveled level geometry using ExtrudeGeometry.
     * @param {number} width - Level width
     * @param {number} height - Level height (extrusion depth)
     * @param {number} depth - Level depth
     * @param {number} bevelSize - Size of the bevel
     * @returns {THREE.BufferGeometry}
     */
    static createLevel(width = CONFIG.LEVEL_WIDTH, height = CONFIG.LEVEL_HEIGHT, depth = CONFIG.LEVEL_DEPTH, bevelSize = 3) {
        // Create rounded rectangle shape
        const shape = this.createRoundedRectShape(width, depth, bevelSize * 2);
        
        const extrudeSettings = {
            depth: height,
            bevelEnabled: true,
            bevelThickness: bevelSize,
            bevelSize: bevelSize,
            bevelOffset: 0,
            bevelSegments: 2
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        
        // Rotate to lay flat (shape was in XY plane, extrusion along Z)
        // After rotation: X centered, Y = [0, height], Z centered
        geometry.rotateX(-Math.PI / 2);
        
        geometry.computeVertexNormals();
        return geometry;
    }

    /**
     * Create a rounded rectangle shape for extrusion.
     * @param {number} width - Shape width
     * @param {number} height - Shape height
     * @param {number} radius - Corner radius
     * @returns {THREE.Shape}
     */
    static createRoundedRectShape(width, height, radius) {
        const shape = new THREE.Shape();
        const x = -width / 2;
        const y = -height / 2;
        
        shape.moveTo(x + radius, y);
        shape.lineTo(x + width - radius, y);
        shape.quadraticCurveTo(x + width, y, x + width, y + radius);
        shape.lineTo(x + width, y + height - radius);
        shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        shape.lineTo(x + radius, y + height);
        shape.quadraticCurveTo(x, y + height, x, y + height - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
        
        return shape;
    }

    /**
     * Create support pillars between levels.
     * @param {number} levelWidth - Width of the level
     * @param {number} levelDepth - Depth of the level
     * @param {number} pillarCount - Number of pillars per side
     * @param {number} pillarHeight - Height of pillars
     * @returns {THREE.Group}
     */
    static createPillars(levelWidth = CONFIG.LEVEL_WIDTH, levelDepth = CONFIG.LEVEL_DEPTH, pillarCount = 4, pillarHeight = CONFIG.LEVEL_SPACING - CONFIG.LEVEL_HEIGHT) {
        const group = new THREE.Group();

        const pillarRadius = 8;
        const pillarGeometry = new THREE.CylinderGeometry(
            pillarRadius,       // top radius
            pillarRadius * 1.2, // bottom radius (slightly wider base)
            pillarHeight,
            8                   // radial segments
        );

        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.85,
            metalness: 0.15
        });

        // Collect all pillar positions
        const positions = [];
        const marginX = levelWidth * 0.15;
        const marginZ = levelDepth * 0.15;
        const spacingX = (levelWidth - 2 * marginX) / (pillarCount - 1);

        for (let i = 0; i < pillarCount; i++) {
            const x = -levelWidth / 2 + marginX + i * spacingX;
            // Front edge
            positions.push(new THREE.Vector3(x, pillarHeight / 2, levelDepth / 2 - marginZ / 2));
            // Back edge
            positions.push(new THREE.Vector3(x, pillarHeight / 2, -levelDepth / 2 + marginZ / 2));
        }

        // Single InstancedMesh for all pillars
        const instancedMesh = new THREE.InstancedMesh(pillarGeometry, pillarMaterial, positions.length);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        const matrix = new THREE.Matrix4();
        positions.forEach((pos, i) => {
            matrix.makeTranslation(pos.x, pos.y, pos.z);
            instancedMesh.setMatrixAt(i, matrix);
        });
        instancedMesh.instanceMatrix.needsUpdate = true;

        group.add(instancedMesh);
        return group;
    }

    /**
     * Create an arched tunnel entrance on a level.
     * @param {number} width - Tunnel width
     * @param {number} height - Tunnel height
     * @param {number} depth - Tunnel depth (into the level)
     * @returns {THREE.Group}
     */
    static createTunnelEntrance(width = 40, height = 30, depth = 20) {
        const group = new THREE.Group();
        
        // Arch shape
        const archShape = new THREE.Shape();
        const halfWidth = width / 2;
        
        archShape.moveTo(-halfWidth, 0);
        archShape.lineTo(-halfWidth, height * 0.6);
        archShape.quadraticCurveTo(-halfWidth, height, 0, height);
        archShape.quadraticCurveTo(halfWidth, height, halfWidth, height * 0.6);
        archShape.lineTo(halfWidth, 0);
        archShape.lineTo(-halfWidth, 0);
        
        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 2,
            bevelSize: 2,
            bevelSegments: 1
        };
        
        const archGeometry = new THREE.ExtrudeGeometry(archShape, extrudeSettings);
        archGeometry.rotateY(Math.PI / 2);
        
        const archMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const archMesh = new THREE.Mesh(archGeometry, archMaterial);
        archMesh.castShadow = true;
        archMesh.receiveShadow = true;
        group.add(archMesh);
        
        // Dark interior (visual depth)
        const interiorGeometry = new THREE.BoxGeometry(depth * 0.8, height * 0.9, width * 0.9);
        const interiorMaterial = new THREE.MeshBasicMaterial({
            color: 0x0a0a0a
        });
        const interior = new THREE.Mesh(interiorGeometry, interiorMaterial);
        interior.position.set(depth / 2, height / 2, 0);
        group.add(interior);
        
        return group;
    }

    /**
     * Create a surface building/plant geometry (for processing facilities).
     * Wider, shorter levels that look like industrial buildings.
     * @param {number} width - Building width
     * @param {number} height - Building height
     * @param {number} depth - Building depth
     * @returns {THREE.BufferGeometry}
     */
    static createSurfaceLevel(width = CONFIG.LEVEL_WIDTH * 1.3, height = CONFIG.LEVEL_HEIGHT * 1.5, depth = CONFIG.LEVEL_DEPTH * 0.7) {
        // Create a more industrial shape - wider and flatter
        const shape = this.createRoundedRectShape(width, depth, 5);

        const extrudeSettings = {
            depth: height,
            bevelEnabled: true,
            bevelThickness: 2,
            bevelSize: 2,
            bevelOffset: 0,
            bevelSegments: 1
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);
        geometry.computeVertexNormals();
        return geometry;
    }

    /**
     * Create ore deposit visual markers.
     * @param {number} count - Number of ore deposits
     * @param {number} levelWidth - Width area to distribute in
     * @param {number} levelDepth - Depth area to distribute in
     * @returns {THREE.Group}
     */
    static createOreDeposits(count = 5, levelWidth = CONFIG.LEVEL_WIDTH, levelDepth = CONFIG.LEVEL_DEPTH) {
        const group = new THREE.Group();
        
        const oreGeometry = new THREE.IcosahedronGeometry(6, 0);
        const oreMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0x332200,
            emissiveIntensity: 0.2
        });
        
        for (let i = 0; i < count; i++) {
            const ore = new THREE.Mesh(oreGeometry, oreMaterial.clone());
            
            // Random position on level surface
            ore.position.set(
                (Math.random() - 0.5) * levelWidth * 0.8,
                CONFIG.LEVEL_HEIGHT / 2 + 3,
                (Math.random() - 0.5) * levelDepth * 0.6
            );
            
            ore.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            const scale = 0.5 + Math.random() * 0.5;
            ore.scale.setScalar(scale);
            
            ore.castShadow = true;
            group.add(ore);
        }
        
        return group;
    }
}
