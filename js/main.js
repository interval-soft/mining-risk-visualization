// js/main.js
import { SceneManager } from './core/SceneManager.js';
import { CameraController } from './core/CameraController.js';
import { AnimationLoop } from './core/AnimationLoop.js';
import { StateManager } from './core/StateManager.js';
import { DataLoader } from './data/DataLoader.js';
import { ApiClient } from './data/ApiClient.js';
import { MaterialSystem } from './geometry/MaterialSystem.js';
import { LevelFactory } from './geometry/LevelFactory.js';
import { StructureManager } from './geometry/StructureManager.js';
import { StructuralElements } from './geometry/StructuralElements.js';
import { RiskEffects } from './effects/RiskEffects.js';
import { ActivityIconManager } from './objects/ActivityIconManager.js';
import { LabelRenderer } from './objects/LabelRenderer.js';
import { RaycasterManager } from './interaction/RaycasterManager.js';
import { TooltipManager } from './interaction/TooltipManager.js';
import { HoverHandler } from './interaction/HoverHandler.js';
import { ClickHandler } from './interaction/ClickHandler.js';
import { KeyboardNavigation } from './interaction/KeyboardNavigation.js';
import { FilterPanel } from './ui/FilterPanel.js';
import { TimelinePanel } from './ui/TimelinePanel.js';
import { AlertsPanel } from './ui/AlertsPanel.js';
import { DetailPanel } from './ui/DetailPanel.js';
import { SiteOverviewPanel } from './ui/SiteOverviewPanel.js';
import { AIInsightsPanel } from './ui/AIInsightsPanel.js';
import { QueryInterface } from './ui/QueryInterface.js';
import { CameraControlsPanel } from './ui/CameraControlsPanel.js';

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

            // Determine if we have multi-structure data
            const hasMultipleStructures = mineData.structures && mineData.structures.length > 1;

            // Create geometry - use StructureManager for multi-structure, LevelFactory for single
            if (hasMultipleStructures) {
                this.structureManager = new StructureManager(
                    this.sceneManager.scene,
                    this.materialSystem
                );
                this.structureManager.createStructures(mineData.structures);

                // For backward compatibility, also keep a reference to level source
                this.levelSource = this.structureManager;
            } else {
                // Single structure - use legacy LevelFactory directly on scene
                this.levelFactory = new LevelFactory(
                    this.sceneManager.scene,
                    this.materialSystem
                );
                this.levelFactory.createLevels(mineData.levels);
                this.levelSource = this.levelFactory;
            }

            // Create structural elements (shafts, ramps) - only for single structure
            if (!hasMultipleStructures) {
                this.structuralElements = new StructuralElements(this.sceneManager.scene);
                this.structuralElements.createStructure(this.getAllLevelMeshes());
            }

            // Initialize risk effects
            this.riskEffects = new RiskEffects(
                this.sceneManager.scene,
                this.levelSource
            );

            // Create icons
            this.iconManager = new ActivityIconManager(this.sceneManager.scene);
            await this.iconManager.loadTextures();
            this.createActivityIcons(mineData);

            // Create labels
            this.createLevelLabels(mineData);

            // Setup interactions
            this.setupInteractions();

            // Setup UI
            this.filterPanel = new FilterPanel(
                this.levelSource,
                this.materialSystem,
                this.iconManager,
                this.stateManager
            );

            // Setup Site Overview Panel (for multi-structure)
            const siteOverviewContainer = document.getElementById('site-overview-container');
            if (siteOverviewContainer && hasMultipleStructures) {
                this.siteOverviewPanel = new SiteOverviewPanel(
                    siteOverviewContainer,
                    this.stateManager
                );

                // Wire up structure focus from site overview
                this.siteOverviewPanel.setStructureClickHandler((code) => {
                    this.focusOnStructure(code);
                });

                this.siteOverviewPanel.setSiteViewClickHandler(() => {
                    this.showSiteOverview();
                });
            }

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
                    this.highlightLevel(alert.levelNumber, alert.structureCode);
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

                // Handle breadcrumb navigation
                this.detailPanel.setBreadcrumbClickHandler((type, code) => {
                    if (type === 'site') {
                        this.showSiteOverview();
                    } else if (type === 'structure') {
                        this.focusOnStructure(code);
                    }
                });
            }

            // Setup AI Insights panel (if container exists)
            const aiInsightsContainer = document.getElementById('ai-insights-container');
            if (aiInsightsContainer) {
                this.aiInsightsPanel = new AIInsightsPanel(
                    aiInsightsContainer,
                    this.apiClient,
                    this.stateManager
                );

                // Handle insight clicks to highlight level in 3D view
                this.aiInsightsPanel.setInsightClickHandler((insight) => {
                    this.highlightLevel(insight.levelNumber, insight.structureCode);
                });
            }

            // Setup Query Interface (if container exists)
            const queryContainer = document.getElementById('query-container');
            if (queryContainer) {
                this.queryInterface = new QueryInterface(
                    queryContainer,
                    this.apiClient
                );
            }

            // Setup Camera Controls Panel (if container exists)
            const cameraControlsContainer = document.getElementById('camera-controls-container');
            if (cameraControlsContainer) {
                this.cameraControlsPanel = new CameraControlsPanel(
                    cameraControlsContainer,
                    this.cameraController
                );
            }

            // Setup keyboard navigation
            this.keyboardNavigation = new KeyboardNavigation(
                this.stateManager,
                this.cameraController,
                this.structureManager || null
            );

            this.keyboardNavigation.setStructureFocusHandler((code) => {
                this.focusOnStructure(code);
            });

            this.keyboardNavigation.setSiteViewHandler(() => {
                this.showSiteOverview();
            });

            // Show keyboard shortcuts hint briefly
            if (hasMultipleStructures) {
                this.keyboardNavigation.showHintBriefly(4000);
            }

            // Check AI status and update indicator
            this.checkAIStatus();

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
                        // If focused on structure, return to site view
                        this.showSiteOverview();
                    } else {
                        this.cameraController.reset();
                    }
                });
            }

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
            console.log(`Mode: ${hasMultipleStructures ? 'Multi-Structure' : 'Single-Structure'}`);

        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showError(error.message);
        }
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
                const mesh = this.levelFactory
                    ? this.levelFactory.getLevelMesh(levelData.level)
                    : null;
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
            // Multi-structure: iterate structures
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
                const mesh = this.levelFactory
                    ? this.levelFactory.getLevelMesh(levelData.level)
                    : null;
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
                // Already focused - return to site view
                this.showSiteOverview();
            } else {
                // Focus on this structure
                this.focusOnStructure(code);
            }
        });

        // Create a label for each structure
        structures.forEach(structureData => {
            const structureInfo = this.structureManager.getStructure(structureData.code);
            if (!structureInfo) return;

            const { group, levelFactory } = structureInfo;

            // Get the Y position of the topmost level (level 1, index 0)
            const topLevel = levelFactory.getLevelMesh(1);
            const topY = topLevel ? topLevel.position.y : 0;

            this.labelRenderer.createStructureLabel(structureData, group, topY);
        });
    }

    setupInteractions() {
        const canvas = this.sceneManager.renderer.domElement;

        this.raycasterManager = new RaycasterManager(this.sceneManager.camera);
        this.raycasterManager.setInteractables([
            ...this.getAllLevelMeshes(),
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
            this.levelSource,
            this.materialSystem,
            this.iconManager,
            this.cameraController,
            this.labelRenderer
        );

        // Wire up level selection to detail panel (with structure context)
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

        canvas.addEventListener('mousemove', (e) => {
            this.hoverHandler.onMouseMove(e, canvas);
        });

        canvas.addEventListener('click', (e) => {
            this.clickHandler.onClick(e, canvas);
        });
    }

    /**
     * Focus on a specific structure.
     */
    focusOnStructure(structureCode) {
        this.stateManager.setFocusedStructure(structureCode);

        // Update 3D view
        if (this.structureManager) {
            this.structureManager.setFocusMode(structureCode);

            // Animate camera to structure
            const worldPos = this.structureManager.getStructureWorldPosition(structureCode);
            if (worldPos) {
                this.cameraController.focusOnStructure(worldPos);
            }
        }
    }

    /**
     * Return to site overview (unfocus all structures).
     */
    showSiteOverview() {
        this.stateManager.setFocusedStructure(null);

        // Update 3D view
        if (this.structureManager) {
            this.structureManager.setFocusMode(null);
        }

        // Animate camera to site view
        this.cameraController.showSiteOverview();
    }

    /**
     * Handle view mode changes (site vs structure focus).
     */
    onViewModeChanged(detail) {
        const { viewMode, focusedStructure } = detail;

        // Update 3D visualization
        if (this.structureManager) {
            this.structureManager.setFocusMode(focusedStructure);
        }

        // Update structure label states
        if (this.labelRenderer) {
            this.labelRenderer.setStructureFocus(focusedStructure);
        }
    }

    /**
     * Handle state changes from the StateManager.
     * Updates the 3D visualization to reflect the new state.
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
    highlightLevel(levelNumber, structureCode = null) {
        let mesh = null;

        if (structureCode && this.structureManager) {
            mesh = this.structureManager.getLevelMesh(structureCode, levelNumber);

            // Also focus on the structure
            this.focusOnStructure(structureCode);
        } else if (this.levelFactory) {
            mesh = this.levelFactory.getLevelMesh(levelNumber);
        }

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
            this.showLevelDetail(levelNumber, structureCode);
        }
    }

    /**
     * Show the detail panel for a specific level.
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

    /**
     * Check AI status and update the indicator in the top bar.
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MineVisualizationApp();
});
