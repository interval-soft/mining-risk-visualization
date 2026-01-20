// js/ui/AlertsPanel.js
// Alerts panel for displaying and managing risk alerts

export class AlertsPanel {
    constructor(container, apiClient, stateManager) {
        this.container = container;
        this.apiClient = apiClient;
        this.stateManager = stateManager;

        this.alerts = [];
        this.filteredAlerts = [];
        this.filters = {
            status: 'all',
            level: 'all'
        };

        this.onAlertClick = null; // Callback for timeline jump

        this.render();
        this.bindEvents();
        this.loadAlerts();
    }

    render() {
        this.container.innerHTML = `
            <div class="alerts-panel">
                <div class="alerts-header">
                    <h3>Alerts</h3>
                    <span class="alerts-count">0</span>
                </div>

                <div class="alerts-filters">
                    <select class="filter-status">
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                    </select>

                    <select class="filter-level">
                        <option value="all">All Levels</option>
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                        <option value="4">Level 4</option>
                        <option value="5">Level 5</option>
                    </select>
                </div>

                <div class="alerts-list"></div>
            </div>
        `;

        this.listContainer = this.container.querySelector('.alerts-list');
        this.countBadge = this.container.querySelector('.alerts-count');
        this.statusFilter = this.container.querySelector('.filter-status');
        this.levelFilter = this.container.querySelector('.filter-level');
    }

    bindEvents() {
        this.statusFilter.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });

        this.levelFilter.addEventListener('change', (e) => {
            this.filters.level = e.target.value;
            this.applyFilters();
        });

        // Listen to state changes to refresh alerts
        this.stateManager.addEventListener('stateChanged', () => {
            this.loadAlerts();
        });
    }

    async loadAlerts() {
        try {
            const response = await this.apiClient.getAlerts();
            this.alerts = response.alerts || [];
            this.applyFilters();
        } catch (error) {
            console.warn('Failed to load alerts:', error);
            // Use mock alerts for development
            this.alerts = this.getMockAlerts();
            this.applyFilters();
        }
    }

    getMockAlerts() {
        const now = new Date();
        return [
            {
                id: '1',
                timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
                levelNumber: 3,
                riskScore: 100,
                status: 'active',
                cause: 'Blast fired - awaiting reentry clearance',
                explanation: 'Level 3 is in lockout condition after blast detonation. No personnel may enter until reentry clearance is issued.',
                severity: 'critical'
            },
            {
                id: '2',
                timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
                levelNumber: 4,
                riskScore: 72,
                status: 'acknowledged',
                cause: 'Gas concentration above threshold',
                explanation: 'Methane detected at 1.2% in Stope 4B. Ventilation increased.',
                acknowledgedAt: new Date(now - 5400000).toISOString(),
                acknowledgedBy: 'J. Smith',
                severity: 'high'
            },
            {
                id: '3',
                timestamp: new Date(now - 14400000).toISOString(), // 4 hours ago
                levelNumber: 2,
                riskScore: 45,
                status: 'resolved',
                cause: 'Proximity alarm threshold exceeded',
                explanation: '6 proximity events detected in 15 minutes near active equipment.',
                resolvedAt: new Date(now - 10800000).toISOString(),
                severity: 'medium'
            },
            {
                id: '4',
                timestamp: new Date(now - 1800000).toISOString(), // 30 min ago
                levelNumber: 3,
                riskScore: 65,
                status: 'active',
                cause: 'Blast scheduled within 30 minutes',
                explanation: 'Scheduled blast at 14:30 in Stope 3A. Evacuation in progress.',
                severity: 'high'
            }
        ];
    }

    applyFilters() {
        this.filteredAlerts = this.alerts.filter(alert => {
            const statusMatch = this.filters.status === 'all' ||
                               alert.status === this.filters.status;
            const levelMatch = this.filters.level === 'all' ||
                              alert.levelNumber === parseInt(this.filters.level);
            return statusMatch && levelMatch;
        });

        // Sort by timestamp (newest first)
        this.filteredAlerts.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        this.renderAlerts();
    }

    renderAlerts() {
        // Update count badge
        const activeCount = this.alerts.filter(a => a.status === 'active').length;
        this.countBadge.textContent = activeCount;
        this.countBadge.className = `alerts-count ${activeCount > 0 ? 'has-active' : ''}`;

        if (this.filteredAlerts.length === 0) {
            this.listContainer.innerHTML = `
                <div class="alerts-empty">No alerts match filters</div>
            `;
            return;
        }

        this.listContainer.innerHTML = this.filteredAlerts
            .map(alert => this.renderAlertItem(alert))
            .join('');

        // Bind click events for alert items
        this.listContainer.querySelectorAll('.alert-item').forEach((el, index) => {
            const alert = this.filteredAlerts[index];

            // Jump to time on click
            el.addEventListener('click', (e) => {
                if (!e.target.closest('.alert-actions')) {
                    this.jumpToAlertTime(alert);
                }
            });

            // Acknowledge button
            const ackBtn = el.querySelector('.btn-acknowledge');
            if (ackBtn) {
                ackBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showAcknowledgeDialog(alert);
                });
            }
        });
    }

    renderAlertItem(alert) {
        const time = new Date(alert.timestamp);
        const timeStr = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const dateStr = time.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        const severityClass = this.getSeverityClass(alert);
        const statusClass = alert.status;

        return `
            <div class="alert-item ${statusClass}" data-alert-id="${alert.id}">
                <div class="alert-severity ${severityClass}"></div>
                <div class="alert-content">
                    <div class="alert-header">
                        <span class="alert-level">L${alert.levelNumber}</span>
                        <span class="alert-score">Risk: ${alert.riskScore}</span>
                        <span class="alert-time">${timeStr} ${dateStr}</span>
                    </div>
                    <div class="alert-cause">${alert.cause}</div>
                    ${alert.status === 'acknowledged' ? `
                        <div class="alert-ack-info">
                            Acknowledged by ${alert.acknowledgedBy || 'Unknown'}
                        </div>
                    ` : ''}
                </div>
                <div class="alert-actions">
                    ${alert.status === 'active' ? `
                        <button class="btn-acknowledge" title="Acknowledge">
                            <span class="icon">✓</span>
                        </button>
                    ` : ''}
                    <span class="alert-status-badge ${statusClass}">${alert.status}</span>
                </div>
            </div>
        `;
    }

    getSeverityClass(alert) {
        if (alert.severity) return `severity-${alert.severity}`;
        // Derive from risk score
        if (alert.riskScore >= 90) return 'severity-critical';
        if (alert.riskScore >= 71) return 'severity-high';
        if (alert.riskScore >= 31) return 'severity-medium';
        return 'severity-low';
    }

    jumpToAlertTime(alert) {
        const timestamp = new Date(alert.timestamp);
        this.stateManager.setViewTime(timestamp);

        // Callback for additional handling (e.g., highlight level)
        if (this.onAlertClick) {
            this.onAlertClick(alert);
        }
    }

    showAcknowledgeDialog(alert) {
        const comment = prompt('Add a comment (optional):');
        if (comment !== null) { // User didn't cancel
            this.acknowledgeAlert(alert.id, comment);
        }
    }

    async acknowledgeAlert(alertId, comment) {
        try {
            await this.apiClient.acknowledgeAlert(alertId, comment);

            // Update local state
            const alert = this.alerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'acknowledged';
                alert.acknowledgedAt = new Date().toISOString();
                alert.acknowledgedBy = 'Current User';
                if (comment) {
                    alert.acknowledgedComment = comment;
                }
            }

            this.applyFilters();
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
            // Optimistic update for demo
            const alert = this.alerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'acknowledged';
                alert.acknowledgedAt = new Date().toISOString();
                alert.acknowledgedBy = 'Current User';
            }
            this.applyFilters();
        }
    }

    /**
     * Set callback for alert clicks (for level highlighting, etc.)
     */
    setAlertClickHandler(handler) {
        this.onAlertClick = handler;
    }

    /**
     * Refresh alerts from API
     */
    refresh() {
        this.loadAlerts();
    }

    /**
     * Get count of active alerts
     */
    getActiveCount() {
        return this.alerts.filter(a => a.status === 'active').length;
    }
}
