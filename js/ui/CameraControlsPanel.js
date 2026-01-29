// js/ui/CameraControlsPanel.js
// Physical controls panel for camera manipulation

export class CameraControlsPanel {
    constructor(container, cameraController) {
        this.container = container;
        this.cameraController = cameraController;
        this.isCollapsed = false;
        this.labelsVisible = true;
        this.panelsVisible = true;
        this.onLabelToggle = null;
        this.onPanelToggle = null;

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

    /**
     * Set callback for panel visibility toggle.
     * @param {Function} callback - Receives (isVisible) boolean
     */
    setPanelToggleCallback(callback) {
        this.onPanelToggle = callback;
    }

    render() {
        this.container.innerHTML = `
            <div class="camera-controls-panel">
                <div class="camera-controls-header">
                    <span class="camera-controls-title">View Controls</span>
                    <button class="camera-controls-toggle" title="Toggle panel">−</button>
                </div>
                <div class="camera-controls-body">
                    <!-- Row 1: Rotation + Zoom -->
                    <div class="controls-row">
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
                        <div class="zoom-column">
                            <button class="ctrl-btn" data-action="zoom-in" title="Zoom In (+)">
                                <span class="ctrl-icon">+</span>
                            </button>
                            <button class="ctrl-btn" data-action="zoom-out" title="Zoom Out (-)">
                                <span class="ctrl-icon">−</span>
                            </button>
                        </div>
                    </div>

                    <!-- Row 2: Presets + Reset -->
                    <div class="controls-row-presets">
                        <button class="ctrl-btn ctrl-btn-preset" data-action="view-isometric" title="Isometric (1)">
                            <span class="ctrl-text">ISO</span>
                        </button>
                        <button class="ctrl-btn ctrl-btn-preset" data-action="view-top" title="Top (2)">
                            <span class="ctrl-text">TOP</span>
                        </button>
                        <button class="ctrl-btn ctrl-btn-preset" data-action="view-front" title="Front (3)">
                            <span class="ctrl-text">FRT</span>
                        </button>
                        <button class="ctrl-btn ctrl-btn-preset" data-action="view-side" title="Side (4)">
                            <span class="ctrl-text">SIDE</span>
                        </button>
                        <button class="ctrl-btn ctrl-btn-preset" data-action="reset" title="Reset (R)">
                            <span class="ctrl-icon">⟲</span>
                        </button>
                    </div>

                    <!-- Row 3: Display toggles -->
                    <div class="controls-row-display">
                        <button class="ctrl-btn ctrl-btn-toggle active" data-action="toggle-labels" title="Toggle Labels (L)">
                            <span class="material-symbols-rounded ctrl-icon-material">label</span>
                        </button>
                        <button class="ctrl-btn ctrl-btn-toggle active" data-action="toggle-panels" title="Toggle Panels (P)">
                            <span class="material-symbols-rounded ctrl-icon-material">dashboard</span>
                        </button>
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
            // Don't trigger if user is typing in an input or using modifier keys (Cmd/Ctrl/Alt)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey) {
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

                // Toggle panels
                case 'p':
                    this.handleAction('toggle-panels');
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
                // Reset background color to default
                localStorage.removeItem('bgColor');
                const picker = document.getElementById('bg-color-picker');
                if (picker) picker.value = '#1a1a2e';
                window.dispatchEvent(new CustomEvent('bgcolorchange', { detail: { color: '#1a1a2e' } }));
                break;
            case 'toggle-labels':
                this.toggleLabels();
                break;
            case 'toggle-panels':
                this.togglePanels();
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

    togglePanels() {
        this.panelsVisible = !this.panelsVisible;

        // Update button state
        const btn = this.container.querySelector('[data-action="toggle-panels"]');
        if (btn) {
            btn.classList.toggle('active', this.panelsVisible);
        }

        // Call the callback if set
        if (this.onPanelToggle) {
            this.onPanelToggle(this.panelsVisible);
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
