// babylon/geometry/MineGeometry.js
import * as BABYLON from '@babylonjs/core';
import { CONFIG } from '../../js/config.js';

// Babylon.js ES6 modules require earcut for polygon triangulation
// Import it statically and set on window before any polygon meshes are created
import earcut from 'earcut';
if (typeof window !== 'undefined') {
    window.earcut = earcut;
}

/**
 * Factory for creating mine-specific geometry with enhanced visual details.
 * Babylon.js version using MeshBuilder and ExtrudePolygon.
 */
export class MineGeometry {
    /**
     * Create a beveled level mesh using ExtrudePolygon.
     * @param {BABYLON.Scene} scene - Babylon.js scene
     * @param {string} name - Mesh name
     * @param {number} width - Level width
     * @param {number} height - Level height (extrusion depth)
     * @param {number} depth - Level depth
     * @param {number} bevelSize - Size of the bevel (corner radius)
     * @returns {BABYLON.Mesh}
     */
    static createLevel(scene, name, width = CONFIG.LEVEL_WIDTH, height = CONFIG.LEVEL_HEIGHT, depth = CONFIG.LEVEL_DEPTH, bevelSize = 3) {
        // Create rounded rectangle shape as Vector3 array (XZ plane)
        const shape = this.createRoundedRectShape(width, depth, bevelSize * 2);

        // ExtrudePolygon creates geometry extruded along Y axis
        const mesh = BABYLON.MeshBuilder.ExtrudePolygon(name, {
            shape: shape,
            depth: height,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            wrap: true
        }, scene);

        // ExtrudePolygon extrudes downward by default (-Y direction)
        // Move it so bottom is at y=0 and top at y=height
        mesh.position.y = height;

        // Compute normals for proper lighting
        mesh.convertToFlatShadedMesh();

        return mesh;
    }

    /**
     * Create a rounded rectangle shape for extrusion.
     * Returns array of Vector3 points in XZ plane.
     * @param {number} width - Shape width (X axis)
     * @param {number} depth - Shape depth (Z axis)
     * @param {number} radius - Corner radius
     * @returns {BABYLON.Vector3[]}
     */
    static createRoundedRectShape(width, depth, radius) {
        const points = [];
        const segments = 4; // Segments per corner

        const hw = width / 2;
        const hd = depth / 2;
        const r = Math.min(radius, hw, hd);

        // Start at bottom-left, after corner
        // Bottom edge (left to right)
        points.push(new BABYLON.Vector3(-hw + r, 0, -hd));
        points.push(new BABYLON.Vector3(hw - r, 0, -hd));

        // Bottom-right corner
        for (let i = 0; i <= segments; i++) {
            const angle = -Math.PI / 2 + (Math.PI / 2) * (i / segments);
            points.push(new BABYLON.Vector3(
                hw - r + r * Math.cos(angle),
                0,
                -hd + r + r * Math.sin(angle)
            ));
        }

        // Right edge (bottom to top)
        points.push(new BABYLON.Vector3(hw, 0, hd - r));

        // Top-right corner
        for (let i = 0; i <= segments; i++) {
            const angle = 0 + (Math.PI / 2) * (i / segments);
            points.push(new BABYLON.Vector3(
                hw - r + r * Math.cos(angle),
                0,
                hd - r + r * Math.sin(angle)
            ));
        }

        // Top edge (right to left)
        points.push(new BABYLON.Vector3(-hw + r, 0, hd));

        // Top-left corner
        for (let i = 0; i <= segments; i++) {
            const angle = Math.PI / 2 + (Math.PI / 2) * (i / segments);
            points.push(new BABYLON.Vector3(
                -hw + r + r * Math.cos(angle),
                0,
                hd - r + r * Math.sin(angle)
            ));
        }

        // Left edge (top to bottom)
        points.push(new BABYLON.Vector3(-hw, 0, -hd + r));

        // Bottom-left corner
        for (let i = 0; i <= segments; i++) {
            const angle = Math.PI + (Math.PI / 2) * (i / segments);
            points.push(new BABYLON.Vector3(
                -hw + r + r * Math.cos(angle),
                0,
                -hd + r + r * Math.sin(angle)
            ));
        }

        return points;
    }

    /**
     * Create support pillars between levels using thin instances for performance.
     * @param {BABYLON.Scene} scene - Babylon.js scene
     * @param {number} levelWidth - Width of the level
     * @param {number} levelDepth - Depth of the level
     * @param {number} pillarCount - Number of pillars per side
     * @param {number} pillarHeight - Height of pillars
     * @returns {BABYLON.TransformNode} Group containing pillar mesh
     */
    static createPillars(scene, levelWidth = CONFIG.LEVEL_WIDTH, levelDepth = CONFIG.LEVEL_DEPTH, pillarCount = 4, pillarHeight = CONFIG.LEVEL_SPACING - CONFIG.LEVEL_HEIGHT) {
        const group = new BABYLON.TransformNode('pillars', scene);

        const pillarRadius = 8;

        // Create base cylinder mesh
        const pillarMesh = BABYLON.MeshBuilder.CreateCylinder('pillar', {
            diameterTop: pillarRadius * 2,
            diameterBottom: pillarRadius * 2.4, // Slightly wider base
            height: pillarHeight,
            tessellation: 8
        }, scene);

        // Create material
        const pillarMaterial = new BABYLON.PBRMaterial('pillarMat', scene);
        pillarMaterial.albedoColor = new BABYLON.Color3(0.23, 0.23, 0.23);
        pillarMaterial.roughness = 0.85;
        pillarMaterial.metallic = 0.15;
        pillarMesh.material = pillarMaterial;

        // Calculate positions
        const positions = [];
        const marginX = levelWidth * 0.15;
        const marginZ = levelDepth * 0.15;
        const spacingX = (levelWidth - 2 * marginX) / (pillarCount - 1);

        for (let i = 0; i < pillarCount; i++) {
            const x = -levelWidth / 2 + marginX + i * spacingX;
            // Front edge
            positions.push(new BABYLON.Vector3(x, pillarHeight / 2, levelDepth / 2 - marginZ / 2));
            // Back edge
            positions.push(new BABYLON.Vector3(x, pillarHeight / 2, -levelDepth / 2 + marginZ / 2));
        }

        // Use thin instances for performance
        const matrices = [];
        positions.forEach(pos => {
            const matrix = BABYLON.Matrix.Translation(pos.x, pos.y, pos.z);
            matrices.push(matrix);
        });

        // Set up thin instances
        pillarMesh.thinInstanceAdd(matrices);

        // Enable shadows
        pillarMesh.receiveShadows = true;

        pillarMesh.parent = group;

        return group;
    }

    /**
     * Create an arched tunnel entrance on a level.
     * @param {BABYLON.Scene} scene - Babylon.js scene
     * @param {number} width - Tunnel width
     * @param {number} height - Tunnel height
     * @param {number} tunnelDepth - Tunnel depth (into the level)
     * @returns {BABYLON.TransformNode}
     */
    static createTunnelEntrance(scene, width = 40, height = 30, tunnelDepth = 20) {
        const group = new BABYLON.TransformNode('tunnel', scene);

        // Create arch shape
        const archShape = this.createArchShape(width, height);

        // Extrude the arch
        const archMesh = BABYLON.MeshBuilder.ExtrudePolygon('arch', {
            shape: archShape,
            depth: tunnelDepth,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);

        // Rotate to face outward
        archMesh.rotation.y = Math.PI / 2;

        const archMaterial = new BABYLON.PBRMaterial('archMat', scene);
        archMaterial.albedoColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        archMaterial.roughness = 0.9;
        archMaterial.metallic = 0.1;
        archMesh.material = archMaterial;

        archMesh.receiveShadows = true;
        archMesh.parent = group;

        // Dark interior (visual depth)
        const interior = BABYLON.MeshBuilder.CreateBox('interior', {
            width: tunnelDepth * 0.8,
            height: height * 0.9,
            depth: width * 0.9
        }, scene);
        interior.position.set(tunnelDepth / 2, height / 2, 0);

        const interiorMaterial = new BABYLON.StandardMaterial('interiorMat', scene);
        interiorMaterial.diffuseColor = new BABYLON.Color3(0.04, 0.04, 0.04);
        interiorMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        interior.material = interiorMaterial;

        interior.parent = group;

        return group;
    }

    /**
     * Create arch shape points for tunnel entrance.
     */
    static createArchShape(width, height) {
        const points = [];
        const halfWidth = width / 2;
        const segments = 8;

        // Start at bottom-left
        points.push(new BABYLON.Vector3(-halfWidth, 0, 0));
        points.push(new BABYLON.Vector3(-halfWidth, 0, height * 0.6));

        // Left side of arch
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = Math.PI * (1 - t);
            const x = halfWidth * Math.cos(angle);
            const y = height * 0.6 + (height * 0.4) * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, 0, y));
        }

        // Right side
        points.push(new BABYLON.Vector3(halfWidth, 0, height * 0.6));
        points.push(new BABYLON.Vector3(halfWidth, 0, 0));

        return points;
    }

    /**
     * Create ore deposit visual markers.
     * @param {BABYLON.Scene} scene - Babylon.js scene
     * @param {number} count - Number of ore deposits
     * @param {number} levelWidth - Width area to distribute in
     * @param {number} levelDepth - Depth area to distribute in
     * @returns {BABYLON.TransformNode}
     */
    static createOreDeposits(scene, count = 5, levelWidth = CONFIG.LEVEL_WIDTH, levelDepth = CONFIG.LEVEL_DEPTH) {
        const group = new BABYLON.TransformNode('oreDeposits', scene);

        const oreMaterial = new BABYLON.PBRMaterial('oreMat', scene);
        oreMaterial.albedoColor = new BABYLON.Color3(1, 0.8, 0);
        oreMaterial.roughness = 0.3;
        oreMaterial.metallic = 0.8;
        oreMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.13, 0);

        for (let i = 0; i < count; i++) {
            const ore = BABYLON.MeshBuilder.CreateIcoSphere(`ore${i}`, {
                radius: 6,
                subdivisions: 1
            }, scene);

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
            ore.scaling = new BABYLON.Vector3(scale, scale, scale);

            ore.material = oreMaterial.clone(`oreMat${i}`);
            ore.parent = group;
        }

        return group;
    }
}
