// js/main.js
import { SceneManager } from './core/SceneManager.js';
import { CameraController } from './core/CameraController.js';
import { AnimationLoop } from './core/AnimationLoop.js';
import { StateManager } from './core/StateManager.js';
import { DataLoader } from './data/DataLoader.js';
import { ApiClient } from './data/ApiClient.js';
import { MaterialSystem } from './geometry/MaterialSystem.js';
import { LevelFactory } from './geometry/LevelFactory.js';
import { StructuralElements } from './geometry/StructuralElements.js';
import { RiskEffects } from './effects/RiskEffects.js';
import { ActivityIconManager } from './objects/ActivityIconManager.js';
import { LabelRenderer } from './objects/LabelRenderer.js';
import { RaycasterManager } from './interaction/RaycasterManager.js';
import { TooltipManager } from './interaction/TooltipManager.js';
import { HoverHandler } from './interaction/HoverHandler.js';
import { ClickHandler } from './interaction/ClickHandler.js';
import { FilterPanel } from './ui/FilterPanel.js';
import { TimelinePanel } from './ui/TimelinePanel.js';
import { AlertsPanel } from './ui/AlertsPanel.js';
import { DetailPanel } from './ui/DetailPanel.js';

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

            // Initialize API client and data loader
            this.apiClient = new ApiClient();
            this.dataLoader = new DataLoader(this.apiClient);

            // Initialize state manager
            this.stateManager = new StateManager(this.dataLoader);

            // Load initial data
            const mineData = await this.stateManager.initialize();

            // Create geometry
            this.levelFactory = new LevelFactory(
                this.sceneManager.scene,
                this.materialSystem
            );
            this.levelFactory.createLevels(mineData.levels);

            // Create structural elements (shafts, ramps)
            this.structuralElements = new StructuralElements(this.sceneManager.scene);
            this.structuralElements.createStructure(this.levelFactory.getAllLevels());

            // Initialize risk effects
            this.riskEffects = new RiskEffects(
                this.sceneManager.scene,
                this.levelFactory
            );

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

            // Setup timeline panel (if container exists)
            const timelineContainer = document.getElementById('timeline-container');
            if (timelineContainer) {
                this.timelinePanel = new TimelinePanel(
                    timelineContainer,
                    this.stateManager,
                    this.apiClient
                );
            }

            // Setup alerts panel (if container exists)
            const alertsContainer = document.getElementById('alerts-container');
            if (alertsContainer) {
                this.alertsPanel = new AlertsPanel(
                    alertsContainer,
                    this.apiClient,
                    this.stateManager
                );

                // Handle alert clicks to highlight level in 3D view
                this.alertsPanel.setAlertClickHandler((alert) => {
                    this.highlightLevel(alert.levelNumber);
                });
            }

            // Setup detail panel (if container exists)
            const detailContainer = document.getElementById('detail-container');
            if (detailContainer) {
                this.detailPanel = new DetailPanel(
                    detailContainer,
                    this.apiClient,
                    this.stateManager
                );
            }

            // Listen to state changes
            this.stateManager.addEventListener('stateChanged', (e) => {
                this.onStateChanged(e.detail);
            });

            this.stateManager.addEventListener('modeChanged', (e) => {
                this.onModeChanged(e.detail);
            });

            // Reset camera button
            document.getElementById('reset-camera').addEventListener('click', () => {
                this.cameraController.reset();
            });

            // Start render loop
            this.animationLoop = new AnimationLoop(
                this.sceneManager,
                this.cameraController
            );
            this.animationLoop.addCallback((deltaTime) => {
                this.labelRenderer.render(
                    this.sceneManager.scene,
                    this.sceneManager.camera
                );
                // Update risk visual effects
                this.riskEffects.update(deltaTime || 0.016);
            });
            this.animationLoop.start();

            // Handle resize
            window.addEventListener('resize', () => this.onResize());

            // Update mode indicator
            this.updateModeIndicator(true);

            console.log('Mine Visualization initialized successfully');
            console.log(`Data source: ${this.dataLoader.isUsingApi() ? 'API' : 'Static JSON'}`);

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

        // Wire up level selection to detail panel
        this.clickHandler.setLevelSelectHandler((levelNumber) => {
            this.showLevelDetail(levelNumber);
        });

        canvas.addEventListener('mousemove', (e) => {
            this.hoverHandler.onMouseMove(e, canvas);
        });

        canvas.addEventListener('click', (e) => {
            this.clickHandler.onClick(e, canvas);
        });
    }

    /**
     * Handle state changes from the StateManager.
     * Updates the 3D visualization to reflect the new state.
     */
    onStateChanged(detail) {
        const { state } = detail;
        if (!state || !state.levels) return;

        // Update each level's visual representation
        state.levels.forEach(levelData => {
            const mesh = this.levelFactory.getLevelMesh(levelData.level);
            if (!mesh) return;

            // Update material color based on risk band
            const riskBand = levelData.riskBand || this.computeRiskBand(levelData);
            this.levelFactory.updateLevelRisk(levelData.level, riskBand);

            // Update label with risk score if available
            this.labelRenderer.updateLevelLabel(levelData);
        });

        // Update icons if activities changed
        state.levels.forEach(levelData => {
            const mesh = this.levelFactory.getLevelMesh(levelData.level);
            if (mesh) {
                this.iconManager.updateActivityIcons(levelData, mesh);
            }
        });

        // Update risk visual effects (pulsing, glow, etc.)
        this.riskEffects.updateEffects(state.levels);
    }

    /**
     * Handle mode changes (live vs historical).
     */
    onModeChanged(detail) {
        this.updateModeIndicator(detail.isLive);
    }

    /**
     * Update the UI to show current mode (live/historical).
     */
    updateModeIndicator(isLive) {
        const indicator = document.getElementById('mode-indicator');
        if (indicator) {
            indicator.textContent = isLive ? 'LIVE' : 'HISTORICAL';
            indicator.className = `mode-indicator ${isLive ? 'live' : 'historical'}`;
        }
    }

    /**
     * Compute risk band from level data (fallback for legacy data).
     */
    computeRiskBand(levelData) {
        if (levelData.riskBand) return levelData.riskBand;
        if (levelData.riskScore !== undefined) {
            if (levelData.riskScore <= 30) return 'low';
            if (levelData.riskScore <= 70) return 'medium';
            return 'high';
        }
        // Legacy: compute from activities
        const activities = levelData.activities || [];
        const priority = { low: 1, medium: 2, high: 3 };
        let maxRisk = 'low';
        for (const activity of activities) {
            const risk = activity.risk || 'low';
            if (priority[risk] > priority[maxRisk]) {
                maxRisk = risk;
            }
        }
        return maxRisk;
    }

    onResize() {
        this.sceneManager.handleResize();
        this.labelRenderer.resize(window.innerWidth, window.innerHeight);
    }

    /**
     * Highlight a specific level in the 3D view.
     * Called when clicking on an alert.
     */
    highlightLevel(levelNumber) {
        const mesh = this.levelFactory.getLevelMesh(levelNumber);
        if (mesh) {
            // Focus camera on the level
            this.cameraController.focusOn(mesh.position.clone());

            // Briefly highlight the level (flash effect)
            const originalEmissive = mesh.material.emissive.getHex();
            mesh.material.emissive.setHex(0x444444);

            setTimeout(() => {
                mesh.material.emissive.setHex(originalEmissive);
            }, 500);

            // Show detail panel for this level
            this.showLevelDetail(levelNumber);
        }
    }

    /**
     * Show the detail panel for a specific level.
     */
    showLevelDetail(levelNumber) {
        if (!this.detailPanel) return;

        const state = this.stateManager.currentState;
        const levelData = state?.levels?.find(l => l.level === levelNumber);

        if (levelData) {
            this.detailPanel.showLevel(levelData);
        }
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
