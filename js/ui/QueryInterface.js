// js/ui/QueryInterface.js
// Natural language query interface for asking questions about the mine state

export class QueryInterface {
    constructor(container, apiClient) {
        this.container = container;
        this.apiClient = apiClient;
        this.history = [];
        this.isLoading = false;
        this.isVisible = true;

        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="query-interface">
                <div class="query-header">
                    <h3><span class="ai-badge">AI</span> Ask a Question</h3>
                    <button class="query-toggle" title="Minimize">−</button>
                </div>
                <div class="query-body">
                    <div class="query-input-container">
                        <input type="text" 
                               id="query-input"
                               placeholder="e.g., Why is Level 3 high risk?"
                               maxlength="500"
                               autocomplete="off">
                        <button id="query-submit" class="btn-query" title="Ask">
                            <span class="query-icon">→</span>
                            <span class="query-loading-icon" style="display:none;">⟳</span>
                        </button>
                    </div>
                    <div class="query-response"></div>
                    <div class="query-suggestions"></div>
                </div>
            </div>
        `;

        this.inputEl = this.container.querySelector('#query-input');
        this.submitBtn = this.container.querySelector('#query-submit');
        this.responseEl = this.container.querySelector('.query-response');
        this.suggestionsEl = this.container.querySelector('.query-suggestions');
        this.bodyEl = this.container.querySelector('.query-body');
        this.toggleBtn = this.container.querySelector('.query-toggle');

        // Show initial suggestions
        this.renderSuggestions([
            'What is the current mine status?',
            'Which level has the highest risk?',
            'Are there any active alerts?'
        ]);
    }

    bindEvents() {
        // Submit on button click
        this.submitBtn.addEventListener('click', () => this.submitQuery());

        // Submit on Enter key
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                this.submitQuery();
            }
        });

        // Toggle visibility
        this.toggleBtn.addEventListener('click', () => this.toggleVisibility());

        // Character count indicator (optional visual feedback)
        this.inputEl.addEventListener('input', () => {
            const remaining = 500 - this.inputEl.value.length;
            if (remaining < 50) {
                this.inputEl.style.borderColor = remaining < 0 ? '#F44336' : '#FFC107';
            } else {
                this.inputEl.style.borderColor = '';
            }
        });
    }

    toggleVisibility() {
        this.isVisible = !this.isVisible;
        this.bodyEl.style.display = this.isVisible ? 'block' : 'none';
        this.toggleBtn.textContent = this.isVisible ? '−' : '+';
        this.toggleBtn.title = this.isVisible ? 'Minimize' : 'Expand';
    }

    async submitQuery() {
        const queryText = this.inputEl.value.trim();
        
        if (!queryText || queryText.length < 3) {
            this.showError('Please enter a question (at least 3 characters)');
            return;
        }

        if (this.isLoading) return;

        this.setLoading(true);
        this.responseEl.innerHTML = '<div class="query-loading">Thinking...</div>';

        try {
            let result;
            
            // Try API client method first
            if (typeof this.apiClient.queryAI === 'function') {
                result = await this.apiClient.queryAI(queryText);
            } else {
                // Direct fetch fallback
                const response = await fetch('/api/ai/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryText })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Query failed');
                }
                
                result = await response.json();
            }

            // Add to history
            this.history.unshift({
                query: queryText,
                answer: result.answer,
                timestamp: new Date()
            });

            // Keep history limited
            if (this.history.length > 10) {
                this.history.pop();
            }

            this.renderResponse(result);
            this.renderSuggestions(result.suggestedFollowups || []);
            this.inputEl.value = '';

        } catch (error) {
            console.error('Query failed:', error);
            this.showError(error.message || 'Failed to process query. Please try again.');
            this.renderSuggestions([
                'What is the current mine status?',
                'Are there any active alerts?',
                'Which level is safest?'
            ]);
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.submitBtn.disabled = loading;
        this.inputEl.disabled = loading;
        
        const icon = this.submitBtn.querySelector('.query-icon');
        const loadingIcon = this.submitBtn.querySelector('.query-loading-icon');
        
        icon.style.display = loading ? 'none' : 'inline';
        loadingIcon.style.display = loading ? 'inline' : 'none';
        
        if (loading) {
            loadingIcon.classList.add('spinning');
        } else {
            loadingIcon.classList.remove('spinning');
        }
    }

    renderResponse(result) {
        const confidencePercent = Math.round((result.confidence || 0) * 100);
        const confidenceClass = confidencePercent >= 70 ? 'high' : 
                               confidencePercent >= 50 ? 'medium' : 'low';

        this.responseEl.innerHTML = `
            <div class="query-answer">
                <div class="answer-text">${this.escapeHtml(result.answer)}</div>
                ${result.citations && result.citations.length > 0 ? `
                    <div class="answer-citations">
                        <strong>Sources:</strong>
                        ${result.citations.map(c => `
                            <span class="citation" title="${this.escapeHtml(JSON.stringify(c))}">
                                ${this.escapeHtml(c.reference || c.type)}
                                ${c.timestamp ? ` (${new Date(c.timestamp).toLocaleTimeString()})` : ''}
                            </span>
                        `).join(' ')}
                    </div>
                ` : ''}
                <div class="answer-meta">
                    <span class="answer-confidence ${confidenceClass}" title="AI Confidence">
                        ${confidencePercent}% confident
                    </span>
                    ${result.latencyMs ? `
                        <span class="answer-latency">${result.latencyMs}ms</span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.suggestionsEl.innerHTML = '';
            return;
        }

        this.suggestionsEl.innerHTML = `
            <div class="suggestions-label">Try asking:</div>
            <div class="suggestions-list">
                ${suggestions.map(s => `
                    <button class="btn-suggestion" data-query="${this.escapeHtml(s)}">
                        ${this.escapeHtml(s)}
                    </button>
                `).join('')}
            </div>
        `;

        // Bind click events
        this.suggestionsEl.querySelectorAll('.btn-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.inputEl.value = e.target.dataset.query;
                this.submitQuery();
            });
        });
    }

    showError(message) {
        this.responseEl.innerHTML = `
            <div class="query-error">
                <span class="error-icon">⚠</span>
                ${this.escapeHtml(message)}
            </div>
        `;
    }

    /**
     * Programmatically ask a question (for external triggers)
     */
    ask(question) {
        this.inputEl.value = question;
        this.submitQuery();
    }

    /**
     * Get query history
     */
    getHistory() {
        return this.history;
    }

    /**
     * Clear the response area
     */
    clear() {
        this.responseEl.innerHTML = '';
        this.inputEl.value = '';
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        if (typeof text !== 'string') {
            text = String(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
