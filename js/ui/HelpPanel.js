// js/ui/HelpPanel.js
// Comprehensive help modal with tabbed documentation

export class HelpPanel {
    constructor() {
        this.isVisible = false;
        this.activeTab = 'quick-start';
        this.element = null;

        this.createPanel();
        this.bindEvents();
        this.setupKeyboardShortcut();
    }

    createPanel() {
        this.element = document.createElement('div');
        this.element.className = 'help-modal';
        this.element.innerHTML = this.getTemplate();
        document.body.appendChild(this.element);
    }

    getTemplate() {
        return `
            <div class="help-container">
                <div class="help-header">
                    <h2>
                        <span class="material-symbols-rounded">help</span>
                        Digital Twin Help
                    </h2>
                    <span class="help-shortcut">Press ? to toggle</span>
                    <button class="help-close" title="Close (ESC)">&times;</button>
                </div>

                <div class="help-tabs">
                    <button class="help-tab active" data-tab="quick-start">
                        <span class="material-symbols-rounded">rocket_launch</span>
                        <span>Quick Start</span>
                    </button>
                    <button class="help-tab" data-tab="controls">
                        <span class="material-symbols-rounded">gamepad</span>
                        <span>Controls</span>
                    </button>
                    <button class="help-tab" data-tab="panels">
                        <span class="material-symbols-rounded">dashboard</span>
                        <span>Panels</span>
                    </button>
                    <button class="help-tab" data-tab="visualization">
                        <span class="material-symbols-rounded">view_in_ar</span>
                        <span>3D View</span>
                    </button>
                    <button class="help-tab" data-tab="demo">
                        <span class="material-symbols-rounded">movie</span>
                        <span>Demo</span>
                    </button>
                    <button class="help-tab" data-tab="tech-stack">
                        <span class="material-symbols-rounded">code</span>
                        <span>Tech Stack</span>
                    </button>
                    <button class="help-tab" data-tab="whats-next">
                        <span class="material-symbols-rounded">rocket</span>
                        <span>What's Next</span>
                    </button>
                </div>

                <div class="help-content">
                    ${this.getQuickStartContent()}
                    ${this.getControlsContent()}
                    ${this.getPanelsContent()}
                    ${this.get3DContent()}
                    ${this.getDemoContent()}
                    ${this.getTechStackContent()}
                    ${this.getWhatsNextContent()}
                </div>

                <div class="help-footer">
                    <div class="help-footer-tip">
                        <span class="material-symbols-rounded">lightbulb</span>
                        Press <kbd>?</kbd> anytime to open this help
                    </div>
                    <div>Digital Twin Mining Visualization</div>
                </div>
            </div>
        `;
    }

    getQuickStartContent() {
        return `
            <div class="help-tab-content active" data-content="quick-start">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">info</span>
                        What is Digital Twin?
                    </h3>
                    <p class="help-intro">
                        This is a proof of concept developed for Worley, demonstrating how a Digital Twin
                        platform could transform the monitoring of mining operations. It displays mine
                        structures, risk levels, active alerts, and AI-powered insights to help operators
                        monitor safety conditions across multiple underground levels.
                    </p>
                    <p class="help-intro">
                        The 3D structures shown here are simplified representations. In a production
                        deployment, they can be replaced with highly detailed, realistic models of the
                        actual site — created by professional 3D designers from drone surveys or mine plans
                        — to give operators an immediately recognizable view of their environment.
                    </p>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">schedule</span>
                        Operating Modes
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon risk-low">
                                <span class="material-symbols-rounded">sensors</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">LIVE Mode</div>
                                <div class="feature-desc">Real-time data from sensors and systems. Green indicator pulses in the top bar.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-medium">
                                <span class="material-symbols-rounded">history</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">HISTORICAL Mode</div>
                                <div class="feature-desc">Review past events using the timeline. Yellow indicator shows playback status.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">mouse</span>
                        Basic 3D Navigation
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">rotate_left</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Rotate View</div>
                                <div class="feature-desc">Click and drag to orbit around the mine structure.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">zoom_in</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Zoom</div>
                                <div class="feature-desc">Scroll wheel or pinch gesture to zoom in/out.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">pan_tool</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Pan</div>
                                <div class="feature-desc">Right-click and drag to pan the view.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">touch_app</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Touch Support</div>
                                <div class="feature-desc">One finger to rotate, two fingers to zoom and pan.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">keyboard</span>
                        Quick Shortcuts
                    </h3>
                    <div class="shortcuts-quick">
                        <div class="shortcut-item"><kbd>WASD</kbd><span>Rotate camera</span></div>
                        <div class="shortcut-item"><kbd>Shift</kbd>+<kbd>WASD</kbd><span>Pan</span></div>
                        <div class="shortcut-item"><kbd>+</kbd> <kbd>-</kbd><span>Zoom</span></div>
                        <div class="shortcut-item"><kbd>1-4</kbd><span>Preset views</span></div>
                        <div class="shortcut-item"><kbd>R</kbd><span>Reset view</span></div>
                        <div class="shortcut-item"><kbd>L</kbd><span>Toggle labels</span></div>
                        <div class="shortcut-item"><kbd>P</kbd><span>Toggle panels</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    getControlsContent() {
        return `
            <div class="help-tab-content" data-content="controls">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">videocam</span>
                        Camera Controls Panel
                    </h3>
                    <p class="help-intro">
                        The View Controls panel (bottom-left) provides on-screen buttons for camera manipulation.
                        All controls also have keyboard shortcuts.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">rotate_left</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Rotation</div>
                                <div class="feature-desc">Arrow buttons or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / Arrow keys to orbit the camera around the target.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">pan_tool</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Pan</div>
                                <div class="feature-desc">Pan buttons or <kbd>Shift</kbd>+<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to slide the camera without rotating.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">zoom_in</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Zoom</div>
                                <div class="feature-desc">Plus/minus buttons or <kbd>+</kbd><kbd>-</kbd> keys to zoom in/out.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">grid_view</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Preset Views</div>
                                <div class="feature-desc">ISO, TOP, FRT, SIDE buttons or <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> for quick camera angles.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">refresh</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Reset View</div>
                                <div class="feature-desc">Reset button or <kbd>R</kbd> to return to default camera position.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">toggle_on</span>
                        Display Toggles
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">label</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Labels Toggle</div>
                                <div class="feature-desc">Press <kbd>L</kbd> to show/hide 3D labels for levels and structures.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">dashboard</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Panels Toggle</div>
                                <div class="feature-desc">Press <kbd>P</kbd> to show/hide the left sidebar panels.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">timeline</span>
                        Timeline Controls
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon risk-low">
                                <span class="material-symbols-rounded">sensors</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">LIVE Button</div>
                                <div class="feature-desc">Click to return to real-time mode from historical playback.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">play_pause</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Play/Pause</div>
                                <div class="feature-desc">Control historical playback. Pause to examine a specific moment.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">speed</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Speed Control</div>
                                <div class="feature-desc">Adjust playback speed from 1x to 10x for faster review.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">linear_scale</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Scrubber</div>
                                <div class="feature-desc">Drag the timeline scrubber to jump to any point in time.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">place</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Event Markers</div>
                                <div class="feature-desc">Colored dots on timeline indicate alert events. Click to jump there.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">tune</span>
                        Top Bar Controls
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">restart_alt</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Reset View Button</div>
                                <div class="feature-desc">Returns camera to default position. If focused on a structure, returns to site overview.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">palette</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Background Color</div>
                                <div class="feature-desc">Click the BG color picker to customize the 3D scene background.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">keyboard</span>
                        Keyboard Shortcuts Reference
                    </h3>
                    <table class="shortcuts-table">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Arrows</td><td>Rotate camera</td></tr>
                            <tr><td><kbd>Shift</kbd>+<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></td><td>Pan camera</td></tr>
                            <tr><td><kbd>+</kbd> / <kbd>-</kbd></td><td>Zoom in/out</td></tr>
                            <tr><td><kbd>1</kbd></td><td>Isometric view</td></tr>
                            <tr><td><kbd>2</kbd></td><td>Top view</td></tr>
                            <tr><td><kbd>3</kbd></td><td>Front view</td></tr>
                            <tr><td><kbd>4</kbd></td><td>Side view</td></tr>
                            <tr><td><kbd>R</kbd></td><td>Reset view</td></tr>
                            <tr><td><kbd>L</kbd></td><td>Toggle labels</td></tr>
                            <tr><td><kbd>P</kbd></td><td>Toggle panels</td></tr>
                            <tr><td><kbd>?</kbd></td><td>Open/close help</td></tr>
                            <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd></td><td>Toggle demo mode</td></tr>
                            <tr><td><kbd>ESC</kbd></td><td>Close dialogs</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getPanelsContent() {
        return `
            <div class="help-tab-content" data-content="panels">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">filter_alt</span>
                        Filter Panel
                    </h3>
                    <p class="help-intro">
                        Located at the top of the left sidebar. Filter the 3D visualization by risk level or structure.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">warning</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Risk Level Toggles</div>
                                <div class="feature-desc">Click High, Medium, or Low to show/hide levels by risk. Active filters are highlighted.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">category</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Activity Type Filter</div>
                                <div class="feature-desc">Toggle activity types (drilling, blasting, hauling, etc.) to show or hide specific icon categories across all levels.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">apartment</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Structure Dropdown</div>
                                <div class="feature-desc">In multi-structure sites, select a specific mine structure to focus on.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">notifications</span>
                        Alerts Panel
                    </h3>
                    <p class="help-intro">
                        Shows real-time safety alerts from the mine. Alerts are color-coded by severity.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">filter_list</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Status Filtering</div>
                                <div class="feature-desc">Filter alerts by status: All, Active, or Acknowledged.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-low">
                                <span class="material-symbols-rounded">check_circle</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Acknowledge Button</div>
                                <div class="feature-desc">Mark alerts as reviewed. Acknowledged alerts can be filtered out.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">my_location</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Jump to Location</div>
                                <div class="feature-desc">Click an alert to focus the 3D view on that level and show details.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">schedule</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Jump to Timestamp</div>
                                <div class="feature-desc">Click the timestamp to jump the timeline to when the alert occurred.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">psychology</span>
                        AI Insights Panel
                    </h3>
                    <p class="help-intro">
                        AI-generated predictions and recommendations based on sensor data and patterns.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">filter_list</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Severity Filtering</div>
                                <div class="feature-desc">Filter insights by severity level to focus on critical predictions.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">thumb_up</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Feedback Buttons</div>
                                <div class="feature-desc">Rate insights with thumbs up/down to improve AI accuracy over time.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">chat</span>
                        Query Interface
                    </h3>
                    <p class="help-intro">
                        Ask questions about the mine in natural language. Located at the bottom of the screen.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">edit_note</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Natural Language</div>
                                <div class="feature-desc">Type questions like "Which level has the highest risk?" or "Show me recent gas alerts".</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">lightbulb</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Suggested Queries</div>
                                <div class="feature-desc">Click suggested questions for quick insights without typing.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">verified</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Confidence Score</div>
                                <div class="feature-desc">AI responses include a confidence percentage for transparency.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">info</span>
                        Detail Panel
                    </h3>
                    <p class="help-intro">
                        Shows detailed information when you select a level. Located on the right side.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">layers</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Level Information</div>
                                <div class="feature-desc">Displays level name, depth, and current operational status.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-medium">
                                <span class="material-symbols-rounded">speed</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Risk Score</div>
                                <div class="feature-desc">Shows calculated risk score (0-100) with color-coded severity.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">engineering</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Active Activities</div>
                                <div class="feature-desc">Lists current activities on the level (drilling, blasting, etc.).</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">error</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Active Alerts</div>
                                <div class="feature-desc">Shows any alerts currently affecting this level.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">smart_toy</span>
                        AI Status Indicator
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon risk-low">
                                <span class="material-symbols-rounded">check_circle</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Active (Green)</div>
                                <div class="feature-desc">AI services are connected and processing data.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">cancel</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Offline (Red)</div>
                                <div class="feature-desc">AI services unavailable. Basic visualization still works.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    get3DContent() {
        return `
            <div class="help-tab-content" data-content="visualization">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">layers</span>
                        Mine Structure
                    </h3>
                    <p class="help-intro">
                        The 3D view represents the underground mine with multiple levels and structural elements.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">view_in_ar</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Levels</div>
                                <div class="feature-desc">Horizontal platforms representing mine levels. Color indicates risk: green (low), yellow (medium), red (high).</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">square</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Pillars</div>
                                <div class="feature-desc">Vertical support structures between levels.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">arrow_downward</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Shafts</div>
                                <div class="feature-desc">Main vertical access points through the mine.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">trending_down</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Ramps</div>
                                <div class="feature-desc">Inclined passages connecting levels for vehicle access.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">elevator</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Elevator</div>
                                <div class="feature-desc">Personnel and material transport system.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">apps</span>
                        Activity Icons
                    </h3>
                    <p class="help-intro">
                        Icons on each level indicate active operations. Icon color reflects risk level.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">local_fire_department</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">High Risk (Red)</div>
                                <div class="feature-desc">Blasting, hazardous materials, emergency conditions.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-medium">
                                <span class="material-symbols-rounded">construction</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Medium Risk (Yellow)</div>
                                <div class="feature-desc">Active drilling, equipment operation, maintenance.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-low">
                                <span class="material-symbols-rounded">engineering</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Low Risk (Green)</div>
                                <div class="feature-desc">Surveying, inspections, routine operations.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">label</span>
                        3D Labels
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">apartment</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Structure Labels</div>
                                <div class="feature-desc">Clickable labels above each mine structure. Click to focus.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">layers</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Level Labels</div>
                                <div class="feature-desc">Show level number, name, and depth in meters.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">touch_app</span>
                        Interactions
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">near_me</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Hover</div>
                                <div class="feature-desc">Mouse over a level to highlight it and show a tooltip with details.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">ads_click</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Single Click</div>
                                <div class="feature-desc">Click a level to select it, isolate the view, and open the detail panel.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">double_arrow</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Double-Click</div>
                                <div class="feature-desc">Double-click a structure to focus on it and hide others.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">location_city</span>
                        Multi-Structure Sites
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">public</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Site Overview</div>
                                <div class="feature-desc">See all mine structures at once with aggregate risk indicators.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">center_focus_strong</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Focus Mode</div>
                                <div class="feature-desc">Click a structure label or card to focus on a single mine structure.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getDemoContent() {
        return `
            <div class="help-tab-content" data-content="demo">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">movie</span>
                        Demo Mode Overview
                    </h3>
                    <p class="help-intro">
                        Demo mode allows you to trigger realistic mining scenarios for demonstrations,
                        training, or testing. Access it with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd>
                        or the Demo button in the top bar.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon demo">
                                <span class="material-symbols-rounded">play_circle</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Activation</div>
                                <div class="feature-desc">Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> or click the Demo button to open the control panel.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon demo">
                                <span class="material-symbols-rounded">dashboard</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Control Panel</div>
                                <div class="feature-desc">Access scenarios, auto-generation settings, speed controls, and quick actions.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">theater_comedy</span>
                        Demo Scenarios
                    </h3>
                    <p class="help-intro">
                        Six pre-built scenarios simulate different mining situations.
                    </p>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">flash_on</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Blast Lockout</div>
                                <div class="feature-desc">Simulates blasting operations with safety lockouts across multiple levels.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-high">
                                <span class="material-symbols-rounded">air</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Gas Emergency</div>
                                <div class="feature-desc">Hazardous gas detection triggering evacuation protocols.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-medium">
                                <span class="material-symbols-rounded">build</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Equipment Failure</div>
                                <div class="feature-desc">Critical equipment malfunction affecting operations.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-medium">
                                <span class="material-symbols-rounded">radar</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Proximity Cascade</div>
                                <div class="feature-desc">Multiple proximity warnings cascading across levels.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon risk-low">
                                <span class="material-symbols-rounded">groups</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Shift Change</div>
                                <div class="feature-desc">Normal shift transition with personnel movement tracking.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">psychology</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">AI Prediction</div>
                                <div class="feature-desc">Demonstrates AI-generated risk predictions and recommendations.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">settings</span>
                        Demo Controls
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon demo">
                                <span class="material-symbols-rounded">autorenew</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Auto-Generate</div>
                                <div class="feature-desc">Toggle automatic event generation for continuous demonstration.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon demo">
                                <span class="material-symbols-rounded">speed</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Speed Control</div>
                                <div class="feature-desc">Adjust how frequently demo events are generated.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon demo">
                                <span class="material-symbols-rounded">bolt</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Quick Actions</div>
                                <div class="feature-desc">Buttons to clear all alerts, reset risks, or trigger random events instantly.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTechStackContent() {
        return `
            <div class="help-tab-content" data-content="tech-stack">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">architecture</span>
                        Architecture Overview
                    </h3>
                    <p class="help-prose">
                        The Digital Twin is built as a modern web application with a clear separation
                        between the 3D front-end and a serverless API back-end. The entire application
                        runs in the browser — no plugins, no desktop installation required. The back-end
                        handles data processing, AI inference, and database access via serverless functions.
                    </p>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">view_in_ar</span>
                        3D Rendering
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">deployed_code</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Three.js (r160)</div>
                                <div class="feature-desc">WebGL-based 3D engine powering all scene rendering, camera controls, raycasting, sprite icons, and post-processing effects (bloom via UnrealBloomPass).</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">orbit</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">OrbitControls</div>
                                <div class="feature-desc">Three.js addon providing mouse/touch camera interaction — orbit, pan, and zoom with damping for smooth movement.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">label</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">CSS2DRenderer</div>
                                <div class="feature-desc">Renders HTML labels (level names, depth markers) as overlays on the 3D scene, keeping text crisp at any zoom level.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">animation</span>
                        Animation & UI
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">motion_photos_on</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">GSAP (v3.12)</div>
                                <div class="feature-desc">GreenSock Animation Platform for smooth camera transitions between views, with timeline sequencing and easing curves.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">format_paint</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Material Symbols</div>
                                <div class="feature-desc">Google's variable icon font used throughout the UI and rendered as canvas textures for 3D activity sprites.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">css</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Vanilla CSS + Custom Properties</div>
                                <div class="feature-desc">No CSS framework — custom stylesheets with CSS variables for consistent theming across all panels and controls.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">javascript</span>
                        Front-End Architecture
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">package_2</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">ES Modules (No Bundler)</div>
                                <div class="feature-desc">Native browser ES modules with import maps — no Webpack, Vite, or build step. Dependencies loaded directly from CDN via importmap.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">account_tree</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Component-Based Classes</div>
                                <div class="feature-desc">Each UI panel (Alerts, Filters, Detail, AI Insights, Help) and 3D system (Scene, Camera, Materials, Icons) is an independent ES6 class.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">sync_alt</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">State Management</div>
                                <div class="feature-desc">Custom StateManager with event-driven architecture for coordinating multi-structure views, focus modes, and timeline synchronization.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">cloud</span>
                        Back-End & Infrastructure
                    </h3>
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">dns</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">Node.js Serverless API</div>
                                <div class="feature-desc">API routes handling alerts, AI inference, site data, and authentication — deployable on any hosting platform or on-premise server.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">storage</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">PostgreSQL</div>
                                <div class="feature-desc">Relational database for persistent storage of alerts, AI insights, baselines, and historical timeline data.</div>
                            </div>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <span class="material-symbols-rounded">psychology</span>
                            </div>
                            <div class="feature-info">
                                <div class="feature-title">AI Engine (OpenRouter → Local)</div>
                                <div class="feature-desc">Currently using OpenRouter for AI inference during development. In production, a fully self-contained local AI will be deployed for security and data privacy.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">security</span>
                        Production AI Architecture
                    </h3>
                    <p class="help-prose">
                        For production deployment, the AI system will run entirely on-premise using a
                        self-contained local architecture. This ensures that sensitive operational data
                        never leaves the site network — a critical requirement for mining operations
                        where security and privacy are paramount.
                    </p>
                    <div class="help-preview-link" style="cursor:default;">
                        <img src="assets/local-ai-architecture.png" alt="Local AI architecture diagram" class="help-preview-img" />
                        <span class="help-preview-caption">
                            <span class="material-symbols-rounded">schema</span>
                            Self-contained local AI architecture for production deployment
                        </span>
                    </div>
                    <p class="help-prose">
                        The architecture runs on a Mac Studio with Docker containers, featuring Ollama
                        for local AI model inference, AI Agents with RAG (Retrieval-Augmented Generation)
                        for context-aware responses, N8N for workflow automation, and OpenWebUI as the
                        management interface. VPN tunnels provide secure remote access, while cloud sync
                        remains optional for updates and backups. All operations are governed by access
                        controls, audit logs, and a monitoring dashboard.
                    </p>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">data_object</span>
                        Data Flow
                    </h3>
                    <p class="help-prose">
                        Mine data (structures, levels, activities, risk scores) is loaded at startup from
                        the API or from a static JSON file for offline/demo use. The DataLoader normalizes
                        both formats into a unified structure. Real-time updates flow through periodic API
                        polling, with the timeline system coordinating state changes across all panels
                        and the 3D scene simultaneously.
                    </p>
                    <p class="help-prose">
                        The rendering pipeline follows a clear path: raw data enters through the DataLoader,
                        gets processed into level meshes and activity sprites by the StructureManager and
                        ActivityIconManager, then rendered by Three.js with post-processing (bloom, fog).
                        UI panels observe state changes and update independently.
                    </p>
                </div>
            </div>
        `;
    }

    getWhatsNextContent() {
        return `
            <div class="help-tab-content" data-content="whats-next">
                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">rocket</span>
                        From Demo to Your Operations
                    </h3>
                    <p class="help-intro">
                        What you are exploring is a demonstration of what a Digital Twin platform
                        can bring to mining operations. The 3D structures, alerts, AI insights, and
                        timeline playback illustrate the core capabilities of the system. Below is an
                        overview of what becomes possible when this platform is tailored and deployed
                        on a real site.
                    </p>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">view_in_ar</span>
                        Custom 3D Models of Your Actual Site
                    </h3>
                    <p class="help-prose">
                        The schematic 3D structures you see in this demo would be replaced with
                        high-fidelity models of your actual mine site. Using photogrammetry from drone
                        surveys or professional 3D modeling, every open pit, decline, shaft, and surface
                        facility could be recreated with realistic terrain and geometry. Operators would
                        navigate a digital replica that mirrors what they see in the field, making it
                        immediately intuitive to locate zones, identify levels, and understand spatial
                        relationships between operations.
                    </p>
                    <p class="help-prose">
                        The platform would support multiple structure types — open pits, underground
                        declines, vertical shafts, and surface processing plants — each rendered with
                        appropriate geometry and visual cues. As your mine develops and expands, the 3D
                        model could be updated to reflect new excavation areas, additional levels, or
                        infrastructure changes.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> Drone survey data or mine plans (DXF/DWG), or engagement with a 3D modeling specialist to produce optimized web-ready assets.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">sensors</span>
                        Real-Time Sensor Integration
                    </h3>
                    <p class="help-prose">
                        The platform would be designed to ingest live data from the sensors and systems
                        already operating on your site. Gas monitoring stations, proximity detection
                        systems, ground vibration sensors, ventilation flow meters, and environmental
                        monitors could all feed directly into the Digital Twin. Each data point would be
                        mapped to a specific level and structure, so the 3D visualization updates in
                        real time as conditions change underground.
                    </p>
                    <p class="help-prose">
                        Rather than checking separate screens for gas readings, ventilation status, and
                        equipment alerts, operators would see a single unified view where all data
                        converges. When a gas sensor spikes on Level 4, the corresponding level in the
                        3D model would immediately reflect the change in risk color, an alert would
                        appear in the panel, and the AI engine would begin evaluating the situation
                        for cascading risks.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> Access to sensor APIs or SCADA system endpoints, data format documentation, and network access from the platform to your data sources.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">psychology</span>
                        AI-Powered Risk Intelligence
                    </h3>
                    <p class="help-prose">
                        The AI engine illustrated in the insights panel would go well beyond pattern
                        detection. Once trained on your site's historical incident data, shift reports,
                        and sensor logs, it could identify risk signatures specific to your geology,
                        equipment fleet, and operational patterns. The system would learn what a normal
                        shift looks like at your mine, and flag deviations before they escalate into
                        incidents.
                    </p>
                    <p class="help-prose">
                        Predictive capabilities would include forecasting equipment failures based on
                        vibration and temperature trends, identifying high-risk time windows during
                        shift changes or weather events, and recommending optimal timing for blasting
                        operations based on personnel distribution and environmental conditions. Every
                        insight would include contributing factors and recommended actions, turning
                        data into decisions.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> Historical incident records, sensor data archives (12+ months recommended), and collaboration with your safety team to validate and calibrate the risk model.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">people</span>
                        Personnel and Equipment Tracking
                    </h3>
                    <p class="help-prose">
                        The Digital Twin could display the real-time position of every worker and vehicle
                        underground. By integrating with your existing tracking infrastructure — whether
                        RFID tag readers, UWB positioning systems, or GPS units on surface equipment —
                        the platform would show who is on each level, which equipment is active, and how
                        personnel are distributed across the mine at any given moment.
                    </p>
                    <p class="help-prose">
                        This capability would transform emergency response. In an evacuation scenario,
                        control room operators could instantly see how many people are on each level,
                        identify the nearest refuge chambers, and track movement toward exits. During
                        normal operations, it would provide visibility into crew distribution, help
                        ensure exclusion zones are respected, and support compliance with maximum
                        occupancy requirements.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> Personnel tracking system with API access (e.g., MineTrax, Strata Proximity, Newtrax), or RFID/UWB infrastructure data feeds.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">integration_instructions</span>
                        Integration with Your Existing Systems
                    </h3>
                    <p class="help-prose">
                        The platform would connect to the systems your teams already use. Fleet
                        management software like Caterpillar MineStar or Wenco could feed equipment
                        status and location data. ERP systems like SAP or Pronto could provide
                        maintenance schedules and work orders. Shift management tools could supply
                        crew rosters and task assignments. The Digital Twin would become the central
                        interface that ties these disparate systems into a coherent operational picture.
                    </p>
                    <p class="help-prose">
                        Rather than replacing any existing tools, the platform would sit on top as an
                        intelligent visualization layer. It would read data from your systems, enrich it
                        with AI analysis, and present it through an interface that makes complex
                        multi-source information immediately understandable. Your teams would continue
                        using their familiar tools while gaining a new dimension of situational awareness.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> API documentation for your key operational systems, network architecture review, and identification of priority data sources for initial integration.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">devices</span>
                        Multi-Platform Deployment
                    </h3>
                    <p class="help-prose">
                        Built as a web application, the Digital Twin could be deployed across your
                        entire operation without installing specialized software. Control rooms could
                        display it on large wall-mounted screens for continuous monitoring. Supervisors
                        could access it on tablets during underground inspections. Safety managers could
                        review historical data from their office desktops. And with progressive web app
                        capabilities, a mobile version could provide essential alerts and status
                        information to field personnel.
                    </p>
                    <p class="help-prose">
                        For sites with limited connectivity underground, the platform could support edge
                        deployment with local data caching. Critical safety information would remain
                        accessible even during network interruptions, and data would synchronize
                        automatically when connectivity is restored. The system would be designed for
                        the realities of mining environments, not just office networks.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> Assessment of network infrastructure (above and below ground), identification of deployment endpoints, and definition of access roles and permissions.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">verified_user</span>
                        Compliance and Reporting
                    </h3>
                    <p class="help-prose">
                        Every data point, alert, and AI insight captured by the platform would be stored
                        with full traceability. This would create a comprehensive audit trail that
                        supports regulatory compliance and incident investigation. Shift handover reports
                        could be generated automatically from the platform's historical timeline,
                        ensuring that nothing is lost between crews. When an incident occurs, the
                        playback feature would allow investigators to reconstruct exactly what data was
                        available and what actions were taken, minute by minute.
                    </p>
                    <div class="help-requirements">
                        <span class="material-symbols-rounded">checklist</span>
                        <strong>What's needed:</strong> Regulatory reporting requirements for your jurisdiction, existing report templates, and compliance team input on data retention policies.
                    </div>
                </div>

                <div class="help-section">
                    <h3>
                        <span class="material-symbols-rounded">sports_esports</span>
                        Exploring New Visual Approaches
                    </h3>
                    <p class="help-prose">
                        Beyond the current 3D schematic view, we could evolve the interface toward a
                        SimCity-style isometric visualization where mine infrastructure, equipment, and
                        personnel are represented as interactive objects on a detailed terrain map. This
                        approach would make the Digital Twin feel more intuitive and engaging, turning
                        complex operational data into a visual language that anyone can understand at a glance.
                    </p>
                    <a href="https://city-wow.netlify.app" target="_blank" rel="noopener noreferrer" class="help-preview-link">
                        <img src="assets/city-wow-preview.png" alt="City-Wow SimCity-style 3D interface example" class="help-preview-img" />
                        <span class="help-preview-caption">
                            <span class="material-symbols-rounded">open_in_new</span>
                            View City-Wow demo — an example of SimCity-style 3D interface
                        </span>
                    </a>
                    <div class="help-preview-gallery">
                        <img src="assets/3d-city-overview.png" alt="3D city overview with labeled buildings and streets" class="help-preview-img" />
                        <img src="assets/3d-building-detail.png" alt="Detailed 3D building close-up view" class="help-preview-img" />
                    </div>
                    <p class="help-prose">
                        These examples show how 3D environments can represent infrastructure at different
                        zoom levels — from a site-wide overview down to individual building detail. This is
                        just one possible direction. Other ideas can be explored — from realistic terrain
                        rendering to augmented-reality overlays, dashboard-first layouts, or entirely custom
                        visual paradigms designed around your operation's specific needs.
                    </p>
                </div>

                <div class="help-section help-cta">
                    <h3>
                        <span class="material-symbols-rounded">handshake</span>
                        Let's Talk About Your Site
                    </h3>
                    <p class="help-prose">
                        Every mining operation is unique. The geology, equipment fleet, sensor
                        infrastructure, and operational workflows at your site would shape how this
                        platform is configured and which data sources are connected first. The best
                        starting point is a conversation about your current challenges, the systems you
                        already have in place, and what visibility you wish you had in your control room.
                        From there, we can define what a tailored deployment would look like for your
                        operation.
                    </p>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Close button
        const closeBtn = this.element.querySelector('.help-close');
        closeBtn.addEventListener('click', () => this.hide());

        // Tab clicks
        const tabs = this.element.querySelectorAll('.help-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Click outside to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        });

        // ESC to close
        this.escHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }

    setupKeyboardShortcut() {
        this.keyHandler = (e) => {
            // Don't trigger if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            // ? key to toggle help (Shift + / on most keyboards)
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                this.toggle();
            }
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    switchTab(tabId) {
        this.activeTab = tabId;

        // Update tab buttons
        const tabs = this.element.querySelectorAll('.help-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update content panels
        const contents = this.element.querySelectorAll('.help-tab-content');
        contents.forEach(content => {
            content.classList.toggle('active', content.dataset.content === tabId);
        });
    }

    show() {
        this.isVisible = true;
        this.element.classList.add('visible');
    }

    hide() {
        this.isVisible = false;
        this.element.classList.remove('visible');
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    destroy() {
        document.removeEventListener('keydown', this.keyHandler);
        document.removeEventListener('keydown', this.escHandler);
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
