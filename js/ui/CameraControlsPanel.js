// js/ui/CameraControlsPanel.js
// Physical controls panel for camera manipulation

export class CameraControlsPanel {
    constructor(container, cameraController) {
        this.container = container;
        this.cameraController = cameraController;
        this.isCollapsed = false;
        this.labelsVisible = true;
        this.onLabelToggle = null;

        this.render();
        this.bindEvents();
        this.setupKeyboardShortcuts();
    }

    /**
     * Set callback for label visibility toggle.
     * @param {Function} callback - Receives (isVisible) boolean
     */
    setLabelToggleCallback(callback) {
        this.onLabelToggle = callback;
    }

    render() {
        this.container.innerHTML = `
            <div class="camera-controls-panel">
                <div class="camera-controls-header">
                    <span class="camera-controls-title">View Controls</span>
                    <button class="camera-controls-toggle" title="Toggle panel">−</button>
                </div>
                <div class="camera-controls-body">
                    <!-- Rotation controls -->
                    <div class="controls-section">
                        <div class="controls-label">Rotate</div>
                        <div class="rotation-grid">
                            <button class="ctrl-btn" data-action="rotate-up" title="Rotate Up (W)">
                                <span class="ctrl-icon">↑</span>
                            </button>
                            <button class="ctrl-btn" data-action="rotate-left" title="Rotate Left (A)">
                                <span class="ctrl-icon">←</span>
                            </button>
                            <button class="ctrl-btn" data-action="rotate-right" title="Rotate Right (D)">
                                <span class="ctrl-icon">→</span>
                            </button>
                            <button class="ctrl-btn" data-action="rotate-down" title="Rotate Down (S)">
                                <span class="ctrl-icon">↓</span>
                            </button>
                        </div>
                    </div>

                    <!-- Zoom controls -->
                    <div class="controls-section">
                        <div class="controls-label">Zoom</div>
                        <div class="zoom-controls">
                            <button class="ctrl-btn ctrl-btn-wide" data-action="zoom-in" title="Zoom In (+)">
                                <span class="ctrl-icon">+</span>
                            </button>
                            <button class="ctrl-btn ctrl-btn-wide" data-action="zoom-out" title="Zoom Out (-)">
                                <span class="ctrl-icon">−</span>
                            </button>
                        </div>
                    </div>

                    <!-- Preset views -->
                    <div class="controls-section">
                        <div class="controls-label">Presets</div>
                        <div class="preset-controls">
                            <button class="ctrl-btn ctrl-btn-preset" data-action="view-isometric" title="Isometric View (1)">
                                <span class="ctrl-text">ISO</span>
                            </button>
                            <button class="ctrl-btn ctrl-btn-preset" data-action="view-top" title="Top View (2)">
                                <span class="ctrl-text">TOP</span>
                            </button>
                            <button class="ctrl-btn ctrl-btn-preset" data-action="view-front" title="Front View (3)">
                                <span class="ctrl-text">FRT</span>
                            </button>
                            <button class="ctrl-btn ctrl-btn-preset" data-action="view-side" title="Side View (4)">
                                <span class="ctrl-text">SIDE</span>
                            </button>
                        </div>
                    </div>

                    <!-- Reset button -->
                    <div class="controls-section">
                        <button class="ctrl-btn ctrl-btn-reset" data-action="reset" title="Reset View (R)">
                            <span class="ctrl-icon">⟲</span>
                            <span class="ctrl-text">Reset</span>
                        </button>
                    </div>

                    <!-- Display options -->
                    <div class="controls-section">
                        <div class="controls-label">Display</div>
                        <div class="display-controls">
                            <button class="ctrl-btn ctrl-btn-toggle active" data-action="toggle-labels" title="Toggle Labels (L)">
                                <span class="material-symbols-rounded ctrl-icon-material">label</span>
                                <span class="ctrl-text">Labels</span>
                            </button>
                        </div>
                    </div>

                    <!-- Keyboard hint -->
                    <div class="keyboard-hint">
                        <span class="hint-icon">⌨</span>
                        <span class="hint-text">WASD / Arrows to rotate</span>
                    </div>
                </div>
            </div>
        `;

        this.bodyEl = this.container.querySelector('.camera-controls-body');
        this.toggleBtn = this.container.querySelector('.camera-controls-toggle');
    }

    bindEvents() {
        // Button clicks
        this.container.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });

            // Allow holding for continuous action
            let intervalId = null;
            btn.addEventListener('mousedown', (e) => {
                const action = e.currentTarget.dataset.action;
                if (this.isContinuousAction(action)) {
                    intervalId = setInterval(() => this.handleAction(action), 50);
                }
            });
            btn.addEventListener('mouseup', () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            });
        });

        // Toggle collapse
        this.toggleBtn.addEventListener('click', () => this.toggleCollapse());
    }

    setupKeyboardShortcuts() {
        this.keydownHandler = (e) => {
            // Don't trigger if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            let handled = true;

            switch (e.key.toLowerCase()) {
                // Rotation - WASD
                case 'w':
                case 'arrowup':
                    this.handleAction('rotate-up');
                    break;
                case 's':
                case 'arrowdown':
                    this.handleAction('rotate-down');
                    break;
                case 'a':
                case 'arrowleft':
                    this.handleAction('rotate-left');
                    break;
                case 'd':
                case 'arrowright':
                    this.handleAction('rotate-right');
                    break;

                // Zoom
                case '+':
                case '=':
                    this.handleAction('zoom-in');
                    break;
                case '-':
                case '_':
                    this.handleAction('zoom-out');
                    break;

                // Preset views - number keys
                case '1':
                    this.handleAction('view-isometric');
                    break;
                case '2':
                    this.handleAction('view-top');
                    break;
                case '3':
                    this.handleAction('view-front');
                    break;
                case '4':
                    this.handleAction('view-side');
                    break;

                // Reset
                case 'r':
                    this.handleAction('reset');
                    break;

                // Toggle labels
                case 'l':
                    this.handleAction('toggle-labels');
                    break;

                default:
                    handled = false;
            }

            if (handled) {
                e.preventDefault();
            }
        };

        document.addEventListener('keydown', this.keydownHandler);
    }

    handleAction(action) {
        switch (action) {
            case 'rotate-up':
                this.cameraController.rotateVertical(1);
                break;
            case 'rotate-down':
                this.cameraController.rotateVertical(-1);
                break;
            case 'rotate-left':
                this.cameraController.rotateHorizontal(-1);
                break;
            case 'rotate-right':
                this.cameraController.rotateHorizontal(1);
                break;
            case 'zoom-in':
                this.cameraController.zoom(1);
                break;
            case 'zoom-out':
                this.cameraController.zoom(-1);
                break;
            case 'view-isometric':
                this.cameraController.setPresetView('isometric');
                break;
            case 'view-top':
                this.cameraController.setPresetView('top');
                break;
            case 'view-front':
                this.cameraController.setPresetView('front');
                break;
            case 'view-side':
                this.cameraController.setPresetView('side');
                break;
            case 'reset':
                this.cameraController.reset();
                break;
            case 'toggle-labels':
                this.toggleLabels();
                break;
        }
    }

    toggleLabels() {
        this.labelsVisible = !this.labelsVisible;

        // Update button state
        const btn = this.container.querySelector('[data-action="toggle-labels"]');
        if (btn) {
            btn.classList.toggle('active', this.labelsVisible);
        }

        // Call the callback if set
        if (this.onLabelToggle) {
            this.onLabelToggle(this.labelsVisible);
        }
    }

    isContinuousAction(action) {
        return ['rotate-up', 'rotate-down', 'rotate-left', 'rotate-right', 'zoom-in', 'zoom-out'].includes(action);
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.bodyEl.style.display = this.isCollapsed ? 'none' : 'flex';
        this.toggleBtn.textContent = this.isCollapsed ? '+' : '−';
        this.toggleBtn.title = this.isCollapsed ? 'Expand panel' : 'Collapse panel';
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.keydownHandler);
    }
}
