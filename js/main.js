// js/main.js
import { SceneManager } from './core/SceneManager.js';
import { CameraController } from './core/CameraController.js';
import { AnimationLoop } from './core/AnimationLoop.js';
import { DataLoader } from './data/DataLoader.js';
import { MaterialSystem } from './geometry/MaterialSystem.js';
import { LevelFactory } from './geometry/LevelFactory.js';
import { ActivityIconManager } from './objects/ActivityIconManager.js';
import { LabelRenderer } from './objects/LabelRenderer.js';
import { RaycasterManager } from './interaction/RaycasterManager.js';
import { TooltipManager } from './interaction/TooltipManager.js';
import { HoverHandler } from './interaction/HoverHandler.js';
import { ClickHandler } from './interaction/ClickHandler.js';
import { FilterPanel } from './ui/FilterPanel.js';

class MineVisualizationApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.init();
    }

    async init() {
        try {
            // Core setup
            this.sceneManager = new SceneManager(this.container);
            this.cameraController = new CameraController(
                this.sceneManager.camera,
                this.sceneManager.renderer.domElement
            );
            this.materialSystem = new MaterialSystem();
            this.labelRenderer = new LabelRenderer(this.container);

            // Load data
            const dataLoader = new DataLoader();
            const mineData = await dataLoader.load();

            // Create geometry
            this.levelFactory = new LevelFactory(
                this.sceneManager.scene,
                this.materialSystem
            );
            this.levelFactory.createLevels(mineData.levels);

            // Create icons
            this.iconManager = new ActivityIconManager(this.sceneManager.scene);
            await this.iconManager.loadTextures();
            mineData.levels.forEach(levelData => {
                const mesh = this.levelFactory.getLevelMesh(levelData.level);
                this.iconManager.createActivityIcons(levelData, mesh);
            });

            // Create labels
            mineData.levels.forEach(levelData => {
                const mesh = this.levelFactory.getLevelMesh(levelData.level);
                this.labelRenderer.createLevelLabel(levelData, mesh);
            });

            // Setup interactions
            this.setupInteractions();

            // Setup UI
            this.filterPanel = new FilterPanel(
                this.levelFactory,
                this.materialSystem,
                this.iconManager
            );

            // Reset camera button
            document.getElementById('reset-camera').addEventListener('click', () => {
                this.cameraController.reset();
            });

            // Start render loop
            this.animationLoop = new AnimationLoop(
                this.sceneManager,
                this.cameraController
            );
            this.animationLoop.addCallback(() => {
                this.labelRenderer.render(
                    this.sceneManager.scene,
                    this.sceneManager.camera
                );
            });
            this.animationLoop.start();

            // Handle resize
            window.addEventListener('resize', () => this.onResize());

            console.log('Mine Visualization initialized successfully');

        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError(error.message);
        }
    }

    setupInteractions() {
        const canvas = this.sceneManager.renderer.domElement;

        this.raycasterManager = new RaycasterManager(this.sceneManager.camera);
        this.raycasterManager.setInteractables([
            ...this.levelFactory.getAllLevels(),
            ...this.iconManager.getAllSprites()
        ]);

        this.tooltipManager = new TooltipManager();

        this.hoverHandler = new HoverHandler(
            this.raycasterManager,
            this.materialSystem,
            this.tooltipManager
        );

        this.clickHandler = new ClickHandler(
            this.raycasterManager,
            this.levelFactory,
            this.materialSystem,
            this.iconManager,
            this.cameraController,
            this.labelRenderer
        );

        canvas.addEventListener('mousemove', (e) => {
            this.hoverHandler.onMouseMove(e, canvas);
        });

        canvas.addEventListener('click', (e) => {
            this.clickHandler.onClick(e, canvas);
        });
    }

    onResize() {
        this.sceneManager.handleResize();
        this.labelRenderer.resize(window.innerWidth, window.innerHeight);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #ff4444; color: white; padding: 20px; border-radius: 8px;
            font-family: system-ui; z-index: 9999;
        `;
        errorDiv.textContent = `Error: ${message}`;
        document.body.appendChild(errorDiv);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MineVisualizationApp();
});
