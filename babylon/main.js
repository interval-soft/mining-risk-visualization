// babylon/main.js
import * as BABYLON from '@babylonjs/core';
import { SceneManager } from './core/SceneManager.js';
import { CameraController } from './core/CameraController.js';
import { MaterialSystem } from './geometry/MaterialSystem.js';
import { LevelFactory } from './geometry/LevelFactory.js';
import { StructureManager } from './geometry/StructureManager.js';
import { StructuralElements } from './geometry/StructuralElements.js';
import { RiskEffects } from './effects/RiskEffects.js';
import { ActivityIconManager } from './objects/ActivityIconManager.js';
import { LabelRenderer } from './objects/LabelRenderer.js';
import { HoverHandler } from './interaction/HoverHandler.js';
import { ClickHandler } from './interaction/ClickHandler.js';

// Reuse shared modules from Three.js implementation
import { StateManager } from '../js/core/StateManager.js';
import { DataLoader } from '../js/data/DataLoader.js';
import { ApiClient } from '../js/data/ApiClient.js';
import { FilterPanel } from '../js/ui/FilterPanel.js';
import { TimelinePanel } from '../js/ui/TimelinePanel.js';
import { AlertsPanel } from '../js/ui/AlertsPanel.js';
import { DetailPanel } from '../js/ui/DetailPanel.js';
import { SiteOverviewPanel } from '../js/ui/SiteOverviewPanel.js';
import { AIInsightsPanel } from '../js/ui/AIInsightsPanel.js';
import { QueryInterface } from '../js/ui/QueryInterface.js';
import { CameraControlsPanel } from '../js/ui/CameraControlsPanel.js';
import { TooltipManager } from '../js/interaction/TooltipManager.js';
import { DemoMode } from '../js/demo/index.js';

/**
 * Main application class for the Babylon.js Digital Twin visualization.
 * Parallel implementation matching the Three.js version's features.
 */
class BabylonMineApp {
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
                this.sceneManager.getCanvas()
            );
            this.materialSystem = new MaterialSystem(this.sceneManager.getScene());
            this.labelRenderer = new LabelRenderer(
                this.sceneManager.getScene(),
                this.sceneManager.camera
            );

            // Initialize API client and data loader
            this.apiClient = new ApiClient();
            this.dataLoader = new DataLoader(this.apiClient);

            // Initialize state manager
            this.stateManager = new StateManager(this.dataLoader);

            // Load initial data
            const mineData = await this.stateManager.initialize();

            // Determine if we have multi-structure data
            const hasMultipleStructures = mineData.structures && mineData.structures.length > 1;

            // Create geometry
            if (hasMultipleStructures) {
                this.structureManager = new StructureManager(
                    this.sceneManager.getScene(),
                    this.materialSystem,
                    this.sceneManager
                );
                this.structureManager.createStructures(mineData.structures);
                this.levelSource = this.structureManager;
            } else {
                // Single structure - use LevelFactory directly
                this.levelFactory = new LevelFactory(
                    this.sceneManager.getScene(),
                    this.materialSystem,
                    this.sceneManager
                );
                this.levelFactory.createLevels(mineData.levels);
                this.levelSource = this.levelFactory;
            }

            // Create structural elements (shafts, ramps) - only for single structure
            if (!hasMultipleStructures) {
                this.structuralElements = new StructuralElements(this.sceneManager.getScene());
                this.structuralElements.createStructure(this.getAllLevelMeshes());
            }

            // Initialize risk effects
            this.riskEffects = new RiskEffects(
                this.sceneManager.getScene(),
                this.levelSource
            );

            // Create icons
            this.iconManager = new ActivityIconManager(this.sceneManager.getScene());
            await this.iconManager.initialize();
            this.createActivityIcons(mineData);

            // Create labels
            this.createLevelLabels(mineData);

            // Setup interactions
            this.setupInteractions();

            // Setup UI panels (reusing existing UI code)
            this.setupUI(mineData, hasMultipleStructures);

            // Listen to state changes
            this.stateManager.addEventListener('stateChanged', (e) => {
                this.onStateChanged(e.detail);
            });

            this.stateManager.addEventListener('modeChanged', (e) => {
                this.onModeChanged(e.detail);
            });

            this.stateManager.addEventListener('viewModeChanged', (e) => {
                this.onViewModeChanged(e.detail);
            });

            // Reset camera button
            const resetBtn = document.getElementById('reset-camera');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    if (this.stateManager.focusedStructure) {
                        this.showSiteOverview();
                    } else {
                        this.cameraController.reset();
                    }
                });
            }

            // Start render loop
            this.startRenderLoop();

            // Update mode indicator
            this.updateModeIndicator(true);

            // Check AI status
            this.checkAIStatus();

            // Initialize Demo Mode
            this.demoMode = new DemoMode(this.stateManager, this.apiClient);
            await this.demoMode.initialize();

            // Demo mode toggle button
            const demoToggleBtn = document.getElementById('demo-mode-toggle');
            if (demoToggleBtn) {
                demoToggleBtn.addEventListener('click', () => {
                    if (this.demoMode.isActive) {
                        this.demoMode.deactivate();
                        demoToggleBtn.classList.remove('active');
                    } else {
                        this.demoMode.activate();
                        demoToggleBtn.classList.add('active');
                    }
                });
                if (this.demoMode.isActive) {
                    demoToggleBtn.classList.add('active');
                }
            }

            console.log('Babylon.js Mine Visualization initialized successfully');
            console.log(`Data source: ${this.dataLoader.isUsingApi() ? 'API' : 'Static JSON'}`);
            console.log(`Mode: ${hasMultipleStructures ? 'Multi-Structure' : 'Single-Structure'}`);

        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError(error.message);
        }
    }

    /**
     * Start the Babylon.js render loop.
     */
    startRenderLoop() {
        const engine = this.sceneManager.engine;
        const scene = this.sceneManager.scene;

        let lastTime = performance.now();

        engine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Update camera controller
            this.cameraController.update();

            // Update label visibility (AdvancedDynamicTexture handles billboarding)
            this.labelRenderer.update();

            // Update risk visual effects
            this.riskEffects.update(deltaTime || 0.016);

            // Render scene
            scene.render();
        });
    }

    /**
     * Get all level meshes from the current level source.
     */
    getAllLevelMeshes() {
        if (this.structureManager) {
            return this.structureManager.getAllLevelMeshes();
        }
        if (this.levelFactory) {
            return this.levelFactory.getAllLevels();
        }
        return [];
    }

    /**
     * Create activity icons for all levels.
     */
    createActivityIcons(mineData) {
        if (mineData.structures && mineData.structures.length > 1) {
            // Multi-structure: iterate structures
            mineData.structures.forEach(structure => {
                structure.levels.forEach(levelData => {
                    const mesh = this.structureManager.getLevelMesh(structure.code, levelData.level);
                    if (mesh) {
                        this.iconManager.createActivityIcons(levelData, mesh);
                    }
                });
            });
        } else {
            // Single structure
            mineData.levels.forEach(levelData => {
                const mesh = this.levelFactory?.getLevelMesh(levelData.level);
                if (mesh) {
                    this.iconManager.createActivityIcons(levelData, mesh);
                }
            });
        }
    }

    /**
     * Create level labels for all levels.
     */
    createLevelLabels(mineData) {
        if (mineData.structures && mineData.structures.length > 1) {
            // Multi-structure
            mineData.structures.forEach(structure => {
                structure.levels.forEach(levelData => {
                    const mesh = this.structureManager.getLevelMesh(structure.code, levelData.level);
                    if (mesh) {
                        this.labelRenderer.createLevelLabel(levelData, mesh, structure.code);
                    }
                });
            });

            // Create structure labels
            this.createStructureLabels(mineData.structures);
        } else {
            // Single structure
            mineData.levels.forEach(levelData => {
                const mesh = this.levelFactory?.getLevelMesh(levelData.level);
                if (mesh) {
                    this.labelRenderer.createLevelLabel(levelData, mesh);
                }
            });
        }
    }

    /**
     * Create clickable structure labels above each structure.
     */
    createStructureLabels(structures) {
        // Set up click handler for structure labels
        this.labelRenderer.setStructureClickHandler((code, isFocused) => {
            if (isFocused) {
                this.showSiteOverview();
            } else {
                this.focusOnStructure(code);
            }
        });

        structures.forEach(structureData => {
            const structureInfo = this.structureManager.getStructure(structureData.code);
            if (!structureInfo) return;

            const { group, levelFactory } = structureInfo;
            const topLevel = levelFactory.getLevelMesh(1);
            const topY = topLevel ? topLevel.position.y : 0;

            this.labelRenderer.createStructureLabel(structureData, group, topY);
        });
    }

    /**
     * Setup interactions (hover, click).
     */
    setupInteractions() {
        const scene = this.sceneManager.getScene();

        this.tooltipManager = new TooltipManager();

        this.hoverHandler = new HoverHandler(
            scene,
            this.materialSystem,
            this.tooltipManager,
            this.getAllLevelMeshes(),
            this.iconManager.getAllSprites()
        );

        this.clickHandler = new ClickHandler(
            scene,
            this.levelSource,
            this.materialSystem,
            this.iconManager,
            this.cameraController,
            this.labelRenderer
        );

        // Wire up level selection to detail panel
        this.clickHandler.setLevelSelectHandler((levelNumber, structureCode) => {
            this.showLevelDetail(levelNumber, structureCode);
        });

        // Wire up structure selection (double-click)
        this.clickHandler.setStructureSelectHandler((structureCode) => {
            this.focusOnStructure(structureCode);
        });

        // Wire up background click
        this.clickHandler.setBackgroundClickHandler(() => {
            // Could return to site view or just deselect
        });
    }

    /**
     * Setup UI panels.
     */
    setupUI(mineData, hasMultipleStructures) {
        // Filter panel
        this.filterPanel = new FilterPanel(
            this.levelSource,
            this.materialSystem,
            this.iconManager,
            this.stateManager
        );

        // Site Overview Panel (for multi-structure)
        const siteOverviewContainer = document.getElementById('site-overview-container');
        if (siteOverviewContainer && hasMultipleStructures) {
            this.siteOverviewPanel = new SiteOverviewPanel(
                siteOverviewContainer,
                this.stateManager
            );
            this.siteOverviewPanel.setStructureClickHandler((code) => {
                this.focusOnStructure(code);
            });
            this.siteOverviewPanel.setSiteViewClickHandler(() => {
                this.showSiteOverview();
            });
        }

        // Timeline panel
        const timelineContainer = document.getElementById('timeline-container');
        if (timelineContainer) {
            this.timelinePanel = new TimelinePanel(
                timelineContainer,
                this.stateManager,
                this.apiClient
            );
        }

        // Alerts panel
        const alertsContainer = document.getElementById('alerts-container');
        if (alertsContainer) {
            this.alertsPanel = new AlertsPanel(
                alertsContainer,
                this.apiClient,
                this.stateManager
            );
            this.alertsPanel.setAlertClickHandler((alert) => {
                this.highlightLevel(alert.levelNumber, alert.structureCode);
            });
        }

        // Detail panel
        const detailContainer = document.getElementById('detail-container');
        if (detailContainer) {
            this.detailPanel = new DetailPanel(
                detailContainer,
                this.apiClient,
                this.stateManager
            );
            this.detailPanel.setBreadcrumbClickHandler((type, code) => {
                if (type === 'site') {
                    this.showSiteOverview();
                } else if (type === 'structure') {
                    this.focusOnStructure(code);
                }
            });
        }

        // AI Insights panel
        const aiInsightsContainer = document.getElementById('ai-insights-container');
        if (aiInsightsContainer) {
            this.aiInsightsPanel = new AIInsightsPanel(
                aiInsightsContainer,
                this.apiClient,
                this.stateManager
            );
            this.aiInsightsPanel.setInsightClickHandler((insight) => {
                this.highlightLevel(insight.levelNumber, insight.structureCode);
            });
        }

        // Query Interface
        const queryContainer = document.getElementById('query-container');
        if (queryContainer) {
            this.queryInterface = new QueryInterface(queryContainer, this.apiClient);
        }

        // Camera Controls Panel
        const cameraControlsContainer = document.getElementById('camera-controls-container');
        if (cameraControlsContainer) {
            this.cameraControlsPanel = new CameraControlsPanel(
                cameraControlsContainer,
                this.cameraController
            );
        }
    }

    /**
     * Focus on a specific structure.
     */
    focusOnStructure(structureCode) {
        this.stateManager.setFocusedStructure(structureCode);

        if (this.structureManager) {
            this.structureManager.setFocusMode(structureCode);

            const worldPos = this.structureManager.getStructureWorldPosition(structureCode);
            if (worldPos) {
                this.cameraController.focusOnStructure(worldPos);
            }
        }

        if (this.labelRenderer) {
            this.labelRenderer.setStructureFocus(structureCode);
        }
    }

    /**
     * Return to site overview.
     */
    showSiteOverview() {
        this.stateManager.setFocusedStructure(null);

        if (this.structureManager) {
            this.structureManager.setFocusMode(null);
        }

        if (this.labelRenderer) {
            this.labelRenderer.setStructureFocus(null);
        }

        this.cameraController.showSiteOverview();
    }

    /**
     * Handle view mode changes.
     */
    onViewModeChanged(detail) {
        const { viewMode, focusedStructure } = detail;

        if (this.structureManager) {
            this.structureManager.setFocusMode(focusedStructure);
        }

        if (this.labelRenderer) {
            this.labelRenderer.setStructureFocus(focusedStructure);
        }
    }

    /**
     * Handle state changes from StateManager.
     */
    onStateChanged(detail) {
        const { state } = detail;
        if (!state) return;

        // Multi-structure update
        if (state.structures && this.structureManager) {
            this.structureManager.updateFromState(state.structures);
        }

        // Legacy single-structure update
        if (state.levels && this.levelFactory) {
            state.levels.forEach(levelData => {
                const mesh = this.levelFactory.getLevelMesh(levelData.level);
                if (!mesh) return;

                const riskBand = levelData.riskBand || this.computeRiskBand(levelData);
                this.levelFactory.updateLevelRisk(levelData.level, riskBand);
                this.labelRenderer.updateLevelLabel(levelData);
            });
        }

        // Update icons
        if (state.structures) {
            state.structures.forEach(structure => {
                structure.levels.forEach(levelData => {
                    const mesh = this.structureManager?.getLevelMesh(structure.code, levelData.level);
                    if (mesh) {
                        this.iconManager.updateActivityIcons(levelData, mesh);
                    }
                });
            });
        } else if (state.levels) {
            state.levels.forEach(levelData => {
                const mesh = this.levelFactory?.getLevelMesh(levelData.level);
                if (mesh) {
                    this.iconManager.updateActivityIcons(levelData, mesh);
                }
            });
        }

        // Update risk visual effects
        const levels = state.levels || this.flattenStructureLevels(state.structures);
        this.riskEffects.updateEffects(levels);
    }

    /**
     * Flatten structure levels to array.
     */
    flattenStructureLevels(structures) {
        if (!structures) return [];
        const levels = [];
        structures.forEach(s => levels.push(...(s.levels || [])));
        return levels;
    }

    /**
     * Handle mode changes.
     */
    onModeChanged(detail) {
        this.updateModeIndicator(detail.isLive);
    }

    /**
     * Update mode indicator UI.
     */
    updateModeIndicator(isLive) {
        const indicator = document.getElementById('mode-indicator');
        if (indicator) {
            indicator.textContent = isLive ? 'LIVE' : 'HISTORICAL';
            indicator.className = `mode-indicator ${isLive ? 'live' : 'historical'}`;
        }
    }

    /**
     * Compute risk band from level data.
     */
    computeRiskBand(levelData) {
        if (levelData.riskBand) return levelData.riskBand;
        if (levelData.riskScore !== undefined) {
            if (levelData.riskScore <= 30) return 'low';
            if (levelData.riskScore <= 70) return 'medium';
            return 'high';
        }
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

    /**
     * Highlight a specific level in the 3D view.
     */
    highlightLevel(levelNumber, structureCode = null) {
        let mesh = null;

        if (structureCode && this.structureManager) {
            mesh = this.structureManager.getLevelMesh(structureCode, levelNumber);
            this.focusOnStructure(structureCode);
        } else if (this.levelFactory) {
            mesh = this.levelFactory.getLevelMesh(levelNumber);
        }

        if (mesh) {
            this.cameraController.focusOn(mesh.position.clone());

            // Flash effect using emissive color
            const material = mesh.material;
            const originalEmissive = material.emissiveColor.clone();
            material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);

            setTimeout(() => {
                material.emissiveColor = originalEmissive;
            }, 500);

            this.showLevelDetail(levelNumber, structureCode);
        }
    }

    /**
     * Show detail panel for a specific level.
     */
    showLevelDetail(levelNumber, structureCode = null) {
        if (!this.detailPanel) return;

        let levelData = null;

        if (structureCode) {
            levelData = this.stateManager.getLevel(structureCode, levelNumber);
        } else {
            const state = this.stateManager.currentState;
            levelData = state?.levels?.find(l => l.level === levelNumber);
        }

        if (levelData) {
            this.detailPanel.showLevel(levelData, structureCode);
        }
    }

    /**
     * Check AI status.
     */
    async checkAIStatus() {
        const indicator = document.getElementById('ai-status');
        if (!indicator) return;

        const statusText = indicator.querySelector('.ai-status-text');

        try {
            const status = await this.apiClient.getAIStatus();

            if (status.available && status.enabled) {
                statusText.textContent = 'Active';
                indicator.className = 'ai-status-indicator active';
            } else if (status.enabled && !status.available) {
                statusText.textContent = 'Unavailable';
                indicator.className = 'ai-status-indicator offline';
            } else {
                statusText.textContent = 'Disabled';
                indicator.className = 'ai-status-indicator offline';
            }
        } catch (error) {
            console.warn('AI status check failed:', error);
            statusText.textContent = 'Offline';
            indicator.className = 'ai-status-indicator offline';
        }

        // Re-check every 5 minutes
        setTimeout(() => this.checkAIStatus(), 5 * 60 * 1000);
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
    new BabylonMineApp();
});
