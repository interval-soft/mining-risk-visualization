// js/ui/AIInsightsPanel.js
// AI Insights panel for displaying anomaly detections and AI-generated observations

export class AIInsightsPanel {
    constructor(container, apiClient, stateManager) {
        this.container = container;
        this.apiClient = apiClient;
        this.stateManager = stateManager;

        this.insights = [];
        this.filteredInsights = [];
        this.filters = {
            severity: 'all',
            level: 'all'
        };
        this.isLoading = false;
        this.pollingInterval = null;

        this.onInsightClick = null; // Callback for level highlighting

        this.render();
        this.bindEvents();
        this.loadInsights();
        this.startPolling();
    }

    render() {
        this.container.innerHTML = `
            <div class="ai-insights-panel">
                <div class="ai-insights-header">
                    <h3><span class="ai-badge">AI</span> Insights</h3>
                    <span class="insights-count">0</span>
                </div>

                <div class="ai-insights-filters">
                    <select class="filter-severity">
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
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

                <div class="ai-insights-list"></div>
            </div>
        `;

        this.listContainer = this.container.querySelector('.ai-insights-list');
        this.countBadge = this.container.querySelector('.insights-count');
        this.severityFilter = this.container.querySelector('.filter-severity');
        this.levelFilter = this.container.querySelector('.filter-level');
    }

    bindEvents() {
        this.severityFilter.addEventListener('change', (e) => {
            this.filters.severity = e.target.value;
            this.applyFilters();
        });

        this.levelFilter.addEventListener('change', (e) => {
            this.filters.level = e.target.value;
            this.applyFilters();
        });

        // Listen to state changes
        this.stateManager?.addEventListener('stateChanged', () => {
            // Could refresh insights on state change if needed
        });

        // Listen to demo mode insight injections
        this.stateManager?.addEventListener('insightsChanged', (e) => {
            if (e.detail?.insights) {
                this.insights = e.detail.insights;
                this.applyFilters();
            }
        });
    }

    async loadInsights() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            // Check if API client has the method (will be added in Task 20-21)
            if (typeof this.apiClient.getAIInsights === 'function') {
                const response = await this.apiClient.getAIInsights({ status: 'active' });
                this.insights = response.insights || [];
            } else {
                // Fallback to direct fetch if method not yet added
                const response = await fetch('/api/ai/insights?status=active');
                if (response.ok) {
                    const data = await response.json();
                    this.insights = data.insights || [];
                } else {
                    this.insights = this.getMockInsights();
                }
            }
            this.applyFilters();
        } catch (error) {
            console.warn('Failed to load AI insights:', error);
            this.insights = this.getMockInsights();
            this.applyFilters();
        } finally {
            this.isLoading = false;
        }
    }

    getMockInsights() {
        const now = new Date();
        return [
            {
                id: 'mock-1',
                timestamp: new Date(now - 900000).toISOString(), // 15 min ago
                insightType: 'anomaly',
                levelNumber: 3,
                severity: 'high',
                confidence: 0.85,
                title: 'Methane reading elevated',
                explanation: 'Methane sensor reading of 0.95 ppm is 2.3 standard deviations above normal baseline for Level 3.',
                contributingFactors: ['Recent blasting activity', 'Reduced ventilation flow'],
                recommendedAction: 'Verify sensor calibration and increase ventilation monitoring frequency.',
                status: 'active'
            },
            {
                id: 'mock-2',
                timestamp: new Date(now - 1800000).toISOString(), // 30 min ago
                insightType: 'anomaly',
                levelNumber: 4,
                severity: 'medium',
                confidence: 0.72,
                title: 'Unusual proximity alert frequency',
                explanation: 'Proximity alerts occurred 5 times in the last hour, compared to expected 2.',
                contributingFactors: ['Shift change', 'Equipment repositioning'],
                recommendedAction: 'Review crew movement patterns and equipment spacing.',
                status: 'active'
            },
            {
                id: 'mock-3',
                timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
                insightType: 'anomaly',
                levelNumber: 5,
                severity: 'low',
                confidence: 0.65,
                title: 'Ventilation efficiency reduced',
                explanation: 'Air flow measurement slightly below expected range for current operations.',
                contributingFactors: ['Filter maintenance due'],
                recommendedAction: 'Schedule filter inspection during next maintenance window.',
                status: 'active'
            }
        ];
    }

    applyFilters() {
        this.filteredInsights = this.insights.filter(insight => {
            const severityMatch = this.filters.severity === 'all' ||
                                 insight.severity === this.filters.severity;
            const levelMatch = this.filters.level === 'all' ||
                              insight.levelNumber === parseInt(this.filters.level);
            return severityMatch && levelMatch;
        });

        // Sort by severity (critical first), then by timestamp
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        this.filteredInsights.sort((a, b) => {
            const severityDiff = (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
            if (severityDiff !== 0) return severityDiff;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        this.renderInsights();
    }

    renderInsights() {
        // Update count badge
        const activeCount = this.insights.filter(i => i.status === 'active').length;
        this.countBadge.textContent = activeCount;
        this.countBadge.className = `insights-count ${activeCount > 0 ? 'has-active' : ''}`;

        if (this.filteredInsights.length === 0) {
            this.listContainer.innerHTML = `
                <div class="ai-insights-empty">No AI insights at this time</div>
            `;
            return;
        }

        this.listContainer.innerHTML = this.filteredInsights
            .map(insight => this.renderInsightCard(insight))
            .join('');

        // Bind events for insight cards
        this.listContainer.querySelectorAll('.ai-insight-card').forEach((el, index) => {
            const insight = this.filteredInsights[index];

            // Click to highlight level
            el.addEventListener('click', (e) => {
                if (!e.target.closest('.insight-feedback')) {
                    this.handleInsightClick(insight);
                }
            });

            // Feedback buttons
            const agreeBtn = el.querySelector('.btn-feedback[data-type="agree"]');
            const dismissBtn = el.querySelector('.btn-feedback[data-type="dismiss"]');

            if (agreeBtn) {
                agreeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.submitFeedback(insight.id, 'agree');
                });
            }
            if (dismissBtn) {
                dismissBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.submitFeedback(insight.id, 'dismiss');
                });
            }
        });
    }

    renderInsightCard(insight) {
        const severityColors = {
            critical: '#F44336',
            high: '#FF9800',
            medium: '#FFC107',
            low: '#4CAF50'
        };

        const time = new Date(insight.timestamp);
        const timeStr = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const confidencePercent = Math.round((insight.confidence || 0) * 100);

        return `
            <div class="ai-insight-card" data-id="${insight.id}">
                <div class="insight-severity" style="background: ${severityColors[insight.severity] || '#666'}"></div>
                <div class="insight-content">
                    <div class="insight-header">
                        <span class="insight-level">L${insight.levelNumber}</span>
                        <span class="insight-confidence" title="AI Confidence: ${confidencePercent}%">
                            ${confidencePercent}%
                        </span>
                        <span class="insight-time">${timeStr}</span>
                    </div>
                    <div class="insight-title">${this.escapeHtml(insight.title)}</div>
                    <div class="insight-explanation">${this.escapeHtml(insight.explanation)}</div>
                    ${insight.contributingFactors && insight.contributingFactors.length > 0 ? `
                        <div class="insight-factors">
                            <strong>Factors:</strong> ${insight.contributingFactors.map(f => this.escapeHtml(f)).join(', ')}
                        </div>
                    ` : ''}
                    ${insight.recommendedAction ? `
                        <div class="insight-action">
                            <strong>Recommended:</strong> ${this.escapeHtml(insight.recommendedAction)}
                        </div>
                    ` : ''}
                    <div class="insight-feedback">
                        <button class="btn-feedback" data-type="agree" title="This was helpful">
                            <span>👍</span>
                        </button>
                        <button class="btn-feedback" data-type="dismiss" title="Not helpful / incorrect">
                            <span>👎</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    handleInsightClick(insight) {
        if (this.onInsightClick) {
            this.onInsightClick(insight);
        }
    }

    async submitFeedback(insightId, feedbackType) {
        const card = this.listContainer.querySelector(`[data-id="${insightId}"]`);
        const feedbackContainer = card?.querySelector('.insight-feedback');

        try {
            // Try API method first
            if (typeof this.apiClient.submitInsightFeedback === 'function') {
                await this.apiClient.submitInsightFeedback(insightId, feedbackType);
            } else {
                // Direct fetch fallback
                await fetch(`/api/ai/insights/${insightId}/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: feedbackType })
                });
            }

            // Update UI
            if (feedbackContainer) {
                feedbackContainer.innerHTML = '<span class="feedback-thanks">Thanks for feedback!</span>';
            }

            // If dismissed, remove from list after delay
            if (feedbackType === 'dismiss') {
                setTimeout(() => {
                    this.insights = this.insights.filter(i => i.id !== insightId);
                    this.applyFilters();
                }, 1500);
            }

        } catch (error) {
            console.error('Failed to submit feedback:', error);
            // Still show thanks in UI for better UX
            if (feedbackContainer) {
                feedbackContainer.innerHTML = '<span class="feedback-thanks">Feedback noted</span>';
            }
        }
    }

    /**
     * Set callback for insight clicks (for level highlighting)
     */
    setInsightClickHandler(handler) {
        this.onInsightClick = handler;
    }

    /**
     * Start polling for new insights
     */
    startPolling(intervalMs = 60000) {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.pollingInterval = setInterval(() => this.loadInsights(), intervalMs);
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Manual refresh
     */
    refresh() {
        this.loadInsights();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.stopPolling();
    }
}
