// js/interaction/TooltipManager.js
import { RiskResolver } from '../data/RiskResolver.js';

export class TooltipManager {
    constructor() {
        this.element = document.getElementById('tooltip');
    }

    show(userData, x, y) {
        if (userData.type === 'level') {
            this.element.innerHTML = this.renderLevelTooltip(userData);
        } else if (userData.type === 'activity') {
            this.element.innerHTML = this.renderActivityTooltip(userData);
        }

        // Position with boundary checking
        const rect = this.element.getBoundingClientRect();
        let posX = x + 15;
        let posY = y + 15;

        if (posX + 320 > window.innerWidth) {
            posX = x - 320 - 15;
        }
        if (posY + rect.height > window.innerHeight) {
            posY = y - rect.height - 15;
        }

        this.element.style.left = `${posX}px`;
        this.element.style.top = `${posY}px`;
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }

    renderLevelTooltip(data) {
        const activitiesHtml = data.activities.map(a => `
            <div class="activity-row">
                <span class="risk-indicator ${a.risk}"></span>
                <span>${a.name}</span>
                <span class="status-badge">${a.status}</span>
            </div>
        `).join('');

        return `
            <div class="tooltip-header">
                <span class="risk-indicator ${data.risk}"></span>
                <strong>Level ${data.levelNumber}: ${data.levelName}</strong>
            </div>
            <div>Overall Risk: <strong style="color: ${RiskResolver.getRiskColorCSS(data.risk)}">${data.risk.toUpperCase()}</strong></div>
            <div class="tooltip-activities">
                <div style="margin-bottom: 6px; color: #888;">Activities:</div>
                ${activitiesHtml}
            </div>
        `;
    }

    renderActivityTooltip(data) {
        const activity = data.activity;
        return `
            <div class="tooltip-header">
                <span class="risk-indicator ${activity.risk}"></span>
                <strong>${activity.name}</strong>
            </div>
            <div>Risk: <strong style="color: ${RiskResolver.getRiskColorCSS(activity.risk)}">${activity.risk.toUpperCase()}</strong></div>
            <div>Status: ${activity.status}</div>
        `;
    }
}
