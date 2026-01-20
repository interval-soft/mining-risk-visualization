// js/ui/FilterPanel.js
export class FilterPanel {
    constructor(levelFactory, materialSystem, iconManager) {
        this.levelFactory = levelFactory;
        this.materialSystem = materialSystem;
        this.iconManager = iconManager;

        this.activeFilters = new Set(['high', 'medium', 'low']);

        this.element = document.getElementById('filter-panel');
        this.render();
        this.attachListeners();
    }

    render() {
        this.element.innerHTML = `
            <div class="filter-section">
                <h3>Filter by Risk</h3>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-risk="high" style="--filter-color: #F44336;">
                        <span class="indicator"></span>High
                    </button>
                    <button class="filter-btn active" data-risk="medium" style="--filter-color: #FFC107;">
                        <span class="indicator"></span>Medium
                    </button>
                    <button class="filter-btn active" data-risk="low" style="--filter-color: #4CAF50;">
                        <span class="indicator"></span>Low
                    </button>
                </div>
            </div>
        `;
    }

    attachListeners() {
        this.element.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const risk = e.currentTarget.dataset.risk;
                this.toggleFilter(risk, e.currentTarget);
            });
        });
    }

    toggleFilter(risk, button) {
        if (this.activeFilters.has(risk)) {
            this.activeFilters.delete(risk);
            button.classList.remove('active');
        } else {
            this.activeFilters.add(risk);
            button.classList.add('active');
        }

        this.applyFilters();
    }

    applyFilters() {
        const allLevels = this.levelFactory.getAllLevels();

        allLevels.forEach(mesh => {
            const levelRisk = mesh.userData.risk;
            const visible = this.activeFilters.has(levelRisk);

            mesh.visible = visible;
            this.iconManager.setVisibilityForLevel(mesh.userData.levelNumber, visible);
        });
    }
}
