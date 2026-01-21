// js/interaction/KeyboardNavigation.js
/**
 * Keyboard navigation handler for multi-structure mine visualization.
 * Provides shortcuts for navigating between structures and view modes.
 *
 * Keyboard shortcuts:
 * - Esc: Return to site view (unfocus structure)
 * - 1-9: Focus on structure by index
 * - 0: Return to site view
 * - ?: Show/hide keyboard shortcuts help
 */
export class KeyboardNavigation {
    /**
     * Create a new KeyboardNavigation handler.
     * @param {StateManager} stateManager - State manager for view mode control
     * @param {CameraController} cameraController - Camera controller for animations
     * @param {StructureManager} structureManager - Optional structure manager for 3D
     */
    constructor(stateManager, cameraController, structureManager = null) {
        this.stateManager = stateManager;
        this.cameraController = cameraController;
        this.structureManager = structureManager;

        // Callbacks for extended navigation
        this.onStructureFocus = null;
        this.onSiteView = null;
        this.onHelpToggle = null;

        this.enabled = true;
        this.helpVisible = false;

        this.bindEvents();
    }

    /**
     * Bind keyboard event listeners.
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Handle keydown events.
     */
    handleKeyDown(event) {
        // Skip if disabled or if user is typing in an input
        if (!this.enabled) return;
        if (this.isInputFocused()) return;

        const key = event.key;

        switch (key) {
            case 'Escape':
                this.returnToSiteView();
                event.preventDefault();
                break;

            case '0':
                this.returnToSiteView();
                event.preventDefault();
                break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                this.focusStructureByIndex(parseInt(key) - 1);
                event.preventDefault();
                break;

            case '?':
                this.toggleHelp();
                event.preventDefault();
                break;

            default:
                break;
        }
    }

    /**
     * Check if user is focused on an input element.
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        if (!activeElement) return false;

        const tagName = activeElement.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    }

    /**
     * Return to site overview (unfocus any structure).
     */
    returnToSiteView() {
        this.stateManager.setFocusedStructure(null);

        // Animate camera to site view
        if (this.cameraController) {
            this.cameraController.showSiteOverview();
        }

        // Update 3D structure manager
        if (this.structureManager) {
            this.structureManager.setFocusMode(null);
        }

        // Trigger callback
        if (this.onSiteView) {
            this.onSiteView();
        }
    }

    /**
     * Focus on a structure by index (0-based).
     */
    focusStructureByIndex(index) {
        const structures = Array.from(this.stateManager.getStructures().values());

        if (index < 0 || index >= structures.length) {
            return; // Invalid index
        }

        const structure = structures[index];
        const code = structure.code;

        this.stateManager.setFocusedStructure(code);

        // Animate camera to structure
        if (this.cameraController && this.structureManager) {
            const worldPos = this.structureManager.getStructureWorldPosition(code);
            if (worldPos) {
                this.cameraController.focusOnStructure(worldPos);
            }
        }

        // Update 3D structure manager opacity
        if (this.structureManager) {
            this.structureManager.setFocusMode(code);
        }

        // Trigger callback
        if (this.onStructureFocus) {
            this.onStructureFocus(code, structure);
        }
    }

    /**
     * Toggle keyboard shortcuts help overlay.
     */
    toggleHelp() {
        this.helpVisible = !this.helpVisible;

        // Find or create help overlay
        let helpEl = document.querySelector('.shortcuts-hint');
        if (!helpEl) {
            helpEl = this.createHelpOverlay();
            document.body.appendChild(helpEl);
        }

        helpEl.classList.toggle('visible', this.helpVisible);

        // Trigger callback
        if (this.onHelpToggle) {
            this.onHelpToggle(this.helpVisible);
        }
    }

    /**
     * Create help overlay element.
     */
    createHelpOverlay() {
        const structures = Array.from(this.stateManager.getStructures().values());
        const structureHints = structures.slice(0, 9).map((s, i) =>
            `<b>${i + 1}</b> ${s.name}`
        ).join(' • ');

        const el = document.createElement('div');
        el.className = 'shortcuts-hint';
        el.innerHTML = `
            <b>Esc</b> Site View • ${structureHints} • <b>?</b> Help
        `;
        return el;
    }

    /**
     * Update help overlay content (e.g., when structures change).
     */
    updateHelpOverlay() {
        const helpEl = document.querySelector('.shortcuts-hint');
        if (helpEl) {
            helpEl.remove();
        }
        // Will be recreated on next toggle
    }

    /**
     * Set callback for structure focus.
     * @param {Function} callback - (code, structure) => void
     */
    setStructureFocusHandler(callback) {
        this.onStructureFocus = callback;
    }

    /**
     * Set callback for site view return.
     * @param {Function} callback - () => void
     */
    setSiteViewHandler(callback) {
        this.onSiteView = callback;
    }

    /**
     * Set callback for help toggle.
     * @param {Function} callback - (visible) => void
     */
    setHelpToggleHandler(callback) {
        this.onHelpToggle = callback;
    }

    /**
     * Enable keyboard navigation.
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable keyboard navigation.
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Check if keyboard navigation is enabled.
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Show help hint briefly on startup.
     */
    showHintBriefly(duration = 3000) {
        let helpEl = document.querySelector('.shortcuts-hint');
        if (!helpEl) {
            helpEl = this.createHelpOverlay();
            document.body.appendChild(helpEl);
        }

        helpEl.classList.add('visible');
        setTimeout(() => {
            if (!this.helpVisible) {
                helpEl.classList.remove('visible');
            }
        }, duration);
    }
}
